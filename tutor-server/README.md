# CodeWarrior tutor server

The CodeWarrior site is static (GitHub Pages), so it cannot hold an AI API key. This small
server holds the key, adds the teaching rules, enforces limits, and calls the AI provider.
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
- Provider adapter (`src/providers.ts`): Anthropic (default) or any OpenAI-compatible API,
  chosen with `TUTOR_PROVIDER`. A `mock` provider exists for automated tests only; it refuses
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
they are per isolate; for a hard global cap also set a monthly spend limit in the provider's
console.

## Privacy

The site sends only: course, explanation preferences, the current lesson or question, recent
messages in the conversation and (only if the student leaves "Let the tutor see my progress"
on) a short summary such as "needs practice on: substring". It never sends the warrior name,
password, account id or device data. The server does not store conversations.

## Deploy it (Cloudflare Workers, about 10 minutes)

This needs your own accounts and costs money per AI request, so it was not deployed
automatically.

1. Get an API key from <https://console.anthropic.com> (set a monthly spend limit there).
2. Create a free Cloudflare account, then from this folder:
   ```bash
   cd tutor-server
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY     # paste the key; it is stored encrypted
   npx wrangler deploy                            # prints https://codewarrior-tutor.<you>.workers.dev
   ```
3. Check it: `curl https://codewarrior-tutor.<you>.workers.dev/v1/health` should print
   `{"ok":true,"provider":"anthropic",...}`.
4. In GitHub: **Settings → Secrets and variables → Actions → Variables → New repository
   variable**, name `TUTOR_URL`, value the worker URL (no trailing slash). This is a public
   URL, not a secret.
5. Re-run the "Deploy to GitHub Pages" workflow (or push any commit). The tutor turns on.

To change model or provider, edit `[vars]` in `wrangler.toml` (`TUTOR_MODEL`,
`TUTOR_PROVIDER = "openai"` with `OPENAI_API_KEY` and optional `OPENAI_BASE_URL`) and deploy again.

## Run it locally

```bash
ANTHROPIC_API_KEY=... npx tsx tutor-server/src/node.ts          # real provider on :8787
TUTOR_PROVIDER=mock ALLOW_MOCK=1 npx tsx tutor-server/src/node.ts  # test mode, fake replies
```

Point a local copy of the site at it from the browser console:
`localStorage.setItem("cw.tutorUrl", "http://localhost:8787")`. The tutor header shows
"TEST MODE" whenever the mock provider answers.

Automated tests for the server live in `scripts/test-learn.ts` (CORS, validation, size limits,
rate limits, timeouts, provider failures, grade validation).
