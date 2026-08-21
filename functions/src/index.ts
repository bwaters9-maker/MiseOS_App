/**
 * functions/src/index.ts
 * Cloud Function entry points.
 *
 * Deploys run `tsc` automatically: firebase.json's functions block has a
 * predeploy hook (P-024), so lib/ is rebuilt from this source before the
 * directory is packaged. Do not hand-build before deploying.
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

// A DSN is not a secret, but it rides the same Secret Manager path as
// ANTHROPIC_API_KEY so there is one way to configure this function and
// no second .env file in the repo.
const sentryDsn = defineSecret('SENTRY_DSN');

// Comma-separated uid allowlist for the P-025 forced-error trigger. Not
// a secret either — it rides Secret Manager for the same reason the DSN
// does: one configuration path for this function, no second .env in the
// repo. Ships holding the placeholder `none`, which the uid-shape rule
// in the handler rejects, so the trigger is inert until a real uid is
// deliberately set for the duration of a test.
const allowedTestUids = defineSecret('ALLOWED_TEST_UIDS');

// @sentry/node is imported dynamically, not at module scope. Importing
// it eagerly costs ~1.4s of OpenTelemetry instrumentation setup, which
// pushed this module past the 10s budget `firebase deploy --only
// functions` allows for loading the code to discover its exports — the
// deploy failed outright with "Cannot determine backend specification".
// Nothing here needs Sentry until an actual proxy failure, and the
// secret's value is only readable at runtime anyway, so the whole cost
// moves off the discovery path. The module promise is cached, so an
// instance pays it at most once.
let sentryModule: Promise<typeof import('@sentry/node')> | null = null;
let sentryInitialized = false;

// Awaited by the handler before it returns the 502 (P-025). flush() is
// the point of the exercise: captureException only queues the event, and
// a Cloud Run instance can be frozen the moment the response goes out,
// so without flushing the report dies with the instance. The 2s bound
// caps what this can add to an already-failing request.
//
// Rejections propagate to the handler, which catches and logs them —
// reporting still cannot fail the request it describes.
async function reportError(err: unknown, uid: string): Promise<void> {
  const dsn = sentryDsn.value();
  if (!dsn) return;
  sentryModule ??= import('@sentry/node');
  const Sentry = await sentryModule;
  if (!sentryInitialized) {
    // Errors only — no tracesSampleRate, no profiling, no PII.
    Sentry.init({ dsn, sendDefaultPii: false });
    sentryInitialized = true;
  }
  // uid tag only. Nothing from the request body is ever attached.
  Sentry.captureException(err, { tags: { uid } });
  await Sentry.flush(2000);
}

// No explicit `cors` option: requests through the Hosting rewrite are
// same-origin (no CORS involved). Omitting it means a direct
// cross-origin browser call to this function's own URL gets no
// Access-Control-* headers and is blocked by the browser — traffic is
// expected to come through the Hosting rewrite, not this URL directly.
export const ai = onRequest({ secrets: [anthropicApiKey, sentryDsn, allowedTestUids] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed.' } });
    return;
  }

  const result = await handleAiProxyRequest(
    { authHeader: req.headers.authorization, body: req.body ?? {} },
    anthropicApiKey.value(),
    (idToken) => getAuth().verifyIdToken(idToken),
    recordDailyUsage,
    reportError,
    allowedTestUids.value()
  );
  res.status(result.status).json(result.body);
});
