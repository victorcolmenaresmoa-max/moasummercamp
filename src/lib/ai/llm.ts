/**
 * Cliente LLM (Google Gemini) endurecido.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------
 * El error "La IA no devolvió JSON" tenía tres causas reales:
 *
 *  1. `gemini-2.5-flash` es un modelo *con razonamiento*. Los tokens de
 *     "pensamiento" se descuentan de `maxOutputTokens`. Con 2500 tokens el
 *     modelo gastaba el presupuesto pensando y devolvía texto vacío o un JSON
 *     cortado a la mitad -> `finishReason: MAX_TOKENS`.
 *  2. Se pedía `responseMimeType: 'text/plain'`, así que el modelo era libre de
 *     escribir preámbulos ("Aquí tienes el reporte:") o vallas ```json.
 *  3. No había reintentos: cualquier hipo de la API rompía la generación entera.
 *
 * SOLUCIÓN
 *  - Modo JSON nativo: `responseMimeType: 'application/json'` + `responseSchema`.
 *    Gemini queda obligado por gramática a devolver exactamente esa forma.
 *  - `thinkingConfig.thinkingBudget = 0` en los modelos flash: todo el
 *    presupuesto de tokens va a la respuesta.
 *  - Presupuesto de salida generoso + reintento con el doble si se corta.
 *  - Parser tolerante (vallas, preámbulos, comas finales, JSON truncado).
 *  - Timeout con AbortController para no colgar la ruta.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/** Los modelos "flash"/"lite" razonan por defecto: lo apagamos para no gastar tokens. */
const SUPPORTS_THINKING = /gemini-2\.5/.test(MODEL);
const IS_FLASH = /flash|lite/i.test(MODEL);

export type JsonSchema = Record<string, unknown>;

type CallArgs = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Si se pasa, Gemini responde JSON obligado por esta gramática. */
  schema?: JsonSchema;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export class LlmError extends Error {
  constructor(message: string, readonly detail?: string, readonly retryable = false) {
    super(message);
    this.name = 'LlmError';
  }
}

/* ------------------------------------------------------------------------ */
/* Llamada base                                                             */
/* ------------------------------------------------------------------------ */
async function requestOnce({
  system,
  user,
  maxTokens,
  temperature,
  schema,
  signal,
  timeoutMs = 55_000,
}: CallArgs & { maxTokens: number; temperature: number }): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new LlmError('GEMINI_API_KEY is missing on the server.');

  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: maxTokens,
    responseMimeType: schema ? 'application/json' : 'text/plain',
  };
  if (schema) generationConfig.responseSchema = schema;
  // Todo el presupuesto para la respuesta, nada para el "pensamiento".
  if (SUPPORTS_THINKING && IS_FLASH) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const onAbort = () => ac.abort();
  signal?.addEventListener('abort', onAbort);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig,
        safetySettings: [
          'HARM_CATEGORY_HARASSMENT',
          'HARM_CATEGORY_HATE_SPEECH',
          'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          'HARM_CATEGORY_DANGEROUS_CONTENT',
        ].map((category) => ({ category, threshold: 'BLOCK_ONLY_HIGH' })),
      }),
      signal: ac.signal,
      cache: 'no-store',
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new LlmError('AI took too long to respond. Please try again.', undefined, true);
    }
    throw new LlmError('Could not connect to AI.', String(e?.message ?? e), true);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 600);
    // 429/500/503 son transitorios: merecen reintento.
    const retryable = res.status === 429 || res.status >= 500;
    const human =
      res.status === 401 || res.status === 403
        ? 'GEMINI_API_KEY is invalid or does not have permission.'
        : res.status === 429
          ? 'AI is temporarily rate-limited. Please wait a few seconds and try again.'
          : `AI returned error ${res.status}.`;
    throw new LlmError(human, detail, retryable);
  }

  const json: any = await res.json().catch(() => null);
  if (!json) throw new LlmError('Unreadable AI response.', undefined, true);

  const candidate = json.candidates?.[0];
  if (!candidate) {
    const reason = json.promptFeedback?.blockReason ?? 'no candidates';
    throw new LlmError(`AI did not generate a response (${reason}).`, JSON.stringify(json).slice(0, 400));
  }

  const text: string = (candidate.content?.parts ?? [])
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();

  const finish = candidate.finishReason;

  if (!text) {
    if (finish === 'MAX_TOKENS') {
      throw new LlmError('AI ran out of output space before completing the response.', finish, true);
    }
    if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT') {
      throw new LlmError('AI blocked the content because of its safety filters.', finish);
    }
    throw new LlmError(`AI returned an empty response (${finish ?? 'unknown'}).`, finish, true);
  }

  // Texto presente pero cortado: quien llama decide si repara o reintenta.
  if (finish === 'MAX_TOKENS') throw new LlmError('__TRUNCATED__', text, true);

  return text;
}

