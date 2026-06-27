import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";

// This is our connection ticket to the main pantry (Firebase).
// It should be populated from a secure, environment-specific source, not hardcoded.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Establish the connection to the Firebase service.
const app = initializeApp(firebaseConfig);

// Get a handle to our primary data store, the Firestore database.
// This is our "Master Ledger" for all operational data.
export const db = getFirestore(app);

// --- Collection References ---
// Pre-defined shelves in our pantry for easy access.
export const usersRef = collection(db, 'users');
export const ingredientsRef = collection(db, 'ingredients');
export const recipesRef = collection(db, 'recipes');
export const menuItemsRef = collection(db, 'menuItems');
export const vendorsRef = collection(db, 'vendors');
export const timersRef = collection(db, 'timers');
export const brainDumpsRef = collection(db, 'brain_dumps');
export const prepItemsRef = collection(db, 'prepItems');