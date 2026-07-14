import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { PrepStation } from '../types';

const DEFAULT_STATIONS: PrepStation[] = ['Sauté', 'Grill', 'Garde Manger', 'Pastry'];

export function useStationPresets() {
  const [presets, setPresets] = useState<PrepStation[]>(DEFAULT_STATIONS);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'station_presets'), orderBy('name'));

    const unsubscribe = onSnapshot(q,
      (snapshot: QuerySnapshot) => {
        try {
          const fetchedPresets = snapshot.docs
            .map((doc: QueryDocumentSnapshot) => doc.data()?.name)
            .filter((name): name is PrepStation => typeof name === 'string');
          setPresets(fetchedPresets.length > 0 ? fetchedPresets : DEFAULT_STATIONS);
        } catch (e) {
          setError(e as Error);
        }
      },
      (err) => {
        setError(err);
      }
    );

    return () => unsubscribe();
  }, []);

  return { presets, error };
}