/**
 * MiseOS Service Layer
 * Replaces base44 SDK with standardized API calls to your new backend.
 */

const API_BASE = '/api/v1'; // Or your Firebase/Azure URL

export const apiService = {
  // Recipes
  getRecipes: async () => {
    const res = await fetch(`${API_BASE}/recipes`);
    return res.json();
  },
  saveRecipe: async (recipe) => {
    const res = await fetch(`${API_BASE}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe)
    });
    return res.json();
  },

  // Ingredients
  getIngredients: async () => {
    const res = await fetch(`${API_BASE}/ingredients`);
    return res.json();
  },

  // Analysis/AI
  triggerTrendAnalysis: async () => {
    const res = await fetch(`${API_BASE}/analyze`, { method: 'POST' });
    return res.json();
  }
};