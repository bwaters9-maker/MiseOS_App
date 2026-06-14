/**
 * src/hooks/useKitchenState.ts
 * Complete state management hook with resilient data parsing and real-time cloud syncing logic.
 */
import { useState, useEffect } from 'react';
import { PrepItem, KitchenTimer, Recipe } from '../types';
import { INITIAL_PREP_ITEMS, INITIAL_TIMERS, INITIAL_RECIPES } from '../data';
import { db } from '../firebaseConfig';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Helper function to safely read and parse localStorage items
const getSafeLocalStorage = <T>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved || saved === "undefined" || saved === "null") return fallback;
    return JSON.parse(saved) as T;
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    return fallback;
  }
};

export const useKitchenState = () => {
  const [prepItems, setPrepItems] = useState<PrepItem[]>(() => 
    getSafeLocalStorage('miseos_prep_items', INITIAL_PREP_ITEMS)
  );
  const [timers, setTimers] = useState<KitchenTimer[]>(() => 
    getSafeLocalStorage('miseos_timers', INITIAL_TIMERS)
  );
  const [recipes, setRecipes] = useState<Recipe[]>(() => 
    getSafeLocalStorage('miseos_recipes', INITIAL_RECIPES)
  );

  // Real-time Cloud Listeners on Boot
  useEffect(() => {
    const unsubPrep = onSnapshot(doc(db, "miseos_data", "prep_checklist"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().items) {
        setPrepItems(docSnap.data().items);
        localStorage.setItem('miseos_prep_items', JSON.stringify(docSnap.data().items));
      }
    });

    const unsubTimers = onSnapshot(doc(db, "miseos_data", "line_timers"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().updatedTimers) {
        setTimers(docSnap.data().updatedTimers);
        localStorage.setItem('miseos_timers', JSON.stringify(docSnap.data().updatedTimers));
      }
    });

    const unsubRecipes = onSnapshot(doc(db, "miseos_data", "recipe_catalog"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().updatedRecipes) {
        setRecipes(docSnap.data().updatedRecipes);
        localStorage.setItem('miseos_recipes', JSON.stringify(docSnap.data().updatedRecipes));
      }
    });

    return () => {
      unsubPrep();
      unsubTimers();
      unsubRecipes();
    };
  }, []);

  const updatePrepItems = (items: PrepItem[]) => {
    setPrepItems(items);
    localStorage.setItem('miseos_prep_items', JSON.stringify(items));
    setDoc(doc(db, "miseos_data", "prep_checklist"), { items })
      .catch((error) => console.error("Cloud synchronization failed for prep items:", error));
  };

  const updateTimers = (updatedTimers: KitchenTimer[]) => {
    setTimers(updatedTimers);
    localStorage.setItem('miseos_timers', JSON.stringify(updatedTimers));
    setDoc(doc(db, "miseos_data", "line_timers"), { updatedTimers })
      .catch((error) => console.error("Cloud synchronization failed for timers:", error));
  };

  const updateRecipes = (updatedRecipes: Recipe[]) => {
    setRecipes(updatedRecipes);
    localStorage.setItem('miseos_recipes', JSON.stringify(updatedRecipes));
    setDoc(doc(db, "miseos_data", "recipe_catalog"), { updatedRecipes })
      .catch((error) => console.error("Cloud synchronization failed for recipes:", error));
  };

  return {
    prepItems,
    setPrepItems: updatePrepItems,
    timers,
    setTimers: updateTimers,
    recipes,
    setRecipes: updateRecipes
  };
};
