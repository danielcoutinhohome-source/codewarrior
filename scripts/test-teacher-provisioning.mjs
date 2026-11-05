import { test } from "node:test";
import assert from "node:assert/strict";
import { teacherPlan } from "./teacher-provisioning.mjs";
const env = { TEACHER_INITIAL_PASSWORD: "test-detrick-only-123", ADMIN_INITIAL_PASSWORD: "test-owner-only-456" };
test("both fixed accounts get independent initial passwords and no automatic resets", () => {
  assert.deepEqual(teacherPlan(env), [
    {username:"DetrickD123", password:env.TEACHER_INITIAL_PASSWORD, reset:false},
    {username:"Big3LFG", password:env.ADMIN_INITIAL_PASSWORD, reset:false},
  ]);
});
test("reset only the explicitly selected account", () => {
  for (const username of ["Big3LFG", "DetrickD123"]) {
    assert.deepEqual(teacherPlan({...env,RESET:"true",TEACHER_USERNAME:username}).map(a => [a.username,a.reset]), [["DetrickD123",username === "DetrickD123"],["Big3LFG",username === "Big3LFG"]]);
  }
  assert.throws(() => teacherPlan({...env,RESET:"true",TEACHER_USERNAME:"other"}));
});
test("fail before provisioning if secrets are missing, shared or invalid", () => {
  for (const input of [{}, {...env,ADMIN_INITIAL_PASSWORD:undefined}, {...env,TEACHER_INITIAL_PASSWORD:"short"}, {...env,ADMIN_INITIAL_PASSWORD:env.TEACHER_INITIAL_PASSWORD}, {...env,ADMIN_INITIAL_PASSWORD:"Big3LFG"}, {...env,ADMIN_INITIAL_PASSWORD:"x".repeat(201)}]) assert.throws(() => teacherPlan(input));
});
test("teacher secret alone cannot provision the admin; errors contain no secret values", () => {
  assert.throws(() => teacherPlan({TEACHER_INITIAL_PASSWORD:"legacy-test-password"}));
  try { teacherPlan({...env,ADMIN_INITIAL_PASSWORD:env.TEACHER_INITIAL_PASSWORD}); } catch(e) { assert.ok(!e.message.includes(env.TEACHER_INITIAL_PASSWORD)); }
});

import { provisionTeachers } from "./provision-teachers.mjs";
function fakeRuntime(fail = false) {
  const tokens = [], bodies = [], logs = [];
  return { tokens, bodies, logs, deps: {
    wait: async () => {}, putToken: t => tokens.push(t), tokenFactory: () => `test-token-${tokens.length}`,
    log: s => logs.push(s), request: async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return {ok:!fail,json:async () => ({status:"created"})};
    },
  }};
}
test("provision both accounts with different secrets, then rotate admin credential", async () => {
  const f = fakeRuntime();
  await provisionTeachers({...env,URL:"https://classroom.example"},f.deps);
  assert.deepEqual(f.bodies, teacherPlan(env));
  assert.equal(f.tokens.length,2);
  assert.notEqual(f.tokens[0],f.tokens[1]);
  for (const password of Object.values(env)) assert.ok(f.logs.every(log => !log.includes(password)));
});
test("failed provisioning rotates the admin credential and reports failure", async () => {
  const f = fakeRuntime(true);
  await assert.rejects(provisionTeachers({...env,URL:"https://classroom.example"},f.deps),/Provisioning failed/);
  assert.equal(f.tokens.length,2);
  assert.notEqual(f.tokens[0],f.tokens[1]);
});
test("invalid setup never installs an admin token or sends a password", async () => {
  const f = fakeRuntime();
  await assert.rejects(provisionTeachers({URL:"https://classroom.example"},f.deps));
  assert.equal(f.tokens.length,0);
  assert.equal(f.bodies.length,0);
});
test("initial token installation failure still attempts credential rotation", async () => {
  const f = fakeRuntime();
  f.deps.putToken = t => {f.tokens.push(t); if (f.tokens.length === 1) throw new Error("install failed");};
  await assert.rejects(provisionTeachers({...env,URL:"https://classroom.example"},f.deps),/install failed/);
  assert.equal(f.tokens.length,2);
  assert.equal(f.bodies.length,0);
});
