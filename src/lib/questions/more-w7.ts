// World 7 (LeetCode Citadel) expansion: 40 more templates that introduce classic LeetCode
// problems with AP-level Java. Problem numbers refer to leetcode.com. Verified by
// scripts/verify-questions.ts.
import { mc as c, method as m } from "./ap-builders";
import { predict, predictWith, type Gen, type Rng } from "./core";

const g = (skill: string, tier: 0 | 1 | 2, make: Gen["make"]): Gen => ({ skill, tier, make });
const nums = (r: Rng, n: number, lo = 1, hi = 9) => Array.from({ length: n }, () => r.int(lo, hi));
const lit = (a: number[]) => `{${a.join(", ")}}`;
const show = (a: (number | string | boolean)[]) => `[${a.join(", ")}]`;
const fn = (skill: string, decl: string, call: string, answer: string | number | boolean, explain: string) =>
  predictWith(skill, `${decl}\n// In main:\nSystem.out.println(${call});`, answer, "Trace the loop with the example input, one step at a time.", explain, { src: `${decl}\npublic static void main(String[] args) { System.out.println(${call}); }`, wrap: "class" });

export const W6_MORE: Gen[] = [
  // ---- Novice (10): short warm-up problems ----
  g("Fizz Buzz (#412)", 0, (r) => {
    const n = r.pick([3, 5, 9, 10, 15, 7, 30]);
    const v = n % 15 === 0 ? "FizzBuzz" : n % 3 === 0 ? "Fizz" : n % 5 === 0 ? "Buzz" : String(n);
    return predict("Fizz Buzz (#412)", `int i = ${n};\nString s;\nif (i % 15 == 0) s = "FizzBuzz";\nelse if (i % 3 == 0) s = "Fizz";\nelse if (i % 5 == 0) s = "Buzz";\nelse s = "" + i;\nSystem.out.println(s);`, v, "Multiples of both 3 and 5 are checked first.", `${n} → ${v}.`);
  }),
  g("Shuffle the Array (#1470)", 0, (r) => {
    const n = 3, a = nums(r, 2 * n);
    const out = [0, 1, 2].flatMap((i) => [a[i], a[i + n]]);
    return fn("Shuffle the Array (#1470)", "static int[] shuffle(int[] nums, int n) {\n    int[] ans = new int[2 * n];\n    for (int i = 0; i < n; i++) {\n        ans[2 * i] = nums[i];\n        ans[2 * i + 1] = nums[i + n];\n    }\n    return ans;\n}", `Arrays.toString(shuffle(new int[]${lit(a)}, ${n}))`, show(out), "Interleave the first half with the second half: x1, y1, x2, y2, ...");
  }),
  g("Concatenation of Array (#1929)", 0, (r) => {
    const a = nums(r, 3);
    return fn("Concatenation of Array (#1929)", "static int[] concat(int[] nums) {\n    int n = nums.length;\n    int[] ans = new int[2 * n];\n    for (int i = 0; i < n; i++) {\n        ans[i] = nums[i];\n        ans[i + n] = nums[i];\n    }\n    return ans;\n}", `Arrays.toString(concat(new int[]${lit(a)}))`, show([...a, ...a]), "The array is written twice in a row.");
  }),
  g("Array from Permutation (#1920)", 0, (r) => {
    const a = r.shuffle([0, 1, 2, 3, 4]);
    return fn("Array from Permutation (#1920)", "static int[] build(int[] nums) {\n    int[] ans = new int[nums.length];\n    for (int i = 0; i < nums.length; i++) {\n        ans[i] = nums[nums[i]];\n    }\n    return ans;\n}", `Arrays.toString(build(new int[]${lit(a)}))`, show(a.map((x) => a[x])), "Each answer looks up nums at the index nums[i].");
  }),
  m(0, "Defanging an IP Address (#1108)", 'static String defang(String ip) {\n    String out = "";\n    for (int i = 0; i < ip.length(); i++) {\n        String ch = ip.substring(i, i + 1);\n        out += ch.equals(".") ? "[.]" : ch;\n    }\n    return out;\n}', 'defang("1.1.1.1")', "1[.]1[.]1[.]1", "Every dot becomes [.]; other characters are copied."),
  g("Kids With the Most Candies (#1431)", 0, (r) => {
    const a = nums(r, 4, 1, 8), extra = r.int(1, 4);
    const max = Math.max(...a);
    return fn("Kids With the Most Candies (#1431)", "static String check(int[] candies, int extra) {\n    int max = 0;\n    for (int c : candies) max = Math.max(max, c);\n    String out = \"\";\n    for (int c : candies) out += (c + extra >= max) ? \"T\" : \"F\";\n    return out;\n}", `check(new int[]${lit(a)}, ${extra})`, a.map((x) => (x + extra >= max ? "T" : "F")).join(""), `The most anyone has is ${max}; each kid is checked with ${extra} extra.`);
  }),
  g("Steps to Reduce to Zero (#1342)", 0, (r) => {
    const n0 = r.int(6, 40);
    let n = n0, steps = 0;
    while (n > 0) { n = n % 2 === 0 ? n / 2 : n - 1; steps++; }
    return fn("Steps to Reduce to Zero (#1342)", "static int steps(int n) {\n    int s = 0;\n    while (n > 0) {\n        if (n % 2 == 0) n /= 2;\n        else n -= 1;\n        s++;\n    }\n    return s;\n}", `steps(${n0})`, steps, `Halve when even, subtract 1 when odd: ${steps} steps.`);
  }),
  g("Jewels and Stones (#771)", 0, (r) => {
    const [jewels, stones] = r.pick([["aA", "aAAbbbb"], ["z", "ZZ"], ["ab", "aabbcc"], ["xy", "xyzzyx"]] as const);
    const v = [...stones].filter((s) => jewels.includes(s)).length;
    return fn("Jewels and Stones (#771)", "static int count(String jewels, String stones) {\n    int n = 0;\n    for (int i = 0; i < stones.length(); i++) {\n        if (jewels.indexOf(stones.substring(i, i + 1)) >= 0) n++;\n    }\n    return n;\n}", `count("${jewels}", "${stones}")`, v, "Count stones whose letter appears in jewels (case matters).");
  }),
  g("Most Words in a Sentence (#2114)", 0, () =>
    fn("Most Words in a Sentence (#2114)", "static int most(String[] sentences) {\n    int best = 0;\n    for (String s : sentences) {\n        int words = 1;\n        for (int i = 0; i < s.length(); i++) {\n            if (s.substring(i, i + 1).equals(\" \")) words++;\n        }\n        best = Math.max(best, words);\n    }\n    return best;\n}", 'most(new String[]{"code every day", "win", "keep the streak going"})', 4, "Words = spaces + 1; the longest sentence has 4 words."),
  ),
  g("Find the Highest Altitude (#1732)", 0, (r) => {
    const gain = nums(r, 5, -5, 5);
    let alt = 0, best = 0;
    for (const x of gain) { alt += x; best = Math.max(best, alt); }
    return fn("Find the Highest Altitude (#1732)", "static int highest(int[] gain) {\n    int alt = 0, best = 0;\n    for (int g : gain) {\n        alt += g;\n        best = Math.max(best, alt);\n    }\n    return best;\n}", `highest(new int[]${lit(gain)})`, best, "Track the running altitude (starting at 0) and its maximum.");
  }),

  // ---- Intermediate (20) ----
  g("Valid Anagram (#242)", 1, (r) => {
    const [a, b] = r.pick([["listen", "silent"], ["rat", "car"], ["evil", "vile"], ["code", "coed"], ["aab", "abb"]] as const);
    const v = [...a].sort().join("") === [...b].sort().join("");
    return fn("Valid Anagram (#242)", "static boolean anagram(String s, String t) {\n    if (s.length() != t.length()) return false;\n    String rest = t;\n    for (int i = 0; i < s.length(); i++) {\n        int k = rest.indexOf(s.substring(i, i + 1));\n        if (k < 0) return false;\n        rest = rest.substring(0, k) + rest.substring(k + 1);\n    }\n    return true;\n}", `anagram("${a}", "${b}")`, v, "Each letter of s must be found (and used up) in t.");
  }),
  g("Length of Last Word (#58)", 1, (r) => {
    const s = r.pick(["Hello World", "fly me   to the moon  ", "code warrior"]);
    const v = s.trim().split(/\s+/).pop()!.length;
    return fn("Length of Last Word (#58)", "static int lastWord(String s) {\n    int i = s.length() - 1, len = 0;\n    while (i >= 0 && s.substring(i, i + 1).equals(\" \")) i--;\n    while (i >= 0 && !s.substring(i, i + 1).equals(\" \")) { len++; i--; }\n    return len;\n}", `lastWord("${s}")`, v, "Skip trailing spaces, then count letters until the next space.");
  }),
  g("Fibonacci Number (#509)", 1, (r) => {
    const n = r.int(5, 15);
    let a = 0, b = 1;
    for (let i = 0; i < n; i++) [a, b] = [b, a + b];
    return fn("Fibonacci Number (#509)", "static int fib(int n) {\n    int a = 0, b = 1;\n    for (int i = 0; i < n; i++) {\n        int t = a + b;\n        a = b;\n        b = t;\n    }\n    return a;\n}", `fib(${n})`, a, "Keep only the last two values; no recursion needed.");
  }),
  g("Power of Two (#231)", 1, (r) => {
    const n = r.pick([1, 6, 16, 24, 64, 96, 128]);
    const v = (n & (n - 1)) === 0;
    return fn("Power of Two (#231)", "static boolean power(int n) {\n    if (n <= 0) return false;\n    while (n % 2 == 0) n /= 2;\n    return n == 1;\n}", `power(${n})`, v, "Divide out every 2; a power of two ends at 1.");
  }),
  g("Palindrome Number (#9)", 1, (r) => {
    const n = r.pick([121, -121, 10, 1331, 12321, 123]);
    const v = n >= 0 && String(n) === [...String(n)].reverse().join("");
    return fn("Palindrome Number (#9)", "static boolean pal(int x) {\n    if (x < 0) return false;\n    int rev = 0, m = x;\n    while (m > 0) {\n        rev = rev * 10 + m % 10;\n        m /= 10;\n    }\n    return rev == x;\n}", `pal(${n})`, v, "Negative numbers never read the same backwards because of the minus sign.");
  }),
  g("Roman to Integer (#13)", 1, (r) => {
    const [s, v] = r.pick([["III", 3], ["IV", 4], ["IX", 9], ["LVIII", 58], ["XLII", 42]] as const);
    return fn("Roman to Integer (#13)", 'static int value(String c) {\n    return "IVXLCDM".indexOf(c) < 0 ? 0 : new int[]{1, 5, 10, 50, 100, 500, 1000}["IVXLCDM".indexOf(c)];\n}\nstatic int roman(String s) {\n    int total = 0;\n    for (int i = 0; i < s.length(); i++) {\n        int v = value(s.substring(i, i + 1));\n        if (i + 1 < s.length() && v < value(s.substring(i + 1, i + 2))) total -= v;\n        else total += v;\n    }\n    return total;\n}', `roman("${s}")`, v, "A smaller symbol before a bigger one is subtracted.");
  }),
  g("Merge Strings Alternately (#1768)", 1, (r) => {
    const [a, b] = r.pick([["abc", "pqr"], ["ab", "pqrs"], ["abcd", "pq"]] as const);
    let out = "";
    for (let i = 0; i < Math.max(a.length, b.length); i++) out += (a[i] ?? "") + (b[i] ?? "");
    return fn("Merge Strings Alternately (#1768)", 'static String merge(String a, String b) {\n    String out = "";\n    for (int i = 0; i < Math.max(a.length(), b.length()); i++) {\n        if (i < a.length()) out += a.substring(i, i + 1);\n        if (i < b.length()) out += b.substring(i, i + 1);\n    }\n    return out;\n}', `merge("${a}", "${b}")`, out, "Take one letter from each in turn; leftovers go at the end.");
  }),
  g("Sign of the Product (#1822)", 1, (r) => {
    const a = nums(r, 5, -5, 5);
    const neg = a.filter((x) => x < 0).length;
    const v = a.includes(0) ? 0 : neg % 2 ? -1 : 1;
    return fn("Sign of the Product (#1822)", "static int sign(int[] nums) {\n    int s = 1;\n    for (int x : nums) {\n        if (x == 0) return 0;\n        if (x < 0) s = -s;\n    }\n    return s;\n}", `sign(new int[]${lit(a)})`, v, "Don't multiply (it can overflow); just flip the sign for each negative.");
  }),
  g("Count Odds in a Range (#1523)", 1, (r) => {
    const lo = r.int(0, 20), hi = lo + r.int(0, 20);
    const v = Math.trunc((hi + 1) / 2) - Math.trunc(lo / 2);
    return fn("Count Odds in a Range (#1523)", "static int countOdds(int low, int high) {\n    return (high + 1) / 2 - low / 2;\n}", `countOdds(${lo}, ${hi})`, v, "Odds up to high minus odds below low, with no loop.");
  }),
  g("Ransom Note (#383)", 1, (r) => {
    const [note, mag] = r.pick([["a", "b"], ["aa", "ab"], ["aa", "aab"], ["code", "edocx"]] as const);
    let rest = mag, ok = true;
    for (const ch of note) { const k = rest.indexOf(ch); if (k < 0) { ok = false; break; } rest = rest.slice(0, k) + rest.slice(k + 1); }
    return fn("Ransom Note (#383)", "static boolean canBuild(String note, String mag) {\n    for (int i = 0; i < note.length(); i++) {\n        int k = mag.indexOf(note.substring(i, i + 1));\n        if (k < 0) return false;\n        mag = mag.substring(0, k) + mag.substring(k + 1);\n    }\n    return true;\n}", `canBuild("${note}", "${mag}")`, ok, "Each magazine letter can be used once, so remove it after using it.");
  }),
  g("Balanced Parentheses (#20)", 1, (r) => {
    const s = r.pick(["(())", "(()", "())(", "()()", "((()))"]);
    let d = 0, ok = true;
    for (const ch of s) { d += ch === "(" ? 1 : -1; if (d < 0) ok = false; }
    ok = ok && d === 0;
    return fn("Balanced Parentheses (#20)", 'static boolean balanced(String s) {\n    int depth = 0;\n    for (int i = 0; i < s.length(); i++) {\n        if (s.substring(i, i + 1).equals("(")) depth++;\n        else depth--;\n        if (depth < 0) return false;\n    }\n    return depth == 0;\n}', `balanced("${s}")`, ok, "Depth can never go negative, and must end at 0. (With one bracket type a counter works; #20 uses a stack for several types.)");
  }),
  g("Pascal's Triangle Row (#119)", 1, (r) => {
    const k = r.int(2, 5);
    const row = [1];
    for (let i = 0; i < k; i++) { for (let j = row.length - 1; j > 0; j--) row[j] += row[j - 1]; row.push(1); }
    return fn("Pascal's Triangle Row (#119)", "static String row(int k) {\n    int[] r = new int[k + 1];\n    r[0] = 1;\n    for (int i = 1; i <= k; i++) {\n        for (int j = i; j > 0; j--) r[j] += r[j - 1];\n    }\n    return Arrays.toString(r);\n}", `row(${k})`, show(row), "Each entry becomes itself plus its left neighbor, updated right to left.");
  }),
  g("Sum of Unique Elements (#1748)", 1, (r) => {
    const a = nums(r, 6, 1, 5);
    const v = a.filter((x) => a.indexOf(x) === a.lastIndexOf(x)).reduce((s, x) => s + x, 0);
    return fn("Sum of Unique Elements (#1748)", "static int sumUnique(int[] nums) {\n    int sum = 0;\n    for (int i = 0; i < nums.length; i++) {\n        int count = 0;\n        for (int x : nums) if (x == nums[i]) count++;\n        if (count == 1) sum += nums[i];\n    }\n    return sum;\n}", `sumUnique(new int[]${lit(a)})`, v, "Add only values that appear exactly once.");
  }),
  g("Two Sum II, sorted (#167)", 1, (r) => {
    const a = [...new Set(nums(r, 7, 1, 20))].sort((x, y) => x - y);
    const i0 = r.int(0, a.length - 2), j0 = r.int(i0 + 1, a.length - 1);
    const target = a[i0] + a[j0];
    let i = 0, j = a.length - 1;
    while (a[i] + a[j] !== target) { if (a[i] + a[j] < target) i++; else j--; }
    return fn("Two Sum II, sorted (#167)", "static String twoSum(int[] a, int target) {\n    int i = 0, j = a.length - 1;\n    while (a[i] + a[j] != target) {\n        if (a[i] + a[j] < target) i++;\n        else j--;\n    }\n    return (i + 1) + \",\" + (j + 1);\n}", `twoSum(new int[]${lit(a)}, ${target})`, `${i + 1},${j + 1}`, "Too small: move the left pointer up. Too big: move the right one down. (Answers are 1-indexed.)");
  }),
  g("First Bad Version (#278)", 1, (r) => {
    const n = 8, bad = r.int(2, 8);
    return fn("First Bad Version (#278)", `static int firstBad(boolean[] isBad) {\n    int lo = 1, hi = isBad.length;\n    while (lo < hi) {\n        int mid = (lo + hi) / 2;\n        if (isBad[mid - 1]) hi = mid;\n        else lo = mid + 1;\n    }\n    return lo;\n}`, `firstBad(new boolean[]{${Array.from({ length: n }, (_, i) => i + 1 >= bad).join(", ")}})`, bad, "Binary search for the first true: a bad middle means the answer is at or before it.");
  }),
  g("Count Primes (#204)", 1, (r) => {
    const n = r.pick([10, 20, 30, 50]);
    const v = Array.from({ length: n }, (_, i) => i).filter((x) => x > 1 && Array.from({ length: x - 2 }, (_, k) => k + 2).every((d) => x % d)).length;
    return fn("Count Primes (#204)", "static int countPrimes(int n) {\n    boolean[] composite = new boolean[n];\n    int count = 0;\n    for (int i = 2; i < n; i++) {\n        if (!composite[i]) {\n            count++;\n            for (int j = i * i; j < n; j += i) composite[j] = true;\n        }\n    }\n    return count;\n}", `countPrimes(${n})`, v, "The sieve crosses out multiples of each prime it finds; count the survivors below n.");
  }),
  g("Add Digits (#258)", 1, (r) => {
    const n0 = r.int(10, 999);
    let n = n0;
    while (n >= 10) n = [...String(n)].reduce((s, d) => s + Number(d), 0);
    return fn("Add Digits (#258)", "static int addDigits(int n) {\n    while (n >= 10) {\n        int s = 0;\n        while (n > 0) { s += n % 10; n /= 10; }\n        n = s;\n    }\n    return n;\n}", `addDigits(${n0})`, n, "Keep summing digits until one digit is left.");
  }),
  g("Happy Number (#202)", 1, (r) => {
    const n0 = r.pick([1, 2, 4, 7, 19, 20]);
    let n = n0, steps = 0;
    while (n !== 1 && steps < 20) { n = [...String(n)].reduce((s, d) => s + Number(d) ** 2, 0); steps++; }
    return fn("Happy Number (#202)", "static boolean happy(int n) {\n    int steps = 0;\n    while (n != 1 && steps < 20) {\n        int s = 0;\n        while (n > 0) { int d = n % 10; s += d * d; n /= 10; }\n        n = s;\n        steps++;\n    }\n    return n == 1;\n}", `happy(${n0})`, n === 1, "Replace n with the sum of its digits' squares; happy numbers reach 1. (Here, a step limit catches the loops.)");
  }),
  g("Valid Mountain Array (#941)", 1, (r) => {
    const a = r.pick([[0, 3, 2, 1], [3, 5, 5], [2, 1], [0, 2, 3, 4, 5, 2, 1, 0], [0, 1, 2, 3]] as const) as number[];
    let i = 0;
    while (i + 1 < a.length && a[i] < a[i + 1]) i++;
    const peak = i;
    while (i + 1 < a.length && a[i] > a[i + 1]) i++;
    const v = peak > 0 && peak < a.length - 1 && i === a.length - 1;
    return fn("Valid Mountain Array (#941)", "static boolean mountain(int[] a) {\n    int i = 0;\n    while (i + 1 < a.length && a[i] < a[i + 1]) i++;\n    int peak = i;\n    while (i + 1 < a.length && a[i] > a[i + 1]) i++;\n    return peak > 0 && peak < a.length - 1 && i == a.length - 1;\n}", `mountain(new int[]${lit(a)})`, v, "Walk up while rising, then down while falling; a mountain uses up the whole array and has a real peak.");
  }),
  c(1, "Big-O of nested loops", "for (int i = 0; i < n; i++)\n  for (int j = 0; j < n; j++)\n    count++;\nHow does the running time grow with n?", ["O(n)", "O(n²)", "O(log n)", "O(1)"], 1, "The inner loop runs n times for each of n outer passes: n × n steps."),

  // ---- Harder (10) ----
  c(2, "Big-O of binary search", "Binary search on a sorted array of n items halves the range each step. What is its running time?", ["O(n)", "O(n²)", "O(log n)", "O(n log n)"], 2, "Halving n until 1 takes about log₂ n steps; 1,000,000 items need only about 20."),
  g("Maximum Subarray (#53)", 2, (r) => {
    const a = nums(r, 7, -6, 6);
    let best = a[0], cur = a[0];
    for (let i = 1; i < a.length; i++) { cur = Math.max(a[i], cur + a[i]); best = Math.max(best, cur); }
    return fn("Maximum Subarray (#53)", "static int maxSub(int[] a) {\n    int best = a[0], cur = a[0];\n    for (int i = 1; i < a.length; i++) {\n        cur = Math.max(a[i], cur + a[i]);\n        best = Math.max(best, cur);\n    }\n    return best;\n}", `maxSub(new int[]${lit(a)})`, best, "Kadane: either extend the current run or start fresh at a[i].");
  }),
  g("Longest Common Prefix (#14)", 2, (r) => {
    const words = r.pick([["flower", "flow", "flight"], ["dog", "racecar", "car"], ["code", "coder", "codeword"], ["inter", "internet", "interval"]] as const);
    let p: string = words[0];
    for (const w of words) while (!w.startsWith(p)) p = p.slice(0, -1);
    return fn("Longest Common Prefix (#14)", "static String prefix(String[] words) {\n    String p = words[0];\n    for (String w : words) {\n        while (w.indexOf(p) != 0) p = p.substring(0, p.length() - 1);\n    }\n    return p;\n}", `"[" + prefix(new String[]{${words.map((w) => `"${w}"`).join(", ")}}) + "]"`, `[${p}]`, "Shorten the prefix until every word starts with it.");
  }),
  g("Rotate Array (#189)", 2, (r) => {
    const a = nums(r, 6), k = r.int(1, 4);
    const out = a.map((_, i) => a[(i - k + a.length * 2) % a.length]);
    return fn("Rotate Array (#189)", "static void reverse(int[] a, int i, int j) {\n    while (i < j) { int t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; }\n}\nstatic String rotate(int[] a, int k) {\n    k %= a.length;\n    reverse(a, 0, a.length - 1);\n    reverse(a, 0, k - 1);\n    reverse(a, k, a.length - 1);\n    return Arrays.toString(a);\n}", `rotate(new int[]${lit(a)}, ${k})`, show(out), "Reverse all, then reverse the first k and the rest: the array rotates right by k.");
  }),
  g("Disappeared Numbers (#448)", 2, (r) => {
    const n = 6;
    const a = nums(r, n, 1, n);
    const missing = Array.from({ length: n }, (_, i) => i + 1).filter((x) => !a.includes(x));
    return fn("Disappeared Numbers (#448)", "static String missing(int[] nums) {\n    boolean[] seen = new boolean[nums.length + 1];\n    for (int x : nums) seen[x] = true;\n    ArrayList<Integer> out = new ArrayList<>();\n    for (int v = 1; v <= nums.length; v++) if (!seen[v]) out.add(v);\n    return out.toString();\n}", `missing(new int[]${lit(a)})`, show(missing), "Mark what appears, then list the values 1..n that were never marked.");
  }),
  g("Can Place Flowers (#605)", 2, (r) => {
    const [bed, k] = r.pick([[[1, 0, 0, 0, 1], 1], [[1, 0, 0, 0, 1], 2], [[0, 0, 1, 0, 0], 2], [[0, 0, 0, 0, 0], 3]] as const) as [number[], number];
    const b = [...bed];
    let placed = 0;
    for (let i = 0; i < b.length; i++) if (b[i] === 0 && (i === 0 || b[i - 1] === 0) && (i === b.length - 1 || b[i + 1] === 0)) { b[i] = 1; placed++; }
    return fn("Can Place Flowers (#605)", "static boolean canPlace(int[] bed, int n) {\n    int placed = 0;\n    for (int i = 0; i < bed.length; i++) {\n        boolean left = i == 0 || bed[i - 1] == 0;\n        boolean right = i == bed.length - 1 || bed[i + 1] == 0;\n        if (bed[i] == 0 && left && right) { bed[i] = 1; placed++; }\n    }\n    return placed >= n;\n}", `canPlace(new int[]${lit(bed)}, ${k})`, placed >= k, "Plant greedily wherever both neighbors are empty, then compare with n.");
  }),
  g("Longest Substring Without Repeats (#3)", 2, (r) => {
    const s = r.pick(["abcabcbb", "bbbbb", "pwwkew", "dvdf", "abcdef"]);
    let best = 0, start = 0;
    for (let i = 0; i < s.length; i++) { const k = s.slice(start, i).indexOf(s[i]); if (k >= 0) start += k + 1; best = Math.max(best, i - start + 1); }
    return fn("Longest Substring Without Repeats (#3)", "static int longest(String s) {\n    int best = 0, start = 0;\n    for (int i = 0; i < s.length(); i++) {\n        int k = s.substring(start, i).indexOf(s.substring(i, i + 1));\n        if (k >= 0) start += k + 1;\n        best = Math.max(best, i - start + 1);\n    }\n    return best;\n}", `longest("${s}")`, best, "Sliding window: when a letter repeats, move the start just past its earlier copy.");
  }),
  g("Next Greater Element (#496)", 2, (r) => {
    const a = [...new Set(nums(r, 6, 1, 15))];
    const out = a.map((x, i) => a.slice(i + 1).find((y) => y > x) ?? -1);
    return fn("Next Greater Element (#496)", "static String nextGreater(int[] a) {\n    int[] out = new int[a.length];\n    for (int i = 0; i < a.length; i++) {\n        out[i] = -1;\n        for (int j = i + 1; j < a.length; j++) {\n            if (a[j] > a[i]) { out[i] = a[j]; break; }\n        }\n    }\n    return Arrays.toString(out);\n}", `nextGreater(new int[]${lit(a)})`, show(out), "For each value, scan right for the first bigger one; none means -1.");
  }),
  g("Matrix Diagonal Sum (#1572)", 2, (r) => {
    const n = r.pick([3, 4]);
    const mtx = Array.from({ length: n }, () => nums(r, n));
    let v = 0;
    for (let i = 0; i < n; i++) { v += mtx[i][i]; if (i !== n - 1 - i) v += mtx[i][n - 1 - i]; }
    return fn("Matrix Diagonal Sum (#1572)", "static int diag(int[][] m) {\n    int n = m.length, s = 0;\n    for (int i = 0; i < n; i++) {\n        s += m[i][i];\n        if (i != n - 1 - i) s += m[i][n - 1 - i];\n    }\n    return s;\n}", `diag(new int[][]{${mtx.map(lit).join(", ")}})`, v, "Add both diagonals, counting a shared center cell only once.");
  }),
  c(2, "Big-O of a two-pointer scan", "Two pointers start at the ends of a sorted array and only move toward each other, one step per loop pass. What's the running time?", ["O(n)", "O(n²)", "O(log n)", "O(1)"], 0, "Each pass moves one pointer, and they can meet after at most n moves, so it's linear."),
];
