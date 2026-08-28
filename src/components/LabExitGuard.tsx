'use client';

import { useEffect, useMemo, useState } from 'react';
import { flushAutosaves } from '@/lib/autosaveManager';
import type { Field } from '@/lib/workbook/types';
import { isFieldComplete } from '@/lib/workbook/types';

const FIELD_EVENT = 'moa:workbook-field-change';

type FieldChangeDetail = {
  fieldKey: string;
  value: unknown;
};

export function LabExitGuard({
  fields,
  initiallyComplete,
}: {
  fields: Field[];
  initiallyComplete: string[];
}) {
  const fieldKeys = useMemo(() => fields.map((field) => field.key), [fields]);
  const fieldsByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);
  const initial = useMemo(() => new Set(initiallyComplete), [initiallyComplete]);
  const [completion, setCompletion] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(fieldKeys.map((key) => [key, initial.has(key)])),
  );
  const [warningOpen, setWarningOpen] = useState(false);

  const missingKeys = fieldKeys.filter((key) => !completion[key]);
  const firstMissing = missingKeys[0] ?? null;

  useEffect(() => {
    const onFieldChange = (event: Event) => {
      const detail = (event as CustomEvent<FieldChangeDetail>).detail;
      if (!detail?.fieldKey) return;
      const field = fieldsByKey.get(detail.fieldKey);
      if (!field) return;
      setCompletion((current) => ({ ...current, [detail.fieldKey]: isFieldComplete(field, detail.value) }));
    };

    window.addEventListener(FIELD_EVENT, onFieldChange);
    return () => window.removeEventListener(FIELD_EVENT, onFieldChange);
  }, [fieldsByKey]);

  useEffect(() => {
    const hasMissing = () => fieldKeys.some((key) => !completion[key]);

    const interceptExit = (event: MouseEvent) => {
      if (!hasMissing()) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const link = target.closest<HTMLAnchorElement>('a[href]');
      const exitButton = target.closest<HTMLElement>('[data-lab-exit="true"]');
      if (!link && !exitButton) return;

      if (link) {
        if (link.dataset.labAllowExit === 'true') return;
        const destination = new URL(link.href, window.location.href);
        const current = new URL(window.location.href);
        const samePage = destination.pathname === current.pathname && destination.search === current.search;
        if (samePage && destination.hash) return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void flushAutosaves();
      setWarningOpen(true);
    };

    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasMissing()) return;
      void flushAutosaves();
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('click', interceptExit, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      document.removeEventListener('click', interceptExit, true);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [completion, fieldKeys]);

  const goToMissing = () => {
    setWarningOpen(false);
    if (!firstMissing) return;

    const element = document.getElementById(`field-${firstMissing}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('ring-4', 'ring-coral-500/25', 'rounded-3xl');
    window.setTimeout(() => element.classList.remove('ring-4', 'ring-coral-500/25', 'rounded-3xl'), 2600);
    window.setTimeout(() => {
      const focusable = element.querySelector<HTMLElement>('textarea, input, select, button');
      focusable?.focus({ preventScroll: true });
    }, 450);
  };

  if (!warningOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-plum-500/70 p-4 no-print" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="incomplete-lab-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-moa-lg sm:p-7"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sun-400 text-xl font-extrabold text-plum-500">
          !
        </div>
        <h2 id="incomplete-lab-title" className="h-display mt-4 text-center text-2xl text-teal-900">
          This Lab is not complete yet
        </h2>
        <p className="mt-3 text-center text-sm font-semibold leading-relaxed text-ink/65">
          You still have <strong className="text-coral-600">{missingKeys.length}</strong>{' '}
          {missingKeys.length === 1 ? 'answer' : 'answers'} to complete. Finish the missing fields before leaving this Lab.
        </p>
        <button type="button" className="btn-primary mt-6 w-full py-3" onClick={goToMissing}>
          Take me to the first missing answer
        </button>
        <button type="button" className="btn-ghost mt-2 w-full" onClick={() => setWarningOpen(false)}>
          Stay here
        </button>
      </section>
    </div>
  );
}
