# CodeWarrior shared improvement plan

Status: proposed handoff, 2026-10-31. This document coordinates upcoming work; it does not mean
Claude has acknowledged a task or that implementation has begun. Read the latest AGENTS.md,
this plan, open PRs, and main before claiming anything.

## Goal

Deliver a polished AP coding game that feels exciting, teaches effectively, and reliably
shares student work with teachers. David and Daniel should not need to relay routine technical
messages, resolve avoidable conflicts, or diagnose failed deployments.

## Starting point

- Seven worlds now contain 100 templates each, with 25 novice / 50 intermediate / 25 hard.
- Campaign difficulty progression and content-based same-battle deduplication exist.
- Claude added device answer-history selection and review of previously missed skills.
- Boss-door camera arrival and brighter world art exist; visual motion needs browser QA.
- Classroom accounts, assignments, upload queues, live teacher updates, and progress sync exist.
- PR #11 fixed backdated classroom test fixtures and added integration testing before merge.
- Main at 73e127d deployed successfully. README still describes some older behavior and counts.

These are systems to verify and refine, not reasons to replace another contributor's work.

## Collaboration agreement

1. Treat AGENTS.md's **Currently working on** list as the shared ownership register. An entry
   gives task ID, agent, branch/PR, exact files or directories, and a short handoff. Publish the
   claim in a small coordination PR before starting a large change. Until the claim is visible
   on main, it is provisional: inspect other branches/PRs and do not assume exclusive access.
2. Proposed ownership below is an invitation, not a reservation on Claude's behalf. Each agent
   explicitly accepts a task in the register. If another task is already active, preserve it
   and take an independent item, or leave a concrete handoff in the task PR.
3. One implementation owner per file at a time. A reviewer may suggest patches but should not
   independently push a competing rewrite. Shared-file or event-schema changes need a written
   handoff covering the interface, compatibility, affected tests, and the other owner's reply.
4. Read main again before pushing. Incorporate upstream changes through normal merges; never
   force-push or silently replace another agent's solution. Prefer the smaller compatible
   change. If assumptions differ, document the tradeoff and propose a compromise in the PR.
5. Use focused PRs. Include the problem, user-visible result, exact validation, screenshots for
   visual work, and any blocked checks. Update this board and clear completed ownership claims.
6. Before reporting a release as live, check both PR validation and the Pages deployment.
   Distinguish **pushed**, **checks passed**, **merged**, and **deployed** in user updates.
7. Preserve the user's PR-review workflow. Hands-free implementation means agents handle
   investigation, tests, fixes, and handoffs; it does not silently authorize automatic merges.
8. Routine decisions stay with the implementing agent. Escalate to the user only for a real
   product decision or unavailable permission, with a recommendation and its consequence.

Repository notes are asynchronous. Neither agent can assume it has started or contacted the
other runtime merely by writing a note. Claude picks up the handoff when its session next
reads this repository. No unattended background work is promised by this document.

## Ordered work queue

| ID | Priority / outcome | Proposed owner | Status | Scope |
| --- | --- | --- | --- | --- |
| Q1 | Repeatable browser QA and accurate release status | Codex | Ready to claim | Test scripts, test-only fixtures, CI; coordinate workflow edits |
| Q2 | Battle and boss-door polish, tested on real viewports | Codex | After Q1 | WorldScene, WorldPassage, arena art; coordinate combat/reporter files |
| Q3 | Verify classroom reliability across devices | Claude | Awaiting acknowledgment | Classroom server, cloud outbox/progress/live clients; verify existing flows first |
| Q4 | Clear learning feedback and a useful personalized tutor | Claude | After Q3; awaiting acknowledgment | Learn Mode, tutor client/server; coordinate question-selection contracts |
| Q5 | Audit question progression and review fairness together | Joint review; one implementer to be agreed | After Q2/Q4 | Question index/history, battle continuation, skill reports |
| Q6 | Refresh onboarding and document the actual product | Codex | Independent after Q1 | README and explanatory UI copy; coordinate login/classroom copy |

Q1 and an accepted Q3 can proceed independently. Q2 and Q4 can proceed independently once
file ownership is clear. These are proposed batches, not time commitments. If Claude is
already working on an overlapping area, adapt this queue around that work.

## Q1: Make verification dependable first

- Add a repeatable test-only browser setup that can show early-world maps, ready boss doors,
  defeated enemies, and representative battles without changing production account rules.
- Check desktop and narrow mobile layouts, reduced motion, rapid navigation, and interrupted
  animations. Check for runtime errors and clipping of doors, controls, questions, and actors.
- Preserve the full AGENTS.md checks, including the real Worker/SQLite integration suite.
  Keep question verification with a JDK and the static build with the production base path.
- Store screenshots with CI/PR evidence. If the environment cannot run a browser or Worker,
  use the configured CI runner and say exactly what remains unverified.
