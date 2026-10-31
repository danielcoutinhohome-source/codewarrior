import { choice } from "../questions/core";
import type { Lesson } from "./types";

// AP CSP questions use the College Board exam reference sheet pseudocode:
//   a ← expr     assignment          DISPLAY(x)      output
//   =  ≠         equality tests      MOD             remainder
//   lists start at index 1           APPEND / INSERT / REMOVE / LENGTH
// Each authored question carries a JavaScript reference (`reference`) that computes the
// right option's text; tests check it, so answer keys are never trusted blindly.
type Ref = { reference: () => string };
const csp = (skill: string, prompt: string, code: string, options: string[], correct: number, hint: string, explain: string, reference: () => string): ReturnType<typeof choice> & Ref => ({
  ...choice(skill, prompt, options, correct, hint, explain, code),
  label: "AP CSP pseudocode",
  reference,
});

export const CSP_LESSONS: Lesson[] = [
  {
    id: "csp-variables",
    course: "csp",
    world: 0,
    unit: "Big Idea 3 · Variables and assignment",
    title: "Variables, assignment and expressions",
    minutes: 7,
    objective: "Trace AP CSP assignment statements (←), use MOD, and evaluate expressions in the right order.",
    body: [
      "In AP CSP pseudocode, `a ← 7` **assigns** 7 to a. The arrow points from the value to the variable. The value on the right is evaluated first, then stored.",
      "`b ← a` copies a's **current** value into b. Changing a later does not change b.",
      "Arithmetic follows normal precedence: `*`, `/` and `MOD` before `+` and `-`. `17 MOD 5` is 2. Unlike Java, CSP `/` gives an exact result: `7 / 2` is 3.5.",
    ],
    example: {
      title: "Copy, then change",
      lang: "csp",
      code: "a ← 7\nb ← a\na ← a + 3\nDISPLAY(a)\nDISPLAY(b)",
      output: "10 7",
      steps: ["a is 7; b gets a copy of 7.", "a ← a + 3 evaluates 7 + 3 and stores 10 in a.", "b was never reassigned, so it is still 7. DISPLAY shows 10 then 7."],
      reference: () => {
        let a = 7;
        const b = a;
        a = a + 3;
        return `${a} ${b}`;
      },
    },
    misconception: {
      wrong: "`b ← a` links b to a, so changing a later changes b.",
      right: "Assignment copies the value at that moment. b keeps 7 even after a becomes 10.",
    },
    skills: ["CSP assignment direction", "CSP expression precedence", "CSP random endpoints", "Numeric versus textual data", "Binary place values", "Bit capacity", "Binary overflow capacity", "Lossless representation", "Representation and precision", "CSP abstraction tradeoff", "Text input data", "Data normalization information loss"],
    extras: [
      csp("CSP assignment direction", "What is displayed?", "x ← 4\ny ← x * 2\nx ← y - 1\nDISPLAY(x)", ["4", "7", "8", "3"], 1, "Work one line at a time and keep track of x and y.", "y becomes 8, then x becomes 8 − 1 = 7.", () => { let x = 4; const y = x * 2; x = y - 1; return String(x); }),
      csp("CSP expression precedence", "What is displayed?", "n ← 2 + 13 MOD 4 * 3\nDISPLAY(n)", ["5", "11", "9", "3"], 0, "MOD and * happen before +, left to right.", "13 MOD 4 is 1, 1 * 3 is 3, and 2 + 3 is 5.", () => String(2 + ((13 % 4) * 3))),
    ],
    explain: [
      { id: "csp-var-explain", skill: "CSP assignment direction", prompt: "After `a ← 3`, `b ← a`, `a ← 9`, what is b? Explain in one sentence.", keyPoints: ["b is 3", "b ← a copied the value 3 at that moment", "reassigning a afterwards does not affect b"], model: "b is 3, because b ← a copied a's value (3) at that moment; changing a to 9 later does not change b." },
    ],
    prompts: ["What does the arrow ← mean in AP CSP?", "How is CSP division different from Java division?", "How many values can 4 bits represent?"],
  },
  {
    id: "csp-selection",
    course: "csp",
    world: 1,
    unit: "Big Idea 3 · Selection",
    title: "IF / ELSE and Boolean conditions",
    minutes: 7,
    objective: "Trace IF / ELSE blocks in AP CSP pseudocode, including AND, OR and NOT.",
    body: [
      "CSP uses `=` to **test** equality (Java uses `==`) and `≠` for not equal. Relational tests produce true or false.",
      "`IF (condition) { ... } ELSE { ... }` runs exactly one block. Without an ELSE, nothing happens when the condition is false.",
      "`AND` needs both sides true, `OR` needs at least one, `NOT` flips a value. Test every path: a test case for the IF block and one for the ELSE block.",
    ],
    example: {
      title: "Odd or even",
      lang: "csp",
      code: "x ← 15\nIF (x MOD 2 = 0)\n{\n  DISPLAY(\"even\")\n}\nELSE\n{\n  DISPLAY(\"odd\")\n}",
      output: "odd",
      steps: ["15 MOD 2 is 1.", "1 = 0 is false, so the IF block is skipped.", "The ELSE block displays odd."],
      reference: () => (15 % 2 === 0 ? "even" : "odd"),
    },
    misconception: {
      wrong: "In CSP, `x = 5` inside an IF sets x to 5.",
      right: "In CSP, = is a comparison. Assignment always uses the arrow ←.",
    },
    skills: ["CSP equality notation", "CSP compound selection", "CSP deterministic selection", "CSP test path coverage", "Selection purpose"],
    extras: [
      csp("CSP compound selection", "What is displayed?", "age ← 16\nhasPass ← false\nIF (age ≥ 16 AND NOT hasPass)\n{\n  DISPLAY(\"buy pass\")\n}\nELSE\n{\n  DISPLAY(\"enter\")\n}", ["buy pass", "enter", "Nothing", "An error"], 0, "Evaluate NOT hasPass first.", "age ≥ 16 is true and NOT false is true, so the AND is true and the IF block runs.", () => { const age = 16, hasPass = false; return age >= 16 && !hasPass ? "buy pass" : "enter"; }),
      csp("CSP test path coverage", "Which pair of inputs tests both branches of `IF (score > 50) { DISPLAY(\"pass\") } ELSE { DISPLAY(\"retry\") }`?", "", ["60 and 51", "50 and 51", "10 and 50", "70 and 90"], 1, "You need one input that makes the condition true and one that makes it false.", "50 makes score > 50 false (retry) and 51 makes it true (pass). The boundary pair also checks the edge.", () => { const both = (a: number, b: number) => (a > 50) !== (b > 50) && (a === 50 || b === 50); return both(50, 51) ? "50 and 51" : "?"; }),
    ],
    prompts: ["What is the difference between = and ← in CSP?", "How do AND and OR work in pseudocode?", "How do I choose test cases for an IF statement?"],
  },
  {
    id: "csp-iteration",
    course: "csp",
    world: 2,
    unit: "Big Idea 3 · Iteration",
    title: "REPEAT n TIMES and REPEAT UNTIL",
    minutes: 8,
    objective: "Trace both CSP loop forms and know exactly when REPEAT UNTIL stops.",
    body: [
      "`REPEAT n TIMES { ... }` runs the block exactly n times.",
      "`REPEAT UNTIL (condition) { ... }` checks the condition **before** each pass and keeps going **while it is false**. It stops as soon as the condition is true, which may be before the first pass.",
      "That is the opposite of a Java while loop, which runs while its condition is **true**. `REPEAT UNTIL (x > 8)` behaves like `while (!(x > 8))`.",
    ],
    example: {
      title: "Counting up by 3 until past 8",
      lang: "csp",
      code: "x ← 2\nREPEAT UNTIL (x > 8)\n{\n  x ← x + 3\n}\nDISPLAY(x)",
      output: "11",
      steps: ["x is 2: 2 > 8 is false, so add 3 (x = 5).", "5 and then 8 are not > 8, so x becomes 8 and then 11.", "11 > 8 is true, so the loop stops and 11 is displayed."],
      reference: () => {
        let x = 2;
        while (!(x > 8)) x += 3;
        return String(x);
      },
    },
    misconception: {
      wrong: "REPEAT UNTIL (done) keeps going while done is true.",
      right: "It keeps going while done is false and stops the moment done becomes true.",
    },
    skills: ["CSP repetition count", "CSP repeat until stop", "CSP repeat trace", "CSP until boundary", "CSP algorithm equivalence", "CSP simulation reliability", "Choosing repetition"],
    extras: [
      csp("CSP repeat trace", "What is displayed?", "total ← 0\nn ← 1\nREPEAT 4 TIMES\n{\n  total ← total + n\n  n ← n * 2\n}\nDISPLAY(total)", ["8", "15", "16", "31"], 1, "List n and total after each of the 4 passes.", "total adds 1, 2, 4 and 8: 15.", () => { let total = 0, n = 1; for (let i = 0; i < 4; i++) { total += n; n *= 2; } return String(total); }),
      csp("CSP until boundary", "How many times does the loop body run?", "k ← 10\nREPEAT UNTIL (k ≤ 0)\n{\n  k ← k - 4\n}", ["2", "3", "4", "10"], 1, "Check the condition before every pass.", "k goes 10 → 6 → 2 → −2. After 3 passes k ≤ 0 is true.", () => { let k = 10, c = 0; while (!(k <= 0)) { k -= 4; c++; } return String(c); }),
    ],
    explain: [
      { id: "csp-iter-explain", skill: "CSP repeat until stop", prompt: "Can the body of `REPEAT UNTIL (x > 0)` run zero times? Explain.", keyPoints: ["yes", "the condition is checked before each pass", "if x is already greater than 0, the loop stops immediately"], model: "Yes. The condition is checked before the first pass, so if x > 0 is already true, the body never runs." },
    ],
    prompts: ["How is REPEAT UNTIL different from a Java while loop?", "How do I trace a REPEAT n TIMES loop?", "When would I pick REPEAT UNTIL?"],
  },
  {
    id: "csp-lists",
    course: "csp",
    world: 4,
    unit: "Big Idea 3 · Lists",
    title: "Lists: 1-based indexes, APPEND, INSERT, REMOVE",
    minutes: 9,
    objective: "Use AP CSP list operations correctly, remembering that CSP list indexes start at 1.",
    body: [
      "AP CSP lists start at index **1**, not 0. In `nums ← [3, 8, 5]`, `nums[1]` is 3 and `nums[LENGTH(nums)]` is the last item. Indexes below 1 or above LENGTH cause an error.",
      "`APPEND(list, v)` adds v at the end. `INSERT(list, i, v)` puts v at index i and shifts later items right. `REMOVE(list, i)` deletes index i and shifts later items left.",
      "`FOR EACH item IN list { ... }` visits every element in order, which is the simplest way to total or search a list.",
    ],
    example: {
      title: "Append, insert, then read",
      lang: "csp",
      code: "nums ← [3, 8, 5]\nAPPEND(nums, 2)\nINSERT(nums, 2, 9)\nDISPLAY(nums[2])\nDISPLAY(LENGTH(nums))",
      output: "9 5",
      steps: ["APPEND gives [3, 8, 5, 2].", "INSERT at index 2 shifts 8 right: [3, 9, 8, 5, 2].", "nums[2] is 9 and there are 5 items."],
      reference: () => {
        const nums = [3, 8, 5];
        nums.push(2);
        nums.splice(1, 0, 9); // CSP index 2 is JS index 1
        return `${nums[1]} ${nums.length}`;
      },
    },
    misconception: {
      wrong: "`list[0]` is the first element in AP CSP, like in Java.",
      right: "CSP lists start at 1. list[0] is an error; the first element is list[1].",
    },
    skills: ["CSP list first index", "CSP append purpose", "List data abstraction", "CSP insertion index", "CSP removal index", "CSP for each total", "CSP list boundary", "CSP random list selection"],
    extras: [
      csp("CSP removal index", "What is displayed?", "words ← [\"red\", \"blue\", \"gold\", \"teal\"]\nREMOVE(words, 2)\nDISPLAY(words[2])", ["red", "blue", "gold", "teal"], 2, "After removing, which item slides into index 2?", "Removing index 2 deletes blue; gold shifts into index 2.", () => { const w = ["red", "blue", "gold", "teal"]; w.splice(1, 1); return w[1]; }),
      csp("CSP for each total", "What is displayed?", "sum ← 0\nFOR EACH n IN [4, 7, 1, 6]\n{\n  IF (n > 3)\n  {\n    sum ← sum + n\n  }\n}\nDISPLAY(sum)", ["18", "17", "11", "4"], 1, "Only values greater than 3 are added.", "4 + 7 + 6 = 17; 1 is skipped.", () => String([4, 7, 1, 6].filter((n) => n > 3).reduce((a, b) => a + b, 0))),
      csp("CSP list boundary", "Which expression is the last element of any non-empty list `vals`?", "", ["vals[LENGTH(vals)]", "vals[LENGTH(vals) - 1]", "vals[0]", "vals[LENGTH(vals) + 1]"], 0, "CSP indexes run from 1 to LENGTH.", "With 1-based indexing the last valid index equals the length.", () => { const vals = [5, 6, 7]; const csp1 = (i: number) => vals[i - 1]; return csp1(vals.length) === 7 ? "vals[LENGTH(vals)]" : "?"; }),
    ],
    explain: [
      { id: "csp-lists-explain", skill: "CSP list first index", prompt: "A student translates Java code `a[0]` to CSP as `a[0]`. What goes wrong and what is the fix?", keyPoints: ["CSP lists start at index 1", "a[0] is an out-of-range error in CSP", "the first element is a[1]"], model: "CSP lists are 1-indexed, so a[0] is an error; the first element is a[1]." },
    ],
    prompts: ["Why do CSP lists start at 1?", "What does INSERT do to the other items?", "How do I find the largest number in a CSP list?"],
  },
  {
    id: "csp-procedures",
    course: "csp",
    world: 5,
    unit: "Big Idea 3 · Procedures",
    title: "Procedures, parameters and RETURN",
    minutes: 7,
    objective: "Trace calls to CSP procedures and explain how parameters make a procedure reusable (procedural abstraction).",
    body: [
      "`PROCEDURE name(p1, p2) { ... }` defines reusable steps. A call like `name(4, 9)` copies the arguments into the parameters in order.",
      "`RETURN(expression)` sends a value back and ends the procedure immediately. Code after a RETURN in the same path does not run.",
      "**Procedural abstraction**: callers only need to know what a procedure does, not how. Parameters let one procedure handle many inputs instead of copying similar code.",
    ],
    example: {
      title: "Using a returned value",
      lang: "csp",
      code: "PROCEDURE double(n)\n{\n  RETURN(n * 2)\n}\nx ← double(4) + 1\nDISPLAY(x)",
      output: "9",
      steps: ["double(4) copies 4 into n.", "RETURN sends back 8.", "x ← 8 + 1 stores 9."],
      reference: () => String(((n: number) => n * 2)(4) + 1),
    },
    misconception: {
      wrong: "Statements after RETURN still run before the procedure ends.",
      right: "RETURN ends the procedure right away and hands back its value.",
    },
    skills: ["CSP procedural abstraction", "CSP parameter generalization", "CSP procedure return behavior", "Procedure arguments"],
    extras: [
      csp("CSP procedure return behavior", "What is displayed?", "PROCEDURE check(n)\n{\n  IF (n > 10)\n  {\n    RETURN(\"big\")\n  }\n  RETURN(\"small\")\n}\nDISPLAY(check(12))", ["big", "small", "big small", "Nothing"], 0, "RETURN ends the procedure immediately.", "12 > 10, so RETURN(\"big\") ends the call; the second RETURN never runs.", () => ((n: number) => (n > 10 ? "big" : "small"))(12)),
      csp("CSP parameter generalization", "Three procedures add 5, 10 and 20 to a score. Which single procedure replaces all three?", "", ["PROCEDURE addPoints(score, amount) { RETURN(score + amount) }", "PROCEDURE addFive(score) { RETURN(score + 5) }", "PROCEDURE add() { RETURN(35) }", "PROCEDURE addPoints(score) { RETURN(score * 3) }"], 0, "Which part changes between the three? Make it a parameter.", "Turning the changing amount into a parameter generalizes the procedure so one definition handles all three.", () => { const addPoints = (s: number, a: number) => s + a; return [5, 10, 20].every((a) => addPoints(1, a) === 1 + a) ? "PROCEDURE addPoints(score, amount) { RETURN(score + amount) }" : "?"; }),
    ],
    prompts: ["What is procedural abstraction?", "What happens after RETURN runs?", "Why use parameters instead of copying code?"],
  },
  {
    id: "csp-algorithms",
    course: "csp",
    world: 6,
    unit: "Big Idea 3 · Algorithms and efficiency",
    title: "Searching, efficiency and reasonable time",
    minutes: 8,
    objective: "Compare linear and binary search, classify algorithms as reasonable or unreasonable time, and know when a heuristic is used.",
    body: [
      "**Linear (sequential) search** checks each item in order and works on any list. In the worst case it checks every item.",
      "**Binary search** needs a **sorted** list. Each check halves what is left, so 1,000 items take about 10 checks and 1,000,000 take about 20.",
      "Algorithms whose steps grow like a polynomial (n, n², …) run in **reasonable time**. Exponential growth (2ⁿ) is **unreasonable** for large inputs. When exact answers take unreasonable time, a **heuristic** finds a good-enough answer faster without guaranteeing the best one.",
    ],
    example: {
      title: "How many checks does binary search need?",
      lang: "csp",
      code: "n ← 1000\nchecks ← 0\nREPEAT UNTIL (n < 1)\n{\n  n ← n / 2\n  checks ← checks + 1\n}\nDISPLAY(checks)",
      output: "10",
      steps: ["Each pass halves the remaining range: 1000, 500, 250, 125, 62.5, …", "After 10 halvings the range is below 1 (about 0.98).", "So about 10 checks are enough for 1,000 sorted items."],
      reference: () => {
        let n = 1000, checks = 0;
        while (!(n < 1)) { n = n / 2; checks++; }
        return String(checks);
      },
    },
    misconception: {
      wrong: "Binary search is always the better choice.",
      right: "Binary search only works on sorted data. For unsorted data, use linear search (or sort first, which has its own cost).",
    },
    skills: ["CSP sequential search cost", "CSP binary search scalability", "Algorithm correctness versus speed", "CSP reasonable time classification", "CSP heuristic limitation", "Binary Search precondition (#704)"],
    extras: [
      csp("CSP binary search scalability", "A sorted list doubles from 500 to 1,000 items. About how many more checks does binary search need in the worst case?", "", ["About 1 more", "About 500 more", "Twice as many", "About 10 more"], 0, "What does doubling do to the number of halvings?", "Doubling the list adds one more halving step, so about one more check.", () => { const checks = (n: number) => Math.floor(Math.log2(n)) + 1; return checks(1000) - checks(500) === 1 ? "About 1 more" : "?"; }),
      csp("CSP sequential search cost", "In the worst case, how many items does a linear search check in an unsorted list of 300 names?", "", ["300", "150", "9", "1"], 0, "What if the name is last, or missing?", "If the target is last or absent, every one of the 300 items is checked.", () => { const list = Array.from({ length: 300 }, (_, i) => i); let c = 0; for (const v of list) { c++; if (v === -1) break; } return String(c); }),
    ],
    explain: [
      { id: "csp-alg-explain", skill: "CSP heuristic limitation", prompt: "What is a heuristic, and what is the trade-off of using one?", keyPoints: ["a heuristic is a shortcut approach that finds an approximate solution", "it is used when exact solutions take unreasonable time", "the trade-off is that the answer may not be optimal"], model: "A heuristic is a shortcut that finds a good-enough answer quickly when finding the exact best answer would take unreasonable time. The trade-off is that it does not guarantee the optimal solution." },
    ],
    prompts: ["Why does binary search need sorted data?", "What makes an algorithm run in unreasonable time?", "Give me an example of a heuristic."],
  },
];
