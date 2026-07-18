/**
 * functions/src/index.ts
 * Cloud Function entry points.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { handleAiProxyRequest } from './aiProxyHandler.js';

initializeApp();

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

// No explicit `cors` option: requests through the Hosting rewrite are
// same-origin (no CORS involved). Omitting it means a direct
// cross-origin browser call to this function's own URL gets no
// Access-Control-* headers and is blocked by the browser — traffic is
// expected to come through the Hosting rewrite, not this URL directly.
export const ai = onRequest({ secrets: [anthropicApiKey] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed.' } });
    return;
  }

  const result = await handleAiProxyRequest(
    { authHeader: req.headers.authorization, body: req.body ?? {} },
    anthropicApiKey.value(),
    (idToken) => getAuth().verifyIdToken(idToken)
  );
  res.status(result.status).json(result.body);
});
