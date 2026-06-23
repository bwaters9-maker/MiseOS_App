import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

const firebaseConfig = {
apiKey: process.env.VITE_FIREBASE_API_KEY || (import.meta as any).env?.VITE_FIREBASE_API_KEY,
authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
projectId: process.env.VITE_FIREBASE_PROJECT_ID || (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
appId: process.env.VITE_FIREBASE_APP_ID || (import.meta as any).env?.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const ai = getAI(app, { backend: new GoogleAIBackend() });
export const aiModel = getGenerativeModel(ai, { model: 'gemini-3.5-flash' });
