import type { JsonSchema } from './llm';

/**
 * Gramática del reporte pedagógico.
 * Gemini la usa como `responseSchema`: el modelo NO puede salirse de esta forma,
 * así que el fallo "la IA no devolvió JSON" deja de ser posible por construcción.
 */
export const REPORT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: "3-5 sentences describing the teacher's professional profile." },
    strengths: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          evidence: { type: 'string', description: 'Day X, Part Y: real cited evidence.' },
        },
        required: ['title', 'evidence'],
      },
    },
    growth_areas: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          evidence: { type: 'string' },
          suggestion: { type: 'string', description: 'Concrete, observable action.' },
        },
        required: ['title', 'evidence', 'suggestion'],
      },
    },
    evidence_use: { type: 'integer', description: 'From 1 to 5.' },
    pedagogical_depth: { type: 'integer', description: 'From 1 to 5.' },
    reflection_depth: { type: 'integer', description: 'From 1 to 5.' },
    next_step: { type: 'string' },
    moderator_notes: { type: 'string' },
  },
  required: [
    'summary',
    'strengths',
    'growth_areas',
    'evidence_use',
    'pedagogical_depth',
    'reflection_depth',
    'next_step',
  ],
  // Gemini respeta el orden de las claves declarado aquí.
  propertyOrdering: [
    'summary',
    'strengths',
    'growth_areas',
    'evidence_use',
    'pedagogical_depth',
    'reflection_depth',
    'next_step',
    'moderator_notes',
  ],
};

export type ReportJson = {
  summary: string;
  strengths: { title: string; evidence: string }[];
  growth_areas: { title: string; evidence: string; suggestion: string }[];
  evidence_use: number;
  pedagogical_depth: number;
  reflection_depth: number;
  next_step: string;
  moderator_notes?: string;
};

/** Normaliza lo que llegue del modelo a algo que la BD siempre acepte. */
export function normalizeReport(input: any): ReportJson {
  const clamp = (n: any) => Math.min(5, Math.max(1, Math.round(Number(n) || 1)));
  const str = (v: any, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

  const list = (arr: any, keys: string[]) =>
    (Array.isArray(arr) ? arr : [])
      .map((item: any) => {
        if (typeof item === 'string') return { title: item.slice(0, 120), evidence: item, suggestion: '' };
        const out: any = {};
        for (const k of keys) out[k] = str(item?.[k]);
        return out;
      })
      .filter((item: any) => item.title || item.evidence);

  return {
    summary: str(input?.summary, 'AI could not produce the summary. Review the workbook manually.'),
    strengths: list(input?.strengths, ['title', 'evidence']),
    growth_areas: list(input?.growth_areas, ['title', 'evidence', 'suggestion']),
    evidence_use: clamp(input?.evidence_use),
    pedagogical_depth: clamp(input?.pedagogical_depth),
    reflection_depth: clamp(input?.reflection_depth),
    next_step: str(input?.next_step, 'No next step was proposed.'),
    moderator_notes: str(input?.moderator_notes) || undefined,
  };
}
