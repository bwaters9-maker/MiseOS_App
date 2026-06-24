import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, type DocumentData, type QuerySnapshot, type QueryDocumentSnapshot, type FirestoreError } from 'firebase/firestore';
import { PrepItem, Recipe, HandoverLog, Item86 } from '../types';

export const useKitchenState = () => {
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [handoverLogs, setHandoverLogs] = useState<HandoverLog[]>([]);
  const [items86, setItems86] = useState<Item86[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);

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

    const unsubHandovers = onSnapshot(
      collection(db, 'handovers'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const logs = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as HandoverLog));
        setHandoverLogs(logs);
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

    return () => {
      unsubPrep();
      unsubRecipes();
      unsubHandovers();
      unsub86();
    };
  }, []);

  return useMemo(() => ({
    prepItems,
    setPrepItems,
    recipes,
    setRecipes,
    handoverLogs,
    items86,
    loading,
    error
  }), [prepItems, recipes, handoverLogs, items86, loading, error, setPrepItems, setRecipes]);
};