// World 6 (Class Castle) expansion: 40 more templates on classes and objects, recursion and 2D
// arrays (current AP CSA scope: no inheritance). Verified by scripts/verify-questions.ts.
import { blank as f, mc as c, method as m, objects as o } from "./ap-builders";
import { predict, predictWith, type Gen } from "./core";

const g = (skill: string, tier: 0 | 1 | 2, make: Gen["make"]): Gen => ({ skill, tier, make });
const HINT = "Draw a box for each object and track its fields.";
// A randomized object question: `classes` are top-level classes, `use` runs inside main.
const obj = (skill: string, classes: string, use: string, answer: string | number | boolean, explain: string) =>
  predictWith(skill, `${classes}\n// In main:\n${use}`, answer, HINT, explain, { src: `import java.util.*;\n${classes}\npublic class Main { public static void main(String[] args) { ${use} } }`, wrap: "file" });
const meth = (skill: string, decl: string, call: string, answer: string | number | boolean, explain: string) =>
  predictWith(skill, `${decl}\n// In main:\nSystem.out.println(${call});`, answer, "Trace each call, then each return.", explain, { src: `${decl}\npublic static void main(String[] args) { System.out.println(${call}); }`, wrap: "class" });

const HERO = "class Hero {\n    private int hp;\n    public Hero(int hp) { this.hp = hp; }\n    public int getHp() { return hp; }\n    public void heal(int n) { hp += n; }\n}";
const COUNTER = "class Counter {\n    private int count;\n    public void add() { count++; }\n    public int getCount() { return count; }\n}";

