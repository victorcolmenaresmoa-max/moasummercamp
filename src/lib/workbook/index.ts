import { day1 } from './day1';
import { day2 } from './day2';
import { day3 } from './day3';
import { day4 } from './day4';
import type { Day, Field } from './types';

export * from './types';
export const WORKBOOK: Day[] = [day1, day2, day3, day4];

export function getDay(dayNumber: number): Day | undefined {
  return WORKBOOK.find((d) => d.day === dayNumber);
}

/** Total de campos respondibles por dia (denominador del % de avance). */
export function totalFields(dayNumber: number): number {
  const d = getDay(dayNumber);
  if (!d) return 0;
  return d.sections.reduce(
    (acc, s) => acc + s.fields.filter((f) => f.type !== 'info' && f.type !== 'ai_prompt').length,
    0,
  );
}

export const TOTAL_FIELDS_ALL_DAYS = [1, 2, 3, 4].reduce((a, d) => a + totalFields(d), 0);

/** Indice global field_key -> {day, sectionId, label} para reconstruir el reporte de IA. */
export const FIELD_INDEX: Record<string, { day: number; sectionId: string; label: string; type: Field['type'] }> = (() => {
  const idx: Record<string, { day: number; sectionId: string; label: string; type: Field['type'] }> = {};
  for (const d of WORKBOOK) {
    for (const s of d.sections) {
      for (const f of s.fields) {
        const label = f.type === 'info' ? (f.title ?? '') : f.type === 'ai_prompt' ? 'AI prompt' : f.label ?? f.key;
        idx[f.key] = { day: d.day, sectionId: s.id, label, type: f.type };
      }
    }
  }
  return idx;
})();

/** Numero de checkpoints por dia (para el dashboard). */
export const CHECKPOINTS_PER_DAY: Record<number, number> = WORKBOOK.reduce(
  (acc, d) => ({ ...acc, [d.day]: d.sections.filter((s) => s.checkpoint).length }),
  {} as Record<number, number>,
);

export const TOTAL_CHECKPOINTS = Object.values(CHECKPOINTS_PER_DAY).reduce((a, b) => a + b, 0);
