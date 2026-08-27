'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckpointSubmitButton({
  day,
  checkpointNumber,
  resubmit = false,
}: {
  day: number;
  checkpointNumber: number;
  resubmit?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage(null);
    setFailed(false);
    try {
      const response = await fetch('/api/checkpoints/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, checkpointNumber }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setFailed(true);
        setMessage(json?.error ?? 'The checkpoint could not be submitted.');
        return;
      }
      setMessage(json?.warning ?? 'Checkpoint submitted for review.');
      router.refresh();
    } catch {
      setFailed(true);
      setMessage('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button type="button" className="btn-primary btn-sm" disabled={loading} onClick={submit}>
        {loading ? 'Sending…' : resubmit ? 'Resubmit for review' : 'I reached this checkpoint · Submit for review'}
      </button>
      {message && (
        <p className={`mt-2 text-xs font-semibold ${failed ? 'text-coral-600' : 'text-teal-700'}`}>{message}</p>
      )}
    </div>
  );
}
