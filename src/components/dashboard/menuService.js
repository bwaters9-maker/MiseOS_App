import { collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from "../firebase/config.js";

/**
 * Fetches all active menu items and resolves their corresponding recipe details.
 * This acts as the master digital specials board, linking menu prices directly
 * to their backend recipe cards and financial targets.
 *
 * @returns {Promise<Array<object>>} Unified array of active menu items with resolved recipe details.
 */
export const getMenuItemsWithRecipes = async () => {
  try {
    const menuItemsRef = collection(db, 'menuItems');
    const activeQuery = query(menuItemsRef, where('status', '==', 'active'));
    const menuItemsSnapshot = await getDocs(activeQuery);

    const recipePromises = menuItemsSnapshot.docs.map(async (menuItemDoc) => {
      const menuItemData = menuItemDoc.data();
      
      if (menuItemData.recipe_id) {
        try {
          const recipeSnap = await getDoc(menuItemData.recipe_id);
          
          if (recipeSnap.exists()) {
            const recipeData = recipeSnap.data();
            return {
              id: menuItemDoc.id,
              name: menuItemData.name,
              price: menuItemData.price,
              status: menuItemData.status,
              recipeTitle: recipeData.title || 'Untitled Recipe',
              marginGoal: recipeData.margin_goal || 0,
              ingredients: recipeData.ingredients || []
            };
          }
        } catch (innerErr) {
          console.warn(`Warning: Could not resolve recipe reference for menu item ${menuItemDoc.id}`, innerErr);
        }
      }
      
      return {
        id: menuItemDoc.id,
        name: menuItemData.name,
        price: menuItemData.price,
        status: menuItemData.status,
        recipeTitle: 'No Recipe Linked',
        marginGoal: 0,
        ingredients: []
      };
    });

    const combinedItems = await Promise.all(recipePromises);
    return combinedItems;
  } catch (error) {
    console.error('Error fetching active menu items with recipes:', error);
    throw new Error('Failed to fetch active menu items with recipes.');
  }
};