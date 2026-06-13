import React from 'react';
import DashboardView from './Dashboard';
import IngredientsTable from './IngredientsTable';
import RecipeSpecSheetBuilder from './RecipeSpecSheet';
import TestKitchenHub from './TestKitchenHub';

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="bg-[var(--primary)] text-white shadow-md">
        <div className="max-w-[95%] mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tighter text-white">MISEOS</h1>
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Architect's OS // Active Workspace</span>
        </div>
      </nav>

      <main className="max-w-[95%] mx-auto px-6 py-8 grid grid-cols-12 gap-6">
        {/* Stage 1: Plan (Test Kitchen) - Left Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <TestKitchenHub />
        </div>

        {/* Stage 2 & 3: Review & Verify (Ingredients & Recipes) - Central Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <IngredientsTable />
          <RecipeSpecSheetBuilder />
        </div>

        {/* Stage 4: Advocate (Status & Handover) - Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <DashboardView />
        </div>
      </main>
    </div>
  );
}