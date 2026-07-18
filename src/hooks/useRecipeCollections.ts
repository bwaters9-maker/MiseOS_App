import { useState, useEffect, useMemo } from 'react';
import { query, orderBy, onSnapshot, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { rCollection } from '../lib/firestorePaths';
import { useAuth } from '../components/AuthContext';
import type { RecipeCollection } from '../types';

export function useRecipeCollections() {
  const { restaurantId } = useAuth();
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    const q = query(rCollection(restaurantId, 'recipe_collections'), orderBy('name'));

    const unsubscribe = onSnapshot(q,
      (snapshot: QuerySnapshot) => {
        const fetched = snapshot.docs.map((d: QueryDocumentSnapshot): RecipeCollection => {
          const data = d.data() as Partial<RecipeCollection>;
          return {
            id: d.id,
            name: data.name ?? '',
            recipeIds: data.recipeIds ?? [],
            active: data.active ?? false,
          };
        });
        setCollections(fetched);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [restaurantId]);

  const activeCollection = useMemo(
    () => collections.find(c => c.active) ?? null,
    [collections]
  );

  return { collections, activeCollection, loading, error };
}
