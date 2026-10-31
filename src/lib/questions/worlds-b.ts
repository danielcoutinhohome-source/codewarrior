import { arr, choice, fill, fixed, jstr, order, predict, predictWith, type Gen } from "./core";

const WORDS = ["java", "coding", "warrior", "loop", "string", "array", "method", "object", "binary", "pixel", "rocket", "dragon", "castle", "lagoon"];

// ===================== World 4: String Peaks =====================
export const W3: Gen[] = [
  {
    skill: "String length",
    tier: 0,
    make: (r) => {
      const w = r.pick(WORDS);
      return predict("String length", `String s = "${w}";\nSystem.out.println(s.length());`, w.length, "Count the characters. Quotes don't count.", `"${w}" has ${w.length} characters.`);
    },
  },
  {
    skill: "Joining strings",
    tier: 0,
    make: (r) => {
      const a = r.pick(WORDS), b = r.pick(WORDS);
      return predict("Joining strings", `String a = "${a}";\nString b = "${b}";\nSystem.out.println(a + b);`, a + b, "+ glues strings together with no space.", `"${a}" + "${b}" = "${a + b}".`);
    },
  },
  fixed("Comparing strings", 0, () =>
    choice("Comparing strings", "Which correctly checks if two Strings have the same text?", ["a.equals(b)", "a == b", "a = b", "a.same(b)"], 0, "Strings are objects.", "== checks whether they are the same object. .equals checks the text."),
  ),
  {
    skill: "substring(a, b)",
    tier: 1,
    make: (r) => {
      const w = r.pick(WORDS.filter((x) => x.length >= 5));
      const a = r.int(0, 2), b = r.int(a + 1, Math.min(w.length, a + 4));
      return predict("substring(a, b)", `String s = "${w}";\nSystem.out.println(s.substring(${a}, ${b}));`, w.substring(a, b), "Indexes start at 0, and the end index is not included.", `Characters ${a} up to (not including) ${b} of "${w}" are "${w.substring(a, b)}".`);
    },
  },
  {
    skill: "substring(a)",
    tier: 1,
    make: (r) => {
      const w = r.pick(WORDS.filter((x) => x.length >= 5));
      const a = r.int(1, w.length - 2);
      return predict("substring(a)", `String s = "${w}";\nSystem.out.println(s.substring(${a}));`, w.substring(a), "With one number, it runs to the end.", `From index ${a} to the end of "${w}" is "${w.substring(a)}".`);
    },
  },
  {
    skill: "indexOf",
    tier: 1,
    make: (r) => {
      const w = r.pick(WORDS);
      const c = r.next() < 0.75 ? w[r.int(0, w.length - 1)] : r.pick(["z", "q", "x"]);
      return predict("indexOf", `String s = "${w}";\nSystem.out.println(s.indexOf("${c}"));`, w.indexOf(c), "indexOf gives the first position, or -1 if it isn't there.", w.includes(c) ? `The first "${c}" in "${w}" is at index ${w.indexOf(c)}.` : `"${c}" isn't in "${w}", so the answer is -1.`);
    },
  },
  fixed("Finding letters", 1, () =>
    fill(
      "Finding letters",
      "Count the vowels in word.",
      `int count = 0;\nfor (int i = 0; i < word.length(); i++) {\n    String c = word.substring(i, i + 1);\n    if ("aeiou".indexOf(c) ___ -1) {\n        count++;\n    }\n}`,
      ["!=", ">"],
      "What does indexOf return when it finds nothing?",
      "indexOf returns -1 for \"not found\", so != -1 (or > -1) means it's a vowel.",
      { src: `String word = "education";\nint count = 0;\nfor (int i = 0; i < word.length(); i++) {\n    String c = word.substring(i, i + 1);\n    if ("aeiou".indexOf(c) ___ -1) {\n        count++;\n    }\n}\nSystem.out.println(count);`, wrap: "main", expect: "5" },
    ),
  ),
  fixed("Reversing a string", 1, () =>
    order(
      "Reversing a string",
      "Reverse a word.",
      ['String rev = "";', "for (int i = word.length() - 1; i >= 0; i--) {", "    rev += word.substring(i, i + 1);", "}", "return rev;"],
      "Make an empty string first, then walk backwards.",
      "Start with \"\", add letters from the last index down to 0, then return.",
      { src: `static String reverse(String word) {\n@@LINES@@\n}\npublic static void main(String[] args) { System.out.println(reverse("code")); }`, wrap: "class", expect: "edoc" },
    ),
  ),
  {
    skill: "Looping over a string",
    tier: 2,
    make: (r) => {
      const w = r.pick(WORDS.filter((x) => x.length >= 5));
      let out = "";
      for (let i = 0; i < w.length; i += 2) out += w[i];
      return predict("Looping over a string", `String s = "${w}";\nString out = "";\nfor (int i = 0; i < s.length(); i += 2) {\n    out += s.substring(i, i + 1);\n}\nSystem.out.println(out);`, out, "Take every other letter, starting at index 0.", `Indexes 0, 2, 4... of "${w}" give "${out}".`);
    },
  },
  {
    skill: "Last character",
    tier: 2,
    make: (r) => {
      const w = r.pick(WORDS);
      return predict("Last character", `String s = "${w}";\nSystem.out.println(s.substring(s.length() - 1));`, w[w.length - 1], "The last index is length - 1.", `"${w}" has length ${w.length}, so the last character is at index ${w.length - 1}: "${w[w.length - 1]}".`);
    },
  },
  {
    skill: "equals and case",
    tier: 2,
    make: (r) => {
      const w = r.pick(WORDS), low = r.next() < 0.5;
      const v = low;
      return predict("equals and case", `String a = "${w}";\nString b = "${w.toUpperCase()}"${low ? ".toLowerCase()" : ""};\nSystem.out.println(a.equals(b));`, v, "equals cares about capital letters.", low ? `toLowerCase turns "${w.toUpperCase()}" back into "${w}", so they match.` : `"${w}" and "${w.toUpperCase()}" differ in case, so equals is false.`);
    },
  },
  {
    skill: "compareTo",
    tier: 2,
    make: (r) => {
      const [a, b] = r.shuffle(WORDS).slice(0, 2);
      const v = a.localeCompare(b) < 0;
      return predict("compareTo", `System.out.println("${a}".compareTo("${b}") < 0);`, v, "compareTo is negative when the first word comes earlier in the dictionary.", `"${a}" comes ${v ? "before" : "after"} "${b}" alphabetically.`);
    },
  },
];

