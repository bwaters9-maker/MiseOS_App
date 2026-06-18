/**
 * src/hooks/useKitchenState.ts
 * Complete state management hook with resilient data parsing and real-time cloud syncing logic.
 * Optimized with a single state document and native Firestore offline persistence. 
 */
import { useState, useEffect, useCallback } from 'react';
import { PrepItem, KitchenTimer, Recipe, HandoverLog, Item86Entry, TrendReport, KitchenAlert } from '@/types';
import { INITIAL_PREP_ITEMS, INITIAL_TIMERS, INITIAL_RECIPES } from '@/data';
import { db } from '@/firebaseConfig';
import { doc, setDoc, onSnapshot, collection, query, orderBy, where, updateDoc, limit } from 'firebase/firestore';

// A single document in Firestore holds the entire kitchen state.
const kitchenStateDocRef = doc(db, "miseos_data", "kitchen_state");

export const useKitchenState = () => {
  const [prepItems, setPrepItems] = useState<PrepItem[]>(INITIAL_PREP_ITEMS);
  const [timers, setTimers] = useState<KitchenTimer[]>(INITIAL_TIMERS);
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [handovers, setHandovers] = useState<HandoverLog[]>([]);
  const [items86, setItems86] = useState<Item86Entry[]>([]);
  const [kitchenAlerts, setKitchenAlerts] = useState<KitchenAlert[]>([]);
  const [latestReport, setLatestReport] = useState<TrendReport | null>(null);

  // Real-time Cloud Listener for the single state document.
  // Firestore's offline persistence handles all caching automatically.
  useEffect(() => {
    const unsubscribe = onSnapshot(kitchenStateDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudState = docSnap.data();
        // Set state only if the cloud data is valid to avoid overwriting with empty arrays
        if (cloudState.prepItems) {
            setPrepItems(cloudState.prepItems);
        }
        if (cloudState.timers) {
            setTimers(cloudState.timers);
        }
        if (cloudState.recipes) {
            setRecipes(cloudState.recipes);
        }
        if (cloudState.items86) {
            setItems86(cloudState.items86);
        }
      } else {
        // If the document doesn't exist, create it with initial data.
        // This is useful for first-time app setup.
        setDoc(kitchenStateDocRef, {
          prepItems: INITIAL_PREP_ITEMS,
          timers: INITIAL_TIMERS,
          recipes: INITIAL_RECIPES,
          items86: []
        }).catch(err => console.error("Failed to initialize kitchen state document:", err));
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for the handover_logs collection
  useEffect(() => {
    const q = query(collection(db, 'handover_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          timestamp: data.timestamp?.toDate().toLocaleString() ?? new Date().toLocaleString(),
        } as HandoverLog;
      });
      setHandovers(fetchedLogs);
    });
    return () => unsubscribe();
  }, []);

  // Listener for the latest trend report
  useEffect(() => {
    const reportsRef = collection(db, 'trend_reports');
    const q = query(reportsRef, orderBy('analyzedAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        if (snapshot.empty) {
          setLatestReport(null);
        } else {
          const data = snapshot.docs[0].data();
          setLatestReport(data ? (data as TrendReport) : null);
        }
      },
      (error) => { console.error("Trend report listener failed:", error) });
    return () => unsubscribe();
  }, []);

  // Real-time listener for unread kitchen_alerts
  useEffect(() => {
    const q = query(
      collection(db, 'kitchen_alerts'),
      where('read', '==', false),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAlerts = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
      })) as KitchenAlert[];
      setKitchenAlerts(fetchedAlerts);
    });
    return () => unsubscribe();
  }, []);

  const markAlertAsRead = useCallback(async (alertId: string) => {
    await updateDoc(doc(db, 'kitchen_alerts', alertId), { read: true });
  }, []);

  // Generic update function to merge changes into the cloud state.
  const updateCloudState = useCallback((stateUpdate: object) => {
    setDoc(kitchenStateDocRef, stateUpdate, { merge: true })
      .catch((error) => console.error("Cloud synchronization failed:", error));
  }, []);

  const updatePrepItems = useCallback((items: PrepItem[]) => {
    setPrepItems(items);
    updateCloudState({ prepItems: items });
  }, [updateCloudState]);

  const updateTimers = useCallback((updatedTimers: KitchenTimer[]) => {
    setTimers(updatedTimers);
    updateCloudState({ timers: updatedTimers });
  }, [updateCloudState]);

  const updateRecipes = useCallback((updatedRecipes: Recipe[]) => {
    setRecipes(updatedRecipes);
    updateCloudState({ recipes: updatedRecipes });
  }, [updateCloudState]);

  const updateItems86 = useCallback((newItems86: Item86Entry[]) => {
    setItems86(newItems86);
    updateCloudState({ items86: newItems86 });
  }, [updateCloudState]);

  return {
    prepItems,
    setPrepItems: updatePrepItems,
    timers,
    setTimers: updateTimers,
    recipes,
    setRecipes: updateRecipes,
    handovers,
    items86,
    setItems86: updateItems86,
    latestReport,
    kitchenAlerts,
    markAlertAsRead,
  };
};
