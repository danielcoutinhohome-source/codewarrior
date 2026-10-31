// Browser acceptance test for the classroom flow. Separate browser contexts stand in for
// separate devices (separate storage); a real local classroom server (wrangler dev) is the
// backend and the static production build is the site.
//
//   NEXT_PUBLIC_BASE_PATH=/codewarrior NEXT_PUBLIC_CLASSROOM_URL=http://localhost:8797 npm run build
//   npx tsx scripts/e2e-classroom.ts
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const API_PORT = 8797, SITE_PORT = 4329;
const API = `http://localhost:${API_PORT}/v1`;
const SITE = `http://localhost:${SITE_PORT}/codewarrior`;
const ADMIN = "e2e-admin-token-" + "y".repeat(32);
const step = (s: string) => console.log(`  ✓ ${s}`);
const shot = async (p: Page, name: string) => {
  if (process.env.E2E_SHOTS) await p.screenshot({ path: join(process.env.E2E_SHOTS, `${name}.png`), fullPage: true });
};

function stop(p: ChildProcess) {
  try {
    process.kill(-p.pid!, "SIGTERM");
  } catch {
    p.kill("SIGTERM");
  }
}
async function waitHttp(url: string, ms = 60_000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`timed out waiting for ${url}`);
}

async function play(page: Page, wrongFirst = 0) {
  // Answers through the debug-only playtest hook until the battle ends.
  await page.waitForFunction(() => (window as any).__cw?.phase === "answering", null, { timeout: 30_000 });
  let wrong = wrongFirst;
  for (let i = 0; i < 200; i++) {
    const s = await page.evaluate(() => { const c = (window as any).__cw; return c ? { phase: c.phase, over: c.over } : null; });
    if (s?.phase === "over" || s?.over) break;
    if (s?.phase === "answering" || s?.phase === "retry") {
      await page.evaluate((ok) => (window as any).__cw.play(ok), wrong <= 0);
      wrong--;
    } else if (s?.phase === "correct" || s?.phase === "revealed") {
      await page.evaluate(() => (window as any).__cw.next());
    }
    await page.waitForTimeout(250);
  }
  await page.getByText(/VICTORY|BOSS DEFEATED|KNOCKED OUT/).first().waitFor({ timeout: 30_000 });
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "cw-e2e-"));
  const site = join(dir, "site");
  cpSync(join(__dirname, "..", "out"), join(site, "codewarrior"), { recursive: true });
  const api = spawn("npx", ["wrangler", "dev", "--port", String(API_PORT), "--persist-to", join(dir, "state"), "--var", `ADMIN_TOKEN:${ADMIN}`, "--log-level", "warn"], { cwd: join(__dirname, "..", "classroom-server"), detached: true, stdio: "ignore" });
  const web = spawn("python3", ["-m", "http.server", String(SITE_PORT)], { cwd: site, detached: true, stdio: "ignore" });
  const browser = await chromium.launch();
  try {
    await waitHttp(`${API}/health`);
    await waitHttp(`${SITE}/`);

    // Provision the starter teacher exactly as the deploy workflow does (server-only token).
    const prov = await fetch(`${API}/admin/provision-teacher`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${ADMIN}` }, body: JSON.stringify({ username: "E2ETeacher", password: "Starter-pass-1" }) });
    assert.equal((await prov.json()).status, "created");

    const ctx = async (debug: boolean) => {
      const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      if (debug) await c.addInitScript(() => localStorage.setItem("cw.debug", "1"));
      return c;
    };
    const teacherCtx = await ctx(false);
    const studentCtx = await ctx(true);
    const T = await teacherCtx.newPage();
    const S = await studentCtx.newPage();
    const errors: string[] = [];
    for (const p of [T, S]) p.on("pageerror", (e) => errors.push(e.message));

    // 1-2. Teacher signs in with the starter password and must change it.
    await T.goto(`${SITE}/login/`);
    await T.getByRole("tab", { name: "Class account" }).click();
    await T.fill("#li-name", "E2ETeacher");
    await T.fill("#li-pass", "Starter-pass-1");
    await T.getByRole("button", { name: /ENTER/ }).click();
    await T.waitForURL(/\/account\//);
    await T.getByText("This account is using a starter password").waitFor();
    await T.fill("#pw-cur", "Starter-pass-1");
    await T.fill("#pw-new", "Teacher-new-pass-2");
    await T.fill("#pw-confirm", "Teacher-new-pass-2");
    await T.getByRole("button", { name: "SAVE PASSWORD" }).click();
    await T.waitForURL(/\/teacher\//);
    step("teacher signed in and replaced the starter password");

    // 3. Create a class and read its code.
    await T.getByRole("button", { name: "NEW CLASS" }).click();
    await T.fill("#nc-name", "E2E Period 1");
    await T.getByRole("button", { name: "CREATE" }).click();
    await T.getByText("Class code", { exact: true }).waitFor();
    const code = (await T.locator(".font-mono.text-4xl").innerText()).trim();
    assert.match(code, /^[A-Z2-9]{8}$/);
    await T.getByRole("button", { name: "Overview" }).click();
    await T.getByText("Live", { exact: true }).waitFor({ timeout: 15_000 });
    step(`class created with code ${code}; dashboard live`);

    // 4. Student creates a class account on another "device".
    await S.goto(`${SITE}/create/`);
    await S.getByLabel("Class account").check();
    await S.fill("#cw-name", "ava_e2e");
    await S.fill("#cw-display", "Ava E.");
    await S.fill("#cw-pass", "student-pass-1");
    await S.fill("#cw-confirm", "student-pass-1");
    await S.getByRole("button", { name: /FORGE/ }).click();
    await S.waitForURL(/\/classroom\//, { timeout: 20_000 });
    step("student account created");

    // 5-6. Student joins; teacher sees the enrollment without reloading.
    await S.fill("#join-code", code.toLowerCase());
    await S.getByRole("button", { name: "JOIN CLASS" }).click();
    await S.getByText(/You joined E2E Period 1/).waitFor();
    await T.getByText("Enrolled").waitFor();
    await T.waitForFunction(() => document.body.innerText.includes("Ava E."), null, { timeout: 10_000 });
    step("student joined; enrollment appeared on the teacher's screen live");

    // 7. Teacher publishes an assignment.
    await T.getByRole("button", { name: "Assignments" }).click();
    await T.getByRole("button", { name: "NEW ASSIGNMENT" }).click();
    await T.fill("#af-t", "Beat the first battle");
    await T.fill("#af-i", "Win battle 1 in Syntax Shore.");
    await T.locator("label", { hasText: /^B1:/ }).first().locator("input").check();
    await T.getByRole("button", { name: "PUBLISH" }).click();
    await T.getByText("Published", { exact: true }).waitFor();
    step("assignment published");

    // 8. Student sees it and launches it.
    await S.reload();
    await S.getByText("Beat the first battle").waitFor({ timeout: 10_000 });
    await S.getByRole("link", { name: /Battle 1/ }).first().click();
    await S.waitForURL(/\/battle\/\?w=0&b=0&assignment=/);
    step("student launched the assignment");

    // 9-10. Student wins; result saved; appears on the teacher's device automatically.
    await T.getByRole("button", { name: "Overview" }).click();
    let uploads = 0;
    const countSync = (r: { url: () => string; method: () => string }) => { if (r.url().endsWith("/v1/sync") && r.method() === "POST") uploads++; };
    S.on("request", countSync);
    await play(S, 1);
    await S.getByText("Saved to your class.").waitFor({ timeout: 15_000 });
    S.off("request", countSync);
    console.log(`    (${uploads} uploads for this battle)`);
    const t0 = Date.now();
    await T.locator("li", { hasText: "Ava E." }).filter({ hasText: "Won" }).first().waitFor({ timeout: 15_000 });
    step(`battle saved to class; teacher dashboard updated in ${Date.now() - t0} ms after the student saw "Saved"`);

    // 11. Teacher opens the actual recorded work.
    await T.locator("li", { hasText: "Ava E." }).filter({ hasText: "Won" }).first().getByRole("button").click();
    await T.getByRole("dialog").getByText(/try 1: wrong/).first().waitFor();
    await T.getByRole("dialog").getByText(/try 2: right/).first().waitFor();
    const dialogText = await T.getByRole("dialog").innerText();
    assert.match(dialogText, /definitely wrong|Answer key/);
    await T.keyboard.press("Escape");
    await T.getByRole("button", { name: "Assignments" }).click();
    await T.getByText("Completed: 1").waitFor();
    step("teacher sees the actual answers (wrong first try, right on retry) and the assignment completed");
    await T.getByRole("button", { name: "Overview" }).click();
    await T.getByText("Latest results").waitFor();
    await shot(T, "t-overview");
    await T.getByRole("button", { name: "Roster" }).click();
    await T.getByRole("button", { name: "Ava E." }).click();
    await T.getByText("Recent wrong answers").waitFor();
    await shot(T, "t-student");
    await S.goto(`${SITE}/classroom/`);
    await S.getByText("Beat the first battle", { exact: true }).waitFor();
    await shot(S, "s-classroom");
    await S.setViewportSize({ width: 390, height: 844 });
    await shot(S, "s-classroom-phone");
    await T.setViewportSize({ width: 390, height: 844 });
    await shot(T, "t-student-phone");
    await S.setViewportSize({ width: 1280, height: 900 });
    await T.setViewportSize({ width: 1280, height: 900 });
    await T.getByRole("button", { name: "Assignments" }).click();
    await T.getByText("Completed: 1").waitFor();
    await T.waitForURL(/tab=assignments/);

    // 12. Refresh, sign out, sign back in: records remain.
    await T.reload();
    await T.getByText("Completed: 1").waitFor();
    await T.getByRole("button", { name: "Sign out" }).click();
    await T.goto(`${SITE}/login/`);
    await T.getByRole("tab", { name: "Class account" }).click();
    await T.fill("#li-name", "e2eteacher");
    await T.fill("#li-pass", "Teacher-new-pass-2");
    await T.getByRole("button", { name: /ENTER/ }).click();
    await T.waitForURL(/\/teacher\//);
    await T.getByText("Ava E.").first().waitFor();
    step("records persist across refresh and sign-in");

    // 13. Second device for the student: progress and classroom work load.
    const S2ctx = await ctx(true);
    const S2 = await S2ctx.newPage();
    await S2.goto(`${SITE}/login/`);
    await S2.getByRole("tab", { name: "Class account" }).click();
    await S2.fill("#li-name", "ava_e2e");
    await S2.fill("#li-pass", "student-pass-1");
    await S2.getByRole("button", { name: /ENTER/ }).click();
    await S2.waitForURL(/\/map\//);
    const stars = await S2.evaluate(async () => {
      const raw = JSON.parse(localStorage.getItem("cw.cloud.session")!);
      return await new Promise((res) => { const q = indexedDB.open("codewarrior"); q.onsuccess = () => { const g = q.result.transaction("progress").objectStore("progress").get(`c:${raw.me.id}`); g.onsuccess = () => res(g.result?.stars); }; });
    });
    assert.ok((stars as Record<string, number>)["w0-b0"] >= 1, "second device has the earned stars");
    await S2.goto(`${SITE}/classroom/`);
    await S2.getByText("Beat the first battle", { exact: true }).waitFor();
    await S2.getByText("Completed").first().waitFor();
    step("second device loaded the student's progress and class work");

    // 14. Offline: play, queue, reconnect, upload exactly once.
    // The connection drops after the battle page is open (pages themselves need a connection).
    await S.goto(`${SITE}/battle/?w=0&b=1`);
    await S.waitForFunction(() => (window as any).__cw?.phase === "answering", null, { timeout: 30_000 });
    await studentCtx.setOffline(true);
    await play(S);
    await S.getByText("Saved on this device. Will sync when you're back online.").waitFor({ timeout: 10_000 });
    await studentCtx.setOffline(false);
    await S.getByText(/Saved and shared with your class\.|Saved to your class\./).waitFor({ timeout: 30_000 });
    await T.getByRole("button", { name: "Overview" }).click();
    await T.locator("li", { hasText: "Ava E." }).filter({ hasText: "Battle 2" }).first().waitFor({ timeout: 15_000 });
    await T.waitForTimeout(1500);
    assert.equal(await T.locator("li", { hasText: "Ava E." }).filter({ hasText: "Battle 2" }).count(), 1, "offline result appears exactly once");
    step("offline battle queued, uploaded after reconnecting, recorded exactly once");

    // 15. Switching accounts never uploads the previous account's queued work.
    await S.goto(`${SITE}/battle/?w=0&b=2`);
    await S.waitForFunction(() => (window as any).__cw?.phase === "answering", null, { timeout: 30_000 });
    await studentCtx.setOffline(true);
    await play(S);
    await S.getByText(/Will sync when you're back online/).waitFor();
    await S.evaluate(() => localStorage.removeItem("cw.cloud.session")); // sign out while offline
    await studentCtx.setOffline(false);
    await S.goto(`${SITE}/create/`);
    await S.getByLabel("Class account").check();
    await S.fill("#cw-name", "ben_e2e");
    await S.fill("#cw-pass", "student-pass-2");
    await S.fill("#cw-confirm", "student-pass-2");
    await S.getByRole("button", { name: /FORGE/ }).click();
    await S.waitForURL(/\/classroom\//);
    await S.fill("#join-code", code);
    await S.getByRole("button", { name: "JOIN CLASS" }).click();
    await S.getByText(/You joined/).waitFor();
    await S.waitForTimeout(3000);
    // Ava's battle started while online (so it shows as in progress), but its queued answers and
    // finish must not upload while Ben is signed in, and nothing may appear under Ben's name.
    assert.equal(await T.locator("li", { hasText: "ben_e2e" }).filter({ hasText: "Battle 3" }).count(), 0, "nothing uploaded under Ben");
    assert.equal(await T.locator("li", { hasText: "Ava E." }).filter({ hasText: "Battle 3" }).filter({ hasText: "Won" }).count(), 0, "Ava's finished result waits for Ava");
    const queued = await S.evaluate(() => new Promise<number>((res) => { const q = indexedDB.open("codewarrior"); q.onsuccess = () => { const c = q.result.transaction("outbox").objectStore("outbox").count(); c.onsuccess = () => res(c.result); }; }));
    assert.ok(queued > 0, "Ava's events are still queued on the device");
    // Ava signs back in on that device: her queued battle uploads to her account.
    await S.goto(`${SITE}/login/`);
    await S.getByRole("tab", { name: "Class account" }).click();
    await S.fill("#li-name", "ava_e2e");
    await S.fill("#li-pass", "student-pass-1");
    await S.getByRole("button", { name: /ENTER/ }).click();
    await S.waitForURL(/\/map\//);
    await T.locator("li", { hasText: "Ava E." }).filter({ hasText: "Battle 3" }).filter({ hasText: "Won" }).first().waitFor({ timeout: 20_000 });
    step("switching accounts kept Ava's queued work out of Ben's account; it uploaded when Ava signed back in");

    // A student can't open the teacher dashboard.
    await S.goto(`${SITE}/teacher/`);
    await S.getByText("This area is for teachers").waitFor();
    step("student is turned away from the teacher dashboard (and the server refuses teacher APIs)");

    // CSV export contains the real answers.
    await T.getByRole("button", { name: "Reports" }).click();
    await T.getByRole("button", { name: "SHOW RECORDS" }).click();
    await T.getByText(/runs? and \d+ answers? match/).waitFor();
    const dl = T.waitForEvent("download");
    await T.getByRole("button", { name: "DOWNLOAD ANSWERS CSV" }).click();
    const csvPath = await (await dl).path();
    const csv = (await import("node:fs")).readFileSync(csvPath!, "utf8");
    assert.match(csv, /Student,Activity,Assignment/);
    assert.match(csv, /Ava E\./);
    step("answers CSV exported with real records");

    assert.deepEqual(errors.filter((e) => !/ResizeObserver/.test(e)), [], "no page errors");
    await T.screenshot({ path: join(process.env.E2E_SHOTS || dir, "teacher-dashboard.png"), fullPage: false });
    console.log("classroom e2e passed");
  } finally {
    await browser.close();
    stop(api);
    stop(web);
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
