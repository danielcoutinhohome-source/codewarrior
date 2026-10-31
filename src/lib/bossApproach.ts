import type { Scene } from "./game";
export function bossApproach(stars: (number | undefined)[], selected: number) {
  const cleared = stars.slice(0,4).filter(n => (n ?? 0) > 0).length;
  return { cleared, ready: cleared === 4, fog: cleared === 4 && selected === 4 ? .18 : .96 - cleared * .16 };
}
export const BOSS_GATES: Record<Scene, { title: string; code: string; prompt: string; options: string[]; answer: number; hint: string }> = {
  shore: { title: "The Compiler's Sea Gate", code: 'int key = 7 / 2;\nSystem.out.print(key);', prompt: "What does the gate print?", options: ["3", "3.5", "4"], answer:0, hint:"Both operands are integers. Integer division drops the fractional part." },
  woods: { title: "The Last Branch", code: 'boolean torch = true;\nif (torch && !false)\n  System.out.print("OPEN");\nelse\n  System.out.print("SEALED");', prompt:"Which word opens the root door?", options:["SEALED","OPEN","Both words"], answer:1, hint:"!false is true. Both sides of && must be true." },
  lagoon: { title: "The Endless Sluice", code:'int key = 0;\nfor (int i = 0; i < 3; i++)\n  key += 2;\nSystem.out.print(key);',prompt:"Trace the loop to unlock the sluice.",options:["4","8","6"],answer:2,hint:"The loop runs for i = 0, 1, and 2. Add 2 each time." },
  peaks: { title:"The Silent Summit",code:'String key = "FROST";\nSystem.out.print(key.substring(1, 4));',prompt:"Which fragment breaks the ice seal?",options:["ROS","ROST","FRO"],answer:0,hint:"Start at index 1 and stop before index 4." },
  caverns: { title:"The Bounds Vault",code:'int[] keys = {4, 8, 16};\nSystem.out.print(keys[keys.length - 1]);',prompt:"Read the final index to unseal the vault.",options:["8","16","Index error"],answer:1,hint:"The array length is 3. Its last valid index is 2." },
  castle: { title:"The Last Return",code:'int seal(int n) {\n  if (n == 0) return 1;\n  return n * seal(n - 1);\n}\n// seal(3) = ?',prompt:"Reach the base case. Return the seal.",options:["3","9","6"],answer:2,hint:"seal(3) = 3 × 2 × 1 × seal(0). The base case returns 1." },
  citadel: { title:"The Final Test Gate",code:'int[] data = {2, 4, 6, 8};\nfor (int value : data) {\n  if (value == 6) break;\n  System.out.print(value + " ");\n}',prompt:"Which output passes the last test?",options:["2 4 6","2 4","2 4 6 8"],answer:1,hint:"break exits before printing 6. Only 2 and 4 reach the print statement." },
};
export function gateKey(accountId: number | string, world: number) { return `cw.boss-gate.v1.${accountId}.${world}`; }

const openedGates = new Set<string>();
// Memory fallback prevents a solved gate reappearing on navigation when a
// privacy setting makes sessionStorage unavailable. Keys isolate accounts.
export function bossGateIsOpen(accountId:string,world:number) {
  const id=gateKey(accountId,world);
  if(openedGates.has(id))return true;
  try { return sessionStorage.getItem(id)==="open"; } catch { return false; }
}
export function openBossGate(accountId:string,world:number) {
  const id=gateKey(accountId,world);openedGates.add(id);
  try {sessionStorage.setItem(id,"open");} catch {}
}
