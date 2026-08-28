// Modelo de contenido del Reading Lab.
// El workbook es DATA, no JSX: asi el renderizador es uno solo y anadir/editar
// preguntas no obliga a tocar componentes.

export type ReadingBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'quote'; text: string };

export type Field =
  /** Respuesta abierta corta o larga */
  | { type: 'textarea'; key: string; label: string; help?: string; rows?: number; placeholder?: string }
  /** Respuesta de una sola linea */
  | { type: 'text'; key: string; label: string; help?: string; placeholder?: string }
  /** Tabla de evidencias. fixedFirstColumn bloquea la primera columna (Grammar, Past Simple...) */
  | {
      type: 'table';
      key: string;
      label?: string;
      help?: string;
      columns: string[];
      minRows: number;
      fixedFirstColumn?: string[];
      /** Optional dropdown choices keyed by zero-based column index. */
      selectColumns?: Record<number, string[]>;
    }
  /** Autoevaluacion: una opcion por fila */
  | { type: 'matrix'; key: string; label: string; rows: string[]; options: string[] }
  /** Casillas multiples */
  | { type: 'checkgroup'; key: string; label: string; options: string[] }
  /** Prompt sugerido del workbook: se copia a una IA externa y se registra la evidencia de uso */
  | { type: 'ai_prompt'; key: string; prompt: string; note?: string }
  /** Bloque informativo (situaciones, recordatorios) */
  | { type: 'info'; key: string; title?: string; text: string };

export type Checkpoint = {
  number: number;
  items: string[];
};

export type Section = {
  id: string;
  title: string;
  minutes?: number;
  intro?: string;
  fields: Field[];
  checkpoint?: Checkpoint;
};

export type Day = {
  day: 1 | 2 | 3 | 4;
  slug: string;
  title: string;
  theme: string;
  guidingQuestion: string;
  schedule: string;
  objectives: string[];
  reading: { title: string; blocks: ReadingBlock[] };
  /** Coloca la lectura despues de esta seccion. Si se omite, aparece antes de las secciones. */
  readingAfterSectionId?: string;
  /** Coloca la lectura dentro de esta seccion, despues de su introduccion y antes de sus campos. */
  readingBeforeFieldsSectionId?: string;
  sections: Section[];
  finalChecklist: string[];
};



/**
 * Strict completion used by the Lab exit guard. Unlike hasContent(), this
 * verifies every required cell in compound fields so a partially filled table
 * or matrix is not treated as finished.
 */
export function isFieldComplete(field: Field, value: any): boolean {
  if (field.type === 'info' || field.type === 'ai_prompt') return true;

  if (field.type === 'text' || field.type === 'textarea') {
    return typeof value?.text === 'string' && value.text.trim().length > 0;
  }

  if (field.type === 'checkgroup') {
    return Array.isArray(value?.checked) && value.checked.length > 0;
  }

  if (field.type === 'matrix') {
    return field.rows.every((row) => typeof value?.[row] === 'string' && value[row].trim().length > 0);
  }

  if (field.type === 'table') {
    const rows: unknown[][] = Array.isArray(value?.rows) ? value.rows : [];
    for (let r = 0; r < field.minRows; r += 1) {
      for (let c = 0; c < field.columns.length; c += 1) {
        if (c === 0 && field.fixedFirstColumn?.length) continue;
        const cell = rows[r]?.[c];
        if (typeof cell !== 'string' || cell.trim().length === 0) return false;
      }
    }
    return true;
  }

  return false;
}

export const CAMPUS_LABELS: Record<string, string> = {
  merida: 'Mérida',
  el_vigia: 'El Vigía',
};

/** Todos los campos "respondibles" de un dia (excluye info y ai_prompt). */
export function answerableFields(day: Day): { field: Field; sectionId: string }[] {
  const out: { field: Field; sectionId: string }[] = [];
  for (const s of day.sections) {
    for (const f of s.fields) {
      if (f.type !== 'info' && f.type !== 'ai_prompt') out.push({ field: f, sectionId: s.id });
    }
  }
  return out;
}

export function fieldLabel(f: Field): string {
  if (f.type === 'info') return f.title ?? '';
  if (f.type === 'ai_prompt') return 'AI prompt';
  return f.label ?? f.key;
}
