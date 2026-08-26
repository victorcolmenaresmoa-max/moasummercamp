const API_URL = 'https://api.anthropic.com/v1/messages';

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

type CallArgs = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
};

/**
 * Llamada minima a la API de Anthropic (sin SDK: menos dependencias, menos
 * sorpresas al desplegar en Vercel). Para usar OpenAI en su lugar, cambia
 * solo esta funcion: el resto del sistema no la conoce.
 */
export async function callLLM({ system, user, maxTokens = 2000, temperature = 0.3 }: CallArgs): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LLM ${res.status}: ${detail.slice(0, 500)}`);
  }

  const json = await res.json();
  return (json.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();
}

/** Extrae el primer objeto JSON valido de una respuesta del modelo. */
export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?/gm, '').replace(/```$/gm, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('La IA no devolvió JSON');
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
