// Runs every code question through real Java and checks the expected output.
// Usage: npx tsx scripts/verify-questions.ts
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BANKS, buildBattle, rng, type Question } from "../src/lib/questions/index";

const SEEDS = Number(process.env.SEEDS || 8);
const dir = "/tmp/cw-verify";
rmSync(dir, { recursive: true, force: true });
mkdirSync(join(dir, "src"), { recursive: true });

type Job = { pkg: string; q: Question; variant: string; expect: string };
const jobs: Job[] = [];
const problems: string[] = [];
let n = 0;

function program(pkg: string, wrap: string, src: string) {
  if (wrap === "main") return `package ${pkg};\nimport java.util.*;\npublic class Main { public static void main(String[] args) {\n${src}\n} }`;
  if (wrap === "class") return `package ${pkg};\nimport java.util.*;\npublic class Main {\n${src}\n}`;
  return `package ${pkg};\n${src}`;
}

function add(q: Question, variant: string, src: string) {
  const pkg = `q${n++}`;
  mkdirSync(join(dir, "src", pkg), { recursive: true });
  writeFileSync(join(dir, "src", pkg, "Main.java"), program(pkg, q.java!.wrap, src));
  jobs.push({ pkg, q, variant, expect: q.java!.expect });
}

function check(q: Question) {
  if (!q.prompt || !q.hint || !q.explain) problems.push(`${q.skill}: missing text`);
  if (q.kind === "choice" && (q.correct === undefined || !q.options?.[q.correct])) problems.push(`${q.skill}: bad choice index`);
  if (q.kind === "predict" && q.answers![0].includes("\n")) problems.push(`${q.skill}: multi-line predict answer`);
  if (!q.java) return;
  if (q.kind === "predict") {
    if (q.answers![0] !== q.java.expect) problems.push(`${q.skill}: answer/expect mismatch`);
    add(q, "predict", q.java.src);
  } else if (q.kind === "fill") {
    if (!q.code!.includes("___")) problems.push(`${q.skill}: fill without blank`);
    for (const a of q.answers!) add(q, `fill:${a}`, q.java.src.split("___").join(a));
  } else if (q.kind === "order") {
    add(q, "order", q.java.src.replace("@@LINES@@", q.lines!.join("\n")));
  } else add(q, "choice", q.java.src);
}

let total = 0;
BANKS.forEach((bank, w) => {
  for (const g of bank) {
    const seeds = g.once ? 1 : SEEDS;
    for (let s = 0; s < seeds; s++) {
      check(g.make(rng(1000 * w + 31 * s + 7)));
      total++;
    }
  }
  // Every battle builds the right number of questions.
  for (let b = 0; b < 5; b++)
    for (let s = 1; s <= 30; s++) {
      const qs = buildBattle(w, b, s);
      const want = b === 4 ? 8 : 5;
      if (qs.length !== want) problems.push(`world ${w} battle ${b}: ${qs.length} questions`);
    }
});

const runner = `import java.io.*;
public class Runner {
  public static void main(String[] a) throws Exception {
    PrintStream real = System.out;
    for (String pkg : a) {
      ByteArrayOutputStream buf = new ByteArrayOutputStream();
      System.setOut(new PrintStream(buf, true, "UTF-8"));
      String err = "";
      try { Class.forName(pkg + ".Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
      catch (Throwable t) { Throwable c = t.getCause() != null ? t.getCause() : t; err = c.getClass().getSimpleName(); }
      System.setOut(real);
      String out = buf.toString("UTF-8").replace("\\\\", "\\\\\\\\").replace("\\n", "\\\\n").replace("\\r", "");
      real.println(pkg + "\\t" + err + "\\t" + out);
    }
  }
}`;
writeFileSync(join(dir, "src", "Runner.java"), runner);

const files = jobs.map((j) => join(dir, "src", j.pkg, "Main.java")).concat(join(dir, "src", "Runner.java"));
try {
  execFileSync("javac", ["-nowarn", "-d", join(dir, "out"), ...files], { stdio: "pipe", maxBuffer: 64 << 20 });
} catch (e) {
  const msg = String((e as { stderr?: Buffer }).stderr || e);
  console.error(msg.split("\n").slice(0, 40).join("\n"));
  process.exit(1);
}
const res = execFileSync("java", ["-cp", join(dir, "out"), "Runner", ...jobs.map((j) => j.pkg)], { maxBuffer: 64 << 20 }).toString();
const byPkg = new Map(res.trim().split("\n").map((l) => { const [p, err, out] = l.split("\t"); return [p, { err, out: (out || "").replace(/\\n/g, "\n").replace(/\\\\/g, "\\") }]; }));
const norm = (s: string) => s.split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();
let ok = 0;
for (const j of jobs) {
  const r = byPkg.get(j.pkg);
  if (!r) problems.push(`${j.q.skill} [${j.variant}]: no result`);
  else if (r.err) problems.push(`${j.q.skill} [${j.variant}]: threw ${r.err}\n${j.q.code || j.q.lines?.join("\n")}`);
  else if (norm(r.out) !== norm(j.expect)) problems.push(`${j.q.skill} [${j.variant}]: expected ${JSON.stringify(j.expect)} got ${JSON.stringify(r.out)}\n${j.q.code}`);
  else ok++;
}
console.log(`${total} questions generated, ${jobs.length} Java runs, ${ok} passed`);
if (problems.length) {
  console.log(`${problems.length} problems:\n` + problems.slice(0, 30).join("\n---\n"));
  process.exit(1);
}
console.log("All questions verified.");
