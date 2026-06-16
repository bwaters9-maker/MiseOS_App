/**
 * src/hooks/useKitchenState.ts
 * Complete state management hook with resilient data parsing and real-time cloud syncing logic.
 * Optimized with a single state document and native Firestore offline persistence.
 */
import { useState, useEffect, useCallback } from 'react';
import { PrepItem, KitchenTimer, Recipe, HandoverEntry, Item86Entry } from '@/types';
import { INITIAL_PREP_ITEMS, INITIAL_TIMERS, INITIAL_RECIPES } from '@/data';
import { db } from '@/firebaseConfig';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// A single document in Firestore holds the entire kitchen state.
const kitchenStateDocRef = doc(db, "miseos_data", "kitchen_state");

export const useKitchenState = () => {
  const [prepItems, setPrepItems] = useState<PrepItem[]>(INITIAL_PREP_ITEMS);
  const [timers, setTimers] = useState<KitchenTimer[]>(INITIAL_TIMERS);
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [handovers, setHandovers] = useState<HandoverEntry[]>([]);
  const [items86, setItems86] = useState<Item86Entry[]>([]);

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
        if (cloudState.handovers) {
            setHandovers(cloudState.handovers);
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
          handovers: [],
          items86: []
        }).catch(err => console.error("Failed to initialize kitchen state document:", err));
      }
    });

    return () => unsubscribe();
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

  const updateHandovers = useCallback((newHandovers: HandoverEntry[]) => {
    setHandovers(newHandovers);
    updateCloudState({ handovers: newHandovers });
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
    setHandovers: updateHandovers,
    items86,
    setItems86: updateItems86
  };
};

