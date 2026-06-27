import { z } from 'zod';

/**
 * @fileoverview This file defines the validation schema for the 'conceptNotes' collection.
 * It acts as a digital napkin or a chef's personal notebook, a free-form space
 * for capturing raw culinary ideas before they are structured enough to become
 * formal recipes. This ensures our main cookbook (the 'recipes' collection)
 * remains pristine and only contains tested, production-ready data.
 */

/**
 * A reusable schema for a single tag. This ensures consistency and prevents
 * overly long or empty tags. It's like having a standard label size for our pantry.
 */
const tagSchema = z.string()
  .trim()
  .min(1, { message: "Tags cannot be empty." })
  .max(25, { message: "A tag cannot be longer than 25 characters." });

/**
 * Schema for a single concept note.
 * This is intentionally unstructured to encourage free-form ideation, but with
 * defensive guardrails to prevent data pollution.
 */
export const conceptSchema = z.object({
  /**
   * The main, unstructured text of the culinary idea. This is the core of the
   * brain dump, like scribbled notes about a flavor combination or a plating idea.
   * We trim whitespace and limit the length to prevent messy or oversized entries.
   */
  content: z.string()
    .trim()
    .min(1, "Note content cannot be empty.")
    .max(5000, "Note content is too long."),

  /**
   * A list of tags for categorizing and searching for ideas. These are like
   * keywords a chef might use, e.g., 'vegetarian', 'winter-menu', 'seafood'.
   * We limit the number of tags and ensure they are unique and well-formed.
   */
  tags: z.array(tagSchema)
    .max(10, { message: "You can add a maximum of 10 tags." })
    .refine((items) => new Set(items).size === items.length, {
      message: "Tags must be unique.",
    })
    .optional(),
});