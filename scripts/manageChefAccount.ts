/**
 * scripts/manageChefAccount.ts
 * Creates a new chef account or retrofits an existing Firebase Auth user
 * with a restaurantId custom claim + a users/{uid} metadata doc. Run
 * locally only, via the Firebase Admin SDK — never exposed to the app.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS to point at a service account
 * key JSON (Firebase console -> Project Settings -> Service Accounts ->
 * Generate new private key). That file must never be committed.
 *
 * Usage:
 *   npx tsx scripts/manageChefAccount.ts create --email=chef@example.com --password=... --restaurantId=some-restaurant --displayName="Chef Name" [--role=chef]
 *   npx tsx scripts/manageChefAccount.ts retrofit --uid=<existing-uid> --restaurantId=main --role=admin [--displayName="Brian"]
 *
 * The affected account must sign out and back in (or force-refresh its ID
 * token) before the new claim takes effect — claims only apply to tokens
 * issued after they're set.
 */
import 'dotenv/config';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function parseArgs(argv: string[]): { mode: string | undefined; opts: Record<string, string> } {
  const [mode, ...rest] = argv;
  const opts: Record<string, string> = {};
  for (const arg of rest) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) opts[match[1]] = match[2];
  }
  return { mode, opts };
}

async function main() {
  const { mode, opts } = parseArgs(process.argv.slice(2));
  if (mode !== 'create' && mode !== 'retrofit') {
    console.error('Usage: npx tsx scripts/manageChefAccount.ts <create|retrofit> --restaurantId=... [options]');
    process.exit(1);
  }

  const restaurantId = opts.restaurantId;
  if (!restaurantId) {
    console.error('--restaurantId is required.');
    process.exit(1);
  }
  const role: 'admin' | 'chef' = opts.role === 'admin' ? 'admin' : 'chef';

  initializeApp({ credential: applicationDefault() });
  const auth = getAuth();
  const db = getFirestore();

  let uid: string;
  let email: string | null;

  if (mode === 'create') {
    if (!opts.email || !opts.password) {
      console.error('create mode requires --email and --password.');
      process.exit(1);
    }
    const userRecord = await auth.createUser({
      email: opts.email,
      password: opts.password,
      displayName: opts.displayName,
    });
    uid = userRecord.uid;
    email = userRecord.email ?? null;
    console.log(`Created Firebase Auth user ${uid} (${email}).`);
  } else {
    if (!opts.uid) {
      console.error('retrofit mode requires --uid.');
      process.exit(1);
    }
    uid = opts.uid;
    const userRecord = await auth.getUser(uid);
    email = userRecord.email ?? null;
    console.log(`Retrofitting existing Firebase Auth user ${uid} (${email}).`);
  }

  await auth.setCustomUserClaims(uid, { restaurantId });
  console.log(`Set restaurantId claim to "${restaurantId}" for ${uid}.`);

  await db.doc(`users/${uid}`).set(
    {
      email,
      restaurantId,
      role,
      displayName: opts.displayName ?? null,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`Wrote users/${uid} metadata doc (role: ${role}).`);
  console.log('\nDone. The account must sign out and back in before the new claim takes effect.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
