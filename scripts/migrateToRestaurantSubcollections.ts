/**
 * scripts/migrateToRestaurantSubcollections.ts
 * Copies every document from the old flat top-level collections into
 * restaurants/{restaurantId}/{collection}/{docId} — SAME document IDs
 * preserved. This is required, not cosmetic: every cross-document
 * reference in the type model (RecipeLine.refId, KitchenEvent.clientId,
 * Shift.staffId, Ingredient.vendorId, Feature.recipeId, Recipe.categoryId)
 * resolves by matching the old doc ID against the new collection — an
 * auto-generated ID would silently and permanently break every one of
 * those references.
 *
 * Copy-only. Never deletes or modifies the old flat docs — cleanup is a
 * separate, later, explicitly-confirmed step (after the migrated data is
 * verified live). Safe to re-run: idempotent, overwrites the same target
 * docs with the same source data.
 *
 * Usage:
 *   npx tsx scripts/migrateToRestaurantSubcollections.ts --restaurantId=main            (dry run — reports only, writes nothing)
 *   npx tsx scripts/migrateToRestaurantSubcollections.ts --restaurantId=main --confirm   (actually copies)
 *   npx tsx scripts/migrateToRestaurantSubcollections.ts --restaurantId=main --verify    (read-only: compares source vs already-copied target counts)
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS pointing at a service account
 * key JSON (see scripts/manageChefAccount.ts for how to get one).
 */
import 'dotenv/config';
import { pathToFileURL } from 'url';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

// Must match firestore.rules' TRANSITIONAL ONLY section exactly.
export const COLLECTIONS = [
  'prepItems', 'recipes', 'features', 'staff', 'shifts', 'events', 'alerts',
  'crib_notes', 'timers', 'station_presets', 'recipe_categories',
  'recipe_collections', 'event_types', 'clients', 'vendors',
  'restaurant_profile', 'trend_reports', 'ingredients',
];

export interface MigrationOptions {
  restaurantId: string;
  confirm: boolean;
  verify: boolean;
}

export async function runMigration(db: Firestore, opts: MigrationOptions): Promise<{ ok: boolean; totalDocs: number }> {
  const { restaurantId, confirm, verify } = opts;

  if (verify) {
    console.log(`VERIFY — comparing source counts vs restaurants/${restaurantId}/...\n`);
    let mismatches = 0;
    for (const name of COLLECTIONS) {
      const sourceSnap = await db.collection(name).get();
      const targetSnap = await db.collection('restaurants').doc(restaurantId).collection(name).get();
      const ok = sourceSnap.size === targetSnap.size;
      if (!ok) mismatches++;
      console.log(`  ${name}: source=${sourceSnap.size} target=${targetSnap.size} ${ok ? 'OK' : 'MISMATCH'}`);
    }
    console.log(mismatches === 0 ? '\nAll collections match.' : `\n${mismatches} collection(s) mismatched.`);
    return { ok: mismatches === 0, totalDocs: 0 };
  }

  console.log(`${confirm ? 'LIVE RUN' : 'DRY RUN'} — copying into restaurants/${restaurantId}/...\n`);

  let totalDocs = 0;
  let totalCollectionsWithData = 0;

  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).get();
    if (snap.empty) {
      console.log(`  ${name}: 0 docs, skipping`);
      continue;
    }
    totalCollectionsWithData++;
    totalDocs += snap.size;
    console.log(`  ${name}: ${snap.size} docs`);

    if (!confirm) continue;

    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 500) {
      const batch = db.batch();
      for (const d of docs.slice(i, i + 500)) {
        const target = db.collection('restaurants').doc(restaurantId).collection(name).doc(d.id);
        batch.set(target, d.data());
      }
      await batch.commit();
    }
  }

  console.log(`\n${confirm ? 'Copied' : 'Would copy'} ${totalDocs} docs across ${totalCollectionsWithData} collections.`);
  if (!confirm) {
    console.log('Dry run only — nothing was written. Re-run with --confirm to actually copy, then --verify to check.');
  } else {
    console.log('Old flat documents were left untouched — nothing was deleted. Run with --verify to confirm counts match.');
  }

  return { ok: true, totalDocs };
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const opts: Record<string, string | boolean> = {};
  for (const arg of argv) {
    const eq = arg.match(/^--([^=]+)=(.*)$/);
    if (eq) { opts[eq[1]] = eq[2]; continue; }
    const flag = arg.match(/^--([^=]+)$/);
    if (flag) opts[flag[1]] = true;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const restaurantId = typeof opts.restaurantId === 'string' ? opts.restaurantId : undefined;
  if (!restaurantId) {
    console.error('Usage: npx tsx scripts/migrateToRestaurantSubcollections.ts --restaurantId=... [--confirm | --verify]');
    process.exit(1);
  }

  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  const result = await runMigration(db, {
    restaurantId,
    confirm: opts.confirm === true,
    verify: opts.verify === true,
  });

  if (!result.ok) process.exit(1);
}

// Only run the CLI when this file is executed directly, not when its
// exports (runMigration, COLLECTIONS) are imported by another script.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
