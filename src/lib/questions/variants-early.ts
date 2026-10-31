import { expand, type Family } from "./variants-core";

const syntax: Family[] = [
  { skill: "Copying primitive values", tier: 0, make: r => {
    const a = r.int(3, 35), b = r.int(2, 12), copyFirst = r.pick([true, false]);
    return { body: `int score = ${a};\n${copyFirst ? "int saved = score;\n" : ""}score += ${b};\n${copyFirst ? "" : "int saved = score;\n"}score *= 2;`, expression: "saved", value: copyFirst ? a : a + b,
      hint: "A primitive copy stores the value at that statement; it does not stay linked.", explanation: `saved is assigned ${copyFirst ? "before" : "after"} the addition, so it keeps ${copyFirst ? a : a + b} when score changes again.`, wrong: [a, a + b, (a + b) * 2] };
  } },
  { skill: "Order of operations", tier: 1, make: r => {
    const a = r.int(3, 17), b = r.int(2, 8), c = r.int(2, 9), grouped = r.pick([true, false]), subtract = r.pick([true, false]);
    const op = subtract ? "-" : "+", first = subtract ? a - b : a + b;
    const expr = grouped ? `(a ${op} b) * c` : `a ${op} b * c`;
    const v = grouped ? first * c : subtract ? a - b * c : a + b * c;
    return { body: `int a = ${a}, b = ${b}, c = ${c};`, expression: expr, value: v,
      hint: "Parentheses run first; otherwise multiplication runs before addition or subtraction.", explanation: `${grouped ? `The grouped expression is ${first}, then multiply by ${c}` : `Multiply ${b} by ${c} before combining with ${a}`}. The result is ${v}.`, wrong: [subtract ? a - b * c : a + b * c, first * c, subtract ? (a + b) * c : (a - b) * c, v + c] };
  } },
  { skill: "CSP chained assignment", tier: 1, make: r => {
    const a = r.int(2, 30), b = r.int(1, 12), swap = r.pick([true, false]);
    const java = swap ? "int saved = first;\nfirst = second;\nsecond = saved;" : "first = first + second;\nsecond = first - second;";
    const csp = swap ? "saved ← first\nfirst ← second\nsecond ← saved" : "first ← first + second\nsecond ← first - second";
    return { body: `int first = ${a}, second = ${b};\n${java}`, expression: "first + second", value: swap ? a + b : 2 * a + b,
      csp: { body: `first ← ${a}\nsecond ← ${b}\n${csp}`, expression: "first + second" }, hint: "Assignment copies the current value; update your trace after each line.", explanation: `The final first and second values are ${swap ? `${b} and ${a}` : `${a + b} and ${a}`}, so their sum is ${swap ? a + b : 2 * a + b}.`, wrong: [a + b, 2 * a + b, a + 2 * b] };
  } },
  { skill: "Cast placement in an average", tier: 2, make: r => {
    const a = r.int(2, 30), b = r.int(2, 19), n = r.int(2, 6), before = r.pick([true, false]);
    const expr = before ? `(int) (10 * ((double) (a + b) / ${n}))` : `(int) (10 * (double) ((a + b) / ${n}))`;
    const v = before ? Math.trunc(10 * ((a + b) / n)) : 10 * Math.trunc((a + b) / n);
    return { body: `int a = ${a}, b = ${b};`, expression: expr, value: v, hint: "Check whether the division happens before or after conversion to double.", explanation: `The sum is ${a + b}. ${before ? "Conversion before division preserves the fractional part" : "Integer division discards the fractional part before conversion"}; after multiplying by 10 and casting, the value is ${v}.`, wrong: [Math.trunc(10 * ((a + b) / n)), 10 * Math.trunc((a + b) / n), Math.trunc((a + b) / n), (a + b) * 10] };
  } },
];

