// World 5 (Array Caverns) expansion: 40 more templates on arrays, ArrayLists and 2D arrays.
// Every Java question is compiled and run by scripts/verify-questions.ts.
import { blank as f, mc as c, method as m } from "./ap-builders";
import { predict, type Gen, type Rng } from "./core";

const g = (skill: string, tier: 0 | 1 | 2, make: Gen["make"]): Gen => ({ skill, tier, make });
const nums = (r: Rng, n: number, lo = 1, hi = 9) => Array.from({ length: n }, () => r.int(lo, hi));
const lit = (a: (number | string)[]) => `{${a.join(", ")}}`;
const show = (a: (number | string)[]) => `[${a.join(", ")}]`;

export const W4_MORE: Gen[] = [
  // ---- Novice (10) ----
  g("Reading one element", 0, (r) => {
    const a = nums(r, 5), i = r.int(0, 4);
    return predict("Reading one element", `int[] a = ${lit(a)};\nSystem.out.println(a[${i}]);`, a[i], "Count from 0.", `Index ${i} holds ${a[i]}.`);
  }),
  g("How many elements", 0, (r) => {
    const a = nums(r, r.int(3, 7));
    return predict("How many elements", `int[] a = ${lit(a)};\nSystem.out.println(a.length);`, a.length, "length counts the elements (no parentheses for arrays).", `There are ${a.length} values.`);
  }),
  g("Changing one slot", 0, (r) => {
    const a = nums(r, 3), v = r.int(10, 20);
    return predict("Changing one slot", `int[] a = ${lit(a)};\na[1] = ${v};\nSystem.out.println(a[0] + a[1]);`, a[0] + v, "a[1] now holds the new value.", `${a[0]} + ${v} = ${a[0] + v}.`);
  }),
  g("First plus last", 0, (r) => {
    const a = nums(r, r.int(4, 6));
    return predict("First plus last", `int[] a = ${lit(a)};\nSystem.out.println(a[0] + a[a.length - 1]);`, a[0] + a[a.length - 1], "The last index is length - 1.", `${a[0]} + ${a[a.length - 1]}.`);
  }),
  g("Size after adding", 0, (r) => {
    const n = r.int(2, 5);
    return predict("Size after adding", `ArrayList<String> list = new ArrayList<>();\n${Array.from({ length: n }, (_, i) => `list.add("item${i}");`).join("\n")}\nSystem.out.println(list.size());`, n, "Each add puts one more item in the list.", `${n} adds → size ${n}.`);
  }),
  g("Getting from a list", 0, (r) => {
    const items = r.shuffle(["sword", "shield", "potion", "map"]).slice(0, 3);
    return predict("Getting from a list", `ArrayList<String> bag = new ArrayList<>();\n${items.map((x) => `bag.add("${x}");`).join("\n")}\nSystem.out.println(bag.get(1));`, items[1], "get(1) is the second item.", `Index 1 is ${items[1]}.`);
  }),
  g("String array element", 0, (r) => {
    const names = r.shuffle(["Ava", "Ben", "Cy", "Dee"]);
    return predict("String array element", `String[] names = ${lit(names.map((n) => `"${n}"`))};\nSystem.out.println(names[2]);`, names[2], "Index 2 is the third name.", `names[2] is ${names[2]}.`);
  }),
  g("Adding two elements", 0, (r) => {
    const a = nums(r, 4);
    return predict("Adding two elements", `int[] a = ${lit(a)};\nint s = a[1] + a[3];\nSystem.out.println(s);`, a[1] + a[3], "Find each index, then add.", `${a[1]} + ${a[3]}.`);
  }),
  c(0, "Making an int array", "Which line creates an array that holds 5 ints?", ["int[] a = new int[5];", "int a = new int[5];", "int[] a = int[5];", "int[5] a = new int[];"], 0, "The type is int[], and new int[5] makes room for 5 values (all starting at 0)."),
  g("Sum with for-each", 0, (r) => {
    const a = nums(r, 4);
    return predict("Sum with for-each", `int[] a = ${lit(a)};\nint total = 0;\nfor (int x : a) {\n    total += x;\n}\nSystem.out.println(total);`, a.reduce((s, x) => s + x, 0), "x takes each value in turn.", `${a.join(" + ")} = ${a.reduce((s, x) => s + x, 0)}.`);
  }),

  // ---- Intermediate (20) ----
  g("Counting even elements", 1, (r) => {
    const a = nums(r, 6, 1, 20);
    return predict("Counting even elements", `int[] a = ${lit(a)};\nint count = 0;\nfor (int x : a) {\n    if (x % 2 == 0) count++;\n}\nSystem.out.println(count);`, a.filter((x) => x % 2 === 0).length, "Count values with remainder 0 when divided by 2.", `Evens: ${a.filter((x) => x % 2 === 0).join(", ") || "none"}.`);
  }),
  g("Where the max is", 1, (r) => {
    let a: number[];
    do a = nums(r, 6, 1, 30); while (new Set(a).size !== a.length);
    const idx = a.indexOf(Math.max(...a));
    return predict("Where the max is", `int[] a = ${lit(a)};\nint best = 0;\nfor (int i = 1; i < a.length; i++) {\n    if (a[i] > a[best]) best = i;\n}\nSystem.out.println(best);`, idx, "best holds an index, not a value.", `The largest value ${a[idx]} is at index ${idx}.`);
  }),
  g("Doubling into a new array", 1, (r) => {
    const a = nums(r, 4);
    return predict("Doubling into a new array", `int[] a = ${lit(a)};\nint[] b = new int[a.length];\nfor (int i = 0; i < a.length; i++) {\n    b[i] = a[i] * 2;\n}\nSystem.out.println(b[2]);`, a[2] * 2, "b[i] is twice a[i].", `a[2] is ${a[2]}, so b[2] is ${a[2] * 2}.`);
  }),
  g("Inserting into a list", 1, (r) => {
    const [x, y, z] = r.shuffle(["ax", "bow", "cape", "dart"]);
    return predict("Inserting into a list", `ArrayList<String> list = new ArrayList<>();\nlist.add("${x}");\nlist.add("${y}");\nlist.add(1, "${z}");\nSystem.out.println(list);`, show([x, z, y]), "add(1, ...) puts the item at index 1 and shifts the rest right.", `${z} goes between ${x} and ${y}.`);
  }),
  g("Replacing with set", 1, (r) => {
    const a = nums(r, 3), v = r.int(10, 30);
    return predict("Replacing with set", `ArrayList<Integer> list = new ArrayList<>();\n${a.map((x) => `list.add(${x});`).join("\n")}\nlist.set(0, ${v});\nSystem.out.println(list.get(0) + list.size());`, v + 3, "set replaces; the size doesn't change.", `get(0) is now ${v}, size is still 3.`);
  }),
  g("Removing by index", 1, (r) => {
    const a = nums(r, 4, 10, 40), i = r.int(0, 3);
    return predict("Removing by index", `ArrayList<Integer> list = new ArrayList<>();\n${a.map((x) => `list.add(${x});`).join("\n")}\nlist.remove(${i});\nSystem.out.println(list);`, show(a.filter((_, j) => j !== i)), "Later items shift left to fill the gap.", `Index ${i} (${a[i]}) is removed.`);
  }),
  g("Average as a decimal", 1, (r) => {
    let a: number[];
    do a = nums(r, 4); while (a.reduce((s, x) => s + x, 0) % 4 === 0);
    const sum = a.reduce((s, x) => s + x, 0);
    return predict("Average as a decimal", `int[] a = ${lit(a)};\nint sum = 0;\nfor (int x : a) sum += x;\nSystem.out.println((double) sum / a.length);`, String(sum / 4), "Cast before dividing to keep the decimal.", `${sum} / 4 = ${sum / 4}.`);
  }),
  g("Values over a limit", 1, (r) => {
    const a = nums(r, 7, 1, 50), k = r.int(15, 35);
    return predict("Values over a limit", `int[] a = ${lit(a)};\nint n = 0;\nfor (int x : a) {\n    if (x > ${k}) n++;\n}\nSystem.out.println(n);`, a.filter((x) => x > k).length, "Count only values greater than the limit.", `Over ${k}: ${a.filter((x) => x > k).join(", ") || "none"}.`);
  }),
  g("Shifting left by one", 1, (r) => {
    const a = nums(r, 5);
    const b = [...a.slice(1), a[0]];
    return predict("Shifting left by one", `int[] a = ${lit(a)};\nint first = a[0];\nfor (int i = 0; i < a.length - 1; i++) {\n    a[i] = a[i + 1];\n}\na[a.length - 1] = first;\nSystem.out.println(Arrays.toString(a));`, show(b), "Save the first value before it's overwritten.", `Everything moves left; ${a[0]} wraps to the end.`);
  }),
  m(1, "Does it contain?", "static boolean has(int[] a, int target) {\n    for (int x : a) {\n        if (x == target) return true;\n    }\n    return false;\n}", 'has(new int[]{3, 5, 7}, 5) + " " + has(new int[]{3, 5, 7}, 4)', "true false", "5 is found and returns early; 4 isn't, so the loop finishes and returns false."),
  m(1, "Counting a value", "static int count(int[] a, int t) {\n    int n = 0;\n    for (int x : a) {\n        if (x == t) n++;\n    }\n    return n;\n}", "count(new int[]{1, 2, 2, 3, 2}, 2)", 3, "2 appears three times."),
  f(1, "The last index", "Fill in the operator so the code prints the last element.", "int[] a = {4, 8, 15, 16};\nSystem.out.println(a[a.length ___ 1]);", ["-"], "16", "The last index is length - 1."),
  f(1, "List size method", "Fill in the method that gives how many items are in the list.", 'ArrayList<String> list = new ArrayList<>();\nlist.add("a");\nlist.add("b");\nSystem.out.println(list.___());', ["size"], "2", "ArrayLists use size(); arrays use length."),
  c(1, "An index that crashes", "int[] a = new int[4]; Which index throws an ArrayIndexOutOfBoundsException?", ["0", "3", "4", "2"], 2, "Valid indexes are 0 to 3; 4 is one past the end."),
  g("Every other element", 1, (r) => {
    const a = nums(r, 7);
    return predict("Every other element", `int[] a = ${lit(a)};\nint sum = 0;\nfor (int i = 0; i < a.length; i += 2) {\n    sum += a[i];\n}\nSystem.out.println(sum);`, a.filter((_, i) => i % 2 === 0).reduce((s, x) => s + x, 0), "Indexes 0, 2, 4, 6.", `${a.filter((_, i) => i % 2 === 0).join(" + ")}.`);
  }),
  g("Joining names with dashes", 1, (r) => {
    const names = r.shuffle(["Ava", "Ben", "Cy", "Dee"]).slice(0, 3);
    return predict("Joining names with dashes", `String[] names = ${lit(names.map((n) => `"${n}"`))};\nString out = names[0];\nfor (int i = 1; i < names.length; i++) {\n    out += "-" + names[i];\n}\nSystem.out.println(out);`, names.join("-"), "A dash goes before every name after the first.", names.join("-"));
  }),
  g("Reading a 2D array", 1, (r) => {
    const g2 = [nums(r, 3), nums(r, 3)];
    const i = r.int(0, 1), j = r.int(0, 2);
    return predict("Reading a 2D array", `int[][] grid = {${lit(g2[0])}, ${lit(g2[1])}};\nSystem.out.println(grid[${i}][${j}]);`, g2[i][j], "The first index picks the row, the second the column.", `Row ${i}, column ${j}: ${g2[i][j]}.`);
  }),
  g("Rows and columns", 1, (r) => {
    const rows = r.int(2, 4), cols = r.int(2, 5);
    return predict("Rows and columns", `int[][] grid = new int[${rows}][${cols}];\nSystem.out.println(grid.length + " " + grid[0].length);`, `${rows} ${cols}`, "grid.length counts rows; grid[0].length counts columns.", `${rows} rows of ${cols}.`);
  }),
  g("Running totals", 1, (r) => {
    const a = nums(r, 5);
    const b = a.map((_, i) => a.slice(0, i + 1).reduce((s, x) => s + x, 0));
    return predict("Running totals", `int[] a = ${lit(a)};\nint[] b = new int[a.length];\nb[0] = a[0];\nfor (int i = 1; i < a.length; i++) {\n    b[i] = b[i - 1] + a[i];\n}\nSystem.out.println(Arrays.toString(b));`, show(b), "Each b[i] is the total so far.", show(b));
  }),
  g("Total letters in a list", 1, (r) => {
    const words = r.shuffle(["sword", "map", "lantern", "key", "potion"]).slice(0, 3);
    return predict("Total letters in a list", `ArrayList<String> list = new ArrayList<>();\n${words.map((w) => `list.add("${w}");`).join("\n")}\nint total = 0;\nfor (String w : list) {\n    total += w.length();\n}\nSystem.out.println(total);`, words.reduce((s, w) => s + w.length, 0), "Add up each word's length.", words.map((w) => w.length).join(" + "));
  }),

  // ---- Harder (10) ----
  g("Row sum in a grid", 2, (r) => {
    const grid = [nums(r, 3), nums(r, 3), nums(r, 3)];
    const row = r.int(0, 2);
    return predict("Row sum in a grid", `int[][] g = {${grid.map(lit).join(", ")}};\nint sum = 0;\nfor (int c = 0; c < g[${row}].length; c++) {\n    sum += g[${row}][c];\n}\nSystem.out.println(sum);`, grid[row].reduce((s, x) => s + x, 0), "Keep the row fixed and walk the columns.", `Row ${row}: ${grid[row].join(" + ")}.`);
  }),
  g("Column sum in a grid", 2, (r) => {
    const grid = [nums(r, 3), nums(r, 3), nums(r, 3)];
    const col = r.int(0, 2);
    return predict("Column sum in a grid", `int[][] g = {${grid.map(lit).join(", ")}};\nint sum = 0;\nfor (int row = 0; row < g.length; row++) {\n    sum += g[row][${col}];\n}\nSystem.out.println(sum);`, grid.reduce((s, row) => s + row[col], 0), "Keep the column fixed and walk the rows.", `Column ${col}: ${grid.map((row) => row[col]).join(" + ")}.`);
  }),
  g("Diagonal sum", 2, (r) => {
    const grid = [nums(r, 3), nums(r, 3), nums(r, 3)];
    return predict("Diagonal sum", `int[][] g = {${grid.map(lit).join(", ")}};\nint sum = 0;\nfor (int i = 0; i < g.length; i++) {\n    sum += g[i][i];\n}\nSystem.out.println(sum);`, grid[0][0] + grid[1][1] + grid[2][2], "g[i][i] walks from top-left to bottom-right.", `${grid[0][0]} + ${grid[1][1]} + ${grid[2][2]}.`);
  }),
  g("Rotating right by one", 2, (r) => {
    const a = nums(r, 5);
    const b = [a[4], ...a.slice(0, 4)];
    return predict("Rotating right by one", `int[] a = ${lit(a)};\nint last = a[a.length - 1];\nfor (int i = a.length - 1; i > 0; i--) {\n    a[i] = a[i - 1];\n}\na[0] = last;\nSystem.out.println(Arrays.toString(a));`, show(b), "Go backwards so nothing is overwritten before it's moved.", `${a[4]} wraps to the front.`);
  }),
  g("Reversing in place", 2, (r) => {
    const a = nums(r, r.int(4, 6));
    return predict("Reversing in place", `int[] a = ${lit(a)};\nfor (int i = 0; i < a.length / 2; i++) {\n    int t = a[i];\n    a[i] = a[a.length - 1 - i];\n    a[a.length - 1 - i] = t;\n}\nSystem.out.println(Arrays.toString(a));`, show([...a].reverse()), "Swap pairs from the outside in, stopping at the middle.", show([...a].reverse()));
  }),
  g("Second largest value", 2, (r) => {
    let a: number[];
    do a = nums(r, 6, 1, 40); while (new Set(a).size !== a.length);
    const s = [...a].sort((x, y) => y - x)[1];
    return predict("Second largest value", `int[] a = ${lit(a)};\nint first = Integer.MIN_VALUE, second = Integer.MIN_VALUE;\nfor (int x : a) {\n    if (x > first) {\n        second = first;\n        first = x;\n    } else if (x > second) {\n        second = x;\n    }\n}\nSystem.out.println(second);`, s, "When a new max appears, the old max becomes second.", `Sorted high to low: ${[...a].sort((x, y) => y - x).join(", ")}.`);
  }),
  g("Distinct values when sorted", 2, (r) => {
    const a = nums(r, 8, 1, 5).sort((x, y) => x - y);
    return predict("Distinct values when sorted", `int[] a = ${lit(a)};\nint distinct = 1;\nfor (int i = 1; i < a.length; i++) {\n    if (a[i] != a[i - 1]) distinct++;\n}\nSystem.out.println(distinct);`, new Set(a).size, "In a sorted array, a new value starts wherever it differs from the one before.", `Distinct: ${[...new Set(a)].join(", ")}.`);
  }),
  m(2, "Sorted check", "static boolean isSorted(int[] a) {\n    for (int i = 1; i < a.length; i++) {\n        if (a[i] < a[i - 1]) return false;\n    }\n    return true;\n}", 'isSorted(new int[]{1, 3, 3, 7}) + " " + isSorted(new int[]{4, 2, 9})', "true false", "Equal neighbors are fine; 2 < 4 breaks the order."),
  g("Removing every copy", 2, (r) => {
    const a = nums(r, 6, 1, 3), t = r.int(1, 3);
    return predict("Removing every copy", `ArrayList<Integer> list = new ArrayList<>();\n${a.map((x) => `list.add(${x});`).join("\n")}\nfor (int i = list.size() - 1; i >= 0; i--) {\n    if (list.get(i) == ${t}) list.remove(i);\n}\nSystem.out.println(list);`, show(a.filter((x) => x !== t)), "Going backwards means removals don't skip anything.", `All ${t}s are removed.`);
  }),
  g("Merging sorted arrays", 2, (r) => {
    const a = nums(r, 3, 1, 20).sort((x, y) => x - y), b = nums(r, 3, 1, 20).sort((x, y) => x - y);
    const out = [...a, ...b].sort((x, y) => x - y);
    return predict("Merging sorted arrays", `int[] a = ${lit(a)}, b = ${lit(b)};\nint[] out = new int[a.length + b.length];\nint i = 0, j = 0, k = 0;\nwhile (i < a.length && j < b.length) {\n    if (a[i] <= b[j]) out[k++] = a[i++];\n    else out[k++] = b[j++];\n}\nwhile (i < a.length) out[k++] = a[i++];\nwhile (j < b.length) out[k++] = b[j++];\nSystem.out.println(Arrays.toString(out));`, show(out), "Always take the smaller front value.", show(out));
  }),
];
