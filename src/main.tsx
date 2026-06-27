/**
 * MANDATORY PRE-FLIGHT DEEP CLEAN
 * This script acts as a full system purge before service. It ensures that every
 * single time the application loads in the browser, it starts from a completely
 * clean slate, free of any cached data, old layouts, or lingering state.
 * This is a critical step for isolating components during testing.
 */
console.log('MiseOS: Executing pre-flight deep clean...');
window.localStorage.clear();
window.sessionStorage.clear();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('Service worker unregistered.');
    }
  }).catch(function(err) {
    console.error('Service worker unregistration failed: ', err);
  });
}
console.log('MiseOS: Pre-flight deep clean complete. All caches purged.');

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App.jsx'; // Importing the clean, isolated App component for testing.
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);