const branches: Family[] = [
  { skill: "Inclusive boundary", tier: 0, make: r => {
    const cutoff = r.int(5, 30), score = cutoff + r.pick([-1, 0, 1]), yes = r.int(4, 14), no = r.int(-8, 2), inclusive = r.pick([true, false]);
    const pass = inclusive ? score >= cutoff : score > cutoff;
    return { body: `int score = ${score};\nint result;\nif (score ${inclusive ? ">=" : ">"} ${cutoff}) result = ${yes};\nelse result = ${no};`, expression: "result", value: pass ? yes : no,
      hint: "A boundary value behaves differently for > and >=.", explanation: `${score} ${inclusive ? ">=" : ">"} ${cutoff} is ${pass}, so result is ${pass ? yes : no}.`, wrong: [yes, no, score] };
  } },
  { skill: "Independent if statements", tier: 1, make: r => {
    const x = r.int(1, 16), cut = r.int(4, 12), add = r.int(2, 7), chained = r.pick([true, false]);
    let result = x; if (result < cut) result += add; if (!chained || !(x < cut)) { if (result >= cut) result *= 2; }
    return { body: `int points = ${x};\nif (points < ${cut}) points += ${add};\n${chained ? "else " : ""}if (points >= ${cut}) points *= 2;`, expression: "points", value: result,
      hint: "Independent if statements both run; an else-if skips the second test after the first branch runs.", explanation: `Start at ${x}. ${chained ? "The else links the decisions" : "The second test uses the updated points"}. The final value is ${result}.`, wrong: [x, x + add, x * 2, (x + add) * 2] };
  } },
  { skill: "CSP compound selection", tier: 1, make: r => {
    const x = r.int(2, 18), cut = r.int(4, 15), flag = r.pick([true, false]), and = r.pick([true, false]), yes = r.int(5, 20), no = r.int(-9, 1);
    const pass = and ? x >= cut && flag : x >= cut || flag;
    return { body: `int result;\nif (${x} >= ${cut} ${and ? "&&" : "||"} ${flag}) result = ${yes};\nelse result = ${no};`, expression: "result", value: pass ? yes : no,
      csp: { body: `hasPass ← ${flag}\nscore ← ${x}\nIF (score ≥ ${cut} ${and ? "AND" : "OR"} hasPass)\n{ result ← ${yes} }\nELSE\n{ result ← ${no} }`, expression: "result" }, hint: "Evaluate each Boolean part, then combine with AND or OR.", explanation: `The comparison is ${x >= cut} and hasPass is ${flag}. With ${and ? "AND" : "OR"}, the condition is ${pass}, so result is ${pass ? yes : no}.`, wrong: [yes, no, x] };
  } },
  { skill: "Branch order matters", tier: 2, make: r => {
    const low = r.int(2, 8), high = low + r.int(2, 7), x = r.int(low - 1, high + 2), firstHigh = r.pick([true, false]), a = r.int(10, 30), b = r.int(2, 8);
    const first = firstHigh ? high : low, second = firstHigh ? low : high;
    const v = x >= first ? a : x >= second ? b : -1;
    return { body: `int score = ${x};\nint result;\nif (score >= ${first}) result = ${a};\nelse if (score >= ${second}) result = ${b};\nelse result = -1;`, expression: "result", value: v,
      hint: "In an else-if chain, only the first true condition chooses a branch.", explanation: `Test ${x} against ${first} before ${second}. ${x >= first ? "The first condition is true, so skip the remaining branches" : x >= second ? "Only the second condition is true" : "Both conditions are false"}; result is ${v}.`, wrong: [a, b, -1] };
  } },
];

