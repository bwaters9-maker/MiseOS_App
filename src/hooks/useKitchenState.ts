import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, DocumentData, QuerySnapshot, QueryDocumentSnapshot, FirestoreError } from 'firebase/firestore';
import type { Feature, StaffMember, KitchenEvent, KitchenAlert, CribNote, Ingredient, Recipe } from '../types';

// Based on firebase-blueprint.json
export interface PrepItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  checked: boolean;
  assignedStation: 'Sauté' | 'Grill' | 'Garde Manger' | 'Pastry';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  lastModified?: string;
  recipe_id: string;
}

export interface Item86 {
  id: string;
  name: string;
  status: 'out' | 'limited';
  substitute?: string;
  timestamp: string;
}

export const useKitchenState = () => {
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items86, setItems86] = useState<Item86[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [events, setEvents] = useState<KitchenEvent[]>([]);
  const [alerts, setAlerts] = useState<KitchenAlert[]>([]);
  const [cribNotes, setCribNotes] = useState<CribNote[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    const unsubPrep = onSnapshot(
      collection(db, 'prepItems'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as PrepItem));
        setPrepItems(items);
        setLoading(false);
      },
      (err: FirestoreError) => {
        setError(err);
        setLoading(false);
      }
    );

    const unsubRecipes = onSnapshot(
      collection(db, 'recipes'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Recipe));
        setRecipes(items);
      },
      (error: FirestoreError) => {
        setError(error);
      }
    );

    const unsub86 = onSnapshot(
      collection(db, 'items86'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Item86));
        setItems86(items);
      },
      (error: FirestoreError) => {
        setError(error);
      }
    );

    const unsubFeatures = onSnapshot(
      collection(db, 'features'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setFeatures(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Feature)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubStaff = onSnapshot(
      collection(db, 'staff'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setStaff(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as StaffMember)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubEvents = onSnapshot(
      collection(db, 'events'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setEvents(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as KitchenEvent)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubAlerts = onSnapshot(
      collection(db, 'alerts'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setAlerts(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as KitchenAlert)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubCribNotes = onSnapshot(
      collection(db, 'crib_notes'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setCribNotes(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as CribNote)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubIngredients = onSnapshot(
      collection(db, 'ingredients'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setIngredients(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Ingredient)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    return () => {
      unsubPrep();
      unsubRecipes();
      unsub86();
      unsubFeatures();
      unsubStaff();
      unsubEvents();
      unsubAlerts();
      unsubCribNotes();
      unsubIngredients();
    };
  }, []);

  return { prepItems, setPrepItems, recipes, setRecipes, items86, features, staff, events, alerts, cribNotes, ingredients, loading, error };
};