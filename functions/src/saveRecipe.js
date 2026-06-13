/**
 * functions/src/saveRecipe.js
 * Validates and persists recipe data to Firestore.
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const saveRecipe = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  // Basic validation against Recipe interface
  if (!data.name || !data.station) {
    throw new functions.https.HttpsError('invalid-argument', 'Recipe name and station are required.');
  }

  const recipeRef = admin.firestore().collection('recipes').doc(data.id || admin.firestore().collection('recipes').doc().id);
  
  const payload = {
    ...data,
    lastModified: new Date().toISOString(),
    modifiedBy: context.auth.token.email
  };

  await recipeRef.set(payload, { merge: true });
  return { success: true, id: recipeRef.id };
});