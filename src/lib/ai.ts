/**
 * src/lib/ai.ts
 * Thin client for the server-side /api/ai proxy. No React, no Anthropic key —
 * the key stays server-side in server.ts.
 */

export type AiContent = string | Array<Record<string, any>>;

export const callAi = async (system: string, content: AiContent, maxTokens: number): Promise<string> => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error?.message || `AI request failed (${response.status}).`);
  }
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('The AI returned an empty response.');
  }
  return text;
};

export const parseAiJson = (text: string): any => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
};
