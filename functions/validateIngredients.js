import { z } from 'zod';

/**
 * @fileoverview This file provides data integrity validation for the ingredients collection.
 * It acts as the "Pantry Master's Checklist," ensuring every item on our shelves
 * has a proper label (name), a known supplier (vendor_id), a price tag (cost_per_unit),
 * and is in the right section (category).
 *
 * This protects the static layout of our master pantry database by enforcing
 * the core, non-negotiable fields for any ingredient.
 */

/**
 * A Zod schema that strictly enforces the presence and basic types of the
 * core fields for an ingredient document. It uses `.passthrough()` to allow
 * other optional fields defined in the master `Firestore_Schema.txt` to exist
 * without failing validation.
 */
export const coreIngredientSchema = z.object({
  name: z.string({ required_error: "Ingredient name is required." }).min(1, "Ingredient name cannot be empty."),
  vendor_id: z.string({ required_error: "Vendor ID is required." }).refine(val => val.startsWith('vendors/'), {
    message: "vendor_id must be a valid Firestore path string to the vendors collection (e.g., 'vendors/vendorId123')."
  }),
  cost_per_unit: z.number({ required_error: "Cost per unit is required." }).positive("Cost per unit must be a positive number."),
  category: z.string({ required_error: "Category is required." }).min(1, "Category cannot be empty."),
}).passthrough();

/**
 * A data-integrity function that validates an object against the core ingredient schema.
 * @param {object} data - The ingredient data to validate.
 * @returns {z.SafeParseReturnType<any, any>} The result of the validation.
 */
export const validateIngredientIntegrity = (data) => {
  return coreIngredientSchema.safeParse(data);
};