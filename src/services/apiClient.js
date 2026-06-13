/**
 * src/services/apiClient.js
 * Typed API Gateway for MiseOS.
 * @typedef {import('../database/documents').Recipe} Recipe
 * @typedef {import('../database/documents').Ingredient} Ingredient
 */

const BASE_URL = '/api/v1';

export const apiClient = {
  async request(endpoint, options = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) throw new Error('API Request Failed');
    return response.json();
  },

  recipes: {
    /** @returns {Promise<Recipe[]>} */
    getAll: () => apiClient.request('/recipes'),
    
    /** @param {Recipe} recipeData */
    save: (recipeData) => apiClient.request('/recipes', { 
      method: 'POST', 
      body: JSON.stringify(recipeData) 
    }),
  },

  ingredients: {
    /** @returns {Promise<Ingredient[]>} */
    getAll: () => apiClient.request('/ingredients'),
  }
};