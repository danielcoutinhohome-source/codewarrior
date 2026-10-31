// World 2 (Branch Woods) expansion: 40 more templates on if / else and boolean logic.
// Every Java question is compiled and run by scripts/verify-questions.ts.
import { blank as f, mc as c, method as m } from "./ap-builders";
import { predict, type Gen } from "./core";

const g = (skill: string, tier: 0 | 1 | 2, make: Gen["make"]): Gen => ({ skill, tier, make });
const say = (b: boolean, yes: string, no: string) => (b ? yes : no);

export const W1_MORE: Gen[] = [
  // ---- Novice (10) ----
  g("Hot or cold", 0, (r) => {
    const t = r.int(30, 80);
    return predict("Hot or cold", `int temp = ${t};\nif (temp > 50) {\n    System.out.println("hot");\n} else {\n    System.out.println("cold");\n}`, say(t > 50, "hot", "cold"), "Is the condition true or false for this value?", `${t} > 50 is ${t > 50}, so it prints ${say(t > 50, "hot", "cold")}.`);
  }),
  g("If with no else", 0, (r) => {
    const x = r.int(3, 16);
    return predict("If with no else", `int x = ${x};\nif (x < 10) {\n    x = x + 5;\n}\nSystem.out.println(x);`, x < 10 ? x + 5 : x, "When the condition is false, the block is skipped.", x < 10 ? `${x} < 10, so x becomes ${x + 5}.` : `${x} < 10 is false, so x stays ${x}.`);
  }),
  g("Checking equality", 0, (r) => {
    const a = r.int(1, 6), b = r.pick([a, r.int(1, 6)]);
    return predict("Checking equality", `int a = ${a};\nint b = ${b};\nSystem.out.println(a == b);`, a === b, "== compares; it prints true or false.", `${a} == ${b} is ${a === b}.`);
  }),
  g("Not-equal operator", 0, (r) => {
    const a = r.int(1, 6), b = r.pick([a, r.int(1, 6)]);
    return predict("Not-equal operator", `int a = ${a};\nint b = ${b};\nSystem.out.println(a != b);`, a !== b, "!= is true when the values differ.", `${a} != ${b} is ${a !== b}.`);
  }),
  g("Boolean variable as a condition", 0, (r) => {
    const rain = r.pick([true, false]);
    return predict("Boolean variable as a condition", `boolean raining = ${rain};\nif (raining) {\n    System.out.println("umbrella");\n} else {\n    System.out.println("sunglasses");\n}`, say(rain, "umbrella", "sunglasses"), "A boolean can be the whole condition.", `raining is ${rain}, so it prints ${say(rain, "umbrella", "sunglasses")}.`);
  }),
  g("Pass mark boundary", 0, (r) => {
    const s = r.pick([69, 70, 71]);
    return predict("Pass mark boundary", `int score = ${s};\nif (score >= 70) {\n    System.out.println("pass");\n} else {\n    System.out.println("retry");\n}`, say(s >= 70, "pass", "retry"), ">= includes the number itself.", `${s} >= 70 is ${s >= 70}.`);
  }),
  g("Counting with two ifs", 0, (r) => {
    const n = r.int(-3, 9);
    const v = (n > 0 ? 1 : 0) + (n > 5 ? 1 : 0);
    return predict("Counting with two ifs", `int n = ${n};\nint count = 0;\nif (n > 0) {\n    count++;\n}\nif (n > 5) {\n    count++;\n}\nSystem.out.println(count);`, v, "Both ifs are checked; each one can add 1.", `n > 0 is ${n > 0}, n > 5 is ${n > 5}, so count is ${v}.`);
  }),
  c(0, "At least 13", "Which condition is true when age is 13 or older?", ["age >= 13", "age > 13", "age => 13", "age = 13"], 0, "\"At least 13\" includes 13, so it's >=. => isn't a Java operator and = assigns."),
  g("Storing a comparison", 0, (r) => {
    const n = r.int(50, 150);
    return predict("Storing a comparison", `int n = ${n};\nboolean big = n > 100;\nSystem.out.println(big);`, n > 100, "The comparison's result (true or false) is stored in big.", `${n} > 100 is ${n > 100}.`);
  }),
  g("Else runs when false", 0, (r) => {
    const lives = r.int(0, 2);
    return predict("Else runs when false", `int lives = ${lives};\nif (lives > 0) {\n    System.out.println("play");\n} else {\n    System.out.println("game over");\n}`, say(lives > 0, "play", "game over"), "The else block runs only when the condition is false.", `lives > 0 is ${lives > 0}.`);
  }),

  // ---- Intermediate (20) ----
  g("Letter grade chain", 1, (r) => {
    const s = r.pick([95, 90, 85, 79, 72, 64]);
    const v = s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : "F";
    return predict("Letter grade chain", `int score = ${s};\nif (score >= 90) {\n    System.out.println("A");\n} else if (score >= 80) {\n    System.out.println("B");\n} else if (score >= 70) {\n    System.out.println("C");\n} else {\n    System.out.println("F");\n}`, v, "The first true condition wins; the rest are skipped.", `${s} first passes the ${v === "F" ? "else" : `>= ${v === "A" ? 90 : v === "B" ? 80 : 70}`} check, so ${v}.`);
  }),
  g("Both must be true", 1, (r) => {
    const x = r.int(-3, 13);
    return predict("Both must be true", `int x = ${x};\nSystem.out.println(x > 0 && x < 10);`, x > 0 && x < 10, "&& is true only when both sides are true.", `x > 0 is ${x > 0} and x < 10 is ${x < 10}.`);
  }),
  g("Either can be true", 1, (r) => {
    const x = r.pick([-5, 0, 50, 100, 101, 140]);
    return predict("Either can be true", `int x = ${x};\nSystem.out.println(x < 0 || x > 100);`, x < 0 || x > 100, "|| is true when at least one side is true.", `x < 0 is ${x < 0} and x > 100 is ${x > 100}.`);
  }),
  g("Not with and", 1, (r) => {
    const done = r.pick([true, false]), n = r.int(1, 6);
    return predict("Not with and", `boolean done = ${done};\nint n = ${n};\nSystem.out.println(!done && n > 3);`, !done && n > 3, "! flips just the value next to it.", `!done is ${!done} and n > 3 is ${n > 3}.`);
  }),
  g("Nested decisions", 1, (r) => {
    const a = r.int(-2, 4), b = r.int(-2, 4);
    const v = a > 0 ? (b > 0 ? "both" : "only a") : "a is not positive";
    return predict("Nested decisions", `int a = ${a}, b = ${b};\nif (a > 0) {\n    if (b > 0) {\n        System.out.println("both");\n    } else {\n        System.out.println("only a");\n    }\n} else {\n    System.out.println("a is not positive");\n}`, v, "Check the outer if first; the inner one only runs inside it.", `a > 0 is ${a > 0}${a > 0 ? ` and b > 0 is ${b > 0}` : ""}.`);
  }),
  m(1, "Largest of three", "static int max3(int a, int b, int c) {\n    int best = a;\n    if (b > best) best = b;\n    if (c > best) best = c;\n    return best;\n}", "max3(4, 9, 2)", 9, "best starts at 4, becomes 9, and 2 doesn't beat 9."),
  m(1, "Sign of a number", 'static String sign(int n) {\n    if (n > 0) return "positive";\n    if (n < 0) return "negative";\n    return "zero";\n}', "sign(-3)", "negative", "-3 > 0 is false, -3 < 0 is true, so it returns there."),
  f(1, "Even test operator", "Fill in the operator so the code prints even for even numbers.", 'int n = 8;\nif (n ___ 2 == 0) {\n    System.out.println("even");\n} else {\n    System.out.println("odd");\n}', ["%"], "even", "n % 2 == 0 means 2 divides n evenly."),
  f(1, "Teen check", "Fill in the operator: both conditions must be true.", 'int age = 15;\nif (age >= 13 ___ age <= 19) {\n    System.out.println("teen");\n}', ["&&"], "teen", "&& requires both conditions. || would let every age through."),
  c(1, "Between 1 and 5", "Which condition is true exactly when x is 1, 2, 3, 4 or 5?", ["x >= 1 && x <= 5", "x > 1 && x < 5", "x >= 1 || x <= 5", "1 <= x <= 5"], 0, "Both ends are included, and both must hold. Java can't chain 1 <= x <= 5."),
  g("Unlocking a bonus", 1, (r) => {
    const streak = r.int(1, 6), score = r.int(10, 40);
    return predict("Unlocking a bonus", `int score = ${score};\nint streak = ${streak};\nint bonus = 0;\nif (streak >= 3) {\n    bonus = 10;\n}\nSystem.out.println(score + bonus);`, score + (streak >= 3 ? 10 : 0), "bonus only changes when the condition is true.", `streak >= 3 is ${streak >= 3}, so bonus is ${streak >= 3 ? 10 : 0}.`);
  }),
  g("Temperature labels", 1, (r) => {
    const t = r.pick([-5, 0, 12, 25, 30, 38]);
    const v = t >= 30 ? "hot" : t >= 15 ? "warm" : t > 0 ? "cool" : "freezing";
    return predict("Temperature labels", `int t = ${t};\nif (t >= 30) System.out.println("hot");\nelse if (t >= 15) System.out.println("warm");\nelse if (t > 0) System.out.println("cool");\nelse System.out.println("freezing");`, v, "Check each condition top to bottom; stop at the first true one.", `${t} lands on ${v}.`);
  }),
  g("Discount over a limit", 1, (r) => {
    const total = r.pick([80, 99, 100, 120, 150]);
    return predict("Discount over a limit", `int total = ${total};\nif (total >= 100) {\n    total -= 20;\n}\nSystem.out.println(total);`, total >= 100 ? total - 20 : total, "The discount applies only at 100 or more.", `${total} >= 100 is ${total >= 100}.`);
  }),
  c(1, "CSP odd or even", "AP CSP pseudocode: what is displayed?", ["even", "odd", "7", "Nothing"], 1, "7 MOD 2 is 1, which isn't 0, so the ELSE branch runs.", 'x ← 7\nIF (x MOD 2 = 0)\n{\n   DISPLAY("even")\n}\nELSE\n{\n   DISPLAY("odd")\n}', { src: 'int x = 7; if (x % 2 == 0) System.out.println("even"); else System.out.println("odd");', wrap: "main", expect: "odd" }),
  c(1, "CSP AND condition", "AP CSP pseudocode: what is displayed?", ["yes", "no", "yes no", "Nothing"], 1, "a > 3 is true but b < 5 is false, and AND needs both.", 'a ← 4\nb ← 9\nIF (a > 3 AND b < 5)\n{\n   DISPLAY("yes")\n}\nELSE\n{\n   DISPLAY("no")\n}', { src: 'int a = 4; int b = 9; if (a > 3 && b < 5) System.out.println("yes"); else System.out.println("no");', wrap: "main", expect: "no" }),
  g("FizzBuzz check", 1, (r) => {
    const n = r.pick([9, 10, 15, 30, 7, 12, 25, 11]);
    const v = n % 15 === 0 ? "FizzBuzz" : n % 3 === 0 ? "Fizz" : n % 5 === 0 ? "Buzz" : String(n);
    return predict("FizzBuzz check", `int n = ${n};\nif (n % 15 == 0) System.out.println("FizzBuzz");\nelse if (n % 3 == 0) System.out.println("Fizz");\nelse if (n % 5 == 0) System.out.println("Buzz");\nelse System.out.println(n);`, v, "Check divisibility in order; the first match wins.", `${n} → ${v}.`);
  }),
  g("Flag set inside a branch", 1, (r) => {
    const k = r.int(0, 3);
    return predict("Flag set inside a branch", `int keys = ${k};\nboolean open = false;\nif (keys >= 2) {\n    open = true;\n}\nSystem.out.println(open);`, k >= 2, "open only changes when the condition is true.", `keys >= 2 is ${k >= 2}.`);
  }),
  g("Ticket price rules", 1, (r) => {
    const age = r.pick([3, 8, 12, 13, 40, 65, 70]);
    const v = age < 5 ? 0 : age < 13 ? 5 : age >= 65 ? 6 : 10;
    return predict("Ticket price rules", `int age = ${age};\nint price;\nif (age < 5) price = 0;\nelse if (age < 13) price = 5;\nelse if (age >= 65) price = 6;\nelse price = 10;\nSystem.out.println(price);`, v, "Walk the chain top to bottom.", `age ${age} → ${v}.`);
  }),
  g("Password length check", 1, (r) => {
    const len = r.pick([5, 8, 12, 20, 21]);
    const v = len >= 8 && len <= 20 ? "ok" : "invalid";
    return predict("Password length check", `int len = ${len};
if (len >= 8 && len <= 20) {
    System.out.println("ok");
} else {
    System.out.println("invalid");
}`, v, "Both ends of the range are included.", `${len} is ${v === "ok" ? "" : "not "}between 8 and 20.`);
  }),
  c(1, "Simplifying == true", "Which condition means the same as if (done == true)?", ["if (done)", "if (!done)", "if (done = true)", "if (true)"], 0, "done is already a boolean, so if (done) is the same and simpler. done = true would assign."),

  // ---- Harder (10) ----
  g("Mixing && and ||", 2, (r) => {
    const a = r.int(1, 9), b = r.int(1, 9);
    const v = a > 5 || (b > 5 && a > b);
    return predict("Mixing && and ||", `int a = ${a}, b = ${b};\nSystem.out.println(a > 5 || b > 5 && a > b);`, v, "&& is grouped before ||.", `It's a > 5 || (b > 5 && a > b): ${a > 5} || (${b > 5} && ${a > b}) = ${v}.`);
  }),
  g("Branch order trap", 2, (r) => {
    const n = r.pick([60, 70, 80, 120]);
    return predict("Branch order trap", `int n = ${n};\nif (n > 10) {\n    System.out.println("big");\n} else if (n > 50) {\n    System.out.println("huge");\n} else {\n    System.out.println("small");\n}`, "big", "The first true branch wins, even if a later one fits better.", `${n} > 10 is already true, so "huge" can never print for it.`);
  }),
  g("Not applied to a group", 2, (r) => {
    const x = r.int(1, 6), y = r.int(1, 3);
    const v = !(x > 3) || y === 2;
    return predict("Not applied to a group", `int x = ${x}, y = ${y};\nSystem.out.println(!(x > 3) || y == 2);`, v, "! applies to the whole parenthesized comparison.", `!(x > 3) is ${!(x > 3)} and y == 2 is ${y === 2}.`);
  }),
  m(2, "Range method edges", "static boolean inRange(int n, int lo, int hi) {\n    return n >= lo && n <= hi;\n}", "inRange(10, 1, 10) + \" \" + inRange(0, 1, 10)", "true false", "10 equals hi, which is allowed; 0 is below lo."),
  c(2, "Finding the boundary bug", "A program should print \"adult\" for ages 18 and up, but it uses if (age > 18). Which test reveals the bug?", ["age = 17", "age = 18", "age = 30", "age = 0"], 1, "Only at exactly 18 do > and >= disagree; 18 wrongly isn't an adult."),
  g("Triangle by sides", 2, (r) => {
    const [a, b, d] = r.pick([[5, 5, 5], [5, 5, 8], [3, 4, 5], [7, 4, 7], [2, 9, 9]] as const);
    const v = a === b && b === d ? "equilateral" : a === b || b === d || a === d ? "isosceles" : "scalene";
    return predict("Triangle by sides", `int a = ${a}, b = ${b}, c = ${d};\nif (a == b && b == c) System.out.println("equilateral");\nelse if (a == b || b == c || a == c) System.out.println("isosceles");\nelse System.out.println("scalene");`, v, "Check the all-equal case first, then any equal pair.", `Sides ${a}, ${b}, ${d} → ${v}.`);
  }),
  c(2, "CSP NOT with OR", "AP CSP pseudocode: what is displayed?", ["A", "B", "A B", "Nothing"], 1, "NOT p is false and q is false, so the OR is false and the ELSE runs.", 'p ← true\nq ← false\nIF (NOT p OR q)\n{\n   DISPLAY("A")\n}\nELSE\n{\n   DISPLAY("B")\n}', { src: 'boolean p = true; boolean q = false; if (!p || q) System.out.println("A"); else System.out.println("B");', wrap: "main", expect: "B" }),
  g("At least two true", 2, (r) => {
    const [a, b, d] = [r.pick([true, false]), r.pick([true, false]), r.pick([true, false])];
    const n = [a, b, d].filter(Boolean).length;
    return predict("At least two true", `boolean a = ${a}, b = ${b}, c = ${d};\nint n = 0;\nif (a) n++;\nif (b) n++;\nif (c) n++;\nSystem.out.println(n >= 2);`, n >= 2, "Count the true values, then compare.", `${n} of them are true, so n >= 2 is ${n >= 2}.`);
  }),
  g("Equal values skip both", 2, (r) => {
    const a = r.int(3, 9);
    return predict("Equal values skip both", `int a = ${a}, b = ${a};\nString result = "tie";\nif (a > b) result = "a";\nif (b > a) result = "b";\nSystem.out.println(result);`, "tie", "When neither condition is true, nothing changes.", `a and b are both ${a}, so neither > holds and result stays "tie".`);
  }),
  g("Guarding a division", 2, (r) => {
    const d = r.pick([0, 2, 4, 5]);
    const total = 20;
    const v = d !== 0 && total / d > 4 ? "high" : "low or none";
    return predict("Guarding a division", `int total = ${total}, count = ${d};\nif (count != 0 && total / count > 4) {\n    System.out.println("high");\n} else {\n    System.out.println("low or none");\n}`, v, "&& stops early when the left side is false, so no division by zero.", d === 0 ? "count != 0 is false, so the division never runs." : `20 / ${d} = ${Math.trunc(20 / d)}, and > 4 is ${Math.trunc(20 / d) > 4}.`);
  }),
];
