# Browser quality checks

Run the actual static production build on a local-only test server:

```sh
npm ci
npx playwright install --with-deps chromium
NEXT_PUBLIC_BASE_PATH=/codewarrior NEXT_PUBLIC_CLASSROOM_URL= NEXT_PUBLIC_TUTOR_URL= npm run build
npm run test:quality
```

The PR workflow runs this after the existing Java, gameplay, classroom integration, and build
checks. Screenshots are uploaded as `browser-quality-screenshots`, retained for seven days.
They are also saved locally in ignored `artifacts/quality/` (`E2E_SHOTS` overrides this).

The suite creates a disposable device-only warrior through the real signup screen, using a
random password. A test fixture edits only that account's local IndexedDB progression to
reproduce map checkpoints. Requests outside the local server are blocked. No production
account, teacher credential, student record, test route, or new application debug bypass is used.
The existing opt-in battle playtest hook supplies answers to exercise the battle sequence.

## What is checked

- Landing/signup layouts at Chromebook-oriented 1366 x 650 and 1024 x 650 content viewports; successful device signup.
- Seven world paths, battle arenas, and ready boss gates at each viewport.
- Gate height, full framing, and actual click hit testing; no horizontal page overflow.
- FIGHT controls above the fold on Chromebook sizes; signup, the opening answer, and map selection by keyboard.
- A short interaction check at 4x CPU slowdown (an approximation, not a hardware benchmark).
- Navigation during the camera approach, plus the game's reduced-motion final framing.
- A real battle with an incorrect answer, retry, player attack, and victory; uncaught JS errors.
- Screenshots of each state, including the failed state when an assertion fails.

Screenshots are evidence for human visual review, not a substitute for it. Inspect readability,
contrast, animation contact, door atmosphere, spacing, and whether controls are easy to find.
The automated geometry checks catch specific regressions; they do not certify every device,
all accessibility requirements, or every weapon/enemy animation.

## Classroom handoff

Claude's `scripts/e2e-classroom.ts` already covers the two-device classroom flow against a real
local Worker. It is a separate suite requiring a build with the local classroom URL configured:

```sh
NEXT_PUBLIC_BASE_PATH=/codewarrior NEXT_PUBLIC_CLASSROOM_URL=http://localhost:8797 npm run build
npx tsx scripts/e2e-classroom.ts
```

Do not point either suite at a production classroom service. Coordinate changes to that script
and the classroom/server files with Claude via AGENTS.md. The existing server integration tests
remain required in CI; the visual suite adds browser coverage rather than replacing them.

Chromebooks are the primary target. The 650px content height leaves room for browser/OS chrome
on typical 768px screens. Set `QA_MOBILE=1 npm run test:quality` to also run the optional
390 x 844 layout. Chrome CPU throttling does not reproduce ChromeOS, GPU, RAM, school filters,
or real network conditions; school hardware remains a separate final acceptance check.
