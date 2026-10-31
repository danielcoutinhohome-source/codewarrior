# CodeWarrior

Battle your way from AP CSA basics to real LeetCode problems. Every question is an attack, every world ends in a boss, and the final world is LeetCode itself.

Live: https://danielcoutinhohome-source.github.io/codewarrior/

## How it plays

- **Create a warrior** with a username and password (no email or Google). Pick armor, energy color and title.
- **World view:** a first-person look down the road. Each enemy stands by its level, and the boss waits in the fog until you win the four battles before it.
- **Battles:** right answers make your warrior attack. Each question gives two tries, and every miss lets the enemy hit you. Combos (3+ and 5+ in a row) land critical hits. Missed questions come back until the enemy falls. Run out of HP and you're knocked out.
- **Items:** Health Potion, Firewall, Power Surge and Hint Scroll (a hint counts as a miss). No hint scrolls in boss fights.
- **Coins and the shop:** win battles for coins, XP and up to 3 stars. Spend coins on power-ups, armor colors, weapons, headwear, finishes, animated auras and titles. Each boss awards a title you can't buy.
- **Armory:** equip what you own, see stats, weak and strong skills, download a backup, or make a progress code for your teacher.
- **Teacher dashboard** (`/teacher`): paste student progress codes to see a class table, stars per world, accuracy and the skills students miss most. Works with no server; everything stays in the teacher's browser.
- **Sound:** small synthesized effects, off with one tap.

The expanded cosmetic catalog adds 15 weapons (scythes, warhammers, and glaives in Crimson, Glacier, Void, Jade, and Solar), 15 head accessories, 10 new aura designs, and 8 new finishes. Headwear follows your energy color, including gold and rainbow; weapon variants retain their own palette. Hats, hair, ears, antlers, headphones, and a beard share the Headwear slot. New auras include meteors, spirit koi, planets, spectral tentacles, crystals, vines, code rain, solar rays, a singularity, and desert glyphs. Finishes include carbon weave, obsidian fractures, holographic bands, scales, a starfield, prism facets, frost, and molten veins.

Weapons and headwear appear in the shop preview, armory, login portraits, battle avatar/afterimages, and the rear-facing map avatar. Equipment is cosmetic and does not change damage. Older saves and backups remain compatible; the original blade and original headwear are always available without a purchase. Shop thumbnails remain static while the main preview animates, and new animated art respects reduced-motion preferences.

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

Every world has five original fantasy-tech enemies, including a distinct boss: nautical raiders on the shore, forest hunters, deep-water creatures, frost beasts, crystal predators, castle constructs, and celestial citadel guardians. Each has custom SVG artwork, a programming sigil, lore, a signature attack, and a matching lunge, slam, or ranged-sigil animation. Hidden bosses keep their identity concealed; small map portraits omit tiny text, and idle art respects reduced-motion preferences. `npm test` includes all 35 designs in 210 render states and checks SVG definition isolation.

The bank contains **420 unique question templates: 60 in each world**, preserving the original 88 templates and adding 332 handwritten items. Every world has **15 novice (25%), 30 intermediate (50%), and 15 hard (25%)** templates, represented by tiers 0, 1, and 2. These percentages describe the bank; battle selection still follows the existing tier progression and bosses prioritize hard material.

New questions cover AP-style code tracing, missing expressions, condition equivalence, boundary tests, debugging, algorithm contracts, data representation, and procedural/list abstraction. CSP pseudocode questions explicitly say **AP CSP** and use its one-based list indexes; Java questions use zero-based indexes. Existing class/recursion and LeetCode enrichment remains in its matching world. This is original practice content, not official or copied AP exam material, and is not intended to cover every CSP exam topic.

Content references: [College Board AP CSA course framework](https://apcentral.collegeboard.org/courses/ap-computer-science-a) and [AP CSP exam reference sheet](https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-exam-reference-sheet.pdf). The existing four interaction types are retained; multiple choice remains single-select.

**Every code question is checked against real Java.** `npm run verify` compiles and runs each one with `javac`, and the deploy fails if any expected answer is wrong.

The verifier also enforces the per-world counts and difficulty split, detects duplicate template content, checks accepted answers and multiple-choice keys, and exercises 1,050 battle selections. Java metadata verifies executable examples (including Java equivalents for CSP trace questions); conceptual questions and intentional error examples require content review. Pull requests run verification, battle tests, type checking, and the production build before merge.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run verify     # needs a JDK: checks every question with real Java
npm test           # battle, enemy and cosmetic regression checks
```

## Stack

Next.js (static export), React, TypeScript, Tailwind CSS, Framer Motion, Dexie (IndexedDB), Web Audio. Deploys to GitHub Pages on every push to `main`.

## Layout

- `src/app` pages: home, create, login, map (world view), battle, shop, profile (armory), teacher
- `src/components` `Warrior`, `WarriorGear`, `WarriorAuras`, `Monster`, and `EnemyArt` art, `Arena` (fight animations), `WorldScene`, `QuestionCard`, shared UI
- `src/lib` game data (`game.ts`), battle rules (`battle.ts`), saves (`db.ts`, `progress.ts`, `auth.ts`), sounds (`sfx.ts`)
- `src/lib/questions` question generators per world
- `scripts` question verifier and battle tests
