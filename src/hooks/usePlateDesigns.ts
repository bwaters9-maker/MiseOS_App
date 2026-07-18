import { useState, useEffect } from 'react';
import { query, orderBy, onSnapshot, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { rCollection } from '../lib/firestorePaths';
import { useAuth } from '../components/AuthContext';
import type { PlateDesign } from '../types';

export function usePlateDesigns() {
  const { restaurantId } = useAuth();
  const [designs, setDesigns] = useState<PlateDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    const q = query(rCollection(restaurantId, 'plateDesigns'), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot: QuerySnapshot) => {
        const fetched = snapshot.docs.map((d: QueryDocumentSnapshot): PlateDesign => {
          const data = d.data() as Partial<PlateDesign>;
          return {
            id: d.id,
            name: data.name ?? '',
            plateShape: data.plateShape ?? 'round-rimmed',
            components: data.components ?? [],
            createdAt: data.createdAt ?? '',
            updatedAt: data.updatedAt ?? '',
          };
        });
        setDesigns(fetched);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [restaurantId]);

  return { designs, loading, error };
}
