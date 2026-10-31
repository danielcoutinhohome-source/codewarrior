import { choice, fill, fixed, jdiv, order, predict, predictWith, type Gen } from "./core";

// ===================== World 1: Syntax Shore (variables, math, return) =====================
export const W0: Gen[] = [
  {
    skill: "Integer math",
    tier: 0,
    make: (r) => {
      const a = r.int(3, 20), b = r.int(2, 12), op = r.pick(["+", "-", "*"] as const);
      const v = op === "+" ? a + b : op === "-" ? a - b : a * b;
      return predict("Integer math", `int a = ${a};\nint b = ${b};\nSystem.out.println(a ${op} b);`, v, "Swap the names for their values, then do the math.", `a ${op} b is ${a} ${op} ${b}, which is ${v}.`);
    },
  },
  {
    skill: "Updating variables",
    tier: 0,
    make: (r) => {
      const a = r.int(2, 15), b = r.int(2, 9);
      return predict("Updating variables", `int x = ${a};\nx = x + ${b};\nSystem.out.println(x);`, a + b, "The right side is worked out first, using the old x.", `x starts at ${a}, then becomes ${a} + ${b} = ${a + b}.`);
    },
  },
  {
    skill: "Choosing a type",
    tier: 0,
    make: (r) => {
      const opts = [
        ["3.14", 1],
        ["true", 2],
        ['"hello"', 3],
        ["42", 0],
      ] as const;
      const [v, c] = r.pick(opts);
      return choice("Choosing a type", `Which type should store ${v}?`, ["int", "double", "boolean", "String"], c, "Is it a whole number, a decimal, true/false, or text?", `${v} is ${["a whole number", "a decimal", "true or false", "text in quotes"][c]}, so it goes in ${["int", "double", "boolean", "String"][c]}.`);
    },
  },
  fixed("Declaring variables", 0, () =>
    choice("Declaring variables", "Which line stores 10 in a variable called score?", ["int score = 10;", "score = int 10;", "int 10 = score;", "String score = 10;"], 0, "Type, then name, then = value.", "Java reads it as: type (int), name (score), = value (10), then a semicolon."),
  ),
  {
    skill: "Return values",
    tier: 0,
    make: (r) => {
      const [op, word, f] = r.pick([["+", "sum", (a: number, b: number) => a + b], ["*", "product", (a: number, b: number) => a * b], ["-", "difference", (a: number, b: number) => a - b]] as const);
      const x = r.int(4, 9), y = r.int(2, 3);
      return fill(
        "Return values",
        `Make combine return the ${word} of a and b.`,
        `public int combine(int a, int b) {\n    return a ___ b;\n}`,
        [op],
        "It's a single math symbol.",
        `The ${word} uses ${op}.`,
        { src: `static int combine(int a, int b) {\n    return a ___ b;\n}\npublic static void main(String[] args) { System.out.println(combine(${x}, ${y})); }`, wrap: "class", expect: String(f(x, y)) },
      );
    },
  },
  {
    skill: "Integer division",
    tier: 1,
    make: (r) => {
      const d = r.pick([2, 3, 4, 5, 60]);
      const m = d === 60 ? r.int(61, 250) : r.int(7, 40);
      return predict("Integer division", `int total = ${m};\nSystem.out.println(total / ${d});`, jdiv(m, d), "Dividing two ints throws away the remainder.", `${m} / ${d} is ${(m / d).toFixed(2)}, and int division drops the decimals: ${jdiv(m, d)}.`);
    },
  },
  {
    skill: "Remainder (%)",
    tier: 1,
    make: (r) => {
      const m = r.int(7, 50), d = r.pick([2, 3, 4, 5, 7]);
      return predict("Remainder (%)", `System.out.println(${m} % ${d});`, m % d, "% gives what's left over after dividing.", `${m} divided by ${d} is ${jdiv(m, d)} with ${m % d} left over.`);
    },
  },
  {
    skill: "Compound assignment",
    tier: 1,
    make: (r) => {
      const a = r.int(2, 9), b = r.int(1, 6), c = r.int(2, 4);
      return predict("Compound assignment", `int x = ${a};\nx += ${b};\nx *= ${c};\nSystem.out.println(x);`, (a + b) * c, "x += 3 means x = x + 3. Go line by line.", `x is ${a}, then ${a + b}, then ${(a + b) * c}.`);
    },
  },
  {
    skill: "Decimal division",
    tier: 1,
    make: (r) => {
      const a = r.pick([3, 5, 7, 9, 11, 13, 15]);
      return predict("Decimal division", `System.out.println(${a} / 2.0);`, `${(a - 1) / 2}.5`, "If one side is a double, the answer keeps its decimals.", `2.0 is a double, so ${a} / 2.0 = ${a / 2}.`);
    },
  },
  fixed("Writing a method", 1, () =>
    order(
      "Writing a method",
      "Build a method that turns minutes into hours.",
      ["public int toHours(int minutes) {", "    int hours = minutes / 60;", "    return hours;", "}"],
      "Header first, closing brace last.",
      "The header opens the method, the body computes hours, return sends it back, and } closes it.",
      { src: `static @@LINES@@\npublic static void main(String[] args) { System.out.println(toHours(135)); }`, wrap: "class", expect: "2" },
    ),
  ),
  {
    skill: "String + numbers",
    tier: 2,
    make: (r) => {
      const a = r.int(1, 9), b = r.int(1, 9);
      return r.next() < 0.5
        ? predict("String + numbers", `System.out.println("Total: " + ${a} + ${b});`, `Total: ${a}${b}`, "Java reads + left to right. What type is the left side once text is involved?", `"Total: " + ${a} makes text, so ${b} is stuck on as text too: Total: ${a}${b}.`)
        : predict("String + numbers", `System.out.println(${a} + ${b} + " pts");`, `${a + b} pts`, "Java reads + left to right.", `${a} + ${b} are both numbers, so they add to ${a + b} first. Then " pts" is attached.`);
    },
  },
  {
    skill: "Casting",
    tier: 2,
    make: (r) => {
      if (r.next() < 0.5) {
        const w = r.int(2, 9), f = r.int(1, 9);
        return predict("Casting", `double d = ${w}.${f};\nSystem.out.println((int) d);`, w, "(int) chops off the decimal part. It doesn't round.", `(int) ${w}.${f} drops the .${f}, leaving ${w}.`);
      }
      const [a, b] = r.pick([[7, 4], [9, 4], [7, 8], [9, 5], [11, 4], [3, 8], [13, 5]] as const);
      return predict("Casting", `int a = ${a};\nint b = ${b};\ndouble avg = (double) a / b;\nSystem.out.println(avg);`, String(a / b), "The cast happens before the division.", `(double) a turns ${a} into ${a}.0, so the division keeps decimals: ${a / b}.`);
    },
  },
  {
    skill: "Order of operations",
    tier: 2,
    make: (r) => {
      const a = r.int(2, 9), b = r.int(2, 6), c = r.int(2, 5);
      return r.next() < 0.5
        ? predict("Order of operations", `System.out.println(${a} + ${b} * ${c});`, a + b * c, "Multiplication happens before addition.", `${b} * ${c} = ${b * c} first, then + ${a} = ${a + b * c}.`)
        : predict("Order of operations", `System.out.println((${a} + ${b}) * ${c});`, (a + b) * c, "Parentheses go first.", `(${a} + ${b}) = ${a + b}, times ${c} = ${(a + b) * c}.`);
    },
  },
  fixed("Semicolons", 2, () =>
    fill("Semicolons", "This line won't compile. What's missing at the end?", `int lives = 3___\nSystem.out.println(lives);`, [";"], "Every Java statement ends the same way.", "Statements end with a semicolon.", { src: `int lives = 3___\nSystem.out.println(lives);`, wrap: "main", expect: "3" }),
  ),
];

