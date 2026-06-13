// src/services/apiClient.js

const BASE_URL = process.env.REACT_APP_API_URL || 'https://api.miseos.chef/v1';

export const apiClient = {
  // Generic Fetch Wrapper
  async request(endpoint, options = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('miseos_token')}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API Request Failed');
    }
    return response.json();
  },

  // Service Endpoints
  recipes: {
    getAll: () => apiClient.request('/recipes'),
    save: (data) => apiClient.request('/recipes', { method: 'POST', body: JSON.stringify(data) }),
  },
  
  ingredients: {
    getAll: () => apiClient.request('/ingredients'),
    sync: (data) => apiClient.request('/ingredients/sync', { method: 'POST', body: JSON.stringify(data) }),
  },
  
  trends: {
    getReport: () => apiClient.request('/trends/latest'),
  }
};