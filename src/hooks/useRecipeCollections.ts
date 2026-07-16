import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import type { RecipeCollection } from '../types';

export function useRecipeCollections() {
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'recipe_collections'), orderBy('name'));

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
  }, []);

  const activeCollection = useMemo(
    () => collections.find(c => c.active) ?? null,
    [collections]
  );

  return { collections, activeCollection, loading, error };
}
