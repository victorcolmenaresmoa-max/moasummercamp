'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Boton de eliminar cuenta, con confirmacion por nombre.
 *
 * Es una accion IRREVERSIBLE que borra el workbook entero de una persona, asi
 * que no basta con un "ok/cancelar": hay que teclear el nombre exacto. Es la
 * misma proteccion que usa GitHub para borrar un repositorio, y evita el
 * clasico "me equivoque de fila".
 */
export function DeleteParticipantButton({
  participantId,
  participantName,
}: {
  participantId: string;
  participantName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
  const matches = normalize(typed) === normalize(participantName);

  function close() {
    setOpen(false);
    setTyped('');
    setError(null);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/delete-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: participantId, confirmName: typed }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? 'The account could not be deleted.');
      close();
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? 'Connection error.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Delete the account for ${participantName}`}
        aria-label={`Delete the account for ${participantName}`}
        className="btn btn-sm border-2 border-coral-100 bg-white py-1.5 text-coral-600 hover:border-coral-200 hover:bg-coral-50"
      >
        <TrashIcon className="h-3.5 w-3.5" />
        Delete
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Confirm deletion of ${participantName}`}
      className="w-72 animate-pop-in rounded-2xl border-2 border-coral-200 bg-coral-50 p-3.5 text-left"
    >
      <p className="text-xs font-extrabold text-coral-700">Delete {participantName}</p>
      <p className="mt-1 text-[11px] font-semibold leading-relaxed text-ink/65">
        This deletes the account and the entire workbook. It cannot be undone. The participant can register again with
        the same email address.
      </p>

      <label className="mt-2.5 block text-[11px] font-bold text-ink/70" htmlFor={`del-${participantId}`}>
        Type <span className="font-extrabold text-coral-700">{participantName}</span> to confirm:
      </label>
      <input
        id={`del-${participantId}`}
        className="input mt-1 py-1.5 text-xs"
        value={typed}
        autoComplete="off"
        disabled={busy}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches && !busy) void remove();
          if (e.key === 'Escape') close();
        }}
      />

      {error && <p className="mt-2 text-[11px] font-bold text-coral-700">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!matches || busy}
          onClick={remove}
          className="btn btn-sm grow bg-coral-500 py-1.5 text-white hover:bg-coral-600"
        >
          {busy ? 'Deleting…' : 'Delete'}
        </button>
        <button type="button" disabled={busy} onClick={close} className="btn-ghost btn-sm py-1.5">
          Cancel
        </button>
      </div>
    </div>
  );
}

function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" />
    </svg>
  );
}
