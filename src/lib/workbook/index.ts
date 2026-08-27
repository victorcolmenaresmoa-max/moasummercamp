import { day1 } from './day1';
import { day2 } from './day2';
import { day3 } from './day3';
import { day4 } from './day4';
import { b2c1Day1 } from './b2c1/day1';
import { b2c1Day2 } from './b2c1/day2';
import { b2c1Day3 } from './b2c1/day3';
import { b2c1Day4 } from './b2c1/day4';
import type { Day, Field } from './types';

export * from './types';

export type WorkbookRoute = 'a2_b1' | 'b2_c1';

export const WORKBOOK_ROUTE_LABELS: Record<WorkbookRoute, string> = {
  a2_b1: 'A2–B1',
  b2_c1: 'B2–C1',
};

export const WORKBOOK_ROUTE_TITLES: Record<WorkbookRoute, string> = {
  a2_b1: 'Route 1 · Teachers A2/B1',
  b2_c1: 'Route 2 · Teachers B2/C1',
};

export const A2_B1_WORKBOOK: Day[] = [day1, day2, day3, day4];
export const B2_C1_WORKBOOK: Day[] = [b2c1Day1, b2c1Day2, b2c1Day3, b2c1Day4];

/** Compatibilidad con componentes que solo necesitan los cuatro números de día. */
export const WORKBOOK: Day[] = A2_B1_WORKBOOK;
export const WORKBOOK_DAY_NUMBERS = [1, 2, 3, 4] as const;

export function normalizeWorkbookRoute(value: unknown): WorkbookRoute {
  return value === 'b2_c1' ? 'b2_c1' : 'a2_b1';
}

export function getWorkbook(route: WorkbookRoute | string | null | undefined): Day[] {
  return normalizeWorkbookRoute(route) === 'b2_c1' ? B2_C1_WORKBOOK : A2_B1_WORKBOOK;
}

export function getDay(dayNumber: number, route: WorkbookRoute | string | null | undefined = 'a2_b1'): Day | undefined {
  return getWorkbook(route).find((d) => d.day === dayNumber);
}

/** Total de campos respondibles por día (denominador del % de avance). */
export function totalFields(dayNumber: number, route: WorkbookRoute | string | null | undefined = 'a2_b1'): number {
  const d = getDay(dayNumber, route);
  if (!d) return 0;
  return d.sections.reduce(
    (acc, s) => acc + s.fields.filter((f) => f.type !== 'info' && f.type !== 'ai_prompt').length,
    0,
  );
}

export function totalFieldsAllDays(route: WorkbookRoute | string | null | undefined = 'a2_b1'): number {
  return WORKBOOK_DAY_NUMBERS.reduce((a, d) => a + totalFields(d, route), 0);
}

/** Índice field_key -> metadatos, específico de cada ruta. */
export function getFieldIndex(route: WorkbookRoute | string | null | undefined = 'a2_b1') {
  const idx: Record<string, { day: number; sectionId: string; label: string; type: Field['type'] }> = {};
  for (const d of getWorkbook(route)) {
    for (const s of d.sections) {
      for (const f of s.fields) {
        const label = f.type === 'info' ? (f.title ?? '') : f.type === 'ai_prompt' ? 'AI prompt' : f.label ?? f.key;
        idx[f.key] = { day: d.day, sectionId: s.id, label, type: f.type };
      }
    }
  }
  return idx;
}

export function checkpointsPerDay(route: WorkbookRoute | string | null | undefined = 'a2_b1'): Record<number, number> {
  return getWorkbook(route).reduce(
    (acc, d) => ({ ...acc, [d.day]: d.sections.filter((s) => s.checkpoint).length }),
    {} as Record<number, number>,
  );
}

export function totalCheckpoints(route: WorkbookRoute | string | null | undefined = 'a2_b1'): number {
  return Object.values(checkpointsPerDay(route)).reduce((a, b) => a + b, 0);
}

// Compatibilidad con el código existente. Estos valores representan Ruta 1.
export const TOTAL_FIELDS_ALL_DAYS = totalFieldsAllDays('a2_b1');
export const FIELD_INDEX = getFieldIndex('a2_b1');
export const CHECKPOINTS_PER_DAY = checkpointsPerDay('a2_b1');
export const TOTAL_CHECKPOINTS = totalCheckpoints('a2_b1');
