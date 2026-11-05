import { pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { teacherPlan } from "./teacher-provisioning.mjs";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const freshToken = () => randomBytes(32).toString("hex");
function setAdminToken(token) {
  // stdin avoids putting the token into process arguments or workflow logs.
  const result = spawnSync("npx", ["wrangler", "secret", "put", "ADMIN_TOKEN"], { input: token, stdio: ["pipe", "ignore", "inherit"], env: process.env });
  if (result.error || result.status !== 0) throw new Error("Could not update the temporary provisioning credential.");
}
export async function provisionTeachers(env = process.env, { wait = sleep, putToken = setAdminToken, request = fetch, tokenFactory = freshToken, log = console.log } = {}) {
  const accounts = teacherPlan(env); // Validate everything before touching accounts/tokens.
  const base = new URL(env.URL);
  if (base.protocol !== "https:" || base.username || base.password) throw new Error("Expected the deployed HTTPS classroom URL.");
  const token = tokenFactory();
  log(`::add-mask::${token}`);
  try {
    putToken(token);
    await wait(15_000);
    for (const account of accounts) {
      let status;
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const res = await request(new URL("/v1/admin/provision-teacher", base), { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(account), signal: AbortSignal.timeout(20_000) });
          if (res.ok) {
            const data = await res.json();
            if (["created", "exists", "reset"].includes(data.status)) { status = data.status; break; }
          }
        } catch {} // Never print request bodies, passwords, tokens, or response internals.
        if (attempt < 5) await wait(10_000);
      }
      if (!status) throw new Error(`Provisioning failed for ${account.username}; check server health and account conflicts.`);
      log(`Provisioning result: ${status} (${account.username})`);
    }
  } finally {
    // Rotate even if provisioning or the first secret update fails; do not leave an admin
    // credential usable after this job. A failure here fails the workflow visibly.
    putToken(tokenFactory());
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  provisionTeachers().catch(error => { console.error(error.message); process.exitCode = 1; });
}
