export type TelegramResult = {
  configured: boolean;
  sent: number;
  failed: number;
  errors: string[];
};

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIds = (process.env.TELEGRAM_CHAT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return { token, chatIds };
}

export function telegramIsConfigured() {
  const { token, chatIds } = getConfig();
  return Boolean(token && chatIds.length);
}

export async function sendTelegramMessage({
  text,
  buttonText,
  buttonUrl,
}: {
  text: string;
  buttonText?: string;
  buttonUrl?: string;
}): Promise<TelegramResult> {
  const { token, chatIds } = getConfig();
  if (!token || !chatIds.length) {
    return { configured: false, sent: 0, failed: 0, errors: [] };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const results = await Promise.allSettled(
      chatIds.map(async (chatId) => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...(buttonText && buttonUrl
              ? { reply_markup: { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] } }
              : {}),
          }),
        });

        const payload = await response.json().catch(() => null) as any;
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.description ?? `Telegram HTTP ${response.status}`);
        }
      }),
    );

    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => String(result.reason?.message ?? result.reason));

    return {
      configured: true,
      sent: results.length - errors.length,
      failed: errors.length,
      errors,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function escapeTelegramHtml(value: string) {
  return value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] ?? char);
}
