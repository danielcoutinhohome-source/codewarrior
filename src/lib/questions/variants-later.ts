import { expand, ints, literal, text, values, type Family } from "./variants-core";

const strings: Family[] = [
  { skill: "String alias after append", tier: 0, make: r => {
    const word = text(r, r.int(3, 7)), tail = text(r, r.int(1, 3)), first = r.pick([true, false]);
    return { body: `String word = ${literal(word)};\n${first ? "String saved = word;\n" : ""}word = word + ${literal(tail)};\n${first ? "" : "String saved = word;\n"}word = word + "!";`, expression: "saved", value: first ? word : word + tail,
      hint: "String concatenation creates a new value; assigning word again does not reassign saved.", explanation: `saved was assigned ${first ? "before" : "after"} the first concatenation, so it contains ${literal(first ? word : word + tail)}. The final ! is added only to word.`, wrong: [word, word + tail, word + tail + "!"] };
  } },
  { skill: "substring(a, b)", tier: 1, make: r => {
    const word = text(r, r.int(5, 10)), start = r.int(0, word.length - 3), end = r.int(start + 1, word.length), suffix = r.pick([true, false]);
    const v = suffix ? word.slice(start) : word.slice(start, end);
    return { body: `String word = ${literal(word)};`, expression: `word.substring(${start}${suffix ? "" : `, ${end}`})`, value: v,
      hint: "String indexes start at zero. A second substring argument is the excluded ending index.", explanation: suffix ? `Start at index ${start} and keep the rest: ${literal(v)}.` : `Keep indexes ${start} through ${end - 1}, giving ${literal(v)}.`, wrong: [word, word.slice(start, Math.min(end + 1, word.length)), word.slice(Math.min(start + 1, end), end)] };
  } },
  { skill: "First occurrence only", tier: 1, make: r => {
    const before = text(r, r.int(1, 4)), after = text(r, r.int(1, 4)), marker = r.pick(["#", "@", ":"]), offset = r.int(0, before.length), word = before + marker + after + marker;
    return { body: `String word = ${literal(word)};\nString part = word.substring(${offset});`, expression: `part.indexOf(${literal(marker)})`, value: before.length - offset,
      hint: "The search is in part, so count from its new index zero. indexOf finds the first match.", explanation: `Removing ${offset} leading characters shifts the first ${marker} from index ${before.length} to ${before.length - offset}. The later marker is not the first match.`, wrong: [before.length, before.length + after.length + 1 - offset, -1] };
  } },
  { skill: "Prepending during traversal", tier: 2, make: r => {
    const word = text(r, r.int(4, 8)), start = r.int(0, 1), step = r.int(1, 2), prepend = r.pick([true, false]);
    const chars = [...word].filter((_, i) => i >= start && (i - start) % step === 0);
    const result = (prepend ? [...chars].reverse() : chars).join("");
    return { body: `String word = ${literal(word)};\nString result = "";\nfor (int i = ${start}; i < word.length(); i += ${step}) {\n    result = ${prepend ? "word.substring(i, i + 1) + result" : "result + word.substring(i, i + 1)"};\n}`, expression: "result", value: result,
      hint: "List the selected characters, then check whether each is added to the front or back.", explanation: `The loop selects ${chars.map(literal).join(", ")}. ${prepend ? "Prepending reverses their order" : "Appending preserves their order"}, so result is ${literal(result)}.`, wrong: [word, chars.join(""), [...chars].reverse().join("")] };
  } },
];

const arrays: Family[] = [
  { skill: "Updating one element", tier: 0, make: r => {
    const xs = ints(r, r.int(3, 7)), at = r.int(0, xs.length - 1), delta = r.int(1, 9), subtract = r.pick([true, false]);
    const v = xs[at] + (subtract ? -delta : delta);
    return { body: `int[] values = ${values(xs)};\nvalues[${at}] ${subtract ? "-=" : "+="} ${delta};`, expression: `values[${at}]`, value: v,
      hint: "Use zero-based indexing, then update just that element.", explanation: `Index ${at} starts at ${xs[at]}. ${subtract ? "Subtract" : "Add"} ${delta}, producing ${v}.`, wrong: [xs[at], xs[at] + delta, xs[at] - delta] };
  } },
  { skill: "CSP for each total", tier: 1, make: r => {
    const xs = ints(r, r.int(3, 7), 0, 18), cutoff = r.int(3, 14), greater = r.pick([true, false]);
    const selected = xs.filter(x => greater ? x > cutoff : x <= cutoff), v = selected.reduce((a, b) => a + b, 0);
    return { body: `int[] values = ${values(xs)};\nint total = 0;\nfor (int value : values) {\n    if (value ${greater ? ">" : "<="} ${cutoff}) total += value;\n}`, expression: "total", value: v,
      csp: { body: `values ← [${xs.join(", ")}]\ntotal ← 0\nFOR EACH value IN values\n{\n  IF (value ${greater ? ">" : "≤"} ${cutoff})\n  { total ← total + value }\n}`, expression: "total" }, hint: "Select the matching list values, then add those values rather than their indexes.", explanation: `${selected.length ? selected.join(", ") : "No values"} satisfy the condition. The sum is ${v}.`, wrong: [selected.length, xs.reduce((a, b) => a + b, 0), v + cutoff] };
  } },
  { skill: "ArrayList insertion shifts", tier: 1, make: r => {
    const xs = ints(r, r.int(3, 6)), at = r.int(0, xs.length), added = r.int(-9, 19), remove = r.int(0, xs.length), read = r.int(0, xs.length - 1);
    const result = [...xs]; result.splice(at, 0, added); result.splice(remove, 1);
    return { body: `ArrayList<Integer> values = new ArrayList<Integer>();\n${xs.map(x => `values.add(${x});`).join("\n")}\nvalues.add(${at}, ${added});\nvalues.remove(${remove});`, expression: `values.get(${read})`, value: result[read],
      hint: "Insertion shifts later elements right. Then remove by index using the updated list.", explanation: `After insertion, then removal at index ${remove}, the list is [${result.join(", ")}]. Index ${read} stores ${result[read]}.`, wrong: [xs[read], added, result[(read + 1) % result.length]] };
  } },
  { skill: "In place neighbor sums", tier: 2, make: r => {
    const xs = ints(r, r.int(4, 7), -3, 9), forward = r.pick([true, false]), result = [...xs];
    if (forward) for (let i = 1; i < result.length; i++) result[i] += result[i - 1];
    else for (let i = result.length - 1; i >= 1; i--) result[i] += result[i - 1];
    const read = r.int(1, xs.length - 1);
    return { body: `int[] values = ${values(xs)};\nfor (int i = ${forward ? "1" : "values.length - 1"}; ${forward ? "i < values.length" : "i >= 1"}; ${forward ? "i++" : "i--"}) {\n    values[i] += values[i - 1];\n}`, expression: `values[${read}]`, value: result[read],
      hint: "Updates happen in the same array. Does the neighboring value already include an earlier update?", explanation: `${forward ? "Moving forward reuses updated neighbors" : "Moving backward reads each left neighbor before it is updated"}. The final array is [${result.join(", ")}], so index ${read} is ${result[read]}.`, wrong: [xs[read], xs[read] + xs[read - 1], result[result.length - 1]] };
  } },
];

