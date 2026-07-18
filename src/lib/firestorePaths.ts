/**
 * src/lib/firestorePaths.ts
 * Single choke point for every restaurant-scoped Firestore path. Every
 * collection lives under restaurants/{restaurantId}/{name} — never call
 * collection(db, name) / doc(db, name, id) directly for tenant data.
 */
import { collection, doc, type CollectionReference, type DocumentData, type DocumentReference } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const rCollection = (restaurantId: string, name: string): CollectionReference<DocumentData> =>
  collection(db, 'restaurants', restaurantId, name);

export const rDoc = (restaurantId: string, name: string, id: string): DocumentReference<DocumentData> =>
  doc(db, 'restaurants', restaurantId, name, id);
