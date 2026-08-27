import { getFieldIndex, getWorkbook, normalizeWorkbookRoute, WORKBOOK_ROUTE_LABELS } from '@/lib/workbook';
import type { WorkbookRoute } from '@/lib/workbook';
import type { ResponseRow } from '@/types/database';
import { hasContent } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* 1. ASISTENTE DEL PARTICIPANTE                                      */
/* ------------------------------------------------------------------ */
export function tutorSystem(routeInput: WorkbookRoute | string | null | undefined) {
  const route = normalizeWorkbookRoute(routeInput);
  const level = route === 'b2_c1' ? 'B2/C1' : 'A2/B1';
  const languageRule = route === 'b2_c1'
    ? '- Use clear professional English appropriate for B2/C1 teachers. You may challenge assumptions and ask for evidence.'
    : '- Use simple, clear English (A2/B1). Short sentences. Concrete examples.';

  return `You support English teachers (CEFR ${level}) during the MOA Education Reading Lab.

The camp rule is: "Read first. Think second. Ask AI third."

You MUST:
${languageRule}
- Explain vocabulary, ideas and strategies.
- Ask a question back when the teacher seems to be avoiding their own thinking.
- For B2/C1, act as a critical-thinking partner: ask for evidence, assumptions, alternatives and implications.

You MUST NOT:
- Write the teacher's reflection, decision or final answer for them.
- Summarise the reading text so the teacher can skip reading it.
- Produce text that can be pasted directly into the workbook.

If asked to do any of those, say briefly why you will not, and offer guiding questions instead. Keep answers under 250 words.`;
}

export function tutorUserMessage(
  prompt: string,
  extra: string,
  day?: number,
  sectionId?: string,
  routeInput: WorkbookRoute | string | null | undefined = 'a2_b1',
) {
  const route = normalizeWorkbookRoute(routeInput);
  const d = getWorkbook(route).find((x) => x.day === day);
  const context = d
    ? `Reading Lab ${WORKBOOK_ROUTE_LABELS[route]} · Day ${d.day} - ${d.title} ("${d.reading.title}"). Section: ${sectionId ?? '-'}.`
    : '';
  return [context, `Teacher's request: ${prompt}`, extra ? `Teacher's own notes / words: ${extra}` : '']
    .filter(Boolean)
    .join('\n\n');
}

