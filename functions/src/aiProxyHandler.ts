/**
 * functions/src/aiProxyHandler.ts
 * Framework-agnostic core of the /api/ai proxy — imported by both the
 * deployed Cloud Function (functions/src/index.ts) and the local
 * Express route (server.ts, via a relative import reaching into this
 * directory) so there is exactly one implementation of ID-token
 * verification, uid logging, and the Anthropic forward, not two copies
 * that can drift apart.
 *
 * Does NOT import firebase-admin itself: server.ts (root node_modules)
 * and this file when bundled with the Cloud Function (functions/
 * node_modules) resolve `firebase-admin` to two separate installed
 * copies with independent internal app registries — initializeApp()
 * on one is invisible to getAuth() on the other, which surfaced as a
 * live "The default Firebase app does not exist" failure. Each caller
 * instead passes its own already-correctly-initialized verifyIdToken
 * function.
 *
 * Same pattern for the per-uid daily quota: the handler never touches
 * Firestore directly. The caller that has Firestore access (the
 * deployed Cloud Function) injects an optional `recordDailyUsage`
 * callback that atomically increments the day's counter and returns
 * the new count. server.ts (local dev) omits it, so local dev runs
 * quota-free.
 *
 * Sentry reporting rides the same rail for the same reason: a bare
 * `@sentry/node` import here would resolve to functions/node_modules
 * when bundled with the Cloud Function and to the root install when
 * server.ts pulls this file in — two SDK copies with independent
 * clients, so an init() on one would be invisible to the
 * captureException() on the other. Exactly the firebase-admin failure
 * described above. The caller that owns an initialized SDK injects
 * `reportError` instead; server.ts omits it, so local dev reports
 * nothing (mirroring the browser side, where an unset VITE_SENTRY_DSN
 * skips init).
 *
 * P-025 made that callback async and awaited: the 502 is not returned
 * until the report has been handed off (and flushed), because a Cloud
 * Run instance can be frozen the moment the response is sent, losing a
 * fire-and-forget capture. Awaiting is bounded by the reporter's own
 * flush timeout, and a reporting failure is caught and logged — it can
 * never change the status or body the caller sees.
 */
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

// Per-uid requests allowed per UTC day. Enforced only when a caller
// supplies a recordDailyUsage counter (the deployed function does;
// local dev does not).
const DAILY_AI_LIMIT = 200;

export interface AiProxyRequest {
  authHeader: string | undefined;
  body: {
    system?: string;
    messages?: unknown;
    max_tokens?: number;
    tools?: unknown;
    __forceError?: unknown;
  };
}

export interface AiProxyResult {
  status: number;
  body: unknown;
}

export async function handleAiProxyRequest(
  req: AiProxyRequest,
  apiKey: string | undefined,
  verifyIdToken: (idToken: string) => Promise<{ uid: string }>,
  recordDailyUsage?: (uid: string, dateKey: string) => Promise<number>,
  reportError?: (err: unknown, uid: string) => Promise<void>,
  allowedTestUids?: string
): Promise<AiProxyResult> {
  const { authHeader, body } = req;

  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
  if (!idToken) {
    return { status: 401, body: { error: { message: 'Missing Authorization: Bearer <idToken> header.' } } };
  }

  let uid: string;
  try {
    const decoded = await verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    // Server-side only — never leak verification internals to the client.
    console.error('verifyIdToken failed:', err instanceof Error ? err.message : err);
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

  // Cap max_tokens so a single request can't run up an unbounded bill.
  // 4096 clears the highest real caller (the Ingredient Advisor at 3000);
  // default stays 1024 when unset (applied at forward time below).
  if (typeof max_tokens === 'number' && max_tokens > 4096) {
    return { status: 400, body: { error: { message: 'max_tokens must not exceed 4096.' } } };
  }

  // Bound the conversation payload — a runaway or abusive transcript
  // can't be forwarded no matter how it was assembled client-side.
  if (messages.length > 40) {
    return { status: 400, body: { error: { message: 'messages must not exceed 40 entries.' } } };
  }
  if (Buffer.byteLength(JSON.stringify(messages), 'utf8') > 100 * 1024) {
    return { status: 400, body: { error: { message: 'messages payload must not exceed 100KB.' } } };
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

  // Per-uid daily quota. Fail-open by design: the per-request caps
  // above already bound every call, so if the counter is unavailable
  // (local dev has no credentials, or a Firestore hiccup in prod) we
  // log and let the request through rather than take AI features down.
  // Runs after the 400 validations so a malformed request never burns
  // quota, and before the Anthropic forward so an over-limit request
  // costs nothing.
  if (recordDailyUsage) {
    const dateKey = new Date().toISOString().slice(0, 10); // UTC day bucket
    try {
      const count = await recordDailyUsage(uid, dateKey);
      if (count > DAILY_AI_LIMIT) {
        return { status: 429, body: { error: { message: 'Daily AI limit reached — try again tomorrow.' } } };
      }
    } catch (err) {
      console.warn('ai_proxy daily quota counter unavailable, allowing request:', err instanceof Error ? err.message : err);
    }
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
    // uid only — never the system prompt, the messages, or any part of
    // the request body. The uid is enough to tie a failure back to an
    // account, which is all the existing ai_proxy_request log carries.
    //
    // Awaited so the response is not sent until the report is handed off
    // — an unawaited capture can die with a frozen instance. Wrapped so
    // a reporting failure stays invisible to the caller: the 502 below
    // is returned either way.
    if (reportError) {
      try {
        await reportError(err, uid);
      } catch (reportErr) {
        console.warn('ai_proxy error report failed:', reportErr instanceof Error ? reportErr.message : reportErr);
      }
    }
    return { status: 502, body: { error: { message: 'Failed to reach Anthropic API.' } } };
  }
}
