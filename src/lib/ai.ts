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

/** Shown whenever an AI call can't authenticate — auth.currentUser is null
 * (a stale/half-dead session AuthGate hasn't caught up to yet) or the
 * server rejects the token as expired. Sign Out (AppHeader) is the actual
 * recovery path — it's what forces a fresh onAuthStateChanged and drops
 * AuthGate to the real sign-in screen. */
export const AI_SIGNED_OUT_MESSAGE = 'Session expired — sign out and sign back in.';

/** Throws AI_SIGNED_OUT_MESSAGE instead of silently returning {} when
 * signed out, so a caller can never fire a doomed request — every
 * /api/ai caller awaits this before its fetch. */
export const getAiAuthHeader = async (): Promise<Record<string, string>> => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error(AI_SIGNED_OUT_MESSAGE);
  return { Authorization: `Bearer ${token}` };
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
    if (response.status === 401) throw new Error(AI_SIGNED_OUT_MESSAGE);
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
