export const ARMORS = [
  { name: "Ocean", color: "#2D9CDB" },
  { name: "Ember", color: "#FF8A00" },
  { name: "Jade", color: "#27AE60" },
  { name: "Violet", color: "#8B5CF6" },
  { name: "Ruby", color: "#E5484D" },
  { name: "Shadow", color: "#3B4058" },
];

export const ENERGIES = [
  { name: "Red", color: "#FF5A5F" },
  { name: "Gold", color: "#FFC83D" },
  { name: "Mint", color: "#34D399" },
  { name: "Sky", color: "#5CC8FF" },
  { name: "Pink", color: "#FF7EB6" },
];

export const TITLES = ["Byte Knight", "Loop Ranger", "Logic Mage"];

export type World = {
  name: string;
  topic: string;
  battles: string[]; // enemy names, last one is the boss
};

// One world per AP CSA topic. The final world bridges to LeetCode.
export const WORLDS: World[] = [
  { name: "Syntax Shore", topic: "Variables, math, return", battles: ["Typo Imp", "Semicolon Slime", "Type Mismatch Mite", "Rounding Rat", "The Compile Error"] },
  { name: "Branch Woods", topic: "if / else, booleans", battles: ["Else Sprite", "Boolean Bat", "Modulo Moth", "Nested Newt", "The Dangling Else"] },
  { name: "Loop Lagoon", topic: "for, while, counting", battles: ["Counter Crab", "While Wisp", "Off-By-One Goblin", "Break Beetle", "The Infinite Serpent"] },
  { name: "String Peaks", topic: "length, substring, equals", battles: ["Index Yeti", "Substring Snake", "Char Chimera", "Equals Echo", "The Null Phantom"] },
  { name: "Array Caverns", topic: "arrays, ArrayList", battles: ["Bounds Bat", "Length Lurker", "Swap Spider", "ArrayList Ant", "The Out-of-Bounds Ogre"] },
  { name: "Class Castle", topic: "2D arrays, classes, recursion", battles: ["Grid Gremlin", "Constructor Crow", "This Thief", "Base Case Bat", "The Stack Overflow"] },
  { name: "LeetCode Citadel", topic: "Real interview problems", battles: ["Two Sum Titan", "Palindrome Paladin", "Stock Sorcerer", "Merge Minotaur", "The Final Judge"] },
];

export const XP_PER_LEVEL = 500;
export const levelFor = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;
