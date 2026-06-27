import { writeBatch, doc } from "firebase/firestore";
import { db, ingredientsRef } from "./config.js";

// A static, foundational list of ingredients to ensure the pantry is never bare.
// These are the essentials, like salt, pepper, and oil in a real kitchen.
const initialIngredients = [
  { id: 'pancetta', name: 'Pancetta', category: 'Meat', cost_per_unit: 12.99, quantity: 10 },
  { id: 'heavy-cream', name: 'Heavy Cream', category: 'Dairy', cost_per_unit: 4.50, quantity: 24 },
  { id: 'parmigiano-reggiano', name: 'Parmigiano-Reggiano', category: 'Dairy', cost_per_unit: 22.00, quantity: 5 },
];

/**
 * Atomically seeds the master ingredient library. This is an all-or-nothing
 * operation, like receiving a full produce order. If one item fails, the
 * whole delivery is rejected to maintain data integrity.
 */
export const seedMasterPantry = async () => {
  const batch = writeBatch(db);

  console.log('Staging initial pantry stock...');
  initialIngredients.forEach(ingredient => {
    // We use hardcoded IDs for these foundational items so we can reliably
    // reference them elsewhere in the application's logic.
    const { id, ...data } = ingredient;
    const docRef = doc(ingredientsRef, id);
    batch.set(docRef, data);
  });

  await batch.commit();
  console.log('✅ Master pantry has been successfully seeded.');
};