const classes: Family[] = [
  { skill: "Constructor field initialization", tier: 0, make: r => {
    const start = r.int(2, 30), delta = r.int(1, 12), add = r.pick([true, false]);
    return { classes: `class Meter {\n    private int points;\n    public Meter(int start) { points = start ${add ? "+" : "-"} ${delta}; }\n    public int get() { return points; }\n}`,
      body: `Meter meter = new Meter(${start});`, expression: "meter.get()", value: start + (add ? delta : -delta), hint: "The constructor runs once when new creates the object.", explanation: `The constructor stores ${start} ${add ? "+" : "-"} ${delta}, so the getter returns ${start + (add ? delta : -delta)}.`, wrong: [start, start + delta, start - delta] };
  } },
  { skill: "Object reference alias", tier: 1, make: r => {
    const start = r.int(2, 20), other = r.int(2, 20), delta = r.int(1, 9), alias = r.pick([true, false]), times = r.int(1, 3);
    const v = start + (alias ? times * delta : 0);
    return { classes: `class Counter {\n    private int count;\n    public Counter(int n) { count = n; }\n    public void add(int n) { count += n; }\n    public int get() { return count; }\n}`,
      body: `Counter first = new Counter(${start});\nCounter second = ${alias ? "first" : `new Counter(${other})`};\n${Array.from({ length: times }, () => `second.add(${delta});`).join("\n")}`, expression: "first.get()", value: v,
      hint: "Draw one box per new object. Copying a reference does not create a second object.", explanation: `${alias ? "Both references point to the same object" : "The references point to separate objects"}. After ${times} changes through second, first contains ${v}.`, wrong: [start, start + times * delta, other + times * delta, other] };
  } },
  { skill: "Local versus instance variable", tier: 1, make: r => {
    const start = r.int(2, 25), delta = r.int(1, 9), field = r.pick([true, false]), calls = r.int(1, 3);
    const v = field ? start + calls * delta : start;
    return { classes: `class Score {\n    private int points;\n    public Score(int points) { this.points = points; }\n    public void change(int points) { ${field ? "this.points += points;" : "points += this.points;"} }\n    public int get() { return points; }\n}`,
      body: `Score score = new Score(${start});\n${Array.from({ length: calls }, () => `score.change(${delta});`).join("\n")}`, expression: "score.get()", value: v,
      hint: "Inside change, points is the parameter; this.points is the saved instance field.", explanation: `${field ? "Each call updates the instance field" : "Only the temporary parameter changes"}. After ${calls} calls, the stored field is ${v}.`, wrong: [start, start + calls * delta, start + delta, delta] };
  } },
  { skill: "Column sum traversal", tier: 2, make: r => {
    const rows = r.int(2, 4), cols = r.int(2, 4), grid = Array.from({ length: rows }, () => ints(r, cols, -4, 12)), column = r.int(0, cols - 1), backwards = r.pick([true, false]);
    const v = grid.reduce((sum, row) => sum + row[column], 0);
    return { body: `int[][] grid = {${grid.map(values).join(", ")}};\nint total = 0;\nfor (int row = ${backwards ? "grid.length - 1" : "0"}; ${backwards ? "row >= 0" : "row < grid.length"}; ${backwards ? "row--" : "row++"}) {\n    total += grid[row][${column}];\n}`, expression: "total", value: v,
      hint: "The row index changes but the column index stays fixed. Count every row exactly once.", explanation: `Column ${column} contains ${grid.map(row => row[column]).join(", ")}. Traversing ${backwards ? "backward" : "forward"} gives the same sum, ${v}.`, wrong: [grid[column % rows].reduce((a, b) => a + b, 0), rows * cols, v + 1] };
  } },
];
export const LATER_VARIANTS = [expand(strings), expand(arrays), expand(classes)];
