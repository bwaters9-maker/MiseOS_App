import React, { useState } from 'react';
import DashboardView from './Dashboard';
import IngredientsTable from './IngredientsTable';
import RecipeSpecSheetBuilder from './RecipeSpecSheet';
import TestKitchenHub from './TestKitchenHub';

export default function App() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navy Branding Header */}
      <nav className="bg-[var(--primary)] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tighter text-white">MISEOS</h1>
          <div className="flex gap-8">
            <button onClick={() => setActiveTab('DASHBOARD')} className="text-white/80 hover:text-white font-medium uppercase tracking-wider text-xs transition-colors">Dashboard</button>
            <button onClick={() => setActiveTab('INGREDIENTS')} className="text-white/80 hover:text-white font-medium uppercase tracking-wider text-xs transition-colors">Ingredients</button>
            <button onClick={() => setActiveTab('RECIPES')} className="text-white/80 hover:text-white font-medium uppercase tracking-wider text-xs transition-colors">Recipes</button>
            <button onClick={() => setActiveTab('EXTRACTOR')} className="text-white/80 hover:text-white font-medium uppercase tracking-wider text-xs transition-colors">Test Kitchen</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mise-card">
          {activeTab === 'DASHBOARD' && <DashboardView />}
          {activeTab === 'INGREDIENTS' && <IngredientsTable />}
          {activeTab === 'RECIPES' && <RecipeSpecSheetBuilder />}
          {activeTab === 'EXTRACTOR' && <TestKitchenHub />}
        </div>
      </main>
    </div>
  );
}