import { FIELD_INDEX, WORKBOOK } from '@/lib/workbook';
import type { ResponseRow } from '@/types/database';
import { hasContent } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* 1. ASISTENTE DEL PARTICIPANTE (dentro del lab)                      */
/* ------------------------------------------------------------------ */
export const TUTOR_SYSTEM = `You support English teachers (CEFR A2/B1) during the MOA Education Reading Lab.

The camp rule is: "Read first. Think second. Ask AI third."

You MUST:
- Use simple, clear English (A2/B1). Short sentences. Concrete examples.
- Explain vocabulary, ideas and strategies.
- Ask a question back when the teacher seems to be avoiding their own thinking.

You MUST NOT:
- Write the teacher's reflection, decision or final answer for them.
- Summarise the reading text so the teacher can skip reading it.
- Produce text that can be pasted directly into the workbook.

If asked to do any of those, say briefly why you will not, and offer guiding
questions instead. Keep answers under 250 words.`;

export function tutorUserMessage(prompt: string, extra: string, day?: number, sectionId?: string) {
  const d = WORKBOOK.find((x) => x.day === day);
  const context = d ? `Reading Lab Day ${d.day} - ${d.title} ("${d.reading.title}"). Section: ${sectionId ?? '-'}.` : '';
  return [context, `Teacher's request: ${prompt}`, extra ? `Teacher's own notes / words: ${extra}` : '']
    .filter(Boolean)
    .join('\n\n');
}

/* ------------------------------------------------------------------ */
/* 2. EVALUADOR PEDAGOGICO (reporte final para el moderador)           */
/* ------------------------------------------------------------------ */
export const EVALUATOR_SYSTEM = `Eres un formador de formadores (teacher trainer) senior de MOA Education.
Evalúas el workbook completo de un docente participante del Reading Lab (Ruta 1, profesores A2/B1)
del Immersive Summer Camp 2026.

Los cuatro días forman una progresión:
  Día 1 IDENTITY  - ¿Quién soy como docente MOA?
  Día 2 CLARITY   - instrucciones claras: explicar vs. modelar vs. verificar comprensión.
  Día 3 DECISION  - leer datos de desempeño y decidir con evidencia.
  Día 4 GROWTH    - autoevaluación y una decisión de desarrollo profesional concreta.

Criterios de la rúbrica del workbook:
  BÁSICO     : responde la pregunta y menciona información del texto.
  ESPERADO   : usa evidencia específica y explica su razonamiento.
  EXCELENTE  : usa evidencia, explica causas y deriva una implicación pedagógica.

Evalúa sobre todo:
  1. Uso de evidencia (¿cita el texto/los datos o solo opina?).
  2. Profundidad pedagógica (¿distingue conducta de claridad instruccional? ¿evita saltar a soluciones?).
  3. Calidad de la decisión del Día 3 y del objetivo del Día 4 (¿específico, realista, medible?).
  4. Reflexión genuina vs. respuestas copiadas de la IA o genéricas.

REGLAS:
- Escribe en español neutro, para el moderador (Academy Specialist), en tono profesional y constructivo.
- CADA fortaleza y CADA área de mejora debe citar evidencia real: menciona el día/parte y parafrasea o
  cita brevemente lo que el docente escribió. Nunca inventes evidencia.
- Si un día está vacío o casi vacío, dilo explícitamente y baja las puntuaciones; no rellenes con supuestos.
- El error del idioma (gramática en inglés) NO baja la nota: se evalúa el criterio pedagógico. Solo
  menciónalo si impide entender la idea.
- No inventes nada: si falta información, dilo.

Devuelve el resultado siguiendo el esquema estructurado que recibes (summary, strengths,
growth_areas, evidence_use, pedagogical_depth, reflection_depth, next_step, moderator_notes).
Entre 2 y 4 elementos en strengths y entre 2 y 4 en growth_areas. Las tres puntuaciones son
enteros del 1 al 5. \`next_step\` es UNA sola cosa, concreta y observable.`;

/** Convierte las filas de responses en un documento legible para el modelo. */
export function buildWorkbookTranscript(rows: ResponseRow[], teacherName: string, campus: string | null) {
  const byDay = new Map<number, ResponseRow[]>();
  for (const r of rows) {
    if (!hasContent(r.value)) continue;
    byDay.set(r.day, [...(byDay.get(r.day) ?? []), r]);
  }

  const lines: string[] = [
    `DOCENTE: ${teacherName}`,
    `SEDE: ${campus ?? 'no indicada'}`,
    `RESPUESTAS COMPLETADAS: ${rows.filter((r) => hasContent(r.value)).length}`,
    '',
  ];

  for (const day of WORKBOOK) {
    const items = byDay.get(day.day) ?? [];
    lines.push(`===== DÍA ${day.day} — ${day.theme} (${day.title}) =====`);
    if (!items.length) {
      lines.push('(Sin respuestas registradas)\n');
      continue;
    }
    // Ordena segun el orden real del workbook.
    const order = day.sections.flatMap((s) => s.fields.map((f) => f.key));
    items.sort((a, b) => order.indexOf(a.field_key) - order.indexOf(b.field_key));

    for (const item of items) {
      const meta = FIELD_INDEX[item.field_key];
      lines.push(`--- ${meta?.sectionId ?? item.section_id} | ${item.field_label ?? meta?.label ?? item.field_key}`);
      lines.push(renderValue(item.value));
      lines.push('');
    }
  }
  return lines.join('\n');
}

function renderValue(value: any): string {
  if (!value || typeof value !== 'object') return String(value ?? '');
  if (typeof value.text === 'string') return value.text.trim();
  if (Array.isArray(value.checked)) return value.checked.join(', ');
  if (Array.isArray(value.rows)) {
    return value.rows
      .filter((r: string[]) => r.some((c) => (c ?? '').trim()))
      .map((r: string[]) => '• ' + r.map((c) => (c ?? '').trim()).join(' | '))
      .join('\n');
  }
  return Object.entries(value)
    .map(([k, v]) => `• ${k}: ${v}`)
    .join('\n');
}

export function evaluatorUserMessage(transcript: string, aiUsage: string) {
  return `A continuación está el workbook completo del docente.

${transcript}

===== USO DEL ASISTENTE DE IA DURANTE EL CAMP =====
${aiUsage || '(No usó el asistente integrado)'}

Genera el reporte JSON siguiendo exactamente el formato indicado.`;
}
