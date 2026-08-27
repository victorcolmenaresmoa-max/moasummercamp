# English, Performance, and Telegram Update

## English-only application

- Participant and moderator UI text is in English.
- Login, sign-up, dashboard, workbook, checkpoints, reports, validation, and server responses are in English.
- B2/C1 workbook labels, instructions, objectives, checkpoint criteria, and final checklists are in English.
- AI tutor/evaluator instructions explicitly require English output.
- Database runtime errors that can reach the UI are in English.
- Proper place/person names are preserved as names.

## Performance

- Middleware authentication is limited to protected/auth routes instead of running on unrelated API/static requests.
- Server profile/auth lookups are memoized per render with React `cache()`.
- Moderator realtime subscriptions no longer refresh the complete dashboard for every participant response autosave.
- Participant-detail response refreshes are debounced.
- External Google Fonts were removed in favor of a system font stack, removing extra DNS/TLS/font downloads.
- Heavy fixed-background and header backdrop-blur effects were reduced.
- Existing browser Supabase singleton and autosave optimizations remain in place.

## Telegram checkpoint alerts

- Resend/email checkpoint notification code was removed.
- Added `src/lib/telegram.ts` for Telegram Bot API delivery.
- Added `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_IDS` environment variables.
- Multiple Telegram chats are supported using comma-separated chat IDs.
- Checkpoint alerts include participant, route, campus, day, checkpoint, resubmission number, and a direct moderator link.
- Added `POST /api/telegram/test`, restricted to moderator/admin accounts.
- Added a **Send test alert** control to the moderator dashboard.
- Checkpoint saving is not lost if Telegram is temporarily unavailable; the app returns a warning while preserving the submission.

## Database

No new database migration is required for this update. The existing `notification_sent_at` checkpoint field is reused for successful Telegram delivery.
