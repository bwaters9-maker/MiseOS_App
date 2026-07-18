import { useState, useEffect, useRef } from 'react';
import { query, orderBy, onSnapshot, addDoc, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { rCollection } from '../lib/firestorePaths';
import { useAuth } from '../components/AuthContext';
import type { EventTypePreset } from '../types';

const DEFAULT_EVENT_TYPES = ['Wedding', 'Private Dining', 'Buyout', 'Bridal Shower', 'Corporate', 'Celebration of Life', 'Special Event'];

export function useEventTypes() {
  const { restaurantId } = useAuth();
  const [eventTypes, setEventTypes] = useState<EventTypePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const seedingRef = useRef(false);

  useEffect(() => {
    if (!restaurantId) return;
    const q = query(rCollection(restaurantId, 'event_types'), orderBy('name'));

    const unsubscribe = onSnapshot(q,
      (snapshot: QuerySnapshot) => {
        if (snapshot.empty && !seedingRef.current) {
          seedingRef.current = true;
          Promise.all(DEFAULT_EVENT_TYPES.map(name => addDoc(rCollection(restaurantId, 'event_types'), { name })))
            .catch(err => setError(err));
        }
        const fetched = snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as EventTypePreset));
        setEventTypes(fetched);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [restaurantId]);

  return { eventTypes, loading, error };
}