// ===================== World 5: Array Caverns =====================
const nums = (r: { int: (a: number, b: number) => number }, n: number, lo = 1, hi = 9) => Array.from({ length: n }, () => r.int(lo, hi));

export const W4: Gen[] = [
  {
    skill: "Array indexes",
    tier: 0,
    make: (r) => {
      const a = nums(r, 4), i = r.int(0, 3);
      return predict("Array indexes", `int[] nums = ${arr(a)};\nSystem.out.println(nums[${i}]);`, a[i], "Arrays start counting at 0.", `nums[${i}] is the ${["1st", "2nd", "3rd", "4th"][i]} item: ${a[i]}.`);
    },
  },
  {
    skill: "Array length",
    tier: 0,
    make: (r) => {
      const a = nums(r, r.int(3, 6));
      return predict("Array length", `int[] nums = ${arr(a)};\nSystem.out.println(nums.length);`, a.length, "length is how many items there are.", `There are ${a.length} items.`);
    },
  },
  fixed("ArrayList basics", 0, () =>
    choice("ArrayList basics", "How do you add 5 to an ArrayList called list?", ["list.add(5);", "list[0] = 5;", "list.push(5);", "list.append(5);"], 0, "ArrayList methods: add, get, set, remove, size.", "ArrayList uses add(). [ ] only works on plain arrays."),
  ),
  {
    skill: "Summing an array",
    tier: 1,
    make: (r) => {
      const a = nums(r, r.int(3, 5));
      return predict("Summing an array", `int[] nums = ${arr(a)};\nint total = 0;\nfor (int n : nums) {\n    total += n;\n}\nSystem.out.println(total);`, a.reduce((x, y) => x + y, 0), "Add every item.", `${a.join(" + ")} = ${a.reduce((x, y) => x + y, 0)}.`);
    },
  },
  fixed("Finding the max", 1, () =>
    fill(
      "Finding the max",
      "Find the biggest number in nums.",
      `int max = nums[0];\nfor (int n : nums) {\n    if (n > max) {\n        max = ___;\n    }\n}`,
      ["n"],
      "Which variable holds the current item?",
      "When n beats the current max, max becomes n.",
      { src: `int[] nums = {4, 9, 2, 7};\nint max = nums[0];\nfor (int n : nums) {\n    if (n > max) {\n        max = ___;\n    }\n}\nSystem.out.println(max);`, wrap: "main", expect: "9" },
    ),
  ),
  fixed("Counting matches", 1, () =>
    order(
      "Counting matches",
      "Count how many times target appears.",
      ["int count = 0;", "for (int n : nums) {", "    if (n == target) count++;", "}", "return count;"],
      "Setup, loop, result.",
      "Start at 0, add 1 for every match, then return the count.",
      { src: `static int countOf(int[] nums, int target) {\n@@LINES@@\n}\npublic static void main(String[] args) { System.out.println(countOf(new int[]{3, 1, 3, 3}, 3)); }`, wrap: "class", expect: "3" },
    ),
  ),
  {
    skill: "ArrayList remove",
    tier: 1,
    make: (r) => {
      const [a, b, c] = nums(r, 3, 10, 99);
      return predict("ArrayList remove", `ArrayList<Integer> list = new ArrayList<>();\nlist.add(${a});\nlist.add(${b});\nlist.add(${c});\nlist.remove(0);\nSystem.out.println(list.get(0));`, b, "After a remove, everything slides left.", `Removing index 0 (${a}) shifts ${b} into index 0.`);
    },
  },
  {
    skill: "ArrayList size",
    tier: 1,
    make: (r) => {
      const adds = r.int(3, 6), rem = r.int(1, 2);
      const lines = Array.from({ length: adds }, (_, i) => `list.add(${i * 3 + 1});`).concat(Array.from({ length: rem }, () => "list.remove(0);"));
      return predict("ArrayList size", `ArrayList<Integer> list = new ArrayList<>();\n${lines.join("\n")}\nSystem.out.println(list.size());`, adds - rem, "Count adds, subtract removes.", `${adds} adds and ${rem} remove${rem > 1 ? "s" : ""} leave ${adds - rem}.`);
    },
  },
  {
    skill: "Remove shifts items",
    tier: 2,
    make: (r) => {
      const a = nums(r, 4, 10, 99), i = r.int(0, 2);
      const after = a.filter((_, k) => k !== i);
      return predict("Remove shifts items", `ArrayList<Integer> list = new ArrayList<>(Arrays.asList(${a.join(", ")}));\nlist.remove(${i});\nSystem.out.println(list.get(${i}));`, after[i], "The item after the removed one slides into its spot.", `After removing index ${i}, the list is ${jstr(after)}, so index ${i} holds ${after[i]}.`);
    },
  },
  {
    skill: "Changing an array",
    tier: 2,
    make: (r) => {
      const a = nums(r, 4), k = r.int(0, 3), m = r.int(2, 3);
      return predict("Changing an array", `int[] nums = ${arr(a)};\nfor (int i = 0; i < nums.length; i++) {\n    nums[i] *= ${m};\n}\nSystem.out.println(nums[${k}]);`, a[k] * m, "Every item was multiplied before printing.", `nums[${k}] was ${a[k]}, times ${m} is ${a[k] * m}.`);
    },
  },
  {
    skill: "Looping backwards",
    tier: 2,
    make: (r) => {
      const a = nums(r, 4);
      return predict("Looping backwards", `int[] nums = ${arr(a)};\nfor (int i = nums.length - 1; i >= 0; i--) {\n    System.out.print(nums[i]);\n}`, [...a].reverse().join(""), "Start at the last index.", `Reading from index 3 down to 0 gives ${[...a].reverse().join("")}.`);
    },
  },
  fixed("Out of bounds", 2, () =>
    choice("Out of bounds", "What happens when this runs?", ["It crashes with ArrayIndexOutOfBoundsException", "It prints 0", "It prints 3", "It prints null"], 0, "What's the last valid index of a 3-item array?", "Valid indexes are 0, 1, 2. nums[3] doesn't exist, so Java throws an exception.", `int[] nums = {1, 2, 3};\nSystem.out.println(nums[nums.length]);`),
  ),
];