/* ------------------------------------------------------------------------ */
/* API pública                                                              */
/* ------------------------------------------------------------------------ */

/** Texto libre (asistente del participante). Reintenta ante fallos transitorios. */
export async function callLLM(args: CallArgs): Promise<string> {
  const maxTokens = args.maxTokens ?? 1200;
  const temperature = args.temperature ?? 0.3;
  let lastError: LlmError | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await requestOnce({ ...args, maxTokens: maxTokens * (attempt + 1), temperature });
    } catch (e) {
      const err = e instanceof LlmError ? e : new LlmError(String((e as any)?.message ?? e), undefined, true);
      if (err.message === '__TRUNCATED__' && err.detail) return err.detail; // texto parcial sirve
      lastError = err;
      if (!err.retryable) throw err;
      await sleep(400 * 2 ** attempt);
    }
  }
  throw lastError ?? new LlmError('AI did not respond.');
}

/**
 * JSON garantizado. Obliga al modelo con `responseSchema` y, si aun así llega
 * algo raro, lo repara antes de rendirse.
 */
export async function callLLMJson<T>(args: CallArgs & { schema: JsonSchema }): Promise<{ data: T; raw: string }> {
  const baseTokens = args.maxTokens ?? 4000;
  const temperature = args.temperature ?? 0.2;
  let lastError: LlmError | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const maxTokens = Math.min(8192, baseTokens * (attempt + 1));
    let raw = '';
    try {
      raw = await requestOnce({ ...args, maxTokens, temperature, schema: args.schema });
    } catch (e) {
      const err = e instanceof LlmError ? e : new LlmError(String((e as any)?.message ?? e), undefined, true);
      // Si se truncó, intentamos reparar lo que llegó antes de reintentar.
      if (err.message === '__TRUNCATED__' && err.detail) {
        const repaired = tryParse<T>(err.detail);
        if (repaired) return { data: repaired, raw: err.detail };
      }
      lastError = err;
      if (!err.retryable) throw err;
      await sleep(400 * 2 ** attempt);
      continue;
    }

    const parsed = tryParse<T>(raw);
    if (parsed) return { data: parsed, raw };

    lastError = new LlmError('AI returned a format that could not be interpreted.', raw.slice(0, 400), true);
    await sleep(300);
  }

  throw lastError ?? new LlmError('AI did not return valid JSON.');
}

/* ------------------------------------------------------------------------ */
/* Parser tolerante                                                          */
/* ------------------------------------------------------------------------ */

/** Intenta obtener un objeto del texto del modelo. Devuelve null si no puede. */
export function tryParse<T>(text: string): T | null {
  if (!text) return null;

  const cleaned = stripFences(text);

  // 1) El caso feliz (modo JSON nativo).
  const direct = safeJson<T>(cleaned);
  if (direct) return direct;

  // 2) Extraer el primer objeto/array balanceado del texto.
  const block = extractBalanced(cleaned);
  if (block) {
    const parsed = safeJson<T>(block) ?? safeJson<T>(repair(block));
    if (parsed) return parsed;
  }

  // 3) Último recurso: reparar todo el texto (comas finales, truncamiento).
  return safeJson<T>(repair(cleaned));
}

function safeJson<T>(s: string): T | null {
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' ? (v as T) : null;
  } catch {
    return null;
  }
}

function stripFences(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/```[a-zA-Z]*\s*/g, '')
    .replace(/```/g, '')
    .trim();
}

/** Recorre el texto respetando strings y escapes para hallar un bloque cerrado. */
function extractBalanced(text: string): string | null {
  const startIdx = (() => {
    const o = text.indexOf('{');
    const a = text.indexOf('[');
    if (o === -1) return a;
    if (a === -1) return o;
    return Math.min(o, a);
  })();
  if (startIdx === -1) return null;

  const open = text[startIdx];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  // No cerró: devolvemos lo que hay para que `repair` lo cierre.
  return text.slice(startIdx);
}

/** Cierra JSON truncado y limpia comas colgantes. */
function repair(input: string): string {
  let s = input.trim();

  // Si terminó dentro de un string, ciérralo.
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  for (const ch of s) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  if (inString) s += '"';

  // Quita basura final típica de un corte (", "key":" etc.)
  s = s.replace(/,\s*("[^"]*"\s*:?\s*)?$/, '');
  // Cierra lo que quedó abierto, del más interno al más externo.
  while (stack.length) s += stack.pop() === '{' ? '}' : ']';
  // Comas colgantes antes de un cierre.
  s = s.replace(/,(\s*[}\]])/g, '$1');

  return s;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
