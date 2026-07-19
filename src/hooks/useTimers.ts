import { useState, useEffect } from 'react';
import { onSnapshot, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { rCollection } from '../lib/firestorePaths';
import { useAuth } from '../components/AuthContext';
import type { KitchenTimer } from '../types';

export function useTimers() {
  const { restaurantId } = useAuth();
  const [timers, setTimers] = useState<KitchenTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    const unsubscribe = onSnapshot(rCollection(restaurantId, 'timers'),
      (snapshot: QuerySnapshot) => {
        const fetched = snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as KitchenTimer));
        setTimers(fetched);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [restaurantId]);

  return { timers, loading, error };
}