// ===================== World 2: Branch Woods (if / else, booleans) =====================
export const W1: Gen[] = [
  {
    skill: "if / else",
    tier: 0,
    make: (r) => {
      const a = r.int(1, 15), t = r.int(4, 10);
      return predict("if / else", `int a = ${a};\nif (a > ${t}) {\n    System.out.println("big");\n} else {\n    System.out.println("small");\n}`, a > t ? "big" : "small", `Is ${a} greater than ${t}?`, `${a} > ${t} is ${a > t}, so the ${a > t ? "if" : "else"} branch runs.`);
    },
  },
  {
    skill: "Even or odd",
    tier: 0,
    make: (r) => {
      const n = r.int(3, 40);
      return predict("Even or odd", `int n = ${n};\nif (n % 2 == 0) {\n    System.out.println("even");\n} else {\n    System.out.println("odd");\n}`, n % 2 === 0 ? "even" : "odd", "What is the remainder when you divide by 2?", `${n} % 2 is ${n % 2}, so it's ${n % 2 === 0 ? "even" : "odd"}.`);
    },
  },
  {
    skill: "Comparisons",
    tier: 0,
    make: (r) => {
      const a = r.int(1, 12), b = r.int(1, 12), op = r.pick([">", "<", ">=", "==", "!="] as const);
      const v = op === ">" ? a > b : op === "<" ? a < b : op === ">=" ? a >= b : op === "==" ? a === b : a !== b;
      return predict("Comparisons", `System.out.println(${a} ${op} ${b});`, v, "A comparison prints true or false.", `${a} ${op} ${b} is ${v}.`);
    },
  },
  fixed("Even check", 0, () =>
    choice("Even check", "Which condition is true when n is even?", ["n % 2 == 0", "n / 2 == 0", "n % 2 == 1", "n == 2"], 0, "% gives the remainder.", "Even numbers leave a remainder of 0 when divided by 2."),
  ),
  {
    skill: "And / or",
    tier: 1,
    make: (r) => {
      const a = r.int(1, 12), b = r.int(1, 12), and = r.next() < 0.5;
      const v = and ? a > 5 && b < 8 : a > 5 || b < 8;
      return predict("And / or", `int a = ${a};\nint b = ${b};\nSystem.out.println(a > 5 ${and ? "&&" : "||"} b < 8);`, v, and ? "&& needs both sides true." : "|| needs at least one side true.", `a > 5 is ${a > 5}, b < 8 is ${b < 8}, so ${and ? "&&" : "||"} gives ${v}.`);
    },
  },
  {
    skill: "else if chains",
    tier: 1,
    make: (r) => {
      const s = r.int(55, 99);
      const g = s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : "F";
      return predict("else if chains", `int score = ${s};\nif (score >= 90) {\n    System.out.println("A");\n} else if (score >= 80) {\n    System.out.println("B");\n} else if (score >= 70) {\n    System.out.println("C");\n} else {\n    System.out.println("F");\n}`, g, "Java checks from the top and stops at the first true condition.", `${s} first passes the ${g === "F" ? "else" : `>= ${g === "A" ? 90 : g === "B" ? 80 : 70}`} check, so it prints ${g}.`);
    },
  },
  {
    skill: "Not (!)",
    tier: 1,
    make: (r) => {
      const done = r.next() < 0.5, a = r.int(1, 5), b = r.int(1, 5);
      const v = !done || a === b;
      return predict("Not (!)", `boolean done = ${done};\nint a = ${a};\nint b = ${b};\nSystem.out.println(!done || a == b);`, v, "! flips true and false.", `!done is ${!done}, a == b is ${a === b}, so the || gives ${v}.`);
    },
  },
  fixed("Writing conditions", 1, () =>
    fill(
      "Writing conditions",
      "A score of 65 or higher should pass.",
      `public String grade(int score) {\n    if (score ___ 65) {\n        return "pass";\n    }\n    return "fail";\n}`,
      [">="],
      "What about a score of exactly 65?",
      "65 itself should pass, so the check is >= (greater than or equal).",
      { src: `static String grade(int score) {\n    if (score ___ 65) {\n        return "pass";\n    }\n    return "fail";\n}\npublic static void main(String[] args) { System.out.println(grade(65)); System.out.println(grade(64)); }`, wrap: "class", expect: "pass\nfail" },
    ),
  ),
  fixed("Max of two", 1, () =>
    order(
      "Max of two",
      "Return the bigger of two numbers.",
      ["public int max(int a, int b) {", "    if (a > b) {", "        return a;", "    }", "    return b;", "}"],
      "Where does the comparison go?",
      "Check a > b; if so return a. Otherwise the method continues and returns b.",
      { src: `static @@LINES@@\npublic static void main(String[] args) { System.out.println(max(3, 9)); System.out.println(max(8, 2)); }`, wrap: "class", expect: "9\n8" },
    ),
  ),
  {
    skill: "Nested if",
    tier: 2,
    make: (r) => {
      const x = r.int(4, 20);
      const v = x > 10 ? (x % 2 === 0 ? "A" : "B") : "C";
      return predict("Nested if", `int x = ${x};\nif (x > 10) {\n    if (x % 2 == 0) {\n        System.out.println("A");\n    } else {\n        System.out.println("B");\n    }\n} else {\n    System.out.println("C");\n}`, v, "Check the outer if first, then the inner one.", x > 10 ? `${x} > 10, then ${x} is ${x % 2 === 0 ? "even" : "odd"}, so ${v}.` : `${x} is not > 10, so the outer else prints C.`);
    },
  },
  {
    skill: "&& before ||",
    tier: 2,
    make: (r) => {
      const a = r.int(1, 9), b = r.int(1, 9), c = r.int(1, 9);
      const v = a < b || (b < c && c < a);
      return predict("&& before ||", `int a = ${a}, b = ${b}, c = ${c};\nSystem.out.println(a < b || b < c && c < a);`, v, "&& is grouped before ||, like * before +.", `It reads as a < b || (b < c && c < a): ${a < b} || (${b < c} && ${c < a}) = ${v}.`);
    },
  },
  fixed("Not equal", 2, () =>
    fill(
      "Not equal",
      "Print \"changed\" only when the old and new values are different.",
      `if (oldVal ___ newVal) {\n    System.out.println("changed");\n}`,
      ["!="],
      "It's the opposite of ==.",
      "!= means \"is not equal to\".",
      { src: `int oldVal = 3;\nint newVal = 5;\nif (oldVal ___ newVal) {\n    System.out.println("changed");\n}\nnewVal = 3;\nif (oldVal ___ newVal) {\n    System.out.println("changed");\n}`, wrap: "main", expect: "changed" },
    ),
  ),
  fixed("Assignment vs comparison", 2, () =>
    choice("Assignment vs comparison", "Which line checks whether x equals 5?", ["if (x == 5)", "if (x = 5)", "if (x === 5)", "if (x.equals(5))"], 0, "One = stores a value. Two compare.", "== compares numbers. = assigns, === isn't Java, and .equals is for objects like Strings."),
  ),
  {
    skill: "Absolute value",
    tier: 2,
    make: (r) => {
      const n = -r.int(2, 30);
      return predictWith(
        "Absolute value",
        `public int abs(int n) {\n    if (n < 0) {\n        return -n;\n    }\n    return n;\n}\n// abs(${n})`,
        -n,
        "What happens to a negative number here?",
        `${n} < 0, so it returns -(${n}) = ${-n}.`,
        { src: `static int abs(int n) {\n    if (n < 0) {\n        return -n;\n    }\n    return n;\n}\npublic static void main(String[] args) { System.out.println(abs(${n})); }`, wrap: "class" },
        `What does abs(${n}) return?`,
      );
    },
  },
];

