# Working on CodeWarrior (for AI coding agents and people)

Two people work on this repo at the same time, each with an AI assistant (Daniel with Claude,
David with ChatGPT/Codex). These rules keep us from overwriting each other.

## Every time

1. **Pull before you start and again right before you push.** Never force-push. Never rewrite or
   revert someone else's commits; if you must change their code, say so in your commit message.
2. **Keep changes focused.** Don't reformat or reorganize files you aren't otherwise changing.
3. **Run the checks before pushing** (CI runs them too and blocks the deploy if they fail):
   - `npx tsc --noEmit` (site) and `cd classroom-server && npx tsc -p .` (server)
   - `npm test`
   - `npm run verify` (compiles and runs every Java question; needs a JDK)
   - `npx tsx scripts/test-classroom.ts` (classroom server, starts its own local server)
4. Update **Currently working on** below when you start something big, and clear it when done.

## Shared planning and handoffs

Read [docs/TEAM_PLAN.md](docs/TEAM_PLAN.md) before choosing improvement work. It contains
proposed ownership, priorities, acceptance checks, and a handoff template. Proposed Claude
tasks require Claude's acknowledgment; never assume another agent is already implementing
them. Record the task ID, branch/PR, and exact file scope under **Currently working on**.
Keep one implementation owner per file; discuss overlapping changes in the task PR and adapt
to work already in progress. Preserve the user's review-before-merge workflow.

## Areas and what not to break

- **Game** (`src/app/battle`, `src/app/map`, `src/components/*Arena*`, world art): animations,
  combat, worlds. Battle results are also reported to classes; keep the calls to the reporter
  (`report.current?.attempt/finish`) when changing the battle page.
- **Question bank** (`src/lib/questions/`): every Java question must compile and print what it
  claims (`npm run verify`). Each world has exactly 100 templates (25 novice / 50 intermediate / 25 hard); add one, remove one. Don't
  change existing questions' `skill` names (saved progress and lessons refer to them).
- **Learn Mode and tutor** (`src/app/learn`, `src/lib/learn`, `src/lib/tutor`, `tutor-server/`).
- **Classroom** (`classroom-server/`, `src/lib/cloud/`, `src/app/teacher`, `src/app/classroom`):
  accounts, roles and student data. Permissions are enforced on the server; never move a check
  into the browser only. Database changes go in a **new** migration in
  `classroom-server/src/schema.ts` (never edit a released one). See `classroom-server/README.md`.

## Target devices

Students and teachers use Chromebooks. Prioritize Chrome, keyboard/trackpad access,
short laptop viewports, and modest CPU/GPU/RAM. Keep critical controls reachable, avoid
expensive decorative rendering, and keep text alternatives when school policies block
microphones or other optional browser capabilities. CPU-throttled desktop Chrome tests
are useful approximations, not proof of performance on school hardware.

## Hard rules

- Nothing in this project may cost money. Use free tiers only; no paid services or API keys.
- Never commit passwords, tokens or keys. Secrets live in GitHub Actions secrets.
- Teacher accounts are created only by server-side provisioning (the deploy workflow).
  Don't add teacher sign-up.
- Student data stays minimal (username, display name, progress, answers).

## Currently working on

- **Question variety** / Codex / `codex/ap-question-variety` (provisional PR claim).
  Scope: `src/lib/questions/variants-*.ts`, question core/index/history,
  `scripts/verify-questions.ts`, a variety regression script, package test command,
  and question-bank documentation. Add AP-level randomized families to worlds 1–6;
  preserve existing skill keys and world 7. Claude Q4 Learn/tutor files stay untouched.

- **Q4** / Claude (for Daniel) / next up. Claims `src/app/learn`, `src/lib/learn`,
  `src/lib/tutor`, `tutor-server/`, and a small post-battle "practice what you missed" link
  in `src/app/battle/page.tsx` (results screen only; reporter calls untouched). Codex: if Q2
  needs the battle page at the same time, note it here and I'll adapt.

## Recently finished

- Daniel/Claude: question bank is now 100 templates per world (`src/lib/questions/more-w*.ts`),
  and battles use the device's answer history (`src/lib/questions/history.ts`) so question
  types don't repeat unless the student keeps missing them.

- David/Codex: proposed shared improvement plan in `docs/TEAM_PLAN.md` (planning only;
  implementation tasks still need explicit ownership claims).

- Daniel/Claude, Q3 (classroom reliability): coin/power-up refunds from progress sync fixed
  (`scripts/test-progress-merge.ts`); refreshed/closed battles now show as left early at once;
  teacher live view detects dead connections and catches up. `scripts/e2e-classroom.ts` covers
  these (18 steps, run locally; not in CI yet, which fits Q1).

- Daniel/Claude, audit pass: classroom server migration v3 (per-run `skills_json`, dropped
  unused index); teacher summary 25k -> 3.8k rows read, uploads 71 -> 35 rows written per
  battle (`scripts/bench-classroom.ts`, `x-rows` response header). Fixed: equip() undone by
  sync, class-account streaks never resetting, long answers rejected, teacher dashboard
  reloading in hidden tabs. `src/lib/learn/bank.ts` now holds `BANK_GENS`/`gensForSkill` (import
  from there, not lessons.ts) so the teacher and Learn pages don't load the question bank.
  Deploy now fails if the classroom server's health check never answers.

- David/Codex, Q1/Q2 implementation in PR #13: repeatable browser QA, Chromebook-sized
  maps with the fight control in view, scene-scaled characters, readable world/preview names
  and progress captions.
  No active file claim; validation and screenshot review are recorded in the PR. Claude
  Q4/learning/results-screen work is untouched. Playwright is now a dev dependency, also
  supporting Claude's existing `scripts/e2e-classroom.ts`.
