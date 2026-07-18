/**
 * scripts/backupFirestoreLocal.ts
 * Local JSON backup of every flat top-level collection — read-only
 * against Firestore, writes outside the repo. Used in place of the
 * managed exportDocuments API (which requires Blaze billing, deferred)
 * as the out-of-band safety copy before the pre-cutover cleanup delete.
 *
 * Usage:
 *   npx tsx scripts/backupFirestoreLocal.ts --out=<path>
 *
 * After writing, re-reads the file from disk and reports per-collection
 * counts so the write can be verified before anything gets deleted.
 */
import 'dotenv/config';
import { writeFileSync, readFileSync } from 'fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { COLLECTIONS } from './migrateToRestaurantSubcollections';

function parseArgs(argv: string[]): Record<string, string> {
  const opts: Record<string, string> = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const outPath = opts.out;
  if (!outPath) {
    console.error('Usage: npx tsx scripts/backupFirestoreLocal.ts --out=<path>');
    process.exit(1);
  }

  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  const backup: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {};
  let totalDocs = 0;

  console.log('Reading all flat collections...\n');
  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).get();
    backup[name] = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    totalDocs += snap.size;
    console.log(`  ${name}: ${snap.size} docs`);
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    projectId: 'miseos-app',
    collections: backup,
  };

  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\nWrote backup to ${outPath}`);
  console.log(`Total written: ${totalDocs} docs across ${COLLECTIONS.length} collections checked.`);

  console.log('\nVerifying by re-reading the written file from disk:');
  const reread = JSON.parse(readFileSync(outPath, 'utf8'));
  let rereadTotal = 0;
  let mismatches = 0;
  for (const name of COLLECTIONS) {
    const writtenCount = backup[name].length;
    const rereadCount = (reread.collections[name] ?? []).length;
    rereadTotal += rereadCount;
    const ok = writtenCount === rereadCount;
    if (!ok) mismatches++;
    console.log(`  ${name}: wrote=${writtenCount} reread=${rereadCount} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  console.log(`\nRe-read total: ${rereadTotal} docs across ${reread.collections ? Object.keys(reread.collections).length : 0} collections.`);
  console.log(mismatches === 0 ? 'All collections verified — write matches what was read from Firestore.' : `${mismatches} MISMATCH(ES) — do not proceed to delete.`);
  if (mismatches > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Local backup failed:', err);
  process.exit(1);
});