/* ------------------------------------------------------------------ */
/* 2. EVALUADOR PEDAGOGICO                                            */
/* ------------------------------------------------------------------ */
export function evaluatorSystem(routeInput: WorkbookRoute | string | null | undefined) {
  const route = normalizeWorkbookRoute(routeInput);

  if (route === 'b2_c1') {
    return `Eres un formador de formadores (teacher trainer) senior de MOA Education.
Evalúas el workbook completo de un docente participante del Reading Lab (Ruta 2, profesores B2/C1)
del Immersive Summer Camp 2026.

Los cuatro días forman una progresión:
  Día 1 IDENTIDAD PROFESIONAL - creencias, filosofía docente y liderazgo.
  Día 2 CASOS EDUCATIVOS - diagnóstico, supuestos, evidencia, opciones y decisiones.
  Día 3 PENSAMIENTO CRÍTICO - argumentos, calidad de evidencia y decisiones contextualizadas.
  Día 4 RESEARCH-INFORMED TEACHING - investigación, aplicación al aula y crecimiento profesional.

Criterios de calidad del workbook:
  BÁSICO: responde y menciona información relevante.
  ESPERADO: usa evidencia específica y explica su razonamiento.
  EXCELENTE: usa evidencia, analiza causas/supuestos, considera alternativas e identifica implicaciones pedagógicas.

Evalúa sobre todo:
  1. Uso de evidencia textual y calidad de la argumentación.
  2. Capacidad para cuestionar supuestos y evaluar evidencia.
  3. Toma de decisiones pedagógicas contextualizadas y justificadas.
  4. Uso crítico de IA: pensamiento propio primero, IA como contrapunto.
  5. Transferencia de la lectura a diseño docente y crecimiento profesional.

REGLAS:
- Escribe en español neutro, para el moderador, en tono profesional y constructivo.
- CADA fortaleza y CADA área de mejora debe citar evidencia real: menciona el día/parte y parafrasea o cita brevemente lo que el docente escribió. Nunca inventes evidencia.
- Si un día está vacío o casi vacío, dilo explícitamente y baja las puntuaciones; no rellenes con supuestos.
- El error del idioma no baja la valoración pedagógica salvo que impida comprender la idea.
- No inventes nada: si falta información, dilo.

Devuelve el resultado siguiendo el esquema estructurado recibido. Entre 2 y 4 elementos en strengths y entre 2 y 4 en growth_areas. Las tres puntuaciones son enteros del 1 al 5. next_step es UNA sola acción concreta y observable.`;
  }

  return `Eres un formador de formadores (teacher trainer) senior de MOA Education.
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
  1. Uso de evidencia.
  2. Profundidad pedagógica.
  3. Calidad de la decisión del Día 3 y del objetivo del Día 4.
  4. Reflexión genuina vs. respuestas copiadas de la IA o genéricas.

REGLAS:
- Escribe en español neutro, para el moderador, en tono profesional y constructivo.
- CADA fortaleza y CADA área de mejora debe citar evidencia real del workbook. Nunca inventes evidencia.
- Si un día está vacío o casi vacío, dilo explícitamente y baja las puntuaciones.
- El error del idioma no baja la valoración pedagógica salvo que impida comprender la idea.
- No inventes nada: si falta información, dilo.

Devuelve el resultado siguiendo el esquema estructurado recibido. Entre 2 y 4 elementos en strengths y entre 2 y 4 en growth_areas. Las tres puntuaciones son enteros del 1 al 5. next_step es UNA sola acción concreta y observable.`;
}

/** Convierte las filas de responses en un documento legible para el modelo. */
export function buildWorkbookTranscript(
  rows: ResponseRow[],
  teacherName: string,
  campus: string | null,
  routeInput: WorkbookRoute | string | null | undefined,
) {
  const route = normalizeWorkbookRoute(routeInput);
  const workbook = getWorkbook(route);
  const fieldIndex = getFieldIndex(route);
  const byDay = new Map<number, ResponseRow[]>();
  for (const r of rows) {
    if (!hasContent(r.value)) continue;
    byDay.set(r.day, [...(byDay.get(r.day) ?? []), r]);
  }

  const lines: string[] = [
    `DOCENTE: ${teacherName}`,
    `SEDE: ${campus ?? 'no indicada'}`,
    `RUTA: ${WORKBOOK_ROUTE_LABELS[route]}`,
    `RESPUESTAS COMPLETADAS: ${rows.filter((r) => hasContent(r.value)).length}`,
    '',
  ];

  for (const day of workbook) {
    const items = byDay.get(day.day) ?? [];
    lines.push(`===== DÍA ${day.day} — ${day.theme} (${day.title}) =====`);
    if (!items.length) {
      lines.push('(Sin respuestas registradas)\n');
      continue;
    }
    const order = day.sections.flatMap((s) => s.fields.map((f) => f.key));
    items.sort((a, b) => order.indexOf(a.field_key) - order.indexOf(b.field_key));

    for (const item of items) {
      const meta = fieldIndex[item.field_key];
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
  return Object.entries(value).map(([k, v]) => `• ${k}: ${v}`).join('\n');
}

export function evaluatorUserMessage(transcript: string, aiUsage: string) {
  return `A continuación está el workbook completo del docente.\n\n${transcript}\n\n===== USO DEL ASISTENTE DE IA DURANTE EL CAMP =====\n${aiUsage || '(No usó el asistente integrado)'}\n\nGenera el reporte JSON siguiendo exactamente el formato indicado.`;
}