- Keep setup on free tooling; do not bypass authentication in a production route.

Done: a documented command/CI job reproduces representative map/battle states at both viewport
sizes, saves visual evidence, checks runtime failures, and the entire required suite passes.

## Q2: Improve atmosphere without losing usability

- Inspect the current boss-door camera first. Tune the existing approach and arrival instead
  of layering another camera system over it. Preserve a clear full view without narrowing light.
- Keep doors readable and imposing on mobile; keep interaction targets, warrior, and HUD stable.
- Review all seven environments for a clear path, restrained detail, distinct palettes, and
  readable enemy silhouettes. Protect the brighter blue/mossy Lagoon and distinct Citadel prisms.
- Verify weapon/enemy attack contact and lethal-hit timing, including an interruption or rapid
  route change. Preserve cancellation, pose resets, question input, and result reporting.
- Keep background motion subtle and reduced-motion behavior usable.

Done: before/after evidence for each changed scene, mobile/desktop and reduced-motion checks,
no actor/control clipping, no runtime errors, and existing combat/reporting regressions pass.

## Q3: Trust the student-to-teacher flow

- Exercise existing functionality before adding new abstractions: join a class, finish a battle,
  receive a teacher update, open the actual answers/code, and resume on another device.
- Cover offline battle -> queued events -> reconnect -> exactly-once ingestion; a refreshed tab;
  teacher live-connection loss and reconnect; stale progress writes; and account switching.
- Show accurate pending/saved/retry states using the existing outbox. A missing connection must
  not claim that work was delivered. A failure should preserve work and offer a useful recovery.
- Preserve server-side role, ownership, sharing, enrollment-period, and assignment-launch rules.
  Do not expand teacher access or upload earlier device-only history to make a test pass.
- Fix demonstrated gaps in small PRs. Document recovery behavior without exposing student data.

Done: two isolated browser contexts demonstrate the flow; integration tests cover failure
recovery, isolation, idempotency, and conflicts; a teacher can identify a student's submitted
battle and answers. Any proposed database change uses a new migration and a separate review.

## Q4: Turn mistakes into a clear next step

- Audit existing lessons, practice, and personalized tutor before choosing one measurable gap.
- After a battle, offer a relevant lesson or practice set based on missed skills and let the
  student return to the game. Keep learning explanations distinct from battle damage/scoring.
- Tutor responses should use the student's available progress and explain why a topic was
  selected. Hints should progress toward reasoning rather than immediately handing over answers.
- Practice answers must use deterministic grading / verified questions. AI prose must not become
  an authoritative answer key. Explain unavailable/offline tutor states and provide usable lessons.
- Keep voice optional with a text alternative; avoid new paid APIs or extra personal data.

Done: a learner can miss a skill, find targeted practice, receive useful feedback, and continue;
AI-unavailable behavior remains usable; existing free-tier and tutor tests pass.

## Q5: Agree on question-selection behavior before changing it

Retain the distinction between **unique within a battle** and **review across separate battles**.
The immediate second try is part of the current battle rules. Claude's history-based review is
intentional; do not remove it to satisfy a different interpretation of repeats.

Joint review should decide and record:
- How much remedial review is appropriate while retaining a visible world-to-world ramp.
- What happens as unseen skills or a tier run low, without silently replaying battle content.
- Whether device-only history should remain local or whether a minimal cross-device history
  belongs in progress. No schema or reporting change until an implementation owner is agreed.
- Whether an identifier represents a template or a skill; never rename saved skill keys casually.

Done: agreed examples for novice, intermediate, boss, review, and depleted-bank cases; seeded
regressions for those examples; all seven 100-template banks keep their 25/50/25 composition
and every executable question passes Java verification. Avoid claiming full AP CSP coverage.

## Q6: Help people understand the current product

- Correct stale README claims about 60-template banks, replaying missed questions inside a
  battle, and teacher dashboards being browser-only. Check behavior against source and tests.
- Explain device-only versus class accounts, class joining, synchronization, and the existing
  starter-teacher password-change flow in plain language. Never publish a real credential.
- Audit first-run copy and navigation before proposing changes. Link existing working features
  instead of adding a second onboarding system.

Done: documentation matches the shipped behavior and a new student/teacher can find their
next action without technical implementation details in the product flow.

## Handoff template

Task ID / owner / branch or PR:
Exact files claimed:
Current behavior and intended result:
Shared interfaces and compatibility constraints:
Checks and evidence:
Known limitation / question for the other agent:
Next action / claim cleared:

## Decisions requiring the user

Brand/logo selection remains a user choice. Paid services are prohibited by AGENTS.md. New
product scope, changed classroom sharing policies, or automatic merging need an explicit
user decision. Ordinary implementation details, debugging, and the agreed checks do not.
