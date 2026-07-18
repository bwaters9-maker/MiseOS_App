/**
 * functions/src/aiProxyHandler.ts
 * Framework-agnostic core of the /api/ai proxy — imported by both the
 * deployed Cloud Function (functions/src/index.ts) and the local
 * Express route (server.ts, via a relative import reaching into this
 * directory) so there is exactly one implementation of ID-token
 * verification, uid logging, and the Anthropic forward, not two copies
 * that can drift apart.
 *
 * Assumes firebase-admin's default app is already initialized by the
 * caller (initializeApp({ projectId }) is enough — verifyIdToken()
 * checks the JWT signature against Google's public keys and does not
 * itself require full service-account credentials).
 */
import { getAuth } from 'firebase-admin/auth';

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

export interface AiProxyRequest {
  authHeader: string | undefined;
  body: {
    system?: string;
    messages?: unknown;
    max_tokens?: number;
    tools?: unknown;
  };
}

export interface AiProxyResult {
  status: number;
  body: unknown;
}

export async function handleAiProxyRequest(req: AiProxyRequest, apiKey: string | undefined): Promise<AiProxyResult> {
  const { authHeader, body } = req;

  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
  if (!idToken) {
    return { status: 401, body: { error: { message: 'Missing Authorization: Bearer <idToken> header.' } } };
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return { status: 401, body: { error: { message: 'Invalid or expired ID token.' } } };
  }

  // Logging only — never written to Firestore. Lets a cost spike be
  // traced back to a specific account via Cloud Logging (or the local
  // terminal in dev).
  console.log(JSON.stringify({ event: 'ai_proxy_request', uid, timestamp: new Date().toISOString() }));

  if (!apiKey) {
    return { status: 500, body: { error: { message: 'ANTHROPIC_API_KEY is not configured on the server.' } } };
  }

  const { system, messages, max_tokens, tools } = body ?? {};
  if (!Array.isArray(messages)) {
    return { status: 400, body: { error: { message: 'Request body must include a "messages" array.' } } };
  }

  let allowedTools: unknown[] | undefined;
  if (tools !== undefined) {
    if (
      !Array.isArray(tools) ||
      !tools.every((t) => t && t.type === 'web_search_20250305' && t.name === 'web_search')
    ) {
      return { status: 400, body: { error: { message: 'Only the web_search tool may be requested through this proxy.' } } };
    }
    allowedTools = tools;
  }

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: max_tokens ?? 1024,
        ...(system ? { system } : {}),
        ...(allowedTools ? { tools: allowedTools } : {}),
        messages,
      }),
    });

    const data = await anthropicResponse.json();
    // Anthropic's own error body is already { error: { message } } — forward it as-is.
    return { status: anthropicResponse.status, body: data };
  } catch (err) {
    console.error('Anthropic proxy request failed:', err);
    return { status: 502, body: { error: { message: 'Failed to reach Anthropic API.' } } };
  }
}
