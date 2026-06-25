import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
  type QueryDocumentSnapshot,
  type FirestoreError
} from 'firebase/firestore';
import { type PrepItem, type Recipe, type HandoverLog, type Item86, type TrendReport } from '../types';

interface KitchenState {
  prepItems: PrepItem[];
  setPrepItems: React.Dispatch<React.SetStateAction<PrepItem[]>>;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  handoverLogs: HandoverLog[];
  handovers: HandoverLog[];
  items86: Item86[];
  setItems86: React.Dispatch<React.SetStateAction<Item86[]>>;
  latestReport: TrendReport | null;
  loading: boolean;
  error: FirestoreError | null;
}

const KitchenStateContext = createContext<KitchenState | undefined>(undefined);

export const KitchenStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [handovers, setHandovers] = useState<HandoverLog[]>([]);
  const [items86, setItems86] = useState<Item86[]>([]);
  const [latestReport, setLatestReport] = useState<TrendReport | null>(null);
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
      (err: FirestoreError) => {
        setError(err);
      }
    );

    const unsubHandovers = onSnapshot(
      collection(db, 'handovers'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const logs = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as HandoverLog));
        setHandovers(logs);
      },
      (err: FirestoreError) => {
        setError(err);
      }
    );

    const unsub86 = onSnapshot(
      collection(db, 'items86'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Item86));
        setItems86(items);
      },
      (err: FirestoreError) => {
        setError(err);
      }
    );

    return () => {
      unsubPrep();
      unsubRecipes();
      unsubHandovers();
      unsub86();
    };
  }, []);

  const value = useMemo(() => ({
    prepItems,
    setPrepItems,
    recipes,
    setRecipes,
    handoverLogs: handovers,
    handovers,
    items86,
    setItems86,
    latestReport,
    loading,
    error
  }), [prepItems, recipes, handovers, items86, latestReport, loading, error]);

  return (
    <KitchenStateContext.Provider value={value}>
      {children}
    </KitchenStateContext.Provider>
  );
};

export const useKitchenStateContext = () => {
  const context = useContext(KitchenStateContext);
  if (context === undefined) {
    throw new Error('useKitchenStateContext must be used within a KitchenStateProvider');
  }
  return context;
};
