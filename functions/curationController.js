import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { conceptSchema } from './conceptSchema.js';

/**
 * @fileoverview Controller for handling the business logic of the Curation Rail.
 * This is the "Chef's Assistant," responsible for capturing and organizing raw
 * culinary ideas.
 */

const db = getFirestore();

/**
 * "Jot Concept": Validates and saves a new, unstructured concept note.
 *
 * This function takes a raw idea, validates it to ensure it's legible and
 * properly tagged, and then files it in the `conceptNotes` collection—our
 * digital "Ideation Binder." This keeps creative brainstorming separate from
 * the official, production-ready cookbook.
 *
 * @param {object} conceptData The raw concept data (content and tags).
 * @param {string} userId The UID of the user jotting the note.
 * @returns {Promise<string>} The ID of the newly created concept note.
 */
export const jotConcept = async (conceptData, userId) => {
  // 1. Quality Control: Validate the note against our schema.
  const validatedConcept = conceptSchema.parse(conceptData);

  // 2. Filing the Note: Add metadata and save to the "Ideation Binder".
  const payload = { ...validatedConcept, userId, createdAt: serverTimestamp() };
  const docRef = await addDoc(collection(db, 'conceptNotes'), payload);

  return docRef.id;
};