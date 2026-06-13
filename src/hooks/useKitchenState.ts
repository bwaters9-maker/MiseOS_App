/**
 * src/hooks/useKitchenState.ts
 * Complete state management hook with write-through cloud syncing logic.
 */
import { useState, useEffect } from 'react';
import { PrepItem, KitchenTimer, Recipe } from '../types';
import { INITIAL_PREP_ITEMS, INITIAL_TIMERS, INITIAL_RECIPES } from '../data';
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export const useKitchenState = () => {
  const [prepItems, setPrepItems] = useState<PrepItem[]>(() => {
    const saved = localStorage.getItem('miseos_prep_items');
    return saved ? JSON.parse(saved) : INITIAL_PREP_ITEMS;
  });
  const [timers, setTimers] = useState<KitchenTimer[]>(() => {
    const saved = localStorage.getItem('miseos_timers');
    return saved ? JSON.parse(saved) : INITIAL_TIMERS;
  });
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('miseos_recipes');
    return saved ? JSON.parse(saved) : INITIAL_RECIPES;
  });

  // Write-Through Data Handler: Prep Items
  const updatePrepItems = (items: PrepItem[]) => {
    setPrepItems(items);
    localStorage.setItem('miseos_prep_items', JSON.stringify(items));
    
    // Background execution to update Firebase Cloud Firestore
    setDoc(doc(db, "miseos_data", "prep_checklist"), { items })
      .catch((error) => console.error("Cloud synchronization failed for prep items:", error));
  };

  // Write-Through Data Handler: Timers
  const updateTimers = (updatedTimers: KitchenTimer[]) => {
    setTimers(updatedTimers);
    localStorage.setItem('miseos_timers', JSON.stringify(updatedTimers));
    
    setDoc(doc(db, "miseos_data", "line_timers"), { updatedTimers })
      .catch((error) => console.error("Cloud synchronization failed for timers:", error));
  };

  // Write-Through Data Handler: Recipes
  const updateRecipes = (updatedRecipes: Recipe[]) => {
    setRecipes(updatedRecipes);
    localStorage.setItem('miseos_recipes', JSON.stringify(updatedRecipes));
    
    setDoc(doc(db, "miseos_data", "recipe_catalog"), { updatedRecipes })
      .catch((error) => console.error("Cloud synchronization failed for recipes:", error));
  };

  // Local effect for standalone initialization checks
  useEffect(() => {
    localStorage.setItem('miseos_prep_items', JSON.stringify(prepItems));
    localStorage.setItem('miseos_timers', JSON.stringify(timers));
    localStorage.setItem('miseos_recipes', JSON.stringify(recipes));
  }, [prepItems, timers, recipes]);

  return { 
    prepItems, 
    setPrepItems: updatePrepItems, 
    timers, 
    setTimers: updateTimers, 
    recipes, 
    setRecipes: updateRecipes 
  };
};