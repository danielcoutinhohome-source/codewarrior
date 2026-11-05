# Site traffic

After this PR is merged and the Pages + classroom Worker deployment succeeds, sign in
with an allowlisted classroom account and choose **SITE TRAFFIC** in Account settings
(or the teacher dashboard for owner teachers), or open `/codewarrior/analytics/`. No additional account, token, service,
repository variable or subscription is needed. The existing Cloudflare deployment secrets
must already be configured. A deployment without a classroom server cannot collect visits.

## What is available

- Active browsers now and each day's highest observed concurrent browser count.
- Daily distinct browsers, new browsers, returning browsers and page views.
- A graph and exact daily table for 7, 30 or 90 days, with a CSV download.
- Updates every minute while the dashboard is visible. Today's aggregates are updated as
  heartbeats arrive; there is no daily job to configure or keep running.
- Only the at-most-two usernames in the server-only `ANALYTICS_VIEWERS` configuration can read
  aggregates after authentication. Other accounts (including teachers) and anonymous visitors
  cannot read them; the server enforces this, including starter-password changes.
  This does not grant any new access to classroom records.

## Definitions and limits

A visitor is a random first-party browser ID in `localStorage`, **not a unique person or a
registered account**. A browser is new on its first recorded UTC day, returning on later
UTC days. The same browser is counted once per day across tabs. IDs expire server-side after
365 days without activity, so a later return is new. Clearing storage can also make a browser
new; shared browsers can undercount people. There is no historical backfill.

A visible tab reports every 30 seconds, with cross-tab heartbeat suppression. Active means
seen within 90 seconds; closing or hiding all tabs takes up to 90 seconds to disappear.
Daily peak is sampled on accepted updates, not a precise simultaneous-person measurement.
Page views are route entries; a random event ID makes retries/React effect replays idempotent.
No path or query string is sent. Hidden/offline visits, blocked storage, blockers, network
failures and privacy preferences cause undercounts. There is no queue/retry storm.

Daily totals are retained; per-day deduplication receipts are cleaned on the next day's first
accepted update. Old anonymous IDs are cleaned at the same time. UTC is used consistently in
SQL, the graph, and CSV. This is an aggregate daily log, not a session recording or a raw
per-person event feed. First deployment applies additive schema migration 4.

## Privacy and opt out

Traffic tables contain only random IDs, heartbeat times, deduplication receipts and counts.
No student account ID, name, answer, IP, referrer, full URL or device fingerprint is attached
to traffic records. The existing server uses its IP-based request limiter for ingestion
(600 updates/minute per network); those short-lived rate-limit keys follow the existing
classroom cleanup policy. Network providers still process normal HTTP connection metadata.

Do Not Track and Global Privacy Control disable collection. On `/analytics/`, any visitor
can also check **Exclude this browser from future traffic updates**, without signing in.
Alternatively set `localStorage["cw.traffic.optOut"] = "1"`. Opt-out stops future updates;
previous aggregate counts cannot be attributed to a named person or subtracted reliably.

## Free-tier budget

This shares the existing Workers/SQLite free quotas with classroom work. No paid service or
new dependency is introduced. Heartbeats and their rate-limit checks consume requests and
rows; the active-count query scans the active-ID index. Approximately 90 heartbeats per
browser per 45-minute lesson means roughly 2,700 heartbeats for a class of 30, plus page
entries. Each accepted heartbeat writes roughly 6 metered rows (indexes included), plus
first-visit/day receipts. Large site-wide usage can exhaust the classroom's free quota and
also affect class sync until the quota resets. This implementation suits an initial small
pilot, not unlimited scale. Browser telemetry is forgeable and is not an audit or billing
source. `x-rows` includes analytics SQL and can be used to measure total request row usage.

## Verification

- `npm test` includes the SQLite-based traffic regression suite (Node 22+).
- `npx tsx scripts/test-classroom.ts` covers public ingestion, repeated views, teacher-only
  reads, blocked students/anonymous readers, password changes, CORS and bounded ranges.
- `npx tsc --noEmit`, `cd classroom-server && npx tsc -p .`, `npm run verify`, and the
  production static build remain required by AGENTS.md.
- Live smoke check after deployment: open the game in two browser profiles, wait a minute,
  and confirm active count and visitors increase; hide both profiles, wait 90 seconds, and
  refresh the dashboard. The dashboard's own browser also counts unless opted out. Download
  CSV and compare today's row with the table. New/returning counts need a later UTC day.

## Owner-only access

`classroom-server/wrangler.toml` currently permits only `Big3LFG`. Dan's website username
is pending; do not substitute a GitHub username or assume any teacher is an owner.
Add the second exact username to `ANALYTICS_VIEWERS`, comma separated, and deploy.
Missing, malformed or more-than-two-owner configuration denies everyone. Usernames are
case insensitive; passwords and session tokens are always required. Browser-edited capability
flags cannot grant API access. Public signup cannot claim a configured owner name. Existing
classroom accounts retain their sign-in; an unclaimed owner needs server-side provisioning
through the existing workflow. Device-only warriors do not authenticate to this server.
Sign out and back in after deployment to refresh the owner-only navigation capability.
Dashboard page markup is static/public, but links are hidden from other accounts and all
actual traffic data and CSV source reads require server-side owner authorization.
