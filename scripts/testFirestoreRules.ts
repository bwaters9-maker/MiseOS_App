/**
 * scripts/testFirestoreRules.ts
 * Automated firestore.rules tests against the local emulator only —
 * never touches the real project. Run via:
 *   firebase emulators:exec --only firestore,auth "npx tsx scripts/testFirestoreRules.ts"
 */
import { readFileSync } from 'fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}`);
    console.error(err instanceof Error ? err.message : err);
  }
}

async function main() {
  const [emuHost, emuPortStr] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  const emuPort = parseInt(emuPortStr, 10);

  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'miseos-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: emuHost,
      port: emuPort,
    },
  });

  // Seed: two restaurants in the new shape, one legacy flat doc, one users doc.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'restaurants/restaurant-a/recipes/r1'), { name: 'A Recipe' });
    await setDoc(doc(db, 'restaurants/restaurant-b/recipes/r2'), { name: 'B Recipe' });
    await setDoc(doc(db, 'recipes/legacy1'), { name: 'Legacy Recipe' });
    await setDoc(doc(db, 'users/uid-a'), { restaurantId: 'restaurant-a', role: 'chef' });
  });

  const chefA = testEnv.authenticatedContext('uid-a', { restaurantId: 'restaurant-a' });
  const chefB = testEnv.authenticatedContext('uid-b', { restaurantId: 'restaurant-b' });
  const noClaim = testEnv.authenticatedContext('uid-no-claim', {});
  const anon = testEnv.unauthenticatedContext();

  await check('chef A can read own restaurant subcollection doc', async () => {
    await assertSucceeds(getDoc(doc(chefA.firestore(), 'restaurants/restaurant-a/recipes/r1')));
  });

  await check('chef A cannot read restaurant B subcollection doc', async () => {
    await assertFails(getDoc(doc(chefA.firestore(), 'restaurants/restaurant-b/recipes/r2')));
  });

  await check('chef A cannot write restaurant B subcollection doc', async () => {
    await assertFails(setDoc(doc(chefA.firestore(), 'restaurants/restaurant-b/recipes/r3'), { name: 'x' }));
  });

  await check('unauthenticated cannot read restaurant A subcollection doc', async () => {
    await assertFails(getDoc(doc(anon.firestore(), 'restaurants/restaurant-a/recipes/r1')));
  });

  await check('user with no restaurantId claim is denied in the new shape', async () => {
    await assertFails(getDoc(doc(noClaim.firestore(), 'restaurants/restaurant-a/recipes/r1')));
  });

  await check('post-cutover: old flat path denied even to an authenticated user', async () => {
    await assertFails(getDoc(doc(chefB.firestore(), 'recipes/legacy1')));
  });

  await check('post-cutover: old flat path denied to an unauthenticated user', async () => {
    await assertFails(getDoc(doc(anon.firestore(), 'recipes/legacy1')));
  });

  await check('users/{uid}: owner can read own doc', async () => {
    await assertSucceeds(getDoc(doc(chefA.firestore(), 'users/uid-a')));
  });

  await check('users/{uid}: cannot read another user doc', async () => {
    await assertFails(getDoc(doc(chefB.firestore(), 'users/uid-a')));
  });

  await check('users/{uid}: client can never write, even to their own doc', async () => {
    await assertFails(setDoc(doc(chefA.firestore(), 'users/uid-a'), { restaurantId: 'restaurant-a', role: 'admin' }));
  });

  await check('ingredients: invalid shape rejected even for own restaurant', async () => {
    await assertFails(setDoc(doc(chefA.firestore(), 'restaurants/restaurant-a/ingredients/bad'), { name: 'x' }));
  });

  await check('ingredients: valid shape accepted for own restaurant', async () => {
    await assertSucceeds(
      setDoc(doc(chefA.firestore(), 'restaurants/restaurant-a/ingredients/good'), {
        name: 'Salt',
        category: 'Spices',
        measureType: 'weight',
        purchaseUnit: '1kg bag',
        purchaseCost: 5,
        purchaseQty: 1000,
        yieldPercent: 100,
        lastVerified: '2026-07-18',
        priceSource: 'manual',
      })
    );
  });

  await testEnv.cleanup();

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Rules test run failed:', err);
  process.exit(1);
});
