import React, { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import DailyCribSheet from './components/dashboard/DailyCribSheet';
import { LineTimerModule } from './components/dashboard/LineTimerModule';
import { MetricsHUD } from './components/dashboard/MetricsHUD';
import { RecipeBuilder } from './components/dashboard/RecipeBuilder';
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-mono text-zinc-100 selection:bg-emerald-800">

      {/* HEADER SECTION */}
      <div className="border-b border-zinc-900 pb-4">
        <h1 className="text-xl font-extrabold tracking-wider uppercase">Dashboard</h1>
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">Your kitchen at a glance</p>
      </div>

      {/* METRIC CARD HUD */}
      <MetricsHUD />

      {/* RECIPE BUILDER */}
      {/* <RecipeBuilder /> */}

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