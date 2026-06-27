import { getFirestore, doc, collection, writeBatch, updateDoc } from 'firebase/firestore';
import { recipeSchema, recipeComponentSchema } from './recipeSchema.js';

/**
 * @fileoverview Controller for handling the business logic of recipe creation,
 * updates, and costing. This is the "Executive Chef" of the Recipe Builder station,
 * directing how recipes are created and modified.
 */

const db = getFirestore();

/**
 * "The Remix": Creates a new recipe document and its associated components in Firestore.
 *
 * This function acts as our "recipe development" process. It takes a complete
 * recipe card (the payload), validates every detail with our Zod schema (our
 * quality control check), and then commits the entire recipe to our digital
 * cookbook (Firestore) in a single, atomic operation (a batch write).
 *
 * @param {object} recipeData The main data for the recipe.
 * @param {Array<object>} componentsData An array of component objects for the recipe.
 * @returns {Promise<string>} The ID of the newly created recipe document.
 */
export const createRecipe = async (recipeData, componentsData) => {
  // 1. Quality Control: Validate the main recipe card.
  const validatedRecipe = recipeSchema.parse(recipeData);

  // 2. Quality Control: Validate each component on the prep list.
  const validatedComponents = componentsData.map(comp => recipeComponentSchema.parse(comp));

  // 3. Plating Up: Prepare all database changes in a single batch.
  // We can't create a recipe without its ingredients.
  const batch = writeBatch(db);

  // Create the main recipe document.
  const recipeRef = doc(collection(db, 'recipes'));
  batch.set(recipeRef, validatedRecipe);

  // Create each component in the `recipeComponents` sub-collection.
  validatedComponents.forEach(comp => {
    const componentRef = doc(collection(recipeRef, 'recipeComponents'));
    batch.set(componentRef, comp);
  });

  // 4. Firing the Order: Commit the batch to Firestore.
  await batch.commit();

  return recipeRef.id;
};

/**
 * "The Refine": Updates an existing recipe document.
 *
 * @param {string} recipeId The ID of the recipe to update.
 * @param {object} updateData The data to update.
 * @returns {Promise<void>}
 */
export const updateRecipe = async (recipeId, updateData) => {
  const validatedUpdate = recipeSchema.partial().parse(updateData);
  const recipeRef = doc(db, 'recipes', recipeId);
  await updateDoc(recipeRef, validatedUpdate);
};