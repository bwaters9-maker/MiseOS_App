/**
 * functions/src/index.ts
 * Cloud Function entry points.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { handleAiProxyRequest } from './aiProxyHandler.js';

initializeApp();

// The proxy's one and only Firestore touch: a per-uid, per-UTC-day
// request counter at aiUsage/{uid}_{YYYY-MM-DD}. Admin SDK writes here
// bypass firestore.rules (which deny all client access to aiUsage).
// Atomic read-increment-write in a transaction so the returned count
// is exact under concurrency.
async function recordDailyUsage(uid: string, dateKey: string): Promise<number> {
  const db = getFirestore();
  const ref = db.collection('aiUsage').doc(`${uid}_${dateKey}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = ((snap.exists ? (snap.data()?.count as number | undefined) : 0) ?? 0) + 1;
    tx.set(ref, { uid, date: dateKey, count: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });
}

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
    (idToken) => getAuth().verifyIdToken(idToken),
    recordDailyUsage
  );
  res.status(result.status).json(result.body);
});
