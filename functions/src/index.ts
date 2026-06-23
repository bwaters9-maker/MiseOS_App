import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onDocumentCreated, DocumentEvent } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue, QueryDocumentSnapshot, DocumentReference } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";

initializeApp();
const db = getFirestore();
const auth = getAuth();

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

const MASTER_PANTRY_BASE_SET = [
  // Produce
  { name: "Onion", category: "Produce", nutrition_info: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 }, allergens: [] },
  { name: "Garlic", category: "Produce", nutrition_info: { calories: 149, protein: 6.4, carbs: 33.1, fat: 0.5 }, allergens: [] },
  { name: "Carrot", category: "Produce", nutrition_info: { calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2 }, allergens: [] },
  { name: "Celery", category: "Produce", nutrition_info: { calories: 16, protein: 0.7, carbs: 3, fat: 0.2 }, allergens: [] },
  { name: "Lemon", category: "Produce", nutrition_info: { calories: 29, protein: 1.1, carbs: 9, fat: 0.3 }, allergens: [] },

  // Proteins
  { name: "Chicken Breast", category: "Proteins", nutrition_info: { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, allergens: [] },
  { name: "Ground Beef", category: "Proteins", nutrition_info: { calories: 250, protein: 26, carbs: 0, fat: 15 }, allergens: [] },
  { name: "Eggs", category: "Proteins", nutrition_info: { calories: 155, protein: 13, carbs: 1.1, fat: 11 }, allergens: ["egg"] },

  // Dairy
  { name: "Milk", category: "Dairy", nutrition_info: { calories: 42, protein: 3.4, carbs: 5, fat: 1 }, allergens: ["milk"] },
  { name: "Butter", category: "Dairy", nutrition_info: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81 }, allergens: ["milk"] },
  { name: "Cheddar Cheese", category: "Dairy", nutrition_info: { calories: 404, protein: 25, carbs: 1.3, fat: 33 }, allergens: ["milk"] },

  // Dry Goods
  { name: "All-Purpose Flour", category: "Dry Goods", nutrition_info: { calories: 364, protein: 10, carbs: 76, fat: 1 }, allergens: ["gluten"] },
  { name: "Granulated Sugar", category: "Dry Goods", nutrition_info: { calories: 387, protein: 0, carbs: 100, fat: 0 }, allergens: [] },
  { name: "Rice", category: "Dry Goods", nutrition_info: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 }, allergens: [] },

  // Pantry Staples
  { name: "Salt", category: "Pantry Staples", nutrition_info: { calories: 0, protein: 0, carbs: 0, fat: 0 }, allergens: [] },
  { name: "Black Pepper", category: "Pantry Staples", nutrition_info: { calories: 251, protein: 10, carbs: 64, fat: 3.3 }, allergens: [] },
  { name: "Olive Oil", category: "Pantry Staples", nutrition_info: { calories: 884, protein: 0, carbs: 0, fat: 100 }, allergens: [] },
];

