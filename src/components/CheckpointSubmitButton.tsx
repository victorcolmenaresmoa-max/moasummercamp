'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { flushAutosaves } from '@/lib/autosaveManager';

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
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage(null);
    setFailed(false);
    try {
      // Si quedaba una respuesta en la cola de autosave, se envia en paralelo
      // con el checkpoint: no agrega otra espera secuencial y evita refrescar
      // la pagina con una respuesta todavia pendiente.
      const [response] = await Promise.all([
        fetch('/api/checkpoints/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ day, checkpointNumber }),
        }),
        flushAutosaves(),
      ]);
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setFailed(true);
        setMessage(json?.error ?? 'The checkpoint could not be submitted.');
        return;
      }

      // El usuario ya termino: Telegram se dispara aparte y no bloquea el boton.
      setSubmitted(true);
      setMessage('Checkpoint submitted for review.');
      void fetch('/api/checkpoints/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, checkpointNumber }),
        keepalive: true,
      }).catch(() => undefined);

      // Refresca los datos visuales, pero ya fuera del tiempo de espera percibido.
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
      {!submitted && (
        <button type="button" className="btn-primary btn-sm" disabled={loading} onClick={submit}>
          {loading ? 'Sending…' : resubmit ? 'Resubmit for review' : 'I reached this checkpoint · Submit for review'}
        </button>
      )}
      {message && (
        <p className={`mt-2 text-xs font-semibold ${failed ? 'text-coral-600' : 'text-teal-700'}`}>{message}</p>
      )}
    </div>
  );
}
