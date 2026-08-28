'use client';

import { useEffect, useState } from 'react';

type Props = { enabled: boolean };

function isEditableTarget(target: EventTarget | null) {
  const el = target instanceof Element ? target : null;
  if (!el) return false;
  return Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));
}

function allowsNativeCopy(target: EventTarget | null) {
  const el = target instanceof Element ? target : null;
  return Boolean(el?.closest('[data-allow-native-copy="true"]'));
}

/**
 * Best-effort classroom protection. It blocks normal selection/copy actions in
 * the workbook and asks supported browser translators to leave the page in
 * English. Browser extensions and developer tools cannot be made impossible
 * from a normal website, so this is intentionally a deterrent rather than a
 * security boundary.
 */
export function LabContentProtection({ enabled }: Props) {
  const [translationDetected, setTranslationDetected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const html = document.documentElement;
    const previousTranslate = html.getAttribute('translate');
    html.setAttribute('translate', 'no');
    html.classList.add('notranslate');

    const preventCopy = (event: ClipboardEvent) => {
      if (!allowsNativeCopy(event.target)) event.preventDefault();
    };
    const preventContextMenu = (event: MouseEvent) => {
      if (!isEditableTarget(event.target)) event.preventDefault();
    };
    const preventDrag = (event: DragEvent) => {
      if (!isEditableTarget(event.target)) event.preventDefault();
    };
    const preventShortcutCopy = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && !allowsNativeCopy(event.target)) {
        event.preventDefault();
      }
    };

    const detectTranslation = () => {
      const translated =
        html.classList.contains('translated-ltr') ||
        html.classList.contains('translated-rtl') ||
        Boolean(document.querySelector('iframe.goog-te-banner-frame, .goog-te-banner-frame, #google_translate_element'));
      if (translated) setTranslationDetected(true);
    };

    document.addEventListener('copy', preventCopy, true);
    document.addEventListener('cut', preventCopy, true);
    document.addEventListener('contextmenu', preventContextMenu, true);
    document.addEventListener('dragstart', preventDrag, true);
    document.addEventListener('keydown', preventShortcutCopy, true);

    const observer = new MutationObserver(detectTranslation);
    observer.observe(html, { attributes: true, attributeFilter: ['class', 'lang', 'translate'] });
    observer.observe(document.body, { childList: true, subtree: false });
    detectTranslation();

    return () => {
      document.removeEventListener('copy', preventCopy, true);
      document.removeEventListener('cut', preventCopy, true);
      document.removeEventListener('contextmenu', preventContextMenu, true);
      document.removeEventListener('dragstart', preventDrag, true);
      document.removeEventListener('keydown', preventShortcutCopy, true);
      observer.disconnect();
      html.classList.remove('notranslate');
      if (previousTranslate === null) html.removeAttribute('translate');
      else html.setAttribute('translate', previousTranslate);
    };
  }, [enabled]);

  if (!enabled || !translationDetected) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-plum-500/95 p-6 text-center text-white no-print">
      <div className="max-w-lg rounded-3xl bg-white p-7 text-ink shadow-moa-lg">
        <p className="eyebrow text-coral-500">English learning mode</p>
        <h2 className="h-display mt-2 text-2xl text-teal-900">Page translation is disabled for this activity.</h2>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-ink/65">
          Return the browser to the original English page, then reload the Reading Lab to continue.
        </p>
        <button type="button" className="btn-primary mt-5" onClick={() => window.location.reload()}>
          Reload original page
        </button>
      </div>
    </div>
  );
}
