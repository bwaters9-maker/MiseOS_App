import React, { useState, useEffect } from 'react';
import { Apple, Utensils, Timer, Printer, ChefHat } from 'lucide-react';
import DailyCribSheet from './components/dashboard/DailyCribSheet';
import { LineTimerModule } from './components/dashboard/LineTimerModule';
import { useKitchenState } from '@/hooks/useKitchenState';

export default function DashboardView() {
  const { prepItems, timers, recipes, handovers, setHandovers, items86, setItems86 } = useKitchenState();
  const [tick, setTick] = useState(0);

  // Single in-file interval loop tracking tick state
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const recipeCount = recipes.length;
  const ingredientCount = recipes.reduce((acc, r) => acc + r.ingredients.length, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-mono text-zinc-100 selection:bg-emerald-800">

      {/* HEADER SECTION */}
      <div className="border-b border-zinc-900 pb-4">
        <h1 className="text-xl font-extrabold tracking-wider uppercase">Dashboard</h1>
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">Your kitchen at a glance</p>
      </div>

      {/* METRIC CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Ingredients</span>
            <span className="text-2xl font-black text-zinc-100 block">{ingredientCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Apple className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Recipes</span>
            <span className="text-2xl font-black text-zinc-100 block">{recipeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Utensils className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Active Timers</span>
            <span className="text-2xl font-black text-zinc-100 block">{timers.filter(t => t.status === 'running').length}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Timer className="w-5 h-5" />
          </div>
        </div>
        
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Prep Items</span>
            <span className="text-2xl font-black text-zinc-100 block">{prepItems.length}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <ChefHat className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* LOWER CONTENT PANEL GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left 1/3 Panel: Today's Crib Sheet */}
        <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Today's Crib Sheet</h3>
            <button className="text-[9px] uppercase font-bold tracking-widest bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 px-2 py-1 rounded flex items-center gap-1 transition-colors">
              <Printer className="w-3 h-3" /> Print (4-Up)
            </button>
          </div>
          <div className="pt-2">
            <DailyCribSheet 
              prepItems={prepItems}
              handovers={handovers}
              items86={items86}
              onUpdateHandovers={setHandovers}
              onUpdateItems86={setItems86}
            />
          </div>
        </div>

        {/* Right 2/3 Panel: Active Kitchen Timers */}
        <div className="md:col-span-2">
          <LineTimerModule />
        </div>

      </div>

    </div>
  );
}
