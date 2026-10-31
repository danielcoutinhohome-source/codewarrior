// World 4 (String Peaks) expansion: 40 more templates using the AP CSA String methods
// (length, substring, indexOf, equals, compareTo). Verified by scripts/verify-questions.ts.
import { blank as f, mc as c, method as m } from "./ap-builders";
import { choice, predict, type Gen } from "./core";

const g = (skill: string, tier: 0 | 1 | 2, make: Gen["make"]): Gen => ({ skill, tier, make });
const WORDS = ["dragon", "castle", "wizard", "potion", "shield", "lantern", "falcon", "harbor"];
const q = (s: string) => JSON.stringify(s);

export const W3_MORE: Gen[] = [
  // ---- Novice (10) ----
  g("Length of a word", 0, (r) => {
    const w = r.pick(WORDS);
    return predict("Length of a word", `String w = ${q(w)};\nSystem.out.println(w.length());`, w.length, "Count every letter.", `${q(w)} has ${w.length} letters.`);
  }),
  g("First letter with substring", 0, (r) => {
    const w = r.pick(WORDS);
    return predict("First letter with substring", `String w = ${q(w)};\nSystem.out.println(w.substring(0, 1));`, w[0], "substring(0, 1) is the character at index 0.", `Index 0 of ${q(w)} is ${w[0]}.`);
  }),
  g("Joining with a space", 0, (r) => {
    const [a, b] = r.pick([["Ada", "Lovelace"], ["Alan", "Turing"], ["Grace", "Hopper"]] as const);
    return predict("Joining with a space", `String first = ${q(a)};\nString last = ${q(b)};\nSystem.out.println(first + " " + last);`, `${a} ${b}`, "The middle \" \" adds the space.", `${a} + space + ${b}.`);
  }),
  g("Equal text check", 0, (r) => {
    const a = r.pick(WORDS), b = r.pick([a, r.pick(WORDS)]);
    return predict("Equal text check", `String a = ${q(a)};\nString b = ${q(b)};\nSystem.out.println(a.equals(b));`, a === b, "equals compares the letters.", `${q(a)} and ${q(b)} are ${a === b ? "the same" : "different"}.`);
  }),
  g("Length after joining", 0, (r) => {
    const a = r.pick(WORDS), b = r.pick(WORDS);
    return predict("Length after joining", `String a = ${q(a)};\nString b = ${q(b)};\nSystem.out.println((a + b).length());`, a.length + b.length, "Joining adds the lengths.", `${a.length} + ${b.length} = ${a.length + b.length}.`);
  }),
  g("Index of a letter", 0, (r) => {
    const w = r.pick(WORDS);
    const i = r.int(0, w.length - 1);
    const letter = w[i];
    return predict("Index of a letter", `String w = ${q(w)};\nSystem.out.println(w.indexOf(${q(letter)}));`, w.indexOf(letter), "indexOf finds the first match; counting starts at 0.", `The first ${q(letter)} in ${q(w)} is at index ${w.indexOf(letter)}.`);
  }),
  g("Letter that isn't there", 0, (r) => {
    const w = r.pick(WORDS);
    return predict("Letter that isn't there", `String w = ${q(w)};\nSystem.out.println(w.indexOf("x"));`, -1, "indexOf returns -1 when there's no match.", `${q(w)} has no x, so -1.`);
  }),
  g("Adding to the end", 0, (r) => {
    const w = r.pick(["Hi", "Go", "Win"]);
    return predict("Adding to the end", `String s = ${q(w)};\ns = s + "!";\ns = s + "!";\nSystem.out.println(s);`, `${w}!!`, "Each line adds one ! to the end.", `${w} gets two exclamation marks.`);
  }),
  g("Index of the last letter", 0, (r) => {
    const w = r.pick(WORDS);
    const opts = [w.length - 1, w.length, w.length - 2, 0].map(String);
    const order = r.shuffle([0, 1, 2, 3]);
    return choice("Index of the last letter", `${q(w)} has ${w.length} letters. What index is its last letter at?`, order.map((i) => opts[i]), order.indexOf(0), "Indexes start at 0.", `With ${w.length} letters, indexes go 0 to ${w.length - 1}.`);
  }),
  g("Rest of the word", 0, (r) => {
    const w = r.pick(WORDS), k = r.int(1, 3);
    return predict("Rest of the word", `String w = ${q(w)};\nSystem.out.println(w.substring(${k}));`, w.slice(k), "substring(k) starts at index k and goes to the end.", `From index ${k}: ${w.slice(k)}.`);
  }),

  // ---- Intermediate (20) ----
  g("Middle letters", 1, (r) => {
    const w = r.pick(WORDS);
    return predict("Middle letters", `String w = ${q(w)};\nSystem.out.println(w.substring(1, w.length() - 1));`, w.slice(1, -1), "This drops the first and last letters.", `Indexes 1 to ${w.length - 2}: ${w.slice(1, -1)}.`);
  }),
  g("Last two letters", 1, (r) => {
    const w = r.pick(WORDS);
    return predict("Last two letters", `String w = ${q(w)};\nSystem.out.println(w.substring(w.length() - 2));`, w.slice(-2), "Start two before the end.", `${w.length} - 2 = ${w.length - 2}, so ${w.slice(-2)}.`);
  }),
  g("Counting one letter", 1, (r) => {
    const [w, letter] = r.pick([["banana", "a"], ["mississippi", "s"], ["committee", "t"], ["balloon", "l"], ["bookkeeper", "e"]] as const);
    const n = [...w].filter((x) => x === letter).length;
    return predict("Counting one letter", `String w = ${q(w)};\nint count = 0;\nfor (int i = 0; i < w.length(); i++) {\n    if (w.substring(i, i + 1).equals(${q(letter)})) count++;\n}\nSystem.out.println(count);`, n, "Check each one-letter substring.", `${q(w)} has ${n} ${q(letter)}s.`);
  }),
  g("Doubling each letter", 1, (r) => {
    const w = r.pick(["abc", "cat", "sky", "run"]);
    return predict("Doubling each letter", `String w = ${q(w)};\nString out = "";\nfor (int i = 0; i < w.length(); i++) {\n    String ch = w.substring(i, i + 1);\n    out += ch + ch;\n}\nSystem.out.println(out);`, [...w].map((x) => x + x).join(""), "Each letter is added twice.", `${w} → ${[...w].map((x) => x + x).join("")}.`);
  }),
  g("Initials", 1, (r) => {
    const [a, b] = r.pick([["Ada", "Lovelace"], ["Alan", "Turing"], ["Grace", "Hopper"], ["Katherine", "Johnson"]] as const);
    return predict("Initials", `String first = ${q(a)};\nString last = ${q(b)};\nSystem.out.println(first.substring(0, 1) + last.substring(0, 1));`, a[0] + b[0], "Take the first letter of each.", `${a[0]} + ${b[0]}.`);
  }),
  g("Finding a word in a sentence", 1, (r) => {
    const s = r.pick(["the cat sat", "a big cat", "my cat naps", "cat and dog"]);
    return predict("Finding a word in a sentence", `String s = ${q(s)};\nSystem.out.println(s.indexOf("cat"));`, s.indexOf("cat"), "indexOf gives where the match starts, counting spaces.", `"cat" starts at index ${s.indexOf("cat")}.`);
  }),
  g("Text before the @", 1, (r) => {
    const e = r.pick(["ava@school.org", "kai99@mail.com", "lee@cw.dev"]);
    return predict("Text before the @", `String email = ${q(e)};\nSystem.out.println(email.substring(0, email.indexOf("@")));`, e.split("@")[0], "substring stops just before the @.", `The @ is at ${e.indexOf("@")}, so indexes 0 to ${e.indexOf("@") - 1}.`);
  }),
  g("Text after the @", 1, (r) => {
    const e = r.pick(["ava@school.org", "kai99@mail.com", "lee@cw.dev"]);
    return predict("Text after the @", `String email = ${q(e)};\nSystem.out.println(email.substring(email.indexOf("@") + 1));`, e.split("@")[1], "+ 1 skips the @ itself.", `Everything after index ${e.indexOf("@")}.`);
  }),
  g("Alphabetical order check", 1, (r) => {
    const a = r.pick(WORDS), b = r.pick(WORDS.filter((x) => x !== a));
    return predict("Alphabetical order check", `String a = ${q(a)};\nString b = ${q(b)};\nSystem.out.println(a.compareTo(b) < 0);`, a < b, "compareTo is negative when a comes first in the dictionary.", `${q(a)} comes ${a < b ? "before" : "after"} ${q(b)}.`);
  }),
  m(1, "Starts with A", 'static boolean startsWithA(String s) {\n    return s.length() > 0 && s.substring(0, 1).equals("A");\n}', 'startsWithA("Apple") + " " + startsWithA("banana")', "true false", "\"Apple\" starts with A; \"banana\" starts with b. The length check protects the empty string."),
  m(1, "Counting spaces", 'static int spaces(String s) {\n    int n = 0;\n    for (int i = 0; i < s.length(); i++) {\n        if (s.substring(i, i + 1).equals(" ")) n++;\n    }\n    return n;\n}', 'spaces("a b c d")', 3, "There are spaces between each pair of the four letters."),
  f(1, "First three letters", "Fill in the end index so the code prints War.", 'String s = "Warrior";\nSystem.out.println(s.substring(0, ___));', ["3"], "War", "The end index isn't included, so 0 to 3 gives indexes 0, 1, 2."),
  f(1, "Comparing text correctly", "Fill in the method that compares the letters of two Strings.", 'String a = "sword";\nString b = "sw" + "ord";\nif (a.___(b)) {\n    System.out.println("same");\n}', ["equals"], "same", "Use equals for String contents; == compares whether they are the same object."),
  c(1, "Length of a substring", "How long is s.substring(2, 5), for any s with at least 5 letters?", ["2", "3", "5", "7"], 1, "It holds indexes 2, 3 and 4: end minus start, 5 - 2 = 3.", undefined, { src: 'System.out.println("abcdefg".substring(2, 5).length());', wrap: "main", expect: "3" }),
  g("Inserting a dash", 1, (r) => {
    const w = r.pick(WORDS), k = r.int(2, 4);
    return predict("Inserting a dash", `String w = ${q(w)};\nSystem.out.println(w.substring(0, ${k}) + "-" + w.substring(${k}));`, `${w.slice(0, k)}-${w.slice(k)}`, "Split at index k and put a dash between the halves.", `${w.slice(0, k)} | ${w.slice(k)}.`);
  }),
  g("Joining numbers with commas", 1, (r) => {
    const n = r.int(3, 5);
    return predict("Joining numbers with commas", `String s = "";\nfor (int i = 1; i <= ${n}; i++) {\n    if (i > 1) s += ",";\n    s += i;\n}\nSystem.out.println(s);`, Array.from({ length: n }, (_, i) => i + 1).join(","), "The comma goes before every number except the first.", `${Array.from({ length: n }, (_, i) => i + 1).join(",")}.`);
  }),
  g("Counting words", 1, (r) => {
    const s = r.pick(["code is fun", "loops make it repeat", "one", "the brave knight wins again"]);
    return predict("Counting words", `String s = ${q(s)};\nint words = 1;\nfor (int i = 0; i < s.length(); i++) {\n    if (s.substring(i, i + 1).equals(" ")) words++;\n}\nSystem.out.println(words);`, s.split(" ").length, "One word, plus one more for every space.", `${s.split(" ").length - 1} spaces → ${s.split(" ").length} words.`);
  }),
  g("Last place a letter appears", 1, (r) => {
    const [w, letter] = r.pick([["banana", "a"], ["lantern", "n"], ["potato", "o"], ["referee", "e"]] as const);
    return predict("Last place a letter appears", `String w = ${q(w)};\nint last = -1;\nfor (int i = 0; i < w.length(); i++) {\n    if (w.substring(i, i + 1).equals(${q(letter)})) last = i;\n}\nSystem.out.println(last);`, w.lastIndexOf(letter), "last is overwritten every time a match is found.", `The final ${q(letter)} is at index ${w.lastIndexOf(letter)}.`);
  }),
  g("Longer of two words", 1, (r) => {
    const a = r.pick(WORDS), b = r.pick(WORDS.filter((x) => x.length !== a.length));
    const v = a.length > b.length ? a : b;
    return predict("Longer of two words", `String a = ${q(a)};\nString b = ${q(b)};\nif (a.length() > b.length()) {\n    System.out.println(a);\n} else {\n    System.out.println(b);\n}`, v, "Compare the lengths, not the words.", `${a.length} vs ${b.length} letters.`);
  }),
  g("Shout it", 1, (r) => {
    const w = r.pick(["go", "win", "run"]);
    return predict("Shout it", `String w = ${q(w)};\nString out = w;\nfor (int i = 0; i < 2; i++) {\n    out = out + " " + w;\n}\nSystem.out.println(out);`, [w, w, w].join(" "), "Start with one copy, then add two more.", `Three copies separated by spaces.`);
  }),

  // ---- Harder (10) ----
  g("Removing a letter", 2, (r) => {
    const [w, letter] = r.pick([["banana", "a"], ["committee", "t"], ["balloon", "o"], ["lantern", "n"]] as const);
    return predict("Removing a letter", `String w = ${q(w)};\nString out = "";\nfor (int i = 0; i < w.length(); i++) {\n    String ch = w.substring(i, i + 1);\n    if (!ch.equals(${q(letter)})) out += ch;\n}\nSystem.out.println(out);`, [...w].filter((x) => x !== letter).join(""), "Only letters that aren't the target get copied.", `Without ${q(letter)}: ${[...w].filter((x) => x !== letter).join("")}.`);
  }),
  g("Palindrome word check", 2, (r) => {
    const w = r.pick(["level", "racecar", "rotor", "castle", "noon", "rotate"]);
    const v = w === [...w].reverse().join("");
    return predict("Palindrome word check", `String w = ${q(w)};\nboolean pal = true;\nfor (int i = 0; i < w.length() / 2; i++) {\n    String a = w.substring(i, i + 1);\n    String b = w.substring(w.length() - 1 - i, w.length() - i);\n    if (!a.equals(b)) pal = false;\n}\nSystem.out.println(pal);`, v, "Compare letters from both ends moving inward.", `${q(w)} ${v ? "reads the same both ways" : "doesn't read the same backwards"}.`);
  }),
  g("Swapping halves", 2, (r) => {
    const w = r.pick(WORDS);
    const h = Math.trunc(w.length / 2);
    return predict("Swapping halves", `String w = ${q(w)};\nint h = w.length() / 2;\nSystem.out.println(w.substring(h) + w.substring(0, h));`, w.slice(h) + w.slice(0, h), "The back half moves to the front.", `h = ${h}: ${w.slice(h)} + ${w.slice(0, h)}.`);
  }),
  g("Run-length counts", 2, (r) => {
    const w = r.pick(["aaabbc", "aabccc", "abbbcd", "xxyyyz"]);
    const out = w.replace(/(.)\1*/g, (m0) => m0[0] + m0.length);
    return predict("Run-length counts", `String w = ${q(w)};\nString out = "";\nint i = 0;\nwhile (i < w.length()) {\n    String ch = w.substring(i, i + 1);\n    int run = 0;\n    while (i < w.length() && w.substring(i, i + 1).equals(ch)) {\n        run++;\n        i++;\n    }\n    out += ch + run;\n}\nSystem.out.println(out);`, out, "Count how many times each letter repeats in a row.", `${w} → ${out}.`);
  }),
  g("Second occurrence", 2, (r) => {
    const [w, letter] = r.pick([["balloon", "o"], ["banana", "a"], ["committee", "m"], ["lantern", "n"]] as const);
    const first = w.indexOf(letter);
    const second = w.indexOf(letter, first + 1);
    return predict("Second occurrence", `String w = ${q(w)};\nint first = w.indexOf(${q(letter)});\nint second = w.substring(first + 1).indexOf(${q(letter)}) + first + 1;\nSystem.out.println(second);`, second, "Search the rest after the first match, then convert back to a full index.", `First ${q(letter)} at ${first}; the next one is at ${second}.`);
  }),
  m(2, "Longest word length", 'static int longest(String s) {\n    int best = 0, run = 0;\n    for (int i = 0; i < s.length(); i++) {\n        if (s.substring(i, i + 1).equals(" ")) run = 0;\n        else {\n            run++;\n            if (run > best) best = run;\n        }\n    }\n    return best;\n}', 'longest("a quick brown fox")', 5, "Count letters since the last space; \"quick\" and \"brown\" both have 5."),
  c(2, "Comparing a prefix", 'What does "app".compareTo("apple") return?', ["A negative number", "0", "A positive number", "It throws an error"], 0, "\"app\" is a prefix of \"apple\", so it comes first and the result is negative.", undefined, { src: 'System.out.println("app".compareTo("apple") < 0);', wrap: "main", expect: "true" }),
  g("Is it a rotation?", 2, (r) => {
    const [a, b] = r.pick([["castle", "tlecas"], ["wizard", "zardwi"], ["dragon", "agondr"], ["potion", "tionpp"], ["shield", "ldsiee"]] as const);
    const v = a.length === b.length && (a + a).includes(b);
    return predict("Is it a rotation?", `String a = ${q(a)};\nString b = ${q(b)};\nSystem.out.println(a.length() == b.length() && (a + a).indexOf(b) >= 0);`, v, "Every rotation of a appears inside a + a.", `${q(a + a)} ${v ? "contains" : "doesn't contain"} ${q(b)}.`);
  }),
  g("Short form of a long word", 2, (r) => {
    const w = r.pick(["internationalization", "localization", "accessibility", "kubernetes"]);
    const v = w[0] + (w.length - 2) + w[w.length - 1];
    return predict("Short form of a long word", `String w = ${q(w)};\nSystem.out.println(w.substring(0, 1) + (w.length() - 2) + w.substring(w.length() - 1));`, v, "First letter, the count of middle letters, last letter.", `${w.length} letters → ${v}.`);
  }),
  g("Reversing word order", 2, (r) => {
    const s = r.pick(["code is fun", "win the battle", "red blue green"]);
    const v = s.split(" ").reverse().join(" ");
    return predict("Reversing word order", `String s = ${q(s)};\nString out = "";\nString word = "";\nfor (int i = 0; i < s.length(); i++) {\n    String ch = s.substring(i, i + 1);\n    if (ch.equals(" ")) {\n        out = " " + word + out;\n        word = "";\n    } else {\n        word += ch;\n    }\n}\nout = word + out;\nSystem.out.println(out);`, v, "Each finished word is put in front of what's built so far.", `${q(s)} → ${q(v)}.`);
  }),
];
