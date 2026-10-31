// Bounded AP-level program families. Values and structure are chosen once from
// the seeded RNG; displayed code, answer, hint, and Java check share that case.
import { choice, fill, predict, type Gen, type Rng, type Tier } from "./core";

export type ProgramCase = {
  body: string;
  expression: string;
  value: number | string;
  explanation: string;
  hint: string;
  classes?: string;
  // CSP display code is checked against the equivalent Java reference program.
  csp?: { body: string; expression: string };
  wrong?: (number | string)[];
};
export type Family = { skill: string; tier: Tier; make: (r: Rng) => ProgramCase };
export const ints = (r: Rng, n: number, low = -8, high = 15) => Array.from({ length: n }, () => r.int(low, high));
export const literal = (s: string) => JSON.stringify(s);
export const values = (xs: number[]) => `{${xs.join(", ")}}`;
export function text(r: Rng, n: number) {
  return Array.from({ length: n }, () => r.pick(["a", "b", "c", "d", "e", "r", "s", "t"])).join("");
}

export function expand(families: Family[]): Gen[] {
  return families.flatMap(f => (["predict", "choice", "fill"] as const).map(kind => ({
    skill: f.skill, tier: f.tier, varied: true,
    make(r: Rng) {
      const p = f.make(r);
      const suffix = kind === "fill" ? (typeof p.value === "number" ? r.pick([-9, -7, -4, -2, 2, 4, 7, 9]) : text(r, 2)) : undefined;
      const expression = kind === "fill" ? `(${p.expression}) + ___` : p.expression;
      const javaBody = `${p.body}\nSystem.out.print(${expression});`;
      const java = p.classes
        ? { src: `${p.classes}\npublic class Main { public static void main(String[] args) {\n${javaBody}\n} }`, wrap: "file" as const, expect: String(p.value) }
        : { src: javaBody, wrap: "main" as const, expect: String(p.value) };
      const code = p.csp
        ? `${p.csp.body}\nDISPLAY(${kind === "fill" ? `(${p.csp.expression}) + ___` : p.csp.expression})`
        : `${p.classes ? p.classes + "\n// In main:\n" : ""}${javaBody}`;
      const course = p.csp ? "AP CSP pseudocode. " : "";
      if (kind === "fill") {
        const target = typeof p.value === "number" ? p.value + Number(suffix) : p.value + String(suffix);
        const answer = typeof suffix === "number" ? String(suffix) : literal(String(suffix));
        return { ...fill(f.skill, `${course}Fill the blank with one ${typeof suffix === "number" ? "integer literal" : "quoted string literal"} so the displayed value is ${literal(String(target))}.`, code, [answer],
          p.hint + " Then compare that result with the requested final value.",
          `${p.explanation} Before the blank is added, the value is ${literal(String(p.value))}. Add ${answer} to produce ${literal(String(target))}.`,
          { ...java, expect: String(target) }), literalAnswer: true };
      }
      if (kind === "predict") {
        return { ...predict(f.skill, code, p.value, p.hint, p.explanation, `${course}What value is displayed?`), java };
      }
      const wrong = p.wrong || (typeof p.value === "number" ? [p.value - 1, p.value + 1, p.value + 2] : [p.value.slice(0, -1), p.value + "a", [...p.value].reverse().join("")]);
      const opts = [...new Set([String(p.value), ...wrong.map(String)])];
      for (let i = 1; opts.length < 4; i++) {
        const candidate = typeof p.value === "number" ? String(p.value + i) : p.value + "b".repeat(i);
        if (!opts.includes(candidate)) opts.push(candidate);
      }
      const options = r.shuffle(opts.slice(0, 4));
      return choice(f.skill, `${course}Which value does this program display?`, typeof p.value === "string" ? options.map(literal) : options, options.indexOf(String(p.value)), p.hint, p.explanation, code, java);
    },
  })));
}
