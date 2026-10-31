# CodeWarrior

Battle your way from AP CSA basics to real LeetCode problems. Every question is an attack, every world ends in a boss, and the final world is LeetCode itself.

Live: https://danielcoutinhohome-source.github.io/codewarrior/

## How it plays

- **Create a warrior** with a username and password (no email or Google). Pick armor, energy color and title.
- **World view:** a first-person look down the road. Each enemy stands by its level, and the boss waits in the fog until you win the four battles before it.
- **Battles:** right answers make your warrior attack. Each question gives two tries, and every miss lets the enemy hit you. Combos (3+ and 5+ in a row) land critical hits. Missed questions come back until the enemy falls. Run out of HP and you're knocked out.
- **Items:** Health Potion, Iron Shield, Power Surge and Hint Scroll (a hint counts as a miss). No hint scrolls in boss fights.
- **Coins and the shop:** win battles for coins, XP and up to 3 stars. Spend coins on power-ups or cosmetics: armor colors, energy blades, finishes (Metal Shine, Circuit Lines), animated auras and titles. Each boss awards a title you can't buy.
- **Armory:** equip what you own, see stats, weak and strong skills, download a backup, or make a progress code for your teacher.
- **Teacher dashboard** (`/teacher`): paste student progress codes to see a class table, stars per world, accuracy and the skills students miss most. Works with no server; everything stays in the teacher's browser.
- **Sound:** small synthesized effects, off with one tap.

## Content

7 worlds × (4 battles + 1 boss), built from question generators and handwritten questions:

| World | Topic |
| --- | --- |
| Syntax Shore | Variables, math, return |
| Branch Woods | if / else, booleans |
| Loop Lagoon | for, while, counting |
| String Peaks | length, substring, equals |
| Array Caverns | arrays, ArrayList |
| Class Castle | 2D arrays, classes, recursion |
| LeetCode Citadel | Two Sum, Best Time to Buy and Sell, Valid Palindrome, and more |

Question types: predict the output, fill the blank, multiple choice, drag lines into order. Generators produce new numbers on every battle.

**Every code question is checked against real Java.** `npm run verify` compiles and runs each one with `javac`, and the deploy fails if any expected answer is wrong.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run verify     # needs a JDK: checks every question with real Java
npm test           # battle rule tests
```

## Stack

Next.js (static export), React, TypeScript, Tailwind CSS, Framer Motion, Dexie (IndexedDB), Web Audio. Deploys to GitHub Pages on every push to `main`.

## Layout

- `src/app` pages: home, create, login, map (world view), battle, shop, profile (armory), teacher
- `src/components` `Warrior` and `Monster` art, `Arena` (fight animations), `WorldScene`, `QuestionCard`, shared UI
- `src/lib` game data (`game.ts`), battle rules (`battle.ts`), saves (`db.ts`, `progress.ts`, `auth.ts`), sounds (`sfx.ts`)
- `src/lib/questions` question generators per world
- `scripts` question verifier and battle tests