// ===================== World 6: Class Castle =====================
export const W5: Gen[] = [
  {
    skill: "2D array indexes",
    tier: 0,
    make: (r) => {
      const g = [nums(r, 3), nums(r, 3)], row = r.int(0, 1), col = r.int(0, 2);
      return predict("2D array indexes", `int[][] g = {${arr(g[0])}, ${arr(g[1])}};\nSystem.out.println(g[${row}][${col}]);`, g[row][col], "The first index is the row, the second is the column.", `Row ${row} is ${arr(g[row])}; column ${col} of it is ${g[row][col]}.`);
    },
  },
  {
    skill: "2D array size",
    tier: 0,
    make: (r) => {
      const rows = r.int(2, 4), cols = r.int(2, 5), askRows = r.next() < 0.5;
      return predict("2D array size", `int[][] g = new int[${rows}][${cols}];\nSystem.out.println(${askRows ? "g.length" : "g[0].length"});`, askRows ? rows : cols, "g.length is rows; g[0].length is columns.", askRows ? `There are ${rows} rows.` : `Each row has ${cols} columns.`);
    },
  },
  fixed("this keyword", 0, () =>
    choice("this keyword", "Inside a BankAccount method, how do you refer to this object's balance?", ["this.balance", "self.balance", "balance.this", "my.balance"], 0, "Java has a keyword for \"the current object\".", "this refers to the object the method was called on."),
  ),
  fixed("Row sums", 1, () =>
    fill("Row sums", "Add up every value in row r.", `int total = 0;\nfor (int c = 0; c < grid[r].length; c++) {\n    total += grid[r][___];\n}`, ["c"], "Which loop variable changes?", "The row r stays fixed while c walks across the columns.", { src: `int[][] grid = {{1, 2, 3}, {4, 5, 6}};\nint r = 1;\nint total = 0;\nfor (int c = 0; c < grid[r].length; c++) {\n    total += grid[r][___];\n}\nSystem.out.println(total);`, wrap: "main", expect: "15" }),
  ),
  {
    skill: "Recursion",
    tier: 1,
    make: (r) => {
      const n = r.int(3, 6);
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return predictWith("Recursion", `public int fact(int n) {\n    if (n <= 1) return 1;\n    return n * fact(n - 1);\n}`, f, "Each call uses a smaller n until n is 1.", `fact(${n}) = ${Array.from({ length: n }, (_, i) => n - i).join(" × ")} = ${f}.`, { src: `static int fact(int n) {\n    if (n <= 1) return 1;\n    return n * fact(n - 1);\n}\npublic static void main(String[] args) { System.out.println(fact(${n})); }`, wrap: "class" }, `What does fact(${n}) return?`);
    },
  },
  {
    skill: "Objects and methods",
    tier: 1,
    make: (r) => {
      const a = r.int(1, 9), b = r.int(1, 9), c = r.int(1, 5);
      const cls = `class Counter {\n    private int count;\n    public void add(int n) {\n        count += n;\n    }\n    public int get() {\n        return count;\n    }\n}`;
      const use = `Counter k = new Counter();\nk.add(${a});\nk.add(${b});\nk.add(-${c});\nSystem.out.println(k.get());`;
      return predictWith("Objects and methods", `${cls}\n\n// in main:\n${use}`, a + b - c, "count starts at 0 for a new object.", `0 + ${a} + ${b} - ${c} = ${a + b - c}.`, { src: `import java.util.*;\n${cls}\npublic class Main { public static void main(String[] args) {\n${use}\n} }`, wrap: "file" });
    },
  },
  fixed("Writing a class method", 1, () =>
    order(
      "Writing a class method",
      "Write a deposit method that ignores negative amounts.",
      ["public void deposit(double amount) {", "    if (amount > 0) {", "        this.balance += amount;", "    }", "}"],
      "Guard first, then change.",
      "Check amount > 0, and only then add it to this.balance.",
      { src: `class BankAccount {\n    private double balance;\n@@LINES@@\n    public double getBalance() { return balance; }\n}\npublic class Main { public static void main(String[] args) { BankAccount b = new BankAccount(); b.deposit(20); b.deposit(-5); System.out.println(b.getBalance()); } }`, wrap: "file", expect: "20.0" },
    ),
  ),
  {
    skill: "Tracing recursion",
    tier: 2,
    make: (r) => {
      const n = r.int(4, 9);
      let s = 0;
      for (let k = n; k > 0; k -= 2) s += k;
      return predictWith("Tracing recursion", `public int mystery(int n) {\n    if (n <= 0) return 0;\n    return n + mystery(n - 2);\n}`, s, "Write out each call until n hits 0 or below.", `mystery(${n}) adds ${Array.from({ length: Math.ceil(n / 2) }, (_, i) => n - 2 * i).join(" + ")} = ${s}.`, { src: `static int mystery(int n) {\n    if (n <= 0) return 0;\n    return n + mystery(n - 2);\n}\npublic static void main(String[] args) { System.out.println(mystery(${n})); }`, wrap: "class" }, `What does mystery(${n}) return?`);
    },
  },
  {
    skill: "Searching a grid",
    tier: 2,
    make: (r) => {
      const g = [nums(r, 3), nums(r, 3)], k = r.int(3, 6);
      const v = g.flat().filter((x) => x > k).length;
      return predict("Searching a grid", `int[][] g = {${arr(g[0])}, ${arr(g[1])}};\nint count = 0;\nfor (int[] row : g) {\n    for (int x : row) {\n        if (x > ${k}) count++;\n    }\n}\nSystem.out.println(count);`, v, "Check every value in every row.", `The values greater than ${k} are ${g.flat().filter((x) => x > k).join(", ") || "none"}: ${v}.`);
    },
  },
  fixed("Base cases", 2, () =>
    choice("Base cases", "What happens when you call countdown(3)?", ["StackOverflowError: it never stops", "It prints 3 2 1", "It prints 3 2 1 0", "It doesn't compile"], 0, "Where does the recursion stop?", "There's no base case, so it calls itself forever (3, 2, 1, 0, -1, ...) until the stack overflows.", `public void countdown(int n) {\n    System.out.print(n + " ");\n    countdown(n - 1);\n}`),
  ),
  {
    skill: "Power with recursion",
    tier: 2,
    make: (r) => {
      const b = r.int(2, 3), e = r.int(2, 5);
      return predictWith("Power with recursion", `public int pow(int b, int e) {\n    if (e == 0) return 1;\n    return b * pow(b, e - 1);\n}`, b ** e, "pow(b, 0) is 1. Build up from there.", `${b} multiplied by itself ${e} times is ${b ** e}.`, { src: `static int pow(int b, int e) {\n    if (e == 0) return 1;\n    return b * pow(b, e - 1);\n}\npublic static void main(String[] args) { System.out.println(pow(${b}, ${e})); }`, wrap: "class" }, `What does pow(${b}, ${e}) return?`);
    },
  },
];

