import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, type QuerySnapshot, type QueryDocumentSnapshot } from 'firebase/firestore';
import { PrepStation } from '../types';

export function useStationPresets() {
  const [presets, setPresets] = useState<PrepStation[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'station_presets'), orderBy('name'));

    const unsubscribe = onSnapshot(q,
      (snapshot: QuerySnapshot) => {
        try {
          const fetchedPresets = snapshot.docs
            .map((doc: QueryDocumentSnapshot) => doc.data()?.name)
            .filter((name): name is PrepStation => typeof name === 'string');
          setPresets(fetchedPresets);
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

  return useMemo(() => ({ presets, error }), [presets, error]);
}