# MOA Reading Lab · Immersive Summer Camp 2026

Digital workbook for the **MOA Reading Lab 2026**, with two routes: **Route 1 (Teachers A2/B1)** and **Route 2 (Teachers B2/C1)**. Each route has four class days, a staff moderator panel, live checkpoint review, controlled day access, and an AI pedagogical report.

> Read first. Think second. Ask AI third.

**Stack:** Next.js 14 · TypeScript · Tailwind · Supabase · Google Gemini · Telegram Bot API · Vercel.

## Quick setup

### 1. Database

For a new Supabase project, run the SQL files in the `supabase/` folder as documented in the migration files. For an existing installation that already supports workbook routes/checkpoints, keep the existing data and migrations; do not recreate the database.

### 2. Environment variables

Copy `.env.example` to `.env.local` for local development. Add the same values in Vercel under **Project Settings > Environment Variables**.

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_CAMP_CODE`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_IDS`

`GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`.

### 3. Run locally

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

### 4. Staff accounts

Participants can sign up normally. Staff roles must be assigned server-side/database-side; they are never granted from the browser.

## Telegram checkpoint alerts

Checkpoint email notifications have been removed. When a participant submits a checkpoint, the app now sends a Telegram alert to every chat ID listed in `TELEGRAM_CHAT_IDS`.

The notification includes participant name, route, campus, day, checkpoint number, and a direct **Open checkpoint** button for the moderator.

The moderator dashboard includes a **Telegram checkpoint alerts** card with a **Send test alert** button so the connection can be verified without submitting a real checkpoint.

For full setup instructions, see `TELEGRAM_SETUP.md`.

## Performance improvements in this version

- Authentication middleware runs only on protected pages instead of every API/static request.
- Server profile lookups are deduplicated within a render.
- The moderator dashboard no longer refreshes the full participant list every time a participant autosaves an answer.
- Realtime refreshes are debounced and limited to events that matter to the current screen.
- External Google Font requests were removed; the app uses a fast system font stack.
- Expensive backdrop blur and fixed-background effects were reduced.
- Existing singleton Supabase/browser autosave optimizations remain in place.

## Day access

The moderator controls which class day is open. Participants cannot move to the next day just because they finished the current one. At the end of a day they return to **My dashboard** and wait until staff opens the next day.

Database RLS remains the authoritative protection for writes; the UI lock is not the only barrier.

## Workbook content

A2/B1:

- `src/lib/workbook/day1.ts`
- `src/lib/workbook/day2.ts`
- `src/lib/workbook/day3.ts`
- `src/lib/workbook/day4.ts`

B2/C1:

- `src/lib/workbook/b2c1/day1.ts`
- `src/lib/workbook/b2c1/day2.ts`
- `src/lib/workbook/b2c1/day3.ts`
- `src/lib/workbook/b2c1/day4.ts`

The route selector is in `src/lib/workbook/index.ts` and sign-up is in `src/app/signup/page.tsx`.

## Main server endpoints

- `POST /api/checkpoints/submit` — saves a checkpoint submission and sends the Telegram alert.
- `POST /api/telegram/test` — staff-only Telegram connection test.
- `POST /api/ai/assist` — participant AI assistant.
- `POST /api/ai/report` — staff pedagogical report generator.

## Language policy

All participant-facing and moderator-facing interface text, validation messages, checkpoint content, and AI instructions are in English. Proper names such as campus/city names are preserved as names.
