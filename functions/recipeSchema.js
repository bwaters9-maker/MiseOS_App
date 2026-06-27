import { z } from 'zod';

/**
 * @fileoverview This file defines the Zod validation schema for the 'recipes' collection.
 * It serves as the master recipe card, ensuring all data structures are validated
 * against our data contracts before being used in the application.
 *
 * True data integrity is ultimately enforced by `firestore.rules`.
 */

/**
 * Custom Zod validation for a Firestore document reference string.
 * This is our "ingredient label checker"; it ensures the reference points to the
 * correct pantry shelf ('ingredients/' or 'recipes/').
 *
 * SCOPE CREEP: The allowance for 'recipes/' is a feature enhancement for sub-recipes
 * and deviates from the current `Master_Feature_Manifest.txt`. This must be
 * formally approved before server-side enforcement in `firestore.rules`.
 */
const firestoreIngredientOrRecipeRef = z.string().refine(
  (val) => val.startsWith('ingredients/') || val.startsWith('recipes/'),
  {
    message: "Component reference must be a valid document path in 'ingredients' or 'recipes' collections.",
  }
);

/**
 * Zod schema for the `recipeComponents` sub-collection.
 */
export const recipeComponentSchema = z.object({
  ingredient_id: firestoreIngredientOrRecipeRef,
  quantity: z.number().positive({ message: "Quantity must be a positive number." }),
  unit: z.string().min(1, "Unit cannot be empty.").max(20, "Unit is too long."),
  calculated_cost: z.number().nonnegative({ message: "Calculated cost cannot be negative." }),
});

/**
 * Zod schema for the main `recipes` collection document.
 */
export const recipeSchema = z.object({
  title: z.string().min(1, "Title cannot be empty.").max(150, "Title is too long."),
  yield: z.number().positive({ message: "Yield must be a positive number." }),
  margin_goal: z.number().min(0, "Margin goal cannot be negative.").max(1, "Margin goal cannot exceed 100%."),
  station: z.string().min(1, "Station cannot be empty.").max(50, "Station name is too long."),
});