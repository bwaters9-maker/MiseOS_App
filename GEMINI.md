# MISEOS SYSTEM ARCHITECTURE & STATE CONTEXT

## Project Overview
MiseOS is a highly structured, professional-grade, white-label Back-of-House (BOH) kitchen operations and restaurant logistics platform built for fine craftsmanship, extreme legibility, and high-efficiency tactical execution. 

## Technical Stack
* **Build Tooling:** Vite (utilizing HMR client middleware, strictly running on port 3000)
* **Language Core:** TypeScript layout with React rendering components
* **Styling Layer:** Tailwind CSS v4 (using direct global imports, zero sub-specifiers)
* **Database Backend:** Firebase Firestore for live cloud-state replication

## Core Rules for Code Generation
1. **Strict White-Labeling:** Never hardcode specific brand names, assets, or locations into components. All branding strings, metadata, and systemic configurations must be dynamically requested from the centralized parameters file: `src/lib/app-params.js` using `APP_PARAMS`.
2. **Typography Standards:** Adhere exclusively to high-legibility sans-serif font hierarchies (`system-ui`, `inter`, etc.). Completely avoid raw monospace styling or aggressive text tracking on normal interface labels.
3. **Data Integrity:** Always funnel runtime modifications through the resilient state hooks located in `src/hooks/useKitchenState.ts` to protect browser storage from bad JSON compilation errors or unparsed strings.

## Current Project Status
* **Main Entry Point:** `src/main.tsx` cleanly binds to the TypeScript layout root `src/App.tsx`.
* **State Syncing Hook:** `useKitchenState.ts` actively listens to Firebase snapshots for recipes, prep checklists, and kitchen countdown timers.
* **Commodity Intelligence Layer:** Active. Formed by `src/lib/costEngine.js` (logic), `src/components/ingredients/IngredientTable.jsx` (master grid listing AP vs True EP costs), and `src/components/ingredients/IngredientDetailModal.jsx` (market volatility analytics cards).
* **Next Target Modules:** Building out the automated daily operational tools, printing systems, and recipe scaling calculators (`DailyCribSheet.jsx`, `PrepChecklist.jsx`, `RecipeScaler.jsx`).
