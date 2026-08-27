# Telegram Setup for MOA Checkpoint Alerts

The app sends checkpoint alerts through a Telegram bot instead of email.

## Recommended setup: one private staff group

Using one private Telegram group is the simplest option because every staff member receives the same alert and you only maintain one chat ID.

### 1. Create the bot

1. Open Telegram and search for the official **@BotFather** account.
2. Start the chat and send `/newbot`.
3. Choose a display name for the bot.
4. Choose a username that ends in `bot`.
5. Copy the bot token. Keep it private.

### 2. Create a private staff group

1. Create a private Telegram group for the people who should receive checkpoint alerts.
2. Add the new bot to that group.
3. Send a command such as `/start` in the group. If needed, use `/start@YourBotUsername`.

### 3. Find the group chat ID

1. In a browser, open:
   `https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates`
2. Replace `YOUR_BOT_TOKEN` with the real token from BotFather.
3. Find the most recent group message in the JSON result.
4. Copy the number inside `chat -> id`. Group IDs are usually negative and may start with `-100`.

For private direct-message alerts, each recipient must first open the bot and press **Start**. Then repeat `getUpdates` and copy that person's `chat -> id`.

## 4. Add the variables in Vercel

Open the project in Vercel and go to **Settings > Environment Variables**.

Add:

```text
TELEGRAM_BOT_TOKEN=your_real_bot_token
TELEGRAM_CHAT_IDS=your_chat_id
```

For several chats, separate IDs with commas:

```text
TELEGRAM_CHAT_IDS=123456789,987654321,-1001234567890
```

Never add spaces inside the bot token. Do not commit the real token to GitHub.

## 5. Redeploy

After saving the environment variables, redeploy the latest Vercel deployment so the running app receives the new values.

## 6. Test from the moderator panel

1. Sign in with a moderator/admin account.
2. Open `/moderator`.
3. Find **Telegram checkpoint alerts**.
4. Click **Send test alert**.
5. Confirm that the Telegram message arrives.

## 7. Test a real checkpoint

Submit a checkpoint from a participant account. Telegram should receive an alert with an **Open checkpoint** button that takes staff directly to that participant/day/checkpoint.

## Security notes

- Treat `TELEGRAM_BOT_TOKEN` like a password.
- Store it only in Vercel/local environment variables.
- If the token is ever exposed, use BotFather to revoke it and generate a new one.
