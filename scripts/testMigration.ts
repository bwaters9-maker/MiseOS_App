/**
 * scripts/testMigration.ts
 * Emulator-only test of the migration script's copy logic — never
 * touches the real project. Seeds flat data, dry-runs (asserts zero
 * writes), confirms (asserts correct copy + doc-ID preservation +
 * cross-reference preservation), verifies (asserts counts match),
 * re-runs confirm (asserts idempotency).
 *
 * Run via:
 *   firebase emulators:exec --only firestore "npx tsx scripts/testMigration.ts"
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { runMigration } from './migrateToRestaurantSubcollections';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}`);
  }
}

async function main() {
  initializeApp({ projectId: 'miseos-migration-test' });
  const db = getFirestore();

  // Seed flat data with known IDs, including a cross-document reference
  // (recipe line -> ingredient) — this is exactly what would silently
  // break if the migration ever used auto-generated IDs instead of
  // preserving the source doc ID.
  await db.collection('ingredients').doc('ing-1').set({ name: 'Salt' });
  await db.collection('recipes').doc('rec-1').set({
    name: 'Test Dish',
    lines: [{ type: 'ingredient', refId: 'ing-1', qty: 5 }],
  });
  await db.collection('staff').doc('emp-1').set({ name: 'Test Chef' });

  const restaurantId = 'test-restaurant';

  await runMigration(db, { restaurantId, confirm: false, verify: false });
  const preCopySnap = await db.collection('restaurants').doc(restaurantId).collection('ingredients').get();
  check('dry run writes nothing', preCopySnap.empty);

  await runMigration(db, { restaurantId, confirm: true, verify: false });

  const copiedIngredient = await db.collection('restaurants').doc(restaurantId).collection('ingredients').doc('ing-1').get();
  check('ingredient copied with same doc ID', copiedIngredient.exists);
  check('ingredient data preserved', copiedIngredient.data()?.name === 'Salt');

  const copiedRecipe = await db.collection('restaurants').doc(restaurantId).collection('recipes').doc('rec-1').get();
  check('recipe copied with same doc ID', copiedRecipe.exists);
  check('recipe cross-reference (refId) preserved', copiedRecipe.data()?.lines?.[0]?.refId === 'ing-1');

  const originalIngredient = await db.collection('ingredients').doc('ing-1').get();
  check('original flat doc untouched after copy', originalIngredient.exists && originalIngredient.data()?.name === 'Salt');

  const verifyResult = await runMigration(db, { restaurantId, confirm: false, verify: true });
  check('verify reports counts match', verifyResult.ok);

  await runMigration(db, { restaurantId, confirm: true, verify: false });
  const afterRerun = await db.collection('restaurants').doc(restaurantId).collection('ingredients').get();
  check('re-running confirm is idempotent (still exactly 1 ingredient doc)', afterRerun.size === 1);

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Migration test run failed:', err);
  process.exit(1);
});
