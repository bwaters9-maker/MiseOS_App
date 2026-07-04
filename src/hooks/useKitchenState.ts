import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, DocumentData, QuerySnapshot, QueryDocumentSnapshot, FirestoreError } from 'firebase/firestore';

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

export interface Recipe {
  id: string;
  name: string;
  originalCovers: number;
  targetCovers: number;
  station: 'Sauté' | 'Grill' | 'Garde Manger' | 'Pastry';
  ingredients: any[];
  steps: any[];
  salePrice?: number;
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

    return () => {
      unsubPrep();
      unsubRecipes();
      unsub86();
    };
  }, []);

  return { prepItems, setPrepItems, recipes, setRecipes, items86, loading, error };
};