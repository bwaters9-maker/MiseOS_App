import { useState, useEffect } from 'react';
import { getDocs } from 'firebase/firestore';
import { prepItemsRef } from '../components/dashboard/config.js';

/**
 * A dedicated "Commis Chef" hook responsible for fetching and managing the
 * daily prep list from Firestore. It handles loading, error, and data states,
 * keeping components clean and focused.
 */
export const usePrepList = () => {
  const [prepItems, setPrepItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPrepList = async () => {
      try {
        const snapshot = await getDocs(prepItemsRef);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPrepItems(items);
      } catch (err) {
        console.error("Error fetching prep list:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrepList();
  }, []); // This effect runs once on mount, fetching the initial list.

  return { prepItems, isLoading, error };
};