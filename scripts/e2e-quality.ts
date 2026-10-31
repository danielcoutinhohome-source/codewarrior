// Runs only against the local static export with disposable, device-only accounts.
// No production test route, auth bypass, or external classroom/tutor requests.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, extname, sep, join } from "node:path";
import { chromium, type Page, type Browser } from "playwright";
import { WORLDS } from "../src/lib/game";

const output = resolve("out");
const shots = resolve(process.env.E2E_SHOTS || "artifacts/quality");
const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url!, "http://localhost").pathname);
    if (!path.startsWith("/codewarrior/")) { res.writeHead(404).end(); return; }
    let file = resolve(output, path.slice("/codewarrior/".length));
    if (file !== output && !file.startsWith(output + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" }).end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});

async function capture(page: Page, name: string) {
  await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true });
}
async function noOverflow(page: Page, label: string) {
  const sizes = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(sizes.content <= sizes.viewport + 1, `${label}: horizontal overflow ${JSON.stringify(sizes)}`);
}

// Seed only the disposable account created through the real device signup UI.
// This fixture controls map progression; it never changes authentication/roles.
async function checkpoint(page: Page, id: string, world: number, ready: boolean) {
  await page.evaluate(async ({ id, world, ready }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("codewarrior"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("progress", "readwrite"), store = tx.objectStore("progress");
        const r = store.get(id);
        r.onsuccess = () => {
          if (!r.result) { tx.abort(); return; }
          const stars: Record<string, number> = {};
          for (let w = 0; w < world; w++) for (let b = 0; b < 5; b++) stars[`w${w}-b${b}`] = 3;
          if (ready) for (let b = 0; b < 4; b++) stars[`w${world}-b${b}`] = 3;
          store.put({ ...r.result, stars, updatedAt: Date.now() });
        };
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error("Missing disposable progress fixture"));
      });
    } finally { db.close(); }
  }, { id, world, ready });
}

async function main() {
  await mkdir(shots, { recursive: true });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`, site = `${origin}/codewarrior`;
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      const name = String(viewport.width), context = await browser.newContext({ viewport });
      // Do not accidentally contact production services from a local acceptance test.
      await context.route("**/*", route => route.request().url().startsWith(origin + "/") ? route.continue() : route.abort());
      await context.addInitScript(() => { localStorage.setItem("cw.debug", "1"); localStorage.setItem("cw.sound", "0"); });
      const page = await context.newPage(), errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      try {
        await page.goto(site + "/");
        await page.getByRole("heading", { name: "Battle your way to LeetCode" }).waitFor();
        await noOverflow(page, `${name} landing`); await capture(page, `${name}-landing`);
        await page.getByRole("link", { name: "CREATE MY WARRIOR", exact: true }).click();
        await page.getByRole("heading", { name: "Create your warrior" }).waitFor();
        // This build has no classroom URL, so signup remains device-only.
        assert.equal(await page.getByRole("radio", { name: /Class account/ }).count(), 0);
        await noOverflow(page, `${name} signup`); await capture(page, `${name}-signup`);
        const id = `qa_${name}`, password = crypto.randomUUID();
        await page.locator("#cw-name").fill(id);
        await page.locator("#cw-pass").fill(password);
        await page.locator("#cw-confirm").fill(password);
        await page.getByRole("button", { name: "FORGE MY WARRIOR", exact: true }).click();
        await page.waitForURL(/\/map\//, { timeout: 30_000 });
        await page.locator("[data-boss-camera]").waitFor();

        for (let w = 0; w < WORLDS.length; w++) {
          await checkpoint(page, id, w, false);
          await page.goto(`${site}/map/?w=${w}`);
          await page.locator('[data-boss-camera="travel"]').waitFor();
          await page.getByRole("button", { name: "FIGHT!", exact: true }).waitFor();
          await noOverflow(page, `${name} ${WORLDS[w].name}`);
          await capture(page, `${name}-world-${w + 1}-path`);

          await checkpoint(page, id, w, true);
          await page.goto(`${site}/map/?w=${w}`);
          await page.locator('[data-boss-camera="arrival"]').waitFor();
          await page.waitForFunction(() => {
            const e = document.querySelector('[data-boss-camera="arrival"]');
            return e && new DOMMatrixReadOnly(getComputedStyle(e).transform).a > 1.139;
          });
          const gate = page.getByRole("button", { name: "Approach and unseal the boss gate", exact: true });
          const box = await gate.boundingBox();
          const scene = await page.locator("[data-boss-camera]").locator("..").boundingBox();
          assert.ok(box && scene);
          assert.ok(box.x >= 0 && box.x + box.width <= viewport.width, `${name} ${w}: gate fits horizontally`);
          assert.ok(box.y >= scene.y && box.y + box.height <= scene.y + scene.height, `${name} ${w}: gate fits vertically`);
          assert.ok(box.height > scene.height * .45, `${name} ${w}: gate is imposing`);
          await noOverflow(page, `${name} ${w} gate`); await capture(page, `${name}-world-${w + 1}-gate`);
          // Trial click checks actual hit testing without opening the puzzle.
          await gate.click({ trial: true });
        }

        // Navigate away during the arrival, then check reduced-motion final framing.
        await page.getByRole("tab", { name: "Battle 1", exact: true }).click();
        await page.locator('[data-boss-camera="travel"]').waitFor();
        await page.getByRole("tab", { name: "Boss", exact: true }).click();
        await page.getByRole("tab", { name: "Battle 2", exact: true }).click();
        await page.locator('[data-boss-camera="travel"]').waitFor();
        await page.evaluate(() => localStorage.setItem("cw.reduceMotion", "1"));
        await page.reload();
        await page.locator('[data-boss-camera="arrival"]').waitFor();
        await capture(page, `${name}-gate-reduced-motion`);

        // Return to a fresh early-world battle and test both damage directions.
        await page.evaluate(() => localStorage.removeItem("cw.reduceMotion"));
        await checkpoint(page, id, 0, false);
        await page.goto(`${site}/map/?w=0`);
        await page.getByRole("button", { name: "FIGHT!", exact: true }).click();
        await page.waitForFunction(() => (window as any).__cw?.phase === "answering");
        await noOverflow(page, `${name} question`); await capture(page, `${name}-battle-question`);
        await page.evaluate(() => (window as any).__cw.play(false));
        await page.waitForFunction(() => (window as any).__cw?.phase === "retry");
        await capture(page, `${name}-battle-retry`);
        for (let i = 0; i < 20; i++) {
          const state = await page.evaluate(() => ({ phase: (window as any).__cw.phase, over: (window as any).__cw.over }));
          if (state.over) break;
          if (["answering", "retry"].includes(state.phase)) {
            await page.evaluate(() => (window as any).__cw.play(true));
            if (i === 0) {
              await page.waitForFunction(() => (window as any).__cw?.phase === "busy");
              await capture(page, `${name}-battle-attack`);
            }
          }
          else if (["correct", "revealed"].includes(state.phase)) await page.evaluate(() => (window as any).__cw.next());
          await page.waitForFunction(() => (window as any).__cw?.phase !== "busy");
        }
        await page.getByText("VICTORY", { exact: true }).waitFor();
        await noOverflow(page, `${name} result`); await capture(page, `${name}-battle-result`);
        assert.deepEqual(errors, [], `${name}: no uncaught browser errors`);
        console.log(`Quality checks passed at ${name}px: signup, seven paths/gates, hit targets, reduced motion, battle retry and victory.`);
      } catch (error) {
        await capture(page, `${name}-failure`).catch(() => {});
        throw error;
      } finally { await context.close(); }
    }
  } finally { await browser?.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
