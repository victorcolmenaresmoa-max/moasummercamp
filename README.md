# MOA Reading Lab · Immersive Summer Camp 2026

Digital workbook for the **MOA Reading Lab 2026**, with two routes: **Route 1 (Teachers A2/B1)** and **Route 2 (Teachers B2/C1)**. Each route has four class days, a staff moderator panel, live checkpoint review, controlled day access, and an AI pedagogical report.

> Read first. Think second. Ask AI third.

**Stack:** Next.js 14 · TypeScript · Tailwind · Supabase · Google Gemini · Telegram Bot API · Vercel.

## Quick setup

### 1. Database

For a new Supabase project, run `supabase/schema.sql` and then the numbered migrations in order. For an existing installation that already supports workbook routes/checkpoints, **do not recreate the database**: run only the migrations you have not applied yet. This version requires `supabase/migration_03_tutorial_exit_timer.sql` for the teacher tutorial state and Lab-time tracking.

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


## Teacher onboarding, incomplete-Lab guard, and Lab time

- The participant header includes a **Tutorial** button. The guide opens automatically the first time a teacher enters the Reading Lab and its completion is stored in `profiles.tutorial_seen_at`.
- While a teacher is inside `/lab/[day]`, attempts to return to the dashboard or sign out are blocked when answer fields are still incomplete. The warning sends the teacher to the first missing field. Required external AI links (Google Gemini) remain usable.
- Each visit to a Lab is stored in `lab_time_sessions`. Leaving the Lab closes the current visit; re-entering starts a new visit and the moderator sees the accumulated individual time. A heartbeat limits over-counting if a browser closes unexpectedly.

For an existing deployment, apply `supabase/migration_03_tutorial_exit_timer.sql` in the Supabase SQL Editor before using these features.

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
- `POST /api/lab-time` — starts, heartbeats, and pauses an authenticated teacher's Lab-time session.
- `POST /api/telegram/test` — staff-only Telegram connection test.
- `GET/POST /api/ai/evidence` — records external AI prompts plus text/screenshot evidence; no participant LLM call is made by the app.
- `POST /api/ai/report` — staff pedagogical report generator.

## Language policy

All participant-facing and moderator-facing interface text, validation messages, checkpoint content, and AI instructions are in English. Proper names such as campus/city names are preserved as names.

## External AI evidence flow

Participant AI prompts are no longer sent to Gemini from the Reading Lab. The prompt card now opens Google Gemini in a new tab and lets the teacher record every prompt used. For each prompt, the teacher can save the returned answer as text, a screenshot, or both. Screenshot files are compressed in the browser and stored privately in the Supabase Storage bucket `ai-evidence`; the bucket is created automatically by the server on the first screenshot upload. Moderators receive temporary signed preview links in the participant review screen.

The participant lab also uses browser-level deterrents against copying instructional text and requests `notranslate` behavior from supported browser translation tools. These controls cannot make third-party extensions, developer tools, screenshots, or external devices technically impossible; they are classroom safeguards rather than a security boundary.