const loops: Family[] = [
  { skill: "CSP repeat trace", tier: 0, make: r => {
    const start = r.int(0, 20), n = r.int(2, 7), step = r.int(1, 8), before = r.pick([true, false]);
    const v = before ? n * start + step * n * (n + 1) / 2 : n * start + step * n * (n - 1) / 2;
    const java = before ? `value += ${step};\n    total += value;` : `total += value;\n    value += ${step};`;
    const csp = before ? `value ← value + ${step}\n  total ← total + value` : `total ← total + value\n  value ← value + ${step}`;
    return { body: `int value = ${start}, total = 0;\nfor (int i = 0; i < ${n}; i++) {\n    ${java}\n}`, expression: "total", value: v,
      csp: { body: `value ← ${start}\ntotal ← 0\nREPEAT ${n} TIMES\n{\n  ${csp}\n}`, expression: "total" }, hint: "Keep separate columns for value and total; the order inside the loop matters.", explanation: `There are ${n} iterations. Add value ${before ? "after" : "before"} its increase each time; the total becomes ${v}.`, wrong: [n * start + step * n * (before ? n - 1 : n + 1) / 2, start + n * step, n * step] };
  } },
  { skill: "Stepping by more than 1", tier: 1, make: r => {
    const start = r.int(1, 12), step = r.int(1, 4), n = r.int(2, 7), down = r.pick([true, false]), inclusive = r.pick([true, false]);
    const end = down ? start - n * step : start + n * step;
    const visited = Array.from({ length: n + (inclusive ? 1 : 0) }, (_, i) => start + (down ? -1 : 1) * i * step);
    return { body: `int total = 0;\nfor (int i = ${start}; i ${down ? (inclusive ? ">=" : ">") : (inclusive ? "<=" : "<")} ${end}; i ${down ? "-=" : "+="} ${step}) {\n    total += i;\n}`, expression: "total", value: visited.reduce((a, b) => a + b, 0),
      hint: "List the visited i values; check the direction, step, and whether the endpoint is included.", explanation: `The visited values are ${visited.join(", ")}. Their sum is ${visited.reduce((a, b) => a + b, 0)}.`, wrong: [visited.length, visited.reduce((a, b) => a + b, 0) + end, visited.reduce((a, b) => a + b, 0) - start] };
  } },
  { skill: "Conditional loop counter", tier: 1, make: r => {
    const start = r.int(0, 9), n = r.int(4, 10), divisor = r.int(2, 4), equal = r.pick([true, false]);
    const count = Array.from({ length: n }, (_, i) => start + i).filter(i => equal ? i % divisor === 0 : i % divisor !== 0).length;
    return { body: `int count = 0;\nfor (int i = ${start}; i < ${start + n}; i++) {\n    if (i % ${divisor} ${equal ? "==" : "!="} 0) count++;\n}`, expression: "count", value: count,
      hint: "Count only the iterations where the remainder test is true.", explanation: `Inspect integers ${start} through ${start + n - 1}. ${count} of them are ${equal ? "divisible" : "not divisible"} by ${divisor}.`, wrong: [n - count, n, count + 1] };
  } },
  { skill: "Nested conditional counts", tier: 2, make: r => {
    const rows = r.int(2, 5), cols = r.int(2, 5), offset = r.int(0, 3), same = r.pick([true, false]), initial = r.int(0, 9); let v = initial;
    for (let a = 0; a < rows; a++) for (let b = 0; b < cols; b++) if (same ? (a + b + offset) % 2 === 0 : a < b + offset) v++;
    return { body: `int count = ${initial};\nfor (int row = 0; row < ${rows}; row++) {\n    for (int col = 0; col < ${cols}; col++) {\n        if (${same ? `(row + col + ${offset}) % 2 == 0` : `row < col + ${offset}`}) count++;\n    }\n}`, expression: "count", value: v,
      hint: "For each row, check every column and count only the matching pairs.", explanation: `There are ${rows * cols} row/column pairs; ${v - initial} satisfy the condition. Starting the counter at ${initial} gives ${v}.`, wrong: [rows * cols, v - initial, v + rows, initial] };
  } },
];
export const EARLY_VARIANTS = [expand(syntax), expand(branches), expand(loops)];
