import { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import type { RecipeCategory } from '../types';

const DEFAULT_CATEGORIES = ['Sides', 'Sauces', 'Salads', 'Soups', 'Proteins', 'Desserts'];

export function useRecipeCategories() {
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const seedingRef = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'recipe_categories'), orderBy('name'));

    const unsubscribe = onSnapshot(q,
      (snapshot: QuerySnapshot) => {
        if (snapshot.empty && !seedingRef.current) {
          seedingRef.current = true;
          Promise.all(DEFAULT_CATEGORIES.map(name => addDoc(collection(db, 'recipe_categories'), { name })))
            .catch(err => setError(err));
        }
        const fetched = snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as RecipeCategory));
        setCategories(fetched);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { categories, loading, error };
}