export const W5_MORE: Gen[] = [
  // ---- Novice (10) ----
  g("Calling a getter", 0, (r) => {
    const hp = r.int(20, 90);
    return obj("Calling a getter", HERO, `Hero h = new Hero(${hp});\nSystem.out.println(h.getHp());`, hp, `The constructor stores ${hp}; getHp returns it.`);
  }),
  g("Constructor stores a name", 0, (r) => {
    const n = r.pick(["Rex", "Luna", "Pip", "Mochi"]);
    return obj("Constructor stores a name", 'class Pet {\n    private String name;\n    public Pet(String name) { this.name = name; }\n    public String getName() { return name; }\n}', `Pet p = new Pet("${n}");\nSystem.out.println(p.getName());`, n, `The name passed in is ${n}.`);
  }),
  g("Two separate counters", 0, (r) => {
    const a = r.int(1, 4), b = r.int(0, 3);
    return obj("Two separate counters", COUNTER, `Counter a = new Counter();\nCounter b = new Counter();\n${"a.add();\n".repeat(a)}${"b.add();\n".repeat(b)}System.out.println(a.getCount() + " " + b.getCount());`, `${a} ${b}`, "Each new Counter has its own count.", );
  }),
  g("Changing state with a method", 0, (r) => {
    const hp = r.int(10, 50), n = r.int(5, 20);
    return obj("Changing state with a method", HERO, `Hero h = new Hero(${hp});\nh.heal(${n});\nSystem.out.println(h.getHp());`, hp + n, `heal adds ${n} to ${hp}.`);
  }),
  o(0, "Printing an object with toString", 'class Coin {\n    public String toString() { return "gold coin"; }\n}', "Coin c = new Coin();\nSystem.out.println(c);", "gold coin", "println calls the object's toString method."),
  c(0, "What new does", "What does new Hero(50) do?", ["Creates a Hero object and runs its constructor", "Calls a method named new", "Copies an existing Hero", "Declares a variable named Hero"], 0, "new makes a fresh object and runs the matching constructor to set it up."),
  o(0, "Default int field", "class Box {\n    int size;\n}", "Box b = new Box();\nSystem.out.println(b.size);", 0, "An int field that is never set starts at 0."),
  g("A shared constant", 0, (r) => {
    const max = r.pick([3, 5, 10, 99]);
    return obj("A shared constant", `class Game {\n    public static final int MAX_LIVES = ${max};\n}`, "System.out.println(Game.MAX_LIVES);", max, "A static constant belongs to the class, so use the class name.");
  }),
  g("Adding points twice", 0, (r) => {
    const a = r.int(1, 9), b = r.int(1, 9);
    return obj("Adding points twice", "class Score {\n    private int pts;\n    public void add(int n) { pts += n; }\n    public int getPts() { return pts; }\n}", `Score s = new Score();\ns.add(${a});\ns.add(${b});\nSystem.out.println(s.getPts());`, a + b, `0 + ${a} + ${b}.`);
  }),
  g("Method using two fields", 0, (r) => {
    const w = r.int(2, 9), h = r.int(2, 9);
    return obj("Method using two fields", "class Rect {\n    private int w, h;\n    public Rect(int w, int h) { this.w = w; this.h = h; }\n    public int area() { return w * h; }\n}", `Rect r = new Rect(${w}, ${h});\nSystem.out.println(r.area());`, w * h, `${w} × ${h}.`);
  }),

  // ---- Intermediate (20) ----
  g("Field set with this", 1, (r) => {
    const x = r.int(1, 50);
    return obj("Field set with this", "class Point {\n    private int x;\n    public Point(int x) { this.x = x; }\n    public int getX() { return x; }\n}", `Point p = new Point(${x});\nSystem.out.println(p.getX());`, x, "this.x is the field; x alone is the parameter.");
  }),
  o(1, "== on two new objects", "class Pt {\n    int x, y;\n    Pt(int x, int y) { this.x = x; this.y = y; }\n}", "Pt a = new Pt(1, 2);\nPt b = new Pt(1, 2);\nSystem.out.println(a == b);", false, "== asks if they are the same object. They're two different objects with equal fields."),
  o(1, "Comparing fields in a method", "class Pt {\n    int x, y;\n    Pt(int x, int y) { this.x = x; this.y = y; }\n    boolean sameAs(Pt o) { return x == o.x && y == o.y; }\n}", "Pt a = new Pt(1, 2);\nPt b = new Pt(1, 2);\nSystem.out.println(a.sameAs(b));", true, "sameAs compares the field values, which match."),
  g("Array of objects", 1, (r) => {
    const hps = [r.int(5, 30), r.int(5, 30), r.int(5, 30)];
    return obj("Array of objects", HERO, `Hero[] team = {new Hero(${hps[0]}), new Hero(${hps[1]}), new Hero(${hps[2]})};\nint total = 0;\nfor (Hero h : team) total += h.getHp();\nSystem.out.println(total);`, hps.reduce((s, x) => s + x, 0), `${hps.join(" + ")}.`);
  }),
  g("List of objects", 1, (r) => {
    const prices = [r.int(2, 20), r.int(2, 20), r.int(2, 20)];
    return obj("List of objects", "class Item {\n    private int price;\n    public Item(int price) { this.price = price; }\n    public int getPrice() { return price; }\n}", `ArrayList<Item> cart = new ArrayList<>();\n${prices.map((p) => `cart.add(new Item(${p}));`).join("\n")}\nint total = 0;\nfor (Item it : cart) total += it.getPrice();\nSystem.out.println(total);`, prices.reduce((s, x) => s + x, 0), `${prices.join(" + ")}.`);
  }),
  g("Recursive sum", 1, (r) => {
    const n = r.int(3, 9);
    return meth("Recursive sum", "static int sum(int n) {\n    if (n == 0) return 0;\n    return n + sum(n - 1);\n}", `sum(${n})`, (n * (n + 1)) / 2, `${n} + ${n - 1} + ... + 1 + 0 = ${(n * (n + 1)) / 2}.`);
  }),
  g("Recursive countdown", 1, (r) => {
    const n = r.int(3, 5);
    return meth("Recursive countdown", 'static String down(int n) {\n    if (n == 0) return "go";\n    return n + down(n - 1);\n}', `down(${n})`, Array.from({ length: n }, (_, i) => n - i).join("") + "go", "Each call puts its n in front of the rest.");
  }),
  g("Recursive digit count", 1, (r) => {
    const n = r.int(5, 99999);
    return meth("Recursive digit count", "static int digits(int n) {\n    if (n < 10) return 1;\n    return 1 + digits(n / 10);\n}", `digits(${n})`, String(n).length, "Each call removes one digit until one is left.");
  }),
  g("Recursive factorial", 1, (r) => {
    const n = r.int(3, 7);
    const v = Array.from({ length: n }, (_, i) => i + 1).reduce((a, b) => a * b, 1);
    return meth("Recursive factorial", "static int fact(int n) {\n    if (n <= 1) return 1;\n    return n * fact(n - 1);\n}", `fact(${n})`, v, `${n}! = ${v}.`);
  }),
  g("Withdrawing with a check", 1, (r) => {
    const bal = r.int(50, 100), a = r.int(20, 60), b = r.int(20, 60);
    let left = bal;
    if (a <= left) left -= a;
    if (b <= left) left -= b;
    return obj("Withdrawing with a check", "class Account {\n    private int bal;\n    public Account(int bal) { this.bal = bal; }\n    public boolean withdraw(int amt) {\n        if (amt > bal) return false;\n        bal -= amt;\n        return true;\n    }\n    public int getBal() { return bal; }\n}", `Account acct = new Account(${bal});\nacct.withdraw(${a});\nacct.withdraw(${b});\nSystem.out.println(acct.getBal());`, left, "A withdrawal bigger than the balance is refused.");
  }),
  o(1, "Setter that rejects bad values", "class Player {\n    private int age = 12;\n    public void setAge(int a) { if (a >= 0) age = a; }\n    public int getAge() { return age; }\n}", "Player p = new Player();\np.setAge(-3);\nSystem.out.println(p.getAge());", 12, "-3 fails the check, so age keeps its old value. That's encapsulation protecting the object."),
  f(1, "Naming a constructor", "Fill in the blank: a constructor has the class's name.", "class Gem {\n    int v;\n    ___(int v) { this.v = v; }\n}\npublic class Main { public static void main(String[] args) { System.out.println(new Gem(7).v); } }", ["Gem"], "7", "A constructor's name matches the class exactly and has no return type.", undefined, "file"),
  f(1, "Returning a field", "Fill in the return so getV gives the stored value.", "class Gem {\n    private int v;\n    Gem(int v) { this.v = v; }\n    int getV() { return ___; }\n}\npublic class Main { public static void main(String[] args) { System.out.println(new Gem(9).getV()); } }", ["v", "this.v"], "9", "Inside the class, v (or this.v) is the field.", undefined, "file"),
  c(1, "What private means", "A field is declared private. Where can code use it directly?", ["Only inside that class", "Anywhere in the program", "Only in main", "Only in subclasses"], 0, "private hides the field from other classes; they use public methods instead."),
  g("Counting a value in a grid", 1, (r) => {
    const grid = [0, 1, 2].map(() => [0, 1, 2].map(() => r.int(0, 3)));
    const t = r.int(0, 3);
    const n = grid.flat().filter((x) => x === t).length;
    const code = `int[][] g = {${grid.map((row) => `{${row.join(", ")}}`).join(", ")}};\nint n = 0;\nfor (int[] row : g) {\n    for (int x : row) {\n        if (x == ${t}) n++;\n    }\n}\nSystem.out.println(n);`;
    return predict("Counting a value in a grid", code, n, "Visit every cell, row by row.", `${t} appears ${n} times.`);
  }),
  m(1, "Recursive reverse", 'static String rev(String s) {\n    if (s.length() <= 1) return s;\n    return rev(s.substring(1)) + s.substring(0, 1);\n}', 'rev("code")', "edoc", "Each call moves the first letter to the end of the reversed rest."),
  m(1, "Two recursive calls", "static int f(int n) {\n    if (n <= 1) return 1;\n    return f(n - 1) + f(n - 2);\n}", "f(5)", 8, "f(2)=2, f(3)=3, f(4)=5, f(5)=8."),
  g("Reading a nested object", 1, (r) => {
    const hp = r.int(10, 60);
    return obj("Reading a nested object", `${HERO}\nclass Party {\n    private Hero leader;\n    public Party(Hero leader) { this.leader = leader; }\n    public Hero getLeader() { return leader; }\n}`, `Party p = new Party(new Hero(${hp}));\nSystem.out.println(p.getLeader().getHp());`, hp, "Follow the chain: party → leader → hp.");
  }),
  g("Swapping two fields", 1, (r) => {
    const a = r.int(1, 9), b = r.int(10, 20);
    return obj("Swapping two fields", "class Pair {\n    private int a, b;\n    public Pair(int a, int b) { this.a = a; this.b = b; }\n    public void swap() { int t = a; a = b; b = t; }\n    public String show() { return a + \",\" + b; }\n}", `Pair p = new Pair(${a}, ${b});\np.swap();\nSystem.out.println(p.show());`, `${b},${a}`, "swap uses a temporary so neither value is lost.");
  }),
  g("Object counting itself", 1, (r) => {
    const n = r.int(2, 5);
    return obj("Object counting itself", "class Ticket {\n    private static int sold = 0;\n    private int number;\n    public Ticket() { sold++; number = sold; }\n    public int getNumber() { return number; }\n}", `${Array.from({ length: n }, (_, i) => `Ticket t${i} = new Ticket();`).join("\n")}\nSystem.out.println(t${n - 1}.getNumber());`, n, "sold is shared by all tickets; each ticket keeps its own number.");
  }),

  // ---- Harder (10) ----
  g("Recursive GCD", 2, (r) => {
    const [a, b] = r.pick([[48, 18], [35, 14], [84, 36], [27, 12], [100, 75]] as const);
    let x: number = a, y: number = b;
    while (y !== 0) [x, y] = [y, x % y];
    return meth("Recursive GCD", "static int gcd(int a, int b) {\n    if (b == 0) return a;\n    return gcd(b, a % b);\n}", `gcd(${a}, ${b})`, x, `Euclid's algorithm: the greatest common divisor is ${x}.`);
  }),
  o(2, "Counting recursive calls", "class Fib {\n    static int calls = 0;\n    static int f(int n) {\n        calls++;\n        if (n <= 1) return n;\n        return f(n - 1) + f(n - 2);\n    }\n}", "Fib.f(4);\nSystem.out.println(Fib.calls);", 9, "f(4) calls f(3) and f(2), which branch again: 1 + 3 + 5 = 9 calls in all."),
  g("Bag with a fixed capacity", 2, (r) => {
    const n = r.int(4, 6);
    return obj("Bag with a fixed capacity", "class Bag {\n    private int[] items = new int[3];\n    private int count = 0;\n    public boolean add(int x) {\n        if (count == items.length) return false;\n        items[count] = x;\n        count++;\n        return true;\n    }\n    public int getCount() { return count; }\n}", `Bag b = new Bag();\nfor (int i = 0; i < ${n}; i++) b.add(i);\nSystem.out.println(b.getCount());`, 3, `Only 3 fit; the other ${n - 3} adds return false.`);
  }),
  g("Method that returns a new object", 2, (r) => {
    const a = r.pick([100, 125, 250]), b = r.pick([50, 75, 200]);
    return obj("Method that returns a new object", "class Money {\n    private final int cents;\n    public Money(int cents) { this.cents = cents; }\n    public Money plus(Money o) { return new Money(cents + o.cents); }\n    public int getCents() { return cents; }\n}", `Money a = new Money(${a});\nMoney b = new Money(${b});\nMoney c = a.plus(b);\nSystem.out.println(c.getCents() + " " + a.getCents());`, `${a + b} ${a}`, "plus builds a new object; a itself never changes.");
  }),
  g("Recursive array sum", 2, (r) => {
    const a = [r.int(1, 9), r.int(1, 9), r.int(1, 9), r.int(1, 9)];
    return meth("Recursive array sum", "static int sum(int[] a, int i) {\n    if (i == a.length) return 0;\n    return a[i] + sum(a, i + 1);\n}", `sum(new int[]{${a.join(", ")}}, 0)`, a.reduce((s, x) => s + x, 0), "Each call adds one element and moves to the next index.");
  }),
  m(2, "Order of recursive results", 'static String f(int n) {\n    if (n == 0) return "";\n    return f(n - 1) + n;\n}', "f(4)", "1234", "The recursive call finishes first, so smaller numbers end up on the left."),
  c(2, "Missing base case", "static int count(int n) { return 1 + count(n - 1); } What happens when count(3) runs?", ["It returns 3", "It returns 4", "It keeps calling itself until a StackOverflowError", "It returns 0"], 2, "There's no base case, so n keeps going down forever and the call stack runs out."),
  g("Row with the biggest total", 2, (r) => {
    let grid: number[][];
    do grid = [0, 1, 2].map(() => [0, 1, 2].map(() => r.int(1, 9))); while (new Set(grid.map((row) => row.reduce((s, x) => s + x, 0))).size < 3);
    const sums = grid.map((row) => row.reduce((s, x) => s + x, 0));
    const best = sums.indexOf(Math.max(...sums));
    const src = `int[][] g = {${grid.map((row) => `{${row.join(", ")}}`).join(", ")}};\nint best = 0, bestSum = Integer.MIN_VALUE;\nfor (int r = 0; r < g.length; r++) {\n    int s = 0;\n    for (int x : g[r]) s += x;\n    if (s > bestSum) { bestSum = s; best = r; }\n}\nSystem.out.println(best);`;
    return predictWith("Row with the biggest total", src, best, "Total each row, remembering the best row index.", `Row totals ${sums.join(", ")}: row ${best} is largest.`, { src: `public static void main(String[] args) {\n${src}\n}`, wrap: "class" });
  }),
  g("Neighbors in a grid", 2, (r) => {
    const grid = [0, 1, 2].map(() => [0, 1, 2].map(() => r.int(0, 9)));
    const k = r.int(3, 6);
    const n = [[0, 1], [1, 0], [1, 2], [2, 1]].filter(([i, j]) => grid[i][j] > k).length;
    const src = `int[][] g = {${grid.map((row) => `{${row.join(", ")}}`).join(", ")}};\nint[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\nint n = 0;\nfor (int[] d : dirs) {\n    if (g[1 + d[0]][1 + d[1]] > ${k}) n++;\n}\nSystem.out.println(n);`;
    return predictWith("Neighbors in a grid", src, n, "Check up, down, left and right of the center.", `The center's neighbors are ${grid[0][1]}, ${grid[2][1]}, ${grid[1][0]}, ${grid[1][2]}.`, { src: `public static void main(String[] args) {\n${src}\n}`, wrap: "class" });
  }),
  g("Changing an object through a list", 2, () => obj("Changing an object through a list", HERO, "ArrayList<Hero> team = new ArrayList<>();\nHero h = new Hero(10);\nteam.add(h);\nteam.get(0).heal(5);\nSystem.out.println(h.getHp());", 15, "The list holds a reference to the same Hero, so healing it through the list changes h too.")),
];