// ===================== World 3: Loop Lagoon (for, while, counting) =====================
export const W2: Gen[] = [
  {
    skill: "for loops",
    tier: 0,
    make: (r) => {
      const s = r.int(0, 3), e = s + r.int(2, 5);
      let out = "";
      for (let i = s; i <= e; i++) out += i;
      return predict("for loops", `for (int i = ${s}; i <= ${e}; i++) {\n    System.out.print(i);\n}`, out, "print (not println) keeps everything on one line.", `i goes from ${s} up to and including ${e}: ${out}.`);
    },
  },
  {
    skill: "Summing with a loop",
    tier: 0,
    make: (r) => {
      const n = r.int(3, 10);
      return predict("Summing with a loop", `int sum = 0;\nfor (int i = 1; i <= ${n}; i++) {\n    sum += i;\n}\nSystem.out.println(sum);`, (n * (n + 1)) / 2, "Add up every number the loop visits.", `1 + 2 + ... + ${n} = ${(n * (n + 1)) / 2}.`);
    },
  },
  {
    skill: "Counting iterations",
    tier: 0,
    make: (r) => {
      const n = r.int(3, 9);
      return choice("Counting iterations", "How many times does this loop run?", [String(n - 1), String(n), String(n + 1), "Forever"], 1, "List each value of i that passes the check.", `i takes the values 0 through ${n - 1}: that's ${n} times.`, `for (int i = 0; i < ${n}; i++) { ... }`);
    },
  },
  {
    skill: "Stepping by more than 1",
    tier: 1,
    make: (r) => {
      const s = r.int(0, 3), k = r.int(2, 4), e = s + k * r.int(2, 4) + r.int(0, k - 1);
      const vals: number[] = [];
      for (let i = s; i < e; i += k) vals.push(i);
      return predict("Stepping by more than 1", `for (int i = ${s}; i < ${e}; i += ${k}) {\n    System.out.print(i + " ");\n}`, vals.join(" "), `i jumps by ${k} each time. Stop before ${e}.`, `i is ${vals.join(", ")}; the next would be ${vals[vals.length - 1] + k}, which isn't < ${e}.`);
    },
  },
  {
    skill: "while loops",
    tier: 1,
    make: (r) => {
      const l = r.int(10, 100);
      let x = 1;
      while (x < l) x *= 2;
      return predict("while loops", `int x = 1;\nwhile (x < ${l}) {\n    x *= 2;\n}\nSystem.out.println(x);`, x, "The check happens before every pass.", `x doubles: 1, 2, 4, ... until it reaches ${x}, the first value not below ${l}.`);
    },
  },
  {
    skill: "Counting down",
    tier: 1,
    make: (r) => {
      const n = r.int(3, 7);
      let out = "";
      for (let i = n; i > 0; i--) out += i;
      return predict("Counting down", `for (int i = ${n}; i > 0; i--) {\n    System.out.print(i);\n}`, out, "i-- takes 1 away each time.", `i goes ${n} down to 1 (0 fails i > 0): ${out}.`);
    },
  },
  fixed("Loop shortcuts", 1, () =>
    fill("Loop shortcuts", "Add every number from 1 to n into sum.", `int sum = 0;\nfor (int i = 1; i <= n; i++) {\n    sum ___ i;\n}`, ["+="], "There's a shortcut for sum = sum + i.", "sum += i adds i onto sum.", { src: `int n = 4;\nint sum = 0;\nfor (int i = 1; i <= n; i++) {\n    sum ___ i;\n}\nSystem.out.println(sum);`, wrap: "main", expect: "10" }),
  ),
  fixed("Building a loop", 1, () =>
    order("Building a loop", "Count down from 3, then print Liftoff.", ["for (int i = 3; i > 0; i--) {", "    System.out.println(i);", "}", 'System.out.println("Liftoff");'], "What should only happen once?", "The loop prints 3, 2, 1, and Liftoff comes after the loop ends.", { src: "@@LINES@@", wrap: "main", expect: "3\n2\n1\nLiftoff" }),
  ),
  {
    skill: "Nested loops",
    tier: 2,
    make: (r) => {
      const a = r.int(2, 5), b = r.int(2, 5);
      return predict("Nested loops", `int count = 0;\nfor (int i = 0; i < ${a}; i++) {\n    for (int j = 0; j < ${b}; j++) {\n        count++;\n    }\n}\nSystem.out.println(count);`, a * b, "The inner loop runs fully for every pass of the outer loop.", `${a} outer passes × ${b} inner passes = ${a * b}.`);
    },
  },
  {
    skill: "Off-by-one",
    tier: 2,
    make: (r) => {
      const n = r.int(4, 12);
      return predict("Off-by-one", `int count = 0;\nfor (int i = 0; i <= ${n}; i++) {\n    count++;\n}\nSystem.out.println(count);`, n + 1, "Starting at 0 and using <= — count carefully.", `i goes 0 to ${n} inclusive, which is ${n + 1} values.`);
    },
  },
  {
    skill: "Loop logic",
    tier: 2,
    make: (r) => {
      const n = r.pick([3, 5, 6, 7, 10, 12]);
      let m = n, steps = 0;
      while (m !== 1) {
        m = m % 2 === 0 ? m / 2 : 3 * m + 1;
        steps++;
      }
      return predict("Loop logic", `int n = ${n};\nint steps = 0;\nwhile (n != 1) {\n    if (n % 2 == 0) {\n        n = n / 2;\n    } else {\n        n = 3 * n + 1;\n    }\n    steps++;\n}\nSystem.out.println(steps);`, steps, "Trace n on paper until it reaches 1.", `It takes ${steps} steps for ${n} to reach 1.`);
    },
  },
  {
    skill: "FizzBuzz",
    tier: 2,
    make: (r) => {
      const n = r.pick([9, 10, 15, 20, 30, 7, 25, 45]);
      const v = n % 15 === 0 ? "FizzBuzz" : n % 3 === 0 ? "Fizz" : n % 5 === 0 ? "Buzz" : String(n);
      return predict("FizzBuzz", `int n = ${n};\nif (n % 15 == 0) {\n    System.out.println("FizzBuzz");\n} else if (n % 3 == 0) {\n    System.out.println("Fizz");\n} else if (n % 5 == 0) {\n    System.out.println("Buzz");\n} else {\n    System.out.println(n);\n}`, v, "Check divisibility from the top.", `${n} → ${v}. This is LeetCode #412's core logic.`);
    },
  },
  fixed("Infinite loops", 2, () =>
    choice("Infinite loops", "Which loop never ends?", ["for (int i = 0; i < 5; i--)", "for (int i = 0; i < 5; i++)", "for (int i = 5; i > 0; i--)", "for (int i = 0; i < 5; i += 2)"], 0, "Does i ever move toward the stopping point?", "i-- makes i smaller, so it stays below 5 forever."),
  ),
];
