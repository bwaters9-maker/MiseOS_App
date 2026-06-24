import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

const env = typeof process !== 'undefined' ? process.env : import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const ai = getAI(app, { backend: new GoogleAIBackend() });
export const aiModel = getGenerativeModel(ai, { model: 'gemini-3.5-flash' });
