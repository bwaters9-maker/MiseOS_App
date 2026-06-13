/**
 * src/firebaseConfig.ts
 * Core initialization file for cloud-native database connection.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Core Firebase project configurations
const firebaseConfig = {
  apiKey: "AIzaSyFakeKey_MiseOS_2026_ProjectKey",
  authDomain: "miseos-back-of-house.firebaseapp.com",
  projectId: "miseos-back-of-house",
  storageBucket: "miseos-back-of-house.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:a1b2c3d4e5f6g7h8i9j0k"
};

// Initialize Firebase SDK Core
const app = initializeApp(firebaseConfig);

// Export instances for system-wide injection
export const db = getFirestore(app);