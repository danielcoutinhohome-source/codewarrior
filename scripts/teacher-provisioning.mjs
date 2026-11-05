// Secrets enter only through the deployment environment, never workflow inputs or source.
export function teacherPlan(env) {
  const accounts = [
    { username: "DetrickD123", password: env.TEACHER_INITIAL_PASSWORD },
    { username: "Big3LFG", password: env.ADMIN_INITIAL_PASSWORD },
  ];
  if (accounts.some(a => typeof a.password !== "string" || a.password.length < 8 || a.password.length > 200 || a.password.toLowerCase() === a.username.toLowerCase())) {
    throw new Error("Set TEACHER_INITIAL_PASSWORD and ADMIN_INITIAL_PASSWORD to valid, separate passwords (8–200 characters).");
  }
  if (accounts[0].password === accounts[1].password) throw new Error("The two teacher initial passwords must be different.");
  const reset = env.RESET === "true";
  if (reset && !accounts.some(a => a.username === env.TEACHER_USERNAME)) throw new Error("Choose a configured teacher account for the reset.");
  return accounts.map(a => ({ ...a, reset: reset && a.username === env.TEACHER_USERNAME }));
}
