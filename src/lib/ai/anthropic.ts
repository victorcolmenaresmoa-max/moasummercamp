const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

type CallArgs = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
};

/**
 * Llamada minima a la API de Google Gemini (sin SDK: menos dependencias,
 * menos sorpresas al desplegar en Vercel).
 *
 * El nombre del archivo y de las funciones exportadas no cambia a proposito:
 * el resto del sistema (rutas /api/ai/*) sigue funcionando sin tocar nada.
 * Para volver a Anthropic u OpenAI, reescribe solo callLLM.
 */
export async function callLLM({ system, user, maxTokens = 2000, temperature = 0.3 }: CallArgs): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is missing');

  const res = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: 'text/plain',
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LLM ${res.status}: ${detail.slice(0, 500)}`);
  }

  const json = await res.json();

  const candidate = json.candidates?.[0];
  if (!candidate) {
    // Gemini bloquea la respuesta completa: promptFeedback explica por que.
    const reason = json.promptFeedback?.blockReason ?? 'no candidates';
    throw new Error(`AI did not return a response (${reason})`);
  }

  const text = (candidate.content?.parts ?? [])
    .map((p: any) => p.text ?? '')
    .join('\n')
    .trim();

  if (!text) throw new Error(`Empty response (finishReason: ${candidate.finishReason ?? 'unknown'})`);
  return text;
}

/** Extrae el primer objeto JSON valido de una respuesta del modelo. */
export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?/gm, '').replace(/```$/gm, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI did not return JSON');
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
