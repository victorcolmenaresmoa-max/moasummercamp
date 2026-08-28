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


/** Duration recorded for one Lab visit. Open visits are capped at one heartbeat grace window. */
export function labSessionSeconds(
  session: { started_at: string; last_seen_at: string; ended_at: string | null },
  nowMs = Date.now(),
) {
  const start = new Date(session.started_at).getTime();
  const lastSeen = new Date(session.last_seen_at).getTime();
  const end = session.ended_at
    ? new Date(session.ended_at).getTime()
    : Math.min(nowMs, lastSeen + 30_000);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m`;
  return seconds > 0 ? '<1m' : '—';
}
