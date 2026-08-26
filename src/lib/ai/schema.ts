import type { JsonSchema } from './llm';

/**
 * Gramática del reporte pedagógico.
 * Gemini la usa como `responseSchema`: el modelo NO puede salirse de esta forma,
 * así que el fallo "la IA no devolvió JSON" deja de ser posible por construcción.
 */
export const REPORT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '3-5 frases con el retrato profesional del docente.' },
    strengths: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          evidence: { type: 'string', description: 'Día X, Parte Y: evidencia real citada.' },
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
          suggestion: { type: 'string', description: 'Acción concreta y observable.' },
        },
        required: ['title', 'evidence', 'suggestion'],
      },
    },
    evidence_use: { type: 'integer', description: 'Del 1 al 5.' },
    pedagogical_depth: { type: 'integer', description: 'Del 1 al 5.' },
    reflection_depth: { type: 'integer', description: 'Del 1 al 5.' },
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
    summary: str(input?.summary, 'La IA no pudo redactar el resumen. Revisa el workbook manualmente.'),
    strengths: list(input?.strengths, ['title', 'evidence']),
    growth_areas: list(input?.growth_areas, ['title', 'evidence', 'suggestion']),
    evidence_use: clamp(input?.evidence_use),
    pedagogical_depth: clamp(input?.pedagogical_depth),
    reflection_depth: clamp(input?.reflection_depth),
    next_step: str(input?.next_step, 'Sin siguiente paso propuesto.'),
    moderator_notes: str(input?.moderator_notes) || undefined,
  };
}
