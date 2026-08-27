export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

/** true si la respuesta guardada tiene contenido real. */
export function hasContent(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  if (typeof value.text === 'string' && value.text.trim()) return true;
  if (Array.isArray(value.checked) && value.checked.length) return true;
  if (Array.isArray(value.rows)) {
    if (value.rows.some((r: string[]) => r.some((c) => (c ?? '').trim()))) return true;
  }
  for (const [k, v] of Object.entries(value)) {
    if (['text', 'rows', 'checked'].includes(k)) continue;
    if (typeof v === 'string' && v.trim()) return true;
  }
  return false;
}