// ===================== World 7: LeetCode Citadel =====================
export const W6: Gen[] = [
  {
    skill: "Two Sum (#1)",
    tier: 0,
    make: (r) => {
      // Build an array with exactly one pair that hits the target.
      for (;;) {
        const a = nums(r, 5, 1, 15), i = r.int(0, 3), j = r.int(i + 1, 4), t = a[i] + a[j];
        const pairs: string[] = [];
        for (let x = 0; x < 5; x++) for (let y = x + 1; y < 5; y++) if (a[x] + a[y] === t) pairs.push(`${x} ${y}`);
        if (pairs.length !== 1) continue;
        return predict("Two Sum (#1)", `int[] nums = ${arr(a)};\nint target = ${t};\nfor (int i = 0; i < nums.length; i++) {\n    for (int j = i + 1; j < nums.length; j++) {\n        if (nums[i] + nums[j] == target) {\n            System.out.println(i + " " + j);\n        }\n    }\n}`, pairs[0], "Find the two numbers that add to the target. Print their positions, not values.", `nums[${i}] + nums[${j}] = ${a[i]} + ${a[j]} = ${t}. This brute-force check is LeetCode #1.`);
      }
    },
  },
  {
    skill: "Running sum (#1480)",
    tier: 0,
    make: (r) => {
      const a = nums(r, 4);
      const out = a.map((_, i) => a.slice(0, i + 1).reduce((x, y) => x + y, 0));
      return predict("Running sum (#1480)", `int[] nums = ${arr(a)};\nfor (int i = 1; i < nums.length; i++) {\n    nums[i] += nums[i - 1];\n}\nSystem.out.println(Arrays.toString(nums));`, jstr(out), "Each spot becomes itself plus everything before it.", `Running totals of ${jstr(a)} are ${jstr(out)}.`);
    },
  },
  {
    skill: "Contains Duplicate (#217)",
    tier: 0,
    make: (r) => {
      const a = nums(r, 5, 1, r.next() < 0.5 ? 6 : 30);
      const v = new Set(a).size !== a.length;
      return predict("Contains Duplicate (#217)", `int[] nums = ${arr(a)};\nSet<Integer> seen = new HashSet<>();\nboolean dup = false;\nfor (int n : nums) {\n    if (!seen.add(n)) dup = true;\n}\nSystem.out.println(dup);`, v, "add() returns false when the value is already in the set.", v ? "A number repeats, so add() returned false at least once." : "Every number is different, so dup stays false.");
    },
  },
  {
    skill: "Best Time to Buy and Sell (#121)",
    tier: 1,
    make: (r) => {
      const p = nums(r, 6, 1, 12);
      let min = p[0], best = 0;
      for (const x of p) {
        min = Math.min(min, x);
        best = Math.max(best, x - min);
      }
      return predict("Best Time to Buy and Sell (#121)", `int[] prices = ${arr(p)};\nint minPrice = prices[0];\nint best = 0;\nfor (int p : prices) {\n    minPrice = Math.min(minPrice, p);\n    best = Math.max(best, p - minPrice);\n}\nSystem.out.println(best);`, best, "Track the cheapest price so far, and the best profit selling today.", `Buying at the lowest point before the highest later price gives ${best}.`);
    },
  },
  fixed("Best Time to Buy and Sell (#121)", 1, () =>
    fill("Best Time to Buy and Sell (#121)", "LeetCode 121: best profit so far.", `int minPrice = prices[0];\nint best = 0;\nfor (int p : prices) {\n    minPrice = Math.min(minPrice, p);\n    best = Math.max(best, p - ___);\n}`, ["minPrice"], "Profit is sell price minus buy price.", "You'd want to have bought at the lowest price seen so far.", { src: `int[] prices = {7, 1, 5, 3, 6, 4};\nint minPrice = prices[0];\nint best = 0;\nfor (int p : prices) {\n    minPrice = Math.min(minPrice, p);\n    best = Math.max(best, p - ___);\n}\nSystem.out.println(best);`, wrap: "main", expect: "5" }),
  ),
  {
    skill: "Max Consecutive Ones (#485)",
    tier: 1,
    make: (r) => {
      const a = Array.from({ length: 8 }, () => (r.next() < 0.6 ? 1 : 0));
      let best = 0, run = 0;
      for (const x of a) {
        run = x === 1 ? run + 1 : 0;
        best = Math.max(best, run);
      }
      return predict("Max Consecutive Ones (#485)", `int[] nums = ${arr(a)};\nint best = 0, run = 0;\nfor (int n : nums) {\n    if (n == 1) run++;\n    else run = 0;\n    best = Math.max(best, run);\n}\nSystem.out.println(best);`, best, "Find the longest unbroken streak of 1s.", `The longest run of 1s is ${best}.`);
    },
  },
  fixed("Valid Palindrome (#125)", 1, () =>
    choice("Valid Palindrome (#125)", "LeetCode 125: the two ends match. What comes next?", ["left++; right--;", "left--; right++;", "return true;", "break;"], 0, "Both pointers move toward the middle.", "Matching ends are fine, so move both pointers inward and keep checking.", `int left = 0, right = s.length() - 1;\nwhile (left < right) {\n    if (s.charAt(left) != s.charAt(right)) {\n        return false;\n    }\n    // ???\n}\nreturn true;`),
  ),
  fixed("Max Consecutive Ones (#485)", 1, () =>
    order("Max Consecutive Ones (#485)", "LeetCode 485: find the longest run of 1s.", ["int best = 0, run = 0;", "for (int n : nums) {", "    if (n == 1) run++;", "    else run = 0;", "    best = Math.max(best, run);", "}", "return best;"], "Grow the run on a 1, reset on a 0, and update the best every step.", "The run resets on 0s; best remembers the longest run seen.", { src: `static int longest(int[] nums) {\n@@LINES@@\n}\npublic static void main(String[] args) { System.out.println(longest(new int[]{1, 1, 0, 1, 1, 1})); }`, wrap: "class", expect: "3" }),
  ),
  {
    skill: "Reverse String (#344)",
    tier: 2,
    make: (r) => {
      const w = r.pick(WORDS);
      return predict("Reverse String (#344)", `char[] s = "${w}".toCharArray();\nint left = 0, right = s.length - 1;\nwhile (left < right) {\n    char tmp = s[left];\n    s[left] = s[right];\n    s[right] = tmp;\n    left++;\n    right--;\n}\nSystem.out.println(new String(s));`, [...w].reverse().join(""), "Swap the ends, then move inward.", `Swapping from the outside in reverses "${w}". That's LeetCode #344.`);
    },
  },
  {
    skill: "Missing Number (#268)",
    tier: 2,
    make: (r) => {
      const n = r.int(4, 7), miss = r.int(0, n);
      const a = r.shuffle(Array.from({ length: n + 1 }, (_, i) => i).filter((x) => x !== miss));
      return predict("Missing Number (#268)", `int[] nums = ${arr(a)};\nint n = nums.length;\nint expected = n * (n + 1) / 2;\nint actual = 0;\nfor (int x : nums) actual += x;\nSystem.out.println(expected - actual);`, miss, "0 + 1 + ... + n has a formula. Compare it with the real sum.", `The numbers 0..${n} should add to ${(n * (n + 1)) / 2}; they add to ${(n * (n + 1)) / 2 - miss}, so ${miss} is missing.`);
    },
  },
  fixed("Merge Sorted Array (#88)", 2, () =>
    choice("Merge Sorted Array (#88)", "LeetCode 88: nums1 has empty space at the end. Why fill it from the back?", ["So you never overwrite numbers you still need", "Java arrays can only be filled backwards", "It sorts the array automatically", "It uses less memory"], 0, "What's sitting at the front of nums1?", "The front of nums1 still holds numbers you haven't compared yet. Writing from the back only uses empty slots."),
  ),
  fixed("Big-O thinking", 2, () =>
    choice("Big-O thinking", "Two Sum with a nested loop checks every pair. Roughly how many checks for 1,000 numbers?", ["About 500,000", "About 1,000", "About 2,000", "About 10"], 0, "Every number is compared with every later number.", "That's n × (n - 1) / 2 pairs, about half a million. A HashMap solution does it in about 1,000 steps."),
  ),
];
