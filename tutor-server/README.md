# CodeWarrior tutor server

The CodeWarrior site is static (GitHub Pages), so it cannot hold an AI API key. This small
server holds any credentials, adds the teaching rules, enforces limits, and calls the AI
provider. By default it uses free Cloudflare Workers AI, so no key and no bill.
The site only knows the server's public URL.

```
browser (GitHub Pages)  --POST /v1/tutor-->  tutor server (holds the key)  -->  AI provider
```

Until a server is deployed and its URL is configured, the site shows the tutor as
**offline**. Lessons, worked examples and verified practice keep working, and nothing pretends
to be AI.

## What it does

- `GET /v1/health` reports whether a provider is configured.
- `POST /v1/tutor` with `mode: "chat"` answers a conversation; `mode: "grade"` grades a short
  written explanation and returns validated JSON (`correct | partial | incorrect`, feedback,
  missing ideas). Malformed model output is rejected, never shown as a grade.
- Teaching rules live in `src/prompt.ts`: AP CSA Java versus AP CSP pseudocode conventions,
  the student's explanation preferences, graduated hints that give a full explanation on
  request, misconception-focused corrections, no claims of having run code, and "trust the
  verified answer key" when the site sends one.
- Provider adapter (`src/providers.ts`): free Cloudflare Workers AI (default), or Anthropic or
  any OpenAI-compatible API, chosen with `TUTOR_PROVIDER`. A `mock` provider exists for automated tests only; it refuses
  to start unless `ALLOW_MOCK=1`, and every mock reply says it is a mock.

## Limits and cost controls

| Setting | Default | Meaning |
| --- | --- | --- |
| `RATE_PER_10MIN` | 20 | requests per client IP per 10 minutes |
| `RATE_PER_DAY` | 150 | requests per client IP per day |
| `DAILY_LIMIT` | 3000 | requests per day for the whole server instance |
| `TIMEOUT_MS` | 30000 | provider timeout |
| `ALLOWED_ORIGINS` | the GitHub Pages site and localhost | CORS allow-list |

Requests are also capped in size: at most 16 messages, 6,000 characters per message,
24,000 characters per conversation, 4,000 for the current-question context. Replies are capped
at 750 tokens (1,100 for step-by-step mode). Rate counters live in memory, so on Cloudflare
they are per isolate. With the default free setup there is nothing to bill: the Workers AI
daily allowance is the hard cap.

## Privacy

The site sends only: course, explanation preferences, the current lesson or question, recent
messages in the conversation and (only if the student leaves "Let the tutor see my progress"
on) a short summary such as "needs practice on: substring". It never sends the warrior name,
password, account id or device data. The server does not store conversations.

## Deploy it for free (Cloudflare Workers AI, about 10 minutes)

The default setup costs nothing and needs no API key. The server runs as a Cloudflare Worker
and uses **Workers AI**, which is included in the Workers Free plan with a daily allowance
(10,000 "neurons" per day). On the free plan, going over the allowance does not create a
charge; requests fail until the next day, and the site tells the student "Today's free tutor
allowance is used up. It resets tomorrow." Lessons and practice keep working.

The default model is Llama 3.1 8B (fast and cheap in neurons). At Cloudflare's published rates
a typical reply (about 2,000 tokens in, 400 out) uses roughly 38 neurons, so the free allowance
covers about **250 typed questions a day**. The site's built-in study helper (not AI) answers the
tutor buttons (hints, explanations, examples, why was I wrong, boss prep) from the verified
lessons, so those never use the allowance; when the allowance runs out, typed questions get the
closest lesson instead. For better answers but about half as many, set `TUTOR_MODEL` to
`@cf/mistralai/mistral-small-3.1-24b-instruct`.

1. Create a free Cloudflare account at <https://dash.cloudflare.com/sign-up> and stay on the
   **Free** plan (do not add the paid Workers plan).
2. From the repository:
   ```bash
   cd tutor-server
   npx wrangler login      # opens the browser to approve
   npx wrangler deploy     # prints https://codewarrior-tutor.<you>.workers.dev
   ```
3. Check it: `curl https://codewarrior-tutor.<you>.workers.dev/v1/health` should print
   `{"ok":true,"provider":"workers-ai",...}`.
4. In GitHub: **Settings → Secrets and variables → Actions → Variables → New repository
   variable**, name `TUTOR_URL`, value the worker URL (no trailing slash). This is a public
   URL, not a secret.
5. Re-run the "Deploy to GitHub Pages" workflow (or push any commit). The tutor turns on.

### Why not the free Gemini API?

Google's Gemini API terms say it may not be used in an app "directed towards or is likely to
be accessed by individuals under the age of 18", and free-tier prompts may be read by human
reviewers to improve Google's products. CodeWarrior is for high-school students, so it is not
a fit. ([Gemini API Additional Terms](https://ai.google.dev/terms))

### Paid providers (optional, not used)

`TUTOR_PROVIDER = "anthropic"` with `npx wrangler secret put ANTHROPIC_API_KEY`, or
`TUTOR_PROVIDER = "openai"` with `OPENAI_API_KEY` (and optional `OPENAI_BASE_URL`), still work
if the project ever has a budget. Remove the `[ai]` block if you switch.

## Run it locally

```bash
ANTHROPIC_API_KEY=... npx tsx tutor-server/src/node.ts          # paid provider on :8787 (optional)
TUTOR_PROVIDER=mock ALLOW_MOCK=1 npx tsx tutor-server/src/node.ts  # test mode, fake replies
```

Point a local copy of the site at it from the browser console:
`localStorage.setItem("cw.tutorUrl", "http://localhost:8787")`. The tutor header shows
"TEST MODE" whenever the mock provider answers.

Automated tests for the server live in `scripts/test-learn.ts` (CORS, validation, size limits,
rate limits, timeouts, provider failures, grade validation).
