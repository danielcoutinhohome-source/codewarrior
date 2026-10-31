// World 1 (Syntax Shore) expansion: 40 more templates, weighted toward gentle first steps.
// Every Java question is compiled and run by scripts/verify-questions.ts.
import { blank as f, mc as c, method as m, trace as p } from "./ap-builders";
import { choice, predict, type Gen } from "./core";

const g = (skill: string, tier: 0 | 1 | 2, make: Gen["make"]): Gen => ({ skill, tier, make });
const WORDS = [["Code", "Warrior"], ["Byte", "Knight"], ["Loop", "Hero"], ["Array", "Ace"], ["Java", "Bean"]] as const;

export const W0_MORE: Gen[] = [
  // ---- Novice (10): reading code one line at a time ----
  g("Printing a variable", 0, (r) => {
    const a = r.int(7, 40);
    return predict("Printing a variable", `int lives = ${a};\nSystem.out.println(lives);`, a, "println shows the value stored in the variable.", `lives holds ${a}, so ${a} is printed.`);
  }),
  g("Text versus a variable", 0, (r) => {
    const name = r.pick(["Kai", "Ana", "Leo", "Mia"]);
    return predict("Text versus a variable", `String name = "${name}";\nSystem.out.println("name");`, "name", "Quotes mean literal text, not a variable.", `"name" in quotes is just the word name; the variable (holding ${name}) isn't used.`);
  }),
  g("Adding three values", 0, (r) => {
    const a = r.int(1, 9), b = r.int(1, 9), d = r.int(1, 9);
    return predict("Adding three values", `int a = ${a};\nint b = ${b};\nint c = ${d};\nSystem.out.println(a + b + c);`, a + b + d, "Replace each name with its value and add.", `${a} + ${b} + ${d} = ${a + b + d}.`);
  }),
  g("Increment operator", 0, (r) => {
    const a = r.int(1, 20);
    return predict("Increment operator", `int steps = ${a};\nsteps++;\nsteps++;\nSystem.out.println(steps);`, a + 2, "++ adds 1 each time it runs.", `${a} goes up by 1 twice, ending at ${a + 2}.`);
  }),
  g("Doubling a decimal", 0, (r) => {
    const a = r.int(1, 9);
    return predict("Doubling a decimal", `double price = ${a}.5;\nprice = price * 2;\nSystem.out.println(price);`, `${2 * a + 1}.0`, "A double keeps its decimal point when printed.", `${a}.5 × 2 = ${2 * a + 1}, printed as a double: ${2 * a + 1}.0.`);
  }),
  g("Comparing numbers", 0, (r) => {
    const a = r.int(1, 20), b = r.int(1, 20), op = r.pick([">", "<", ">="] as const);
    const v = op === ">" ? a > b : op === "<" ? a < b : a >= b;
    return predict("Comparing numbers", `int a = ${a};\nint b = ${b};\nSystem.out.println(a ${op} b);`, v, "A comparison prints true or false.", `${a} ${op} ${b} is ${v}.`);
  }),
  g("Joining words", 0, (r) => {
    const [x, y] = r.pick(WORDS);
    return predict("Joining words", `String first = "${x}";\nString second = "${y}";\nSystem.out.println(first + second);`, x + y, "+ between Strings glues them together with no space.", `"${x}" + "${y}" is "${x + y}".`);
  }),
  g("Subtracting with -=", 0, (r) => {
    const a = r.int(20, 50), b = r.int(3, 15);
    return predict("Subtracting with -=", `int hp = ${a};\nhp -= ${b};\nSystem.out.println(hp);`, a - b, "x -= n means x = x - n.", `${a} - ${b} = ${a - b}.`);
  }),
  g("Multiplying before adding", 0, (r) => {
    const a = r.int(1, 9), b = r.int(2, 6), d = r.int(2, 6);
    return predict("Multiplying before adding", `System.out.println(${a} + ${b} * ${d});`, a + b * d, "Multiplication happens before addition.", `${b} × ${d} = ${b * d} first, then + ${a} = ${a + b * d}.`);
  }),
  c(0, "Naming style", "Which variable name follows Java's usual style for a player's score?", ["playerScore", "PlayerScore", "player-score", "PLAYERSCORE"], 0, "Java variables use camelCase: start lowercase, capitalize each new word. A hyphen isn't allowed at all."),

  // ---- Intermediate (20): integer math, Strings, Math, methods, CSP basics ----
  g("Halving an odd number", 1, (r) => {
    const n = 2 * r.int(3, 20) + 1;
    return predict("Halving an odd number", `int coins = ${n};\nSystem.out.println(coins / 2);`, (n - 1) / 2, "int / int drops the decimal part.", `${n} / 2 is ${n / 2}, and integer division keeps only ${(n - 1) / 2}.`);
  }),
  g("Even or odd remainder", 1, (r) => {
    const n = r.int(10, 99);
    return predict("Even or odd remainder", `int n = ${n};\nSystem.out.println(n % 2);`, n % 2, "% 2 is 0 for even numbers and 1 for odd ones.", `${n} is ${n % 2 ? "odd" : "even"}, so n % 2 is ${n % 2}.`);
  }),
  g("Dividing by a double", 1, (r) => {
    const n = r.int(3, 21);
    const v = n % 2 ? `${(n - 1) / 2}.5` : `${n / 2}.0`;
    return predict("Dividing by a double", `int n = ${n};\nSystem.out.println(n / 2.0);`, v, "If either side is a double, the decimal part is kept.", `${n} / 2.0 = ${v}.`);
  }),
  g("Multiply then add", 1, (r) => {
    const a = r.int(2, 9);
    return predict("Multiply then add", `int x = ${a};\nx *= 3;\nx += 1;\nSystem.out.println(x);`, a * 3 + 1, "Run the lines in order, using the newest value of x.", `${a} × 3 = ${a * 3}, then + 1 = ${a * 3 + 1}.`);
  }),
  g("Last digit", 1, (r) => {
    const n = r.int(100, 999);
    return predict("Last digit", `int n = ${n};\nSystem.out.println(n % 10);`, n % 10, "% 10 keeps only the ones digit.", `The remainder of ${n} ÷ 10 is ${n % 10}.`);
  }),
  g("Dropping the last digit", 1, (r) => {
    const n = r.int(100, 999);
    return predict("Dropping the last digit", `int n = ${n};\nSystem.out.println(n / 10);`, Math.trunc(n / 10), "/ 10 with ints removes the ones digit.", `${n} / 10 is ${Math.trunc(n / 10)} in integer division.`);
  }),
  g("Text plus a number", 1, (r) => {
    const n = r.int(2, 30);
    return predict("Text plus a number", `int level = ${n};\nSystem.out.println("Level " + level);`, `Level ${n}`, "A String + a number turns the number into text.", `"Level " + ${n} is "Level ${n}".`);
  }),
  g("Math.max and Math.min", 1, (r) => {
    const a = r.int(1, 20), b = r.int(1, 20), d = r.int(1, 20);
    const v = Math.max(a, Math.min(b, d));
    return predict("Math.max and Math.min", `System.out.println(Math.max(${a}, Math.min(${b}, ${d})));`, v, "Work from the inside out.", `Math.min(${b}, ${d}) is ${Math.min(b, d)}; the larger of ${a} and that is ${v}.`);
  }),
  g("Rounding a decimal", 1, (r) => {
    const a = r.int(1, 20), d = r.pick([2, 5, 7]);
    const v = Math.round(a + d / 10);
    return predict("Rounding a decimal", `System.out.println(Math.round(${a}.${d}));`, v, "Math.round goes to the nearest whole number; .5 rounds up.", `${a}.${d} rounds to ${v}.`);
  }),
  g("Casting cuts the decimal", 1, (r) => {
    const a = r.int(1, 30), d = r.int(1, 9);
    return predict("Casting cuts the decimal", `double speed = ${a}.${d};\nint whole = (int) speed;\nSystem.out.println(whole);`, a, "(int) chops off the decimal part; it doesn't round.", `(int) ${a}.${d} keeps only ${a}.`);
  }),
  m(1, "Using a return value", "static int square(int x) { return x * x; }", "square(3) + 1", 10, "square(3) returns 9, then 1 is added in main."),
  m(1, "Two calls in one expression", "static int area(int w, int h) { return w * h; }", "area(3, 4) + area(1, 2)", 14, "The calls return 12 and 2, which add to 14."),
  f(1, "Declaring a decimal", "Fill in the type so price can hold 4.5.", "___ price = 4.5;\nSystem.out.println(price);", ["double"], "4.5", "A number with a decimal point needs a double."),
  f(1, "Adding to a total", "Fill in the operator that adds 5 to total.", "int total = 10;\ntotal ___ 5;\nSystem.out.println(total);", ["+="], "15", "total += 5 means total = total + 5."),
  f(1, "Testing for even", "Fill in the operator that shows whether 8 divides evenly by 2.", "System.out.println(8 ___ 2);", ["%"], "0", "The remainder 8 % 2 is 0, which means 8 is even."),
  c(1, "Getting a decimal answer", "Which expression evaluates to 2.5?", ["5 / 2", "5 / 2.0", "(int) 5.0 / 2", "5 % 2"], 1, "Only 5 / 2.0 has a double in it, so only it keeps the .5. The others give 2, 2 and 1.", undefined, { src: "System.out.println(5 / 2.0);", wrap: "main", expect: "2.5" }),
  c(1, "Text that looks like a number", 'What does System.out.println("1" + 2); print?', ["3", "12", "1 2", "An error"], 1, '"1" is text, so + joins: "1" followed by 2 gives 12.', undefined, { src: 'System.out.println("1" + 2);', wrap: "main", expect: "12" }),
  p(1, "Copies don't link variables", "int x = 3;\nint y = x;\ny = y + 4;\nSystem.out.println(x + \" \" + y);", "3 7", "y got a copy of 3; changing y doesn't touch x."),
  c(1, "CSP chained assignment", "AP CSP pseudocode: what is displayed?", ["7", "10", "14", "12"], 2, "b gets 5 + 2 = 7, then a gets 7 × 2 = 14.", "a ← 5\nb ← a + 2\na ← b * 2\nDISPLAY(a)", { src: "int a = 5; int b = a + 2; a = b * 2; System.out.println(a);", wrap: "main", expect: "14" }),
  g("Reading 4-bit binary", 1, (r) => {
    const v = r.int(5, 14);
    const bin = v.toString(2).padStart(4, "0");
    const opts = [v, v + 1, v - 1, v + 2].map(String);
    const order = r.shuffle([0, 1, 2, 3]);
    return choice("Reading 4-bit binary", `What decimal number is the binary value ${bin}?`, order.map((i) => opts[i]), order.indexOf(0), "The places are worth 8, 4, 2 and 1.", `${bin} = ${[8, 4, 2, 1].filter((_, i) => bin[i] === "1").join(" + ")} = ${v}.`);
  }),

  // ---- Harder (10): still World 1 ideas, with one twist each ----
  g("Average of three ints", 2, (r) => {
    let a = 0, b = 0, d = 0;
    do { a = r.int(60, 100); b = r.int(60, 100); d = r.int(60, 100); } while ((a + b + d) % 3 === 0);
    return predict("Average of three ints", `int a = ${a}, b = ${b}, c = ${d};\nSystem.out.println((a + b + c) / 3);`, Math.trunc((a + b + d) / 3), "All ints: the average loses its decimal.", `${a + b + d} / 3 is ${((a + b + d) / 3).toFixed(2)}, truncated to ${Math.trunc((a + b + d) / 3)}.`);
  }),
  g("Temperature with int math", 2, (r) => {
    const cdeg = r.pick([21, 23, 26, 28, 31, 33]);
    const v = Math.trunc((cdeg * 9) / 5) + 32;
    return predict("Temperature with int math", `int c = ${cdeg};\ndouble f = c * 9 / 5 + 32;\nSystem.out.println(f);`, `${v}.0`, "Everything on the right is int math; the double only stores the result.", `${cdeg} * 9 = ${cdeg * 9}, / 5 = ${Math.trunc((cdeg * 9) / 5)} (decimal dropped), + 32 = ${v}, stored as ${v}.0.`);
  }),
  g("Swapping with arithmetic", 2, (r) => {
    const a = r.int(2, 20), b = r.int(2, 20);
    return predict("Swapping with arithmetic", `int a = ${a}, b = ${b};\na = a + b;\nb = a - b;\na = a - b;\nSystem.out.println(a + " " + b);`, `${b} ${a}`, "Track a and b after every line.", `a becomes ${a + b}, b becomes ${a}, then a becomes ${b}: the values swap.`);
  }),
  g("Joining before adding", 2, (r) => {
    const a = r.int(1, 9), b = r.int(1, 9);
    return predict("Joining before adding", `int a = ${a}, b = ${b};\nSystem.out.println("Sum: " + a + b);`, `Sum: ${a}${b}`, "Java works left to right; once there's text, + joins.", `"Sum: " + ${a} is text, then + ${b} joins too: "Sum: ${a}${b}". Use (a + b) to add first.`);
  }),
  g("Adding two digits", 2, (r) => {
    const n = r.int(10, 99);
    return predict("Adding two digits", `int n = ${n};\nSystem.out.println(n / 10 + n % 10);`, Math.trunc(n / 10) + (n % 10), "/ 10 gives the tens digit, % 10 the ones digit.", `${Math.trunc(n / 10)} + ${n % 10} = ${Math.trunc(n / 10) + (n % 10)}.`);
  }),
  g("Seconds to hours and minutes", 2, (r) => {
    const s = r.int(1, 3) * 3600 + r.int(1, 59) * 60 + r.int(0, 59);
    return predict("Seconds to hours and minutes", `int total = ${s};\nSystem.out.println(total / 3600 + ":" + total % 3600 / 60);`, `${Math.trunc(s / 3600)}:${Math.trunc((s % 3600) / 60)}`, "/ 3600 counts whole hours; % 3600 is what's left.", `${s} seconds is ${Math.trunc(s / 3600)} hours with ${s % 3600} seconds left, which is ${Math.trunc((s % 3600) / 60)} whole minutes.`);
  }),
  m(2, "A method that calls a method", "static int dbl(int x) { return 2 * x; }\nstatic int quad(int x) { return dbl(dbl(x)); }", "quad(3)", 12, "dbl(3) is 6, and dbl(6) is 12."),
  c(2, "Fixing a lost decimal", "int a = 7; should print 3.5. Which statement does that?", ["System.out.println(a / 2);", "System.out.println(a / 2.0);", "System.out.println((double) (a / 2));", "System.out.println(a % 2);"], 1, "Dividing by 2.0 keeps the .5. Casting after an int division is too late (3.0).", undefined, { src: "int a = 7;\nSystem.out.println(a / 2.0);", wrap: "main", expect: "3.5" }),
  c(2, "CSP MOD then subtract", "AP CSP pseudocode: what is displayed?", ["2 3", "3 2", "2 5", "17 5"], 0, "17 MOD 5 is 2, so x becomes 2; then y becomes 5 - 2 = 3.", "x ← 17\ny ← 5\nx ← x MOD y\ny ← y - x\nDISPLAY(x)\nDISPLAY(y)", { src: "int x = 17; int y = 5; x = x % y; y = y - x; System.out.println(x + \" \" + y);", wrap: "main", expect: "2 3" }),
  g("Chained compound updates", 2, (r) => {
    const a = r.int(2, 12);
    return predict("Chained compound updates", `int x = ${a};\nx += x;\nx *= 2;\nx -= ${a};\nSystem.out.println(x);`, 3 * a, "Each line uses the value from the line before.", `${a} → ${2 * a} → ${4 * a} → ${3 * a}.`);
  }),
];
