import { getFirestore, collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';

/**
 * @fileoverview Controller for the Variant Lab, where different versions of a
 * concept are created and compared.
 */

const db = getFirestore();

/**
 * Creates a new "variant" of a concept for A/B testing.
 *
 * This is like taking a chef's napkin sketch and creating a formal test version
 * with a specific component swap (e.g., "same dish, but with tarragon instead
 * of basil"). The result is stored in a dedicated `conceptVariants` logbook.
 *
 * @param {string} conceptId The ID of the original concept note.
 * @param {object} variantData The data for the new variant.
 * @param {string} userId The UID of the user creating the variant.
 * @returns {Promise<string>} The ID of the newly created concept variant.
 */
export const createVariantTest = async (conceptId, variantData, userId) => {
  const payload = {
    ...variantData,
    conceptId: doc(db, 'conceptNotes', conceptId),
    createdBy: userId,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'conceptVariants'), payload);
  return docRef.id;
};