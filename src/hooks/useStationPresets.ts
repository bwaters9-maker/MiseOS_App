import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { PrepStation } from '../types';

export function useStationPresets() {
  const [presets, setPresets] = useState<PrepStation[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'station_presets'), orderBy('name'));

    const unsubscribe = onSnapshot(q,
      (snapshot: any) => {
        try {
          const fetchedPresets = snapshot.docs
            .map((doc: any) => doc.data()?.name)
            .filter((name: any): name is PrepStation => typeof name === 'string');
          setPresets(fetchedPresets);
        } catch (e) {
          setError(e as Error);
        }
      },
      (err: any) => {
        setError(err);
      }
    );

    return () => unsubscribe();
  }, []);

  return useMemo(() => ({ presets, error }), [presets, error]);
}