export const seedMasterPantry = onDocumentCreated("users/{userId}", async (event: DocumentEvent<QueryDocumentSnapshot>) => {
  const userId = event.params.userId;
  logger.info(`Initializing new user: ${userId}. Setting defaults and seeding pantry.`);

  const userRef = db.collection('users').doc(userId);
  const ingredientsCol = db.collection(`users/${userId}/ingredients`);

  // --- Get Auth user info ---
  let userName = "New Chef"; // Default value
  try {
    const userRecord = await auth.getUser(userId);
    userName = userRecord.displayName || userName;
  } catch (error) {
    logger.error(`Failed to fetch auth record for user ${userId} during seeding. Using default name.`, getErrorMessage(error));
    // Continue with the default name, the function doesn't need to stop.
  }

  // --- Task 1: Set user defaults ---
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial

  const userUpdatePromise = userRef.set({
    name: userName,
    subscription_status: 'trialing',
    role: 'Line', // Default role
    trial_end_date: trialEndDate
  }, { merge: true });

  // --- Task 2: Seed the pantry ---
  const pantryBatch = db.batch();
  // Create a stable reference for the placeholder vendor.
  const placeholderVendorRef = db.collection('vendors').doc('system-placeholder');
  MASTER_PANTRY_BASE_SET.forEach((item) => {
    const docRef = ingredientsCol.doc();
    pantryBatch.set(docRef, {
      ...item,
      quantity: 0,
      vendor_id: placeholderVendorRef,
      cost_per_unit: 0.00,
      price_source: 'regional_estimate',
      culinary_trend: "",
      price_trend: "",
      source_authority: "",
      price_alert: {
        is_volatile: false,
        reason: "",
        expected_duration: ""
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  const pantrySeedPromise = pantryBatch.commit();

  // --- Run both tasks in parallel ---
  try {
    await Promise.all([userUpdatePromise, pantrySeedPromise]);
    logger.info(`Successfully initialized and seeded pantry for user ${userId}.`);
  } catch (error: unknown) {
    logger.error(`Failed to initialize user ${userId}:`, getErrorMessage(error));
  }
});

export const createBrainDump = onCall(async (request: CallableRequest<{ content: string }>) => {
  // 1. A chef must be on the clock to submit a note.
  if (!request.auth) {
    logger.error("createBrainDump call not authenticated.");
    throw new HttpsError("unauthenticated", "You must be logged in to create a note.");
  }

  // 2. Validate the note's content.
  const { content } = request.data;
  const userId = request.auth.uid;

  if (!(typeof content === 'string') || content.length === 0) {
    throw new HttpsError('invalid-argument', 'The function must be called with one argument "content" that is a non-empty string.');
  }

  // 3. Pin the note to the board (write to Firestore).
  try {
    const writeResult = await db.collection('brainDumps').add({
      content: content,
      userId: userId,
      createdAt: FieldValue.serverTimestamp()
    });
    return { result: `Brain dump created with ID: ${writeResult.id}` };
  } catch (error: unknown) {
    logger.error("Error creating brain dump:", getErrorMessage(error));
    throw new HttpsError("internal", "Error writing to database.");
  }
});

export const updateDashboardConfig = onCall(async (request: CallableRequest<{ config: Record<string, boolean> }>) => {
  // 1. A chef must be on the clock to update their station.
  if (!request.auth) {
    logger.error("updateDashboardConfig call not authenticated.");
    throw new HttpsError("unauthenticated", "You must be logged in to update settings.");
  }

  // 2. Validate the incoming configuration.
  const { config } = request.data;
  const userId = request.auth.uid;
  const allowedKeys = ['calendar_forecasting', 'weather_tracking', 'revenue_analytics'];

  if (!config || typeof config !== 'object') {
    throw new HttpsError('invalid-argument', 'The function must be called with a "config" object.');
  }

  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      if (!allowedKeys.includes(key) || typeof config[key] !== 'boolean') {
        throw new HttpsError('invalid-argument', `Invalid configuration provided. Only boolean values for ${allowedKeys.join(', ')} are allowed.`);
      }
    }
  }

  // 3. Update the chef's station layout (write to Firestore).
  try {
    // To avoid overwriting other nested settings within user_settings or ui_toggles,
    // we construct an update payload with dot notation for each key.
    const updatePayload: { [key: string]: boolean } = {};
    for (const key in config) {
      if (Object.prototype.hasOwnProperty.call(config, key)) {
        updatePayload[`user_settings.ui_toggles.${key}`] = config[key];
      }
    }

    // Using .update() with dot notation performs a deep merge, preserving other settings.
    await db.collection('users').doc(userId).update(updatePayload);
    return { result: `Successfully updated dashboard config for user ${userId}.` };
  } catch (error: unknown) {
    logger.error(`Error updating dashboard config for user ${userId}:`, getErrorMessage(error));
    throw new HttpsError("internal", "Error writing to database.");
  }
});

export const calculateRecipeCost = onCall(async (request: CallableRequest<{ recipeId: string }>) => {
  // 1. A chef must be on the clock to run numbers.
  if (!request.auth) {
    logger.error("calculateRecipeCost call not authenticated.");
    throw new HttpsError("unauthenticated", "You must be logged in to calculate costs.");
  }

  // 2. Validate the recipe ID.
  const { recipeId } = request.data;
  if (!recipeId || typeof recipeId !== 'string') {
    throw new HttpsError('invalid-argument', 'The function must be called with a "recipeId" string.');
  }

  try {
    const componentsSnapshot = await db.collection(`recipes/${recipeId}/recipeComponents`).get();

    if (componentsSnapshot.empty) {
      return { totalCost: 0.00 };
    }

    // Step 1: Prepare the shopping list. Collect all unique ingredient references.
    const ingredientRefs = componentsSnapshot.docs
      .map((doc) => (doc.data() as { ingredient_id: DocumentReference }).ingredient_id)
      .filter((ref): ref is DocumentReference => !!ref); // Filter out any null/undefined refs

    if (ingredientRefs.length === 0) {
      return { totalCost: 0.00 };
    }

    // Step 2: Go to the pantry once. Fetch all ingredients in a single batch call.
    const ingredientSnapshots = await db.getAll(...ingredientRefs);
    const ingredientCostMap = new Map<string, number>();
    ingredientSnapshots.forEach((doc) => {
      if (doc.exists) {
        ingredientCostMap.set(doc.id, (doc.data()?.cost_per_unit as number) || 0.00);
      }
    });

    // Step 3: Calculate the total cost using the fetched prices.
    let totalCost = 0;
    componentsSnapshot.docs.forEach((componentDoc) => {
      const { ingredient_id, quantity } = componentDoc.data() as { ingredient_id: DocumentReference, quantity: number };
      if (ingredient_id && typeof quantity === "number" && ingredientCostMap.has(ingredient_id.id)) {
        const costPerUnit = ingredientCostMap.get(ingredient_id.id) || 0;
        totalCost += quantity * costPerUnit;
      } else if (ingredient_id) {
        logger.warn(`Ingredient with ID ${ingredient_id.id} not found for recipe ${recipeId}`);
      }
    });

    return { totalCost: parseFloat(totalCost.toFixed(2)) };
  } catch (error: unknown) {
    logger.error(`Error calculating cost for recipe ${recipeId}:`, getErrorMessage(error));
    throw new HttpsError("internal", "Error calculating recipe cost.");
  }
});