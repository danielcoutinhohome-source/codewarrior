# CodeWarrior

Battle your way from AP CSA basics to real LeetCode problems. Every question is an attack, every world ends in a boss, and the final world is LeetCode itself.

## What works now

- Create a warrior with a username and password (no email or Google account)
- Customize the bot avatar: armor, energy color, and title
- Progress saves in the browser (IndexedDB), and passwords are hashed with PBKDF2
- Log in, log out, and pick from warriors saved on the device
- World map with battle nodes and a boss for World 1
- Daily streak tracking

Next up: the battle engine (HP, combos, hint potions, bosses) and the first world's questions.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Stack

Next.js (static export), React, TypeScript, Tailwind CSS, Framer Motion, Dexie (IndexedDB). Deploys to GitHub Pages on every push to `main`.

## Project layout

- `src/app` pages: home, create, login, map
- `src/components` the `Warrior` avatar and shared UI (3D buttons, pedestal, sky)
- `src/lib` local saves (`db.ts`), accounts (`auth.ts`), world data (`game.ts`)
