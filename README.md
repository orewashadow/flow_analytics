# Community Intelligence Bot — Phase 1

A Telegram bot that logs community activity (messages, edits, joins/leaves,
polls, admin actions) into Supabase, laying the foundation for a full
community analytics platform.

## What this phase does

- Adds the bot to a Telegram group
- Automatically creates a `communities` row for that group
- Tracks every member who's active, creating `members` rows on first contact
- Logs every event (message, edit, join, leave, poll, admin action) into
  the `events` table, fully timestamped
- Maintains a `daily_stats` rollup per member per day, so future dashboards
  don't need to scan raw events for basic counts

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your real values:
   ```
   cp .env.example .env
   ```
   - `BOT_TOKEN` — from @BotFather
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY` — from your Supabase project's
     Settings → API page

3. Run the bot:
   ```
   npm start
   ```

4. Add the bot to a Telegram group, and give it permission to read messages
   (disable "Group Privacy" in @BotFather via `/setprivacy` → Disable, or
   the bot will only see commands, not regular messages).

## Architecture notes

- `src/config.js` — all settings and feature flags live here. No values
  should be hardcoded elsewhere in the codebase.
- `src/db.js` — the only file that talks to Supabase. Every other module
  goes through these functions rather than querying the database directly.
- `src/handlers/` — one file per category of Telegram update. Each handler
  is self-contained; adding a new event type means adding a new handler
  file and one line of routing in `bot.js`, not touching existing code.

## What's intentionally NOT built yet (future phases)

- Dashboard / API (Phase 2)
- Leaderboards, gamification, badges (Phase 3+)
- AI module (topic detection, sentiment, summaries)
- Web3 / wallet verification module
- Reporting exports (PDF/CSV/Excel)

These are all designed for in the database schema (flexible `metadata`
jsonb columns, per-community `settings` flags) so they can be added as
plugins without rewriting Phase 1.
