# Fresh AP-level practice in worlds 1–6

The user requested more variety rather than more advanced topics. The first six worlds now
have 112 templates each (28 novice, 56 intermediate, 28 hard). LeetCode Citadel retains its
100 templates and existing selection behavior. Existing templates and saved skill names
are preserved. This explicitly expands the earlier 100-template cap at the user's request.

## What changes between questions

72 new templates are built from 24 small program families, with three interaction forms per
family: trace output, choose an output, and fill a constrained literal to reach a target output.
They generate cases from the existing seeded RNG, not from AI or an external service.

| World | Program families | Meaningful variation |
| --- | --- | --- |
| Syntax Shore | Primitive copies, arithmetic precedence, CSP assignment, cast placement | Statement order, operators, parentheses, operands, conversion before/after division |
| Branch Woods | Boundaries, independent/chained decisions, CSP compound conditions, branch order | Equality cases, thresholds, AND/OR, truth values, chosen branch results |
| Loop Lagoon | CSP repetition, stepped traversal, conditional counting, nested counting | Initial state, update order, direction, endpoint inclusion, step, predicates, grid dimensions |
| String Peaks | Immutable strings, slices, relative search, traversal | Character sequences, lengths, slice bounds, markers, relative offsets, prepend/append |
| Array Caverns | Element updates, CSP list filtering, ArrayList shifts, neighbor updates | Data, lengths, indexes, inserted/removed values, filtering conditions, traversal direction |
| Class Castle | Constructor state, shared/separate objects, scope, 2D column traversal | Constructor inputs, operations, aliasing, call counts, field/parameter targets, grid contents |

Each displayed question and its answer/explanation/reference code come from the same generated
case. Multiple-choice positions are shuffled, with four distinct choices; String choices are
quoted so an empty-string distractor is visible. The new fill questions explicitly request
an integer or quoted String literal; their literal-only grading preserves required quotes.
Integer blanks vary addition/subtraction, and String blanks vary prefix/suffix placement and
length, so there is no fixed “take the last two characters” answer shortcut. Existing question
grading remains compatible.

New generators reuse existing topic/skill keys. Lessons that already look up these skills can
use the additional examples without editing Learn Mode. Several templates can teach one skill;
the battle picker still chooses distinct skills within each batch.

## Repeat policy

The existing skill-history review remains: missed skills can be revisited and successful skills
are deprioritized. For history-aware selection in worlds 1–6, the picker also avoids content
from the last 100 recorded answers on that device, whether correct or incorrect. The signature
uses kind, prompt, and code because older attempt records do not include choice options.

A bounded eight-case retry gives parameterized generators a chance to produce a fresh instance;
static templates are skipped when their content is recent. If a tier runs short, the existing
fallback can borrow another AP-level tier. Current-battle content deduplication remains in
place, including continuation rounds. Continuations do not currently receive the cross-battle
history object; the last-100 check applies where the history is supplied. No account/database
schema, battle reporter, or Claude-owned learning/tutor files are changed.

This is not a promise of never repeating a finite bank. Old records without displayed content
cannot be matched, the recent window is device-local and bounded, and the normal immediate
second attempt remains. Different programs can legitimately have the same numerical answer.
Learning the method is the goal; remembering an unchanged example should not be the shortcut.

## AP scope and verification

These are original practice questions, not official exam items or a claim of full exam coverage.
The new content uses bounded arithmetic/control flow, Strings, arrays/ArrayLists, objects, and
small rectangular 2D arrays. It introduces no graph algorithms, dynamic programming, or
interview-problem requirements. CSP cases are explicitly labeled, use CSP notation, and have
an equivalent Java reference program; existing one-based CSP list conventions remain intact.

References checked when authoring:
- [College Board AP CSA course framework](https://apcentral.collegeboard.org/courses/ap-computer-science-a)
- [College Board AP CSP exam reference sheet](https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-exam-reference-sheet.pdf)

Run `npm run verify` with a JDK. Every new template is sampled at least 32 times, compiling and
running its Java program or CSP-equivalent reference and checking the expected output. This
samples parameter combinations; it is not exhaustive proof over every possible combination.

`scripts/test-question-variety.ts` generates 200 cases per template (14,400 total), checks
seed reproducibility, variation in displayed programs and answers, distinct shuffled choices,
literal grading, composition, recent correct/incorrect exclusion, legacy history, and the
unchanged world-7 generator list. It also simulates 30 encounters per world (180 total).
The standard battle and browser suites remain required.
