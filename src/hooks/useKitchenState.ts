import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';

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

export interface HandoverLog {
  id: string;
  sender: string;
  station: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
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
  const [handoverLogs, setHandoverLogs] = useState<HandoverLog[]>([]);
  const [items86, setItems86] = useState<Item86[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);

  useEffect(() => {
    const unsubPrep = onSnapshot(
      collection(db, 'prepItems'),
      (snapshot: any) => {
        const items = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as PrepItem));
        setPrepItems(items);
        setLoading(false);
      },
      (err: any) => {
        setError(err);
        setLoading(false);
      }
    );

    const unsubRecipes = onSnapshot(
      collection(db, 'recipes'),
      (snapshot: any) => {
        const items = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Recipe));
        setRecipes(items);
      },
      (error: any) => {
        setError(error);
      }
    );

    const unsubHandovers = onSnapshot(
      collection(db, 'handovers'),
      (snapshot: any) => {
        const logs = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as HandoverLog));
        setHandoverLogs(logs);
      },
      (error: any) => {
        setError(error);
      }
    );

    const unsub86 = onSnapshot(
      collection(db, 'items86'),
      (snapshot: any) => {
        const items = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Item86));
        setItems86(items);
      },
      (error: any) => {
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
  }), [prepItems, recipes, handoverLogs, items86, loading, error]);
};
