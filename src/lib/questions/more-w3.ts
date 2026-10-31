// World 3 (Loop Lagoon) expansion: 40 more templates on for / while loops.
// Every Java question is compiled and run by scripts/verify-questions.ts.
import { blank as f, mc as c, method as m } from "./ap-builders";
import { predict, type Gen } from "./core";

const g = (skill: string, tier: 0 | 1 | 2, make: Gen["make"]): Gen => ({ skill, tier, make });
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const W2_MORE: Gen[] = [
  // ---- Novice (10) ----
  g("Numbers in a row", 0, (r) => {
    const n = r.int(3, 7);
    return predict("Numbers in a row", `String s = "";\nfor (int i = 1; i <= ${n}; i++) {\n    s += i;\n}\nSystem.out.println(s);`, range(1, n).join(""), "Each pass adds the current i to the end of s.", `i goes 1 to ${n}, so s is ${range(1, n).join("")}.`);
  }),
  g("Adding the same amount", 0, (r) => {
    const times = r.int(3, 6), k = r.int(2, 9);
    return predict("Adding the same amount", `int total = 0;\nfor (int i = 0; i < ${times}; i++) {\n    total += ${k};\n}\nSystem.out.println(total);`, times * k, "Count the passes, then add that many times.", `The loop runs ${times} times, adding ${k} each time: ${times * k}.`);
  }),
  g("Countdown in one line", 0, (r) => {
    const n = r.int(3, 7);
    return predict("Countdown in one line", `String s = "";\nfor (int i = ${n}; i >= 1; i--) {\n    s += i;\n}\nSystem.out.println(s);`, range(1, n).reverse().join(""), "i starts high and goes down by 1.", `${range(1, n).reverse().join(", ")}.`);
  }),
  g("Doubling with while", 0, (r) => {
    const limit = r.pick([10, 20, 50, 100]);
    let x = 1;
    while (x < limit) x *= 2;
    return predict("Doubling with while", `int x = 1;\nwhile (x < ${limit}) {\n    x *= 2;\n}\nSystem.out.println(x);`, x, "Keep doubling until x is no longer less than the limit.", `x goes 1, 2, 4, ... and stops at ${x}, the first value not below ${limit}.`);
  }),
  g("Last square in a loop", 0, (r) => {
    const n = r.int(3, 9);
    return predict("Last square in a loop", `int last = 0;\nfor (int i = 1; i <= ${n}; i++) {\n    last = i * i;\n}\nSystem.out.println(last);`, n * n, "last is overwritten every pass; only the final pass counts.", `The last pass has i = ${n}, so last = ${n * n}.`);
  }),
  g("Even numbers in a loop", 0, (r) => {
    const top = r.pick([6, 8, 10]);
    return predict("Even numbers in a loop", `String s = "";\nfor (int i = 0; i <= ${top}; i += 2) {\n    s += i;\n}\nSystem.out.println(s);`, range(0, top / 2).map((x) => 2 * x).join(""), "i += 2 skips the odd numbers.", `i takes 0, 2, ..., ${top}.`);
  }),
  c(0, "Loop that prints 1 to 5", "Which loop prints 1, 2, 3, 4, 5?", ["for (int i = 1; i <= 5; i++)", "for (int i = 1; i < 5; i++)", "for (int i = 0; i <= 5; i++)", "for (int i = 5; i >= 1; i--)"], 0, "Start at 1 and include 5. < 5 stops at 4, starting at 0 adds a 0, and counting down prints them in reverse."),
  g("Loop variable after a for", 0, (r) => {
    const n = r.int(3, 9);
    return predict("Loop variable after a for", `int i;\nfor (i = 0; i < ${n}; i++) {\n}\nSystem.out.println(i);`, n, "The loop stops when i < n becomes false.", `i stops at ${n}, the first value where i < ${n} is false.`);
  }),
  f(0, "Including the last number", "Fill in the comparison so the loop counts 1 through 5.", "int count = 0;\nfor (int i = 1; i ___ 5; i++) {\n    count++;\n}\nSystem.out.println(count);", ["<="], "5", "<= 5 includes 5, so the loop runs for 1, 2, 3, 4 and 5."),
  g("Countdown then go", 0, (r) => {
    const t = r.int(3, 5);
    return predict("Countdown then go", `int t = ${t};\nString s = "";\nwhile (t > 0) {\n    s += t;\n    t--;\n}\ns += "Go";\nSystem.out.println(s);`, range(1, t).reverse().join("") + "Go", "The loop adds digits; Go is added once after it ends.", `${range(1, t).reverse().join("")} then Go.`);
  }),

  // ---- Intermediate (20) ----
  g("Sum of even numbers", 1, (r) => {
    const n = r.int(6, 14);
    const v = range(1, n).filter((x) => x % 2 === 0).reduce((a, b) => a + b, 0);
    return predict("Sum of even numbers", `int sum = 0;\nfor (int i = 1; i <= ${n}; i++) {\n    if (i % 2 == 0) {\n        sum += i;\n    }\n}\nSystem.out.println(sum);`, v, "Only the even i values get added.", `Even numbers up to ${n} add to ${v}.`);
  }),
  g("Counting multiples of 3", 1, (r) => {
    const n = r.int(10, 30);
    const v = range(1, n - 1).filter((x) => x % 3 === 0).length;
    return predict("Counting multiples of 3", `int count = 0;\nfor (int i = 1; i < ${n}; i++) {\n    if (i % 3 == 0) count++;\n}\nSystem.out.println(count);`, v, "Count the i values below the bound that divide by 3.", `3, 6, ... below ${n}: ${v} of them.`);
  }),
  g("Factorial loop", 1, (r) => {
    const n = r.int(3, 7);
    const v = range(1, n).reduce((a, b) => a * b, 1);
    return predict("Factorial loop", `int fact = 1;\nfor (int i = 2; i <= ${n}; i++) {\n    fact *= i;\n}\nSystem.out.println(fact);`, v, "Multiply each i into fact.", `${range(1, n).join(" × ")} = ${v}.`);
  }),
  g("Smallest divisor", 1, (r) => {
    const n = r.pick([15, 21, 25, 35, 49, 77, 91]);
    let d = 2;
    while (n % d !== 0) d++;
    return predict("Smallest divisor", `int n = ${n};\nint d = 2;\nwhile (n % d != 0) {\n    d++;\n}\nSystem.out.println(d);`, d, "Try 2, 3, 4, ... until one divides n.", `The first d that divides ${n} is ${d}.`);
  }),
  g("Integer square root", 1, (r) => {
    const n = r.int(10, 90);
    const v = Math.floor(Math.sqrt(n));
    return predict("Integer square root", `int n = ${n};\nint i = 0;\nwhile ((i + 1) * (i + 1) <= n) {\n    i++;\n}\nSystem.out.println(i);`, v, "Keep going while the next square still fits.", `${v}² = ${v * v} fits in ${n}, but ${v + 1}² = ${(v + 1) * (v + 1)} doesn't.`);
  }),
  g("Pattern from nested loops", 1, (r) => {
    const n = r.int(3, 4);
    const v = range(1, n).map((i) => range(1, i).join("")).join("");
    return predict("Pattern from nested loops", `String s = "";\nfor (int i = 1; i <= ${n}; i++) {\n    for (int j = 1; j <= i; j++) {\n        s += j;\n    }\n}\nSystem.out.println(s);`, v, "For each i, the inner loop counts 1 up to i.", `Row by row: ${range(1, n).map((i) => range(1, i).join("")).join(" | ")}.`);
  }),
  g("Best value in a sequence", 1, (r) => {
    const k = r.int(3, 9), mod = r.int(7, 11);
    const v = Math.max(...range(1, 5).map((i) => (i * k) % mod));
    return predict("Best value in a sequence", `int best = 0;\nfor (int i = 1; i <= 5; i++) {\n    int v = (i * ${k}) % ${mod};\n    if (v > best) best = v;\n}\nSystem.out.println(best);`, v, "Work out each v, keeping the largest so far.", `The values are ${range(1, 5).map((i) => (i * k) % mod).join(", ")}; the largest is ${v}.`);
  }),
  g("Fibonacci loop", 1, (r) => {
    const n = r.int(5, 10);
    let a = 0, b = 1;
    for (let i = 0; i < n; i++) [a, b] = [b, a + b];
    return predict("Fibonacci loop", `int a = 0, b = 1;\nfor (int i = 0; i < ${n}; i++) {\n    int t = a + b;\n    a = b;\n    b = t;\n}\nSystem.out.println(a);`, a, "Each pass shifts the pair forward one step.", `After ${n} steps, a is ${a}.`);
  }),
  g("Filtering inside a loop", 1, (r) => {
    const n = r.int(10, 20);
    const v = range(1, n).filter((i) => i % 2 === 1 && i % 3 !== 0).length;
    return predict("Filtering inside a loop", `int count = 0;\nfor (int i = 1; i <= ${n}; i++) {\n    if (i % 2 == 1 && i % 3 != 0) count++;\n}\nSystem.out.println(count);`, v, "Count odd numbers that aren't multiples of 3.", `They are ${range(1, n).filter((i) => i % 2 === 1 && i % 3 !== 0).join(", ")}.`);
  }),
  m(1, "Power with a loop", "static int power(int base, int exp) {\n    int result = 1;\n    for (int i = 0; i < exp; i++) {\n        result *= base;\n    }\n    return result;\n}", "power(3, 4)", 81, "3 is multiplied in 4 times: 3 × 3 × 3 × 3 = 81."),
  m(1, "Counting divisors", "static int divisors(int n) {\n    int count = 0;\n    for (int d = 1; d <= n; d++) {\n        if (n % d == 0) count++;\n    }\n    return count;\n}", "divisors(12)", 6, "12 is divisible by 1, 2, 3, 4, 6 and 12."),
  f(1, "Starting a product", "Fill in the starting value so the code prints 24 (1 × 2 × 3 × 4).", "int p = ___;\nfor (int i = 1; i <= 4; i++) {\n    p *= i;\n}\nSystem.out.println(p);", ["1"], "24", "A product starts at 1; starting at 0 would keep it 0 forever."),
  c(1, "Counting passes by threes", "How many times does the body of for (int i = 3; i < 10; i += 3) run?", ["2", "3", "4", "10"], 1, "i takes 3, 6 and 9; then 12 fails i < 10.", undefined, { src: "int n = 0; for (int i = 3; i < 10; i += 3) n++; System.out.println(n);", wrap: "main", expect: "3" }),
  c(1, "CSP repeat until a total", "AP CSP pseudocode: what is displayed?", ["4", "5", "10", "15"], 1, "After n = 4 the total is 10, which isn't > 10, so one more pass: n = 5, total = 15.", "n ← 0\ntotal ← 0\nREPEAT UNTIL (total > 10)\n{\n   n ← n + 1\n   total ← total + n\n}\nDISPLAY(n)", { src: "int n = 0, total = 0; while (!(total > 10)) { n++; total += n; } System.out.println(n);", wrap: "main", expect: "5" }),
  g("While with two conditions", 1, (r) => {
    const stop = r.pick([5, 7, 9]);
    let a = 0, b = 20;
    while (a < b && a < stop) { a += 3; b -= 2; }
    return predict("While with two conditions", `int a = 0, b = 20;\nwhile (a < b && a < ${stop}) {\n    a += 3;\n    b -= 2;\n}\nSystem.out.println(a + " " + b);`, `${a} ${b}`, "The loop stops as soon as either condition is false.", `It ends with a = ${a}, b = ${b}.`);
  }),
  g("Growing savings", 1, (r) => {
    const target = r.pick([130, 150, 200]);
    let money = 100, years = 0;
    while (money < target) { money += Math.trunc(money / 10); years++; }
    return predict("Growing savings", `int money = 100;\nint years = 0;\nwhile (money < ${target}) {\n    money += money / 10;\n    years++;\n}\nSystem.out.println(years);`, years, "Each year adds a tenth (int division) of the current money.", `It takes ${years} years to reach at least ${target} (ending at ${money}).`);
  }),
  g("Alternating signs total", 1, (r) => {
    const n = r.int(4, 9);
    const v = range(1, n).reduce((s, i) => (i % 2 === 1 ? s + i : s - i), 0);
    return predict("Alternating signs total", `int total = 0;\nfor (int i = 1; i <= ${n}; i++) {\n    if (i % 2 == 1) total += i;\n    else total -= i;\n}\nSystem.out.println(total);`, v, "Odd i are added, even i are subtracted.", `1 - 2 + 3 - ... ${n % 2 ? "+" : "-"} ${n} = ${v}.`);
  }),
  g("Counting down by a step", 1, (r) => {
    const start = r.int(15, 30), step = r.pick([3, 4, 5]);
    const vals: number[] = [];
    for (let i = start; i > 0; i -= step) vals.push(i);
    return predict("Counting down by a step", `int count = 0;\nfor (int i = ${start}; i > 0; i -= ${step}) {\n    count++;\n}\nSystem.out.println(count);`, vals.length, "List the i values until one is no longer > 0.", `i takes ${vals.join(", ")}: ${vals.length} passes.`);
  }),
  g("Counting digits with while", 1, (r) => {
    const n = r.int(10, 99999);
    return predict("Counting digits with while", `int n = ${n};\nint digits = 0;\nwhile (n > 0) {\n    n /= 10;\n    digits++;\n}\nSystem.out.println(digits);`, String(n).length, "Each pass removes one digit.", `${n} has ${String(n).length} digits.`);
  }),
  g("Running product stop", 1, (r) => {
    const limit = r.pick([50, 100, 500]);
    let p = 1, i = 1;
    while (p * i <= limit) { p *= i; i++; }
    return predict("Running product stop", `int p = 1, i = 1;\nwhile (p * i <= ${limit}) {\n    p *= i;\n    i++;\n}\nSystem.out.println(p);`, p, "Stop before the product would pass the limit.", `p grows 1, 2, 6, 24, ... and stops at ${p}.`);
  }),

  // ---- Harder (10) ----
  g("Collatz steps", 2, (r) => {
    const start = r.pick([3, 6, 7, 9, 12]);
    let n = start, steps = 0;
    while (n !== 1) { n = n % 2 === 0 ? n / 2 : 3 * n + 1; steps++; }
    return predict("Collatz steps", `int n = ${start};\nint steps = 0;\nwhile (n != 1) {\n    if (n % 2 == 0) n = n / 2;\n    else n = 3 * n + 1;\n    steps++;\n}\nSystem.out.println(steps);`, steps, "Even: halve. Odd: 3n + 1. Count until 1.", `${start} reaches 1 after ${steps} steps.`);
  }),
  g("Nested product sum", 2, (r) => {
    const a = r.int(2, 4), b = r.int(2, 4);
    const v = ((a * (a + 1)) / 2) * ((b * (b + 1)) / 2);
    return predict("Nested product sum", `int sum = 0;\nfor (int i = 1; i <= ${a}; i++) {\n    for (int j = 1; j <= ${b}; j++) {\n        sum += i * j;\n    }\n}\nSystem.out.println(sum);`, v, "For each i, add i × (1 + 2 + ... + b).", `(1 + ... + ${a}) × (1 + ... + ${b}) = ${(a * (a + 1)) / 2} × ${(b * (b + 1)) / 2} = ${v}.`);
  }),
  g("Prime check loop", 2, (r) => {
    const n = r.pick([2, 9, 13, 21, 29, 33, 37, 49]);
    let prime = n > 1;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) prime = false;
    return predict("Prime check loop", `int n = ${n};\nboolean prime = n > 1;\nfor (int d = 2; d * d <= n; d++) {\n    if (n % d == 0) prime = false;\n}\nSystem.out.println(prime);`, prime, "Only divisors up to the square root need checking.", prime ? `No d with d² ≤ ${n} divides it, so it's prime.` : `${n} has a divisor, so it isn't prime.`);
  }),
  g("GCD by subtraction", 2, (r) => {
    let [a, b] = r.pick([[12, 18], [20, 8], [21, 14], [9, 24], [35, 15]] as const) as [number, number];
    const [a0, b0] = [a, b];
    while (a !== b) { if (a > b) a -= b; else b -= a; }
    return predict("GCD by subtraction", `int a = ${a0}, b = ${b0};\nwhile (a != b) {\n    if (a > b) a -= b;\n    else b -= a;\n}\nSystem.out.println(a);`, a, "Subtract the smaller from the larger until they match.", `This finds the greatest common divisor of ${a0} and ${b0}: ${a}.`);
  }),
  g("Two variables in one loop", 2, (r) => {
    const n = r.int(3, 5), y0 = r.pick([10, 20]);
    let x = 0, y = y0;
    for (let i = 0; i < n; i++) { x += i; y -= x; }
    return predict("Two variables in one loop", `int x = 0, y = ${y0};\nfor (int i = 0; i < ${n}; i++) {\n    x += i;\n    y -= x;\n}\nSystem.out.println(x + " " + y);`, `${x} ${y}`, "y uses the updated x on every pass.", `After ${n} passes x is ${x} and y is ${y}.`);
  }),
  m(2, "Palindrome number", "static boolean isPal(int n) {\n    int rev = 0, m = n;\n    while (m > 0) {\n        rev = rev * 10 + m % 10;\n        m /= 10;\n    }\n    return rev == n;\n}", "isPal(1221) + \" \" + isPal(1231)", "true false", "Reversing 1221 gives 1221; reversing 1231 gives 1321."),
  c(2, "Fixing an off-by-one sum", "This should add 1 through 10 but prints 45:\nint sum = 0;\nfor (int i = 1; i < 10; i++) sum += i;\nWhich fix is correct?", ["Change i < 10 to i <= 10", "Change i = 1 to i = 0", "Change sum += i to sum += i + 1 and keep i < 10", "Change i++ to i += 2"], 0, "The loop stops at 9. Including 10 gives 55. Starting at 0 still stops at 9.", undefined, { src: "int sum = 0; for (int i = 1; i <= 10; i++) sum += i; System.out.println(sum);", wrap: "main", expect: "55" }),
  g("Products over a threshold", 2, (r) => {
    const k = r.int(6, 14);
    let n = 0;
    for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) if (i * j > k) n++;
    return predict("Products over a threshold", `int count = 0;\nfor (int i = 1; i <= 5; i++) {\n    for (int j = 1; j <= 5; j++) {\n        if (i * j > ${k}) count++;\n    }\n}\nSystem.out.println(count);`, n, "Check every cell of a 5 × 5 times table.", `${n} of the 25 products are greater than ${k}.`);
  }),
  c(2, "CSP repeat until a multiple", "AP CSP pseudocode: what is displayed?", ["4", "7", "10", "21"], 1, "x goes 1, then 4, then 7; 7 MOD 7 is 0, so the loop stops.", "x ← 1\nREPEAT UNTIL (x MOD 7 = 0)\n{\n   x ← x + 3\n}\nDISPLAY(x)", { src: "int x = 1; while (x % 7 != 0) x += 3; System.out.println(x);", wrap: "main", expect: "7" }),
  g("Search with a flag", 2, (r) => {
    const digit = r.pick([1, 4, 9, 6, 5]);
    let i = 0, found = false;
    while (!found && i < 10) { i++; if ((i * i) % 10 === digit) found = true; }
    return predict("Search with a flag", `boolean found = false;\nint i = 0;\nwhile (!found && i < 10) {\n    i++;\n    if (i * i % 10 == ${digit}) found = true;\n}\nSystem.out.println(i);`, i, "Stop at the first i whose square ends in that digit.", `${i}² = ${i * i}, which ends in ${digit}.`);
  }),
];
