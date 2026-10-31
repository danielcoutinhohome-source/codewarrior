# CodeWarrior

Battle your way from AP CSA basics to real LeetCode problems. Every question is an attack, every world ends in a boss, and the final world is LeetCode itself.

Live: https://danielcoutinhohome-source.github.io/codewarrior/

## How it plays

- **Create a warrior** with a username and password (no email or Google). Pick a body, an energy color and a title.
- **World view:** a first-person look down the road. Each enemy stands by its level, and the boss waits in the fog until you win the four battles before it.
- **Battles:** right answers make your warrior attack. Each question gives two tries, and every miss lets the enemy hit you. Combos (3+ and 5+ in a row) land critical hits. Missed questions come back until the enemy falls. Run out of HP and you're knocked out.
- **Items:** Health Potion, Firewall, Power Surge and Hint Scroll (a hint counts as a miss). No hint scrolls in boss fights.
- **Coins and the shop:** win battles for coins, XP and up to 3 stars. Spend coins on power-ups, armor colors, weapons, headwear, finishes, animated auras and titles. Each boss awards a title you can't buy.
- **Armory:** equip what you own, see stats, weak and strong skills, download a backup, or make a progress code for your teacher.
- **Teacher dashboard** (`/teacher`): paste student progress codes to see a class table, stars per world, accuracy and the skills students miss most. Works with no server; everything stays in the teacher's browser.
- **Learn Mode** (`/learn`): lessons, verified practice and an AI tutor tied to your game progress. See below.
- **Sound:** layered synthesized effects for every weapon, enemy attack family, block, combo, finisher and boss seal, off with one tap.

The cosmetic catalog has four weapons (Energy Sword, Reaper Scythe, Warhammer, Glaive) that glow in your energy color, 15 head accessories, 10 new aura designs, and 8 new finishes. Headwear, weapons and armor accents follow your energy color, including gold and rainbow. Hats, hair, ears, antlers, headphones, and a beard share the Headwear slot. New auras include meteors, spirit koi, planets, spectral tentacles, crystals, vines, code rain, solar rays, a singularity, and desert glyphs. Finishes include carbon weave, obsidian fractures, holographic bands, scales, a starfield, prism facets, frost, and molten veins.

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

## Learn Mode

A study hall next to the game, for AP CSA (Java) and AP CSP (exam pseudocode). The two
courses are kept separate: CSA uses `=`, `==` and zero-based indexes; CSP uses `←`, `=` and
one-based lists, and every CSP item is labeled as such.

- **Dashboard:** a recommended next step (an unfixed recent mistake first, then the lesson for
  the world you are on, the weakest topic with enough evidence, or boss prep), topic progress,
  recent mistakes from battles, practice and lesson checkpoints, and a way back into your last
  tutor conversation. Labels stay honest: "Not enough data yet" until there are at least four
  answers, "Needs more practice" below 60% first-try accuracy, "Strong so far" only at 85%
  with six or more answers.
- **20 lessons** (14 CSA, 6 CSP), each with an objective, a short explanation, a worked example,
  a common misconception and a 3-question checkpoint. Java examples are compiled and run by
  `npm run verify`; CSP examples are checked against a JavaScript reference program in
  `npm test`.
- **Practice** by topic and difficulty: multiple choice, code tracing, fill the blank, find and
  fix the bug, ordering, and short written explanations. Two tries, a hint, "show answer", an
  explanation after answering, and a follow-up question on the same misconception after a miss
  (a missed `substring(a, b)` question is followed by another `substring(a, b)` question).
  Every answer is recorded for recommendations. Answer keys come only from the verified bank,
  compiler-checked bug fixes, or reference-checked CSP items.
- **AI tutor:** multi-turn chat with code blocks, saved conversations (new, resume, delete),
  stop and retry, actions (explain differently, simpler example, hint, check my reasoning, why
  was my answer wrong, quiz me, harder problem, boss prep), suggestions tied to the lesson or
  mistake, explanation preferences (short or step by step, beginner or exam style, guided or
  direct), a "What the tutor sees" panel, a progress-sharing switch and "reset
  personalization". Optional push-to-talk voice input and read-aloud where the browser supports
  them; the microphone is only requested when you press the mic button.
- **Written explanations** are graded by the AI when it is connected and labeled "AI feedback ·
  not compiler-verified"; otherwise the student compares against key points and a model answer.

**The tutor needs a small server** because the site is static and AI access can't live in
browser code. The server is in [`tutor-server/`](tutor-server/README.md). By default it runs
free on Cloudflare Workers AI (no API key, no bill; a daily allowance that simply runs out
until the next day). Until it is deployed and `TUTOR_URL` is set, the tutor shows as offline and
everything else works.

## Classes (teacher and student accounts)

Students can create a **class account** (or keep a device-only warrior). Class accounts save
progress online, work on any device, and can join a teacher's class with an 8-character code.
Every finished battle and practice set is queued on the device and uploaded automatically;
results show up on the teacher's dashboard (`/teacher/`) within seconds, with the student's
actual answers. Teachers create classes, publish assignments, review students, leave feedback
and export CSV reports. The backend is free (Cloudflare Workers + SQLite Durable Object):
see [`classroom-server/README.md`](classroom-server/README.md) for the permission model,
sharing policy, setup and the starter teacher account.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run verify     # needs a JDK: checks every question with real Java
npm test           # battle, enemy, cosmetic, Learn Mode, tutor server and sound checks
```

## Stack

Next.js (static export), React, TypeScript, Tailwind CSS, Framer Motion, Dexie (IndexedDB), Web Audio. Deploys to GitHub Pages on every push to `main`.

## Layout

- `src/app` pages: home, create, login, map (world view), battle, shop, profile (armory), teacher
- `src/components` `Warrior`, `WarriorGear`, `WarriorAuras`, `Monster`, and `EnemyArt` art, `Arena` (fight animations), `WorldScene`, `QuestionCard`, shared UI
- `src/lib` game data (`game.ts`), battle rules (`battle.ts`), saves (`db.ts`, `progress.ts`, `auth.ts`), sounds (`sfx.ts`, `combatSfx.ts`)
- `src/lib/learn` lessons, practice engine, insights and storage; `src/lib/tutor` tutor client and voice
- `src/app/learn` dashboard, lessons, practice and tutor pages; `src/components/learn` their components
- `tutor-server` the AI tutor backend (Cloudflare Worker or Node)
- `src/lib/questions` question generators per world
- `scripts` question verifier and battle tests
