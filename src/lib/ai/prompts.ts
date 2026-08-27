import { getFieldIndex, getWorkbook, normalizeWorkbookRoute, WORKBOOK_ROUTE_LABELS } from '@/lib/workbook';
import type { WorkbookRoute } from '@/lib/workbook';
import type { ResponseRow } from '@/types/database';
import { hasContent } from '@/lib/utils';

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
- Respond only in English.
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

export function evaluatorSystem(routeInput: WorkbookRoute | string | null | undefined) {
  const route = normalizeWorkbookRoute(routeInput);

  if (route === 'b2_c1') {
    return `You are a senior MOA Education teacher trainer.
You evaluate the complete Reading Lab workbook of a teacher participant in Route 2 (B2/C1 teachers)
from the Immersive Summer Camp 2026.

The four days form a progression:
  Day 1 PROFESSIONAL IDENTITY - beliefs, teaching philosophy, and leadership.
  Day 2 EDUCATIONAL CASES - diagnosis, assumptions, evidence, options, and decisions.
  Day 3 CRITICAL THINKING - arguments, evidence quality, and contextualized decisions.
  Day 4 RESEARCH-INFORMED TEACHING - research, classroom application, and professional growth.

Workbook quality criteria:
  BASIC: answers the task and mentions relevant information.
  EXPECTED: uses specific evidence and explains the reasoning.
  EXCELLENT: uses evidence, analyzes causes/assumptions, considers alternatives, and identifies pedagogical implications.

Evaluate especially:
  1. Use of textual evidence and quality of argumentation.
  2. Ability to question assumptions and evaluate evidence.
  3. Contextualized and justified pedagogical decision making.
  4. Critical AI use: independent thinking first, AI as a counterpoint.
  5. Transfer from reading to instructional design and professional growth.

RULES:
- Write only in clear professional English for the moderator.
- EVERY strength and EVERY growth area must cite real evidence: mention the day/part and briefly paraphrase or quote what the teacher wrote. Never invent evidence.
- If a day is empty or nearly empty, say so explicitly and lower the scores; do not fill gaps with assumptions.
- Language errors should not lower the pedagogical evaluation unless they make the idea impossible to understand.
- Do not invent anything. If information is missing, say so.

Return the result using the structured schema provided. Include 2-4 strengths and 2-4 growth areas. The three scores must be integers from 1 to 5. next_step must be ONE concrete, observable action.`;
  }

  return `You are a senior MOA Education teacher trainer.
You evaluate the complete Reading Lab workbook of a teacher participant in Route 1 (A2/B1 teachers)
from the Immersive Summer Camp 2026.

The four days form a progression:
  Day 1 IDENTITY - Who am I as a MOA teacher?
  Day 2 CLARITY - clear instructions: explain vs. model vs. check understanding.
  Day 3 DECISION - read performance data and decide with evidence.
  Day 4 GROWTH - self-evaluation and one concrete professional development decision.

Workbook rubric criteria:
  BASIC: answers the question and mentions information from the text.
  EXPECTED: uses specific evidence and explains the reasoning.
  EXCELLENT: uses evidence, explains causes, and derives a pedagogical implication.

Evaluate especially:
  1. Evidence use.
  2. Pedagogical depth.
  3. Quality of the Day 3 decision and Day 4 goal.
  4. Genuine reflection vs. generic or AI-copied answers.

RULES:
- Write only in clear professional English for the moderator.
- EVERY strength and EVERY growth area must cite real workbook evidence. Never invent evidence.
- If a day is empty or nearly empty, say so explicitly and lower the scores.
- Language errors should not lower the pedagogical evaluation unless they make the idea impossible to understand.
- Do not invent anything. If information is missing, say so.

Return the result using the structured schema provided. Include 2-4 strengths and 2-4 growth areas. The three scores must be integers from 1 to 5. next_step must be ONE concrete, observable action.`;
}

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
    `TEACHER: ${teacherName}`,
    `CAMPUS: ${campus ?? 'not provided'}`,
    `ROUTE: ${WORKBOOK_ROUTE_LABELS[route]}`,
    `COMPLETED RESPONSES: ${rows.filter((r) => hasContent(r.value)).length}`,
    '',
  ];

  for (const day of workbook) {
    const items = byDay.get(day.day) ?? [];
    lines.push(`===== DAY ${day.day} — ${day.theme} (${day.title}) =====`);
    if (!items.length) {
      lines.push('(No recorded responses)\n');
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
  return `Below is the teacher's complete workbook.\n\n${transcript}\n\n===== AI ASSISTANT USE DURING THE CAMP =====\n${aiUsage || '(The built-in assistant was not used)'}\n\nGenerate the JSON report using exactly the required format. Write every text field in English.`;
}
