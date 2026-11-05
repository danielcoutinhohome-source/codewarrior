// Isolated UI acceptance test. All account/traffic API responses are local fixtures;
// real server authorization is covered by test-classroom.ts. Never contacts production.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, extname, sep, join } from "node:path";
import { chromium, type Browser } from "playwright";
const output = resolve("out"), shots = resolve("artifacts/quality");
const types: Record<string,string> = {".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".svg":"image/svg+xml"};
const server = createServer(async(req,res) => {
  try {
    const path = decodeURIComponent(new URL(req.url!,"http://localhost").pathname);
    if (!path.startsWith("/codewarrior/")) {res.writeHead(404).end();return;}
    let file = resolve(output,path.slice("/codewarrior/".length));
    if (file !== output && !file.startsWith(output+sep)) {res.writeHead(403).end();return;}
    if ((await stat(file)).isDirectory()) file=join(file,"index.html");
    res.writeHead(200,{"content-type":types[extname(file)] || "application/octet-stream"}).end(await readFile(file));
  } catch {res.writeHead(404).end();}
});
async function main() {
  await mkdir(shots,{recursive:true});
  await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));
  const address=server.address(); assert.ok(address && typeof address !== "string");
  const origin=`http://127.0.0.1:${address.port}`, site=origin+"/codewarrior";
  let browser: Browser | undefined;
  try {
    browser=await chromium.launch();
    for (const width of [1366,1024]) {
      for (const scenario of ["login","stale","other-teacher"] as const) {
        const owner=scenario !== "other-teacher";
        const me={id:"fixture-admin",username:owner ? "Big3LFG":"OtherTeacher",displayName:"Test account",role:"teacher",mustChangePassword:false,createdAt:1,canViewAnalytics:owner};
        const context=await browser.newContext({viewport:{width,height:650}});
        const errors:string[]=[]; let trafficReads=0;
        await context.route("**/*",async route=>{
          const url=new URL(route.request().url());
          if (url.origin !== origin) {await route.abort();return;}
          if (!url.pathname.startsWith("/v1/")) {await route.continue();return;}
          let body:unknown={};
          if (url.pathname === "/v1/auth/login") body={token:"fixture-token",me};
          if (url.pathname === "/v1/me") body={me};
          if (url.pathname === "/v1/classes") body={classes:[]};
          if (url.pathname === "/v1/analytics") {
            trafficReads++; assert.ok(owner,"unlisted teacher must not request traffic");
            body={generatedAt:Date.now(),activeNow:2,days:Array.from({length:Number(url.searchParams.get("days") || 30)},(_,i)=>({day:`2026-11-${String(i+1).padStart(2,"0")}`,visitors:4,newVisitors:3,returningVisitors:1,pageViews:6,peakConcurrent:2}))};
          }
          await route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
        });
        await context.addInitScript(({origin,me,existing})=>{
          localStorage.setItem("cw.classroomUrl",origin);
          localStorage.setItem("cw.traffic.optOut","1");
          if(existing) localStorage.setItem("cw.cloud.session",JSON.stringify({token:"fixture-token",me:{...me,canViewAnalytics:false}}));
        },{origin,me,existing:scenario !== "login"});
        const page=await context.newPage(); page.on("pageerror",e=>errors.push(e.message));
        try {
          await page.goto(site+(scenario === "login" ? "/login/?as=teacher":"/teacher/"));
          if(scenario === "login") {
            await page.getByRole("tab",{name:"Teacher",exact:true}).click();
            await page.locator("#li-name").fill("Big3LFG");
            await page.locator("#li-pass").fill("fixture-only-password");
            await page.getByRole("button",{name:"OPEN DASHBOARD",exact:true}).click();
            await page.waitForURL(/\/teacher\/?(?:\?|#|$)/);
          }
          if(owner) {
            await page.getByRole("heading",{name:"Site traffic",exact:true}).waitFor();
            await page.getByRole("button",{name:"Download CSV"}).waitFor();
            assert.ok(trafficReads>0,"traffic loads without a class");
            await page.getByRole("combobox").first().selectOption("7");
            await page.getByRole("button",{name:"Download CSV"}).waitFor();
            const download=page.waitForEvent("download"); await page.getByRole("button",{name:"Download CSV"}).click();
            assert.equal((await download).suggestedFilename(),"codewarrior-traffic.csv");
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),"no horizontal page overflow");
            if(scenario === "login") await page.screenshot({path:join(shots,`admin-traffic-${width}.png`),fullPage:true});
          } else {
            await page.getByRole("heading",{name:"Create your first class"}).waitFor();
            assert.equal(await page.getByRole("heading",{name:"Site traffic",exact:true}).count(),0);
            assert.equal(trafficReads,0);
          }
          assert.deepEqual(errors,[]);
        } catch (error) {
          await page.screenshot({path:join(shots,`admin-traffic-${width}-${scenario}-failure.png`),fullPage:true}).catch(()=>{});
          throw error;
        } finally {await context.close();}
      }
    }
    console.log("Admin traffic UI passed: Teacher login, existing-session refresh, no-class traffic, CSV, privacy and Chromebook layouts");
  } finally {await browser?.close();await new Promise<void>(r=>server.close(()=>r()));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
