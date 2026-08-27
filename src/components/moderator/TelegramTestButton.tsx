'use client';

import { useState } from 'react';

export function TelegramTestButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function test() {
    setBusy(true);
    setMessage(null);
    setFailed(false);
    try {
      const response = await fetch('/api/telegram/test', { method: 'POST' });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setFailed(true);
        setMessage(json?.error ?? 'The Telegram test failed.');
      } else {
        setMessage(json?.message ?? 'Telegram test sent successfully.');
      }
    } catch {
      setFailed(true);
      setMessage('Connection error while testing Telegram.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 grow">
        <p className="text-sm font-extrabold text-teal-900">Telegram checkpoint alerts</p>
        <p className="text-xs font-semibold text-ink/50">Use this after configuring the bot in Vercel.</p>
        {message && <p className={`mt-1 text-xs font-bold ${failed ? 'text-coral-600' : 'text-moss-600'}`}>{message}</p>}
      </div>
      <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={test}>
        {busy ? 'Sending…' : 'Send test alert'}
      </button>
    </div>
  );
}
