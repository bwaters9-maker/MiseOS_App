import { useState, useEffect, useRef } from 'react';
import { query, orderBy, onSnapshot, addDoc, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { rCollection } from '../lib/firestorePaths';
import { useAuth } from '../components/AuthContext';
import type { RecipeCategory } from '../types';

/** Seeded into `recipe_categories` when the collection is empty. Single source
 * of truth — Settings.tsx's own seeding query imports this rather than keeping
 * a second copy that could drift. */
export const DEFAULT_CATEGORIES = ['Sides', 'Sauces', 'Salads', 'Soups', 'Proteins', 'Desserts'];

export function useRecipeCategories() {
  const { restaurantId } = useAuth();
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const seedingRef = useRef(false);

  useEffect(() => {
    if (!restaurantId) return;
    const q = query(rCollection(restaurantId, 'recipe_categories'), orderBy('name'));

    const unsubscribe = onSnapshot(q,
      (snapshot: QuerySnapshot) => {
        if (snapshot.empty && !seedingRef.current) {
          seedingRef.current = true;
          Promise.all(DEFAULT_CATEGORIES.map(name => addDoc(rCollection(restaurantId, 'recipe_categories'), { name })))
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
  }, [restaurantId]);

  return { categories, loading, error };
}
