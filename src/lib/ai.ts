/**
 * src/lib/ai.ts
 * Thin client for the server-side /api/ai proxy. No React, no Anthropic key —
 * the key stays server-side (server.ts locally, a Cloud Function secret in
 * prod). The proxy requires a Firebase ID token; getAiAuthHeader() is the
 * single place every /api/ai caller (callAi() below, plus the few raw-fetch
 * callers that need `tools` or multi-turn `messages`) sources it from, so
 * there's one implementation, not several copies that can drift.
 */
import { auth } from '../firebaseConfig';

export type AiContent = string | Array<Record<string, any>>;

/** Empty object if signed out — the server's 401 handles that case; every
 * caller of this is already gated behind AuthGate, so it's always present
 * in practice. */
export const getAiAuthHeader = async (): Promise<Record<string, string>> => {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const callAi = async (system: string, content: AiContent, maxTokens: number): Promise<string> => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAiAuthHeader()) },
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
