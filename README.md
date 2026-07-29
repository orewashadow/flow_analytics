# Community Intelligence Bot — Phase 1 (Vercel / Webhook edition)

A Telegram bot that logs community activity (messages, edits, joins/leaves,
polls, admin actions) into Supabase, laying the foundation for a full
community analytics platform. Runs on Vercel using webhooks — no
persistent process, no inactivity spin-down.

## How it works

Telegram pushes each update directly to `/api/webhook`, a serverless
function, instead of the bot polling for updates. This fits Vercel's
model (functions run on-demand) and avoids Render's free-tier spin-down
issue entirely.

## Project structure

```
community-intel-bot/
├── api/
│   ├── webhook.js         ← Telegram sends updates here
│   ├── set-webhook.js     ← visit once after deploy to register the webhook
│   └── webhook-status.js  ← visit any time to check webhook health
├── src/
│   ├── bot.js              (Telegraf setup + routing, no polling)
│   ├── config.js           (settings + feature flags)
│   ├── db.js                (all Supabase access)
│   └── handlers/
│       ├── messages.js
│       ├── joinLeave.js
│       └── admin.js
├── vercel.json
├── package.json
└── .env.example
```

## Deployment steps (no terminal needed)

1. **Push this project to a GitHub repo** (e.g. `community-intel-bot`) —
   using GitHub's mobile web upload or the GitHub app.

2. **Import the repo into Vercel:**
   - Go to vercel.com → **Add New** → **Project**
   - Select your GitHub repo
   - Framework preset: **Other** (no build step needed)
   - Don't deploy yet — first add environment variables (next step)

3. **Add environment variables** in Vercel's project settings
   (Settings → Environment Variables):
   - `BOT_TOKEN` — from @BotFather
   - `SUPABASE_URL` — `https://yappcmqdmkcjsawjumyt.supabase.co`
   - `SUPABASE_ANON_KEY` — your Supabase anon key

4. **Deploy.** Vercel gives you a URL like
   `https://community-intel-bot.vercel.app`.

5. **Register the webhook** — visit this URL once in your phone's browser:
   ```
   https://community-intel-bot.vercel.app/api/set-webhook
   ```
   You should see a JSON response with `"ok": true` from Telegram.

6. **Disable group privacy** so the bot can read regular messages, not
   just commands: message @BotFather → `/setprivacy` → select your bot →
   **Disable**.

7. **Add the bot to your Telegram group**, then send `/ping` — it should
   reply "pong". At that point it's already logging events into
   Supabase in the background.

8. **Check webhook health any time** by visiting:
   ```
   https://community-intel-bot.vercel.app/api/webhook-status
   ```
   This tells you if Telegram is successfully delivering updates or
   hitting errors.

## Architecture notes

- `src/config.js` — all settings and feature flags live here. No values
  should be hardcoded elsewhere in the codebase.
- `src/db.js` — the only file that talks to Supabase. Every other module
  goes through these functions rather than querying the database directly.
- `src/handlers/` — one file per category of Telegram update. Each handler
  is self-contained; adding a new event type means adding a new handler
  file and one line of routing in `src/bot.js`, not touching existing code.
- `api/webhook.js` always responds `200 OK` even on internal errors, since
  Telegram aggressively retries non-200 responses, which could cause
  duplicate event logging. Real errors show up in Vercel's function logs
  instead.

## What's intentionally NOT built yet (future phases)

- Dashboard / API for viewing stats (Phase 2)
- Leaderboards, gamification, badges (Phase 3+)
- AI module (topic detection, sentiment, summaries)
- Web3 / wallet verification module
- Reporting exports (PDF/CSV/Excel)

These are all designed for in the database schema (flexible `metadata`
jsonb columns, per-community `settings` flags) so they can be added as
plugins without rewriting Phase 1.
