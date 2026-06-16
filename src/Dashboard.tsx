import React, { useState, useEffect } from 'react';
import { Apple, Utensils, Timer, Printer, ChefHat } from 'lucide-react';
import DailyCribSheet from './components/dashboard/DailyCribSheet';
import { useKitchenState } from '@/hooks/useKitchenState';
import { INITIAL_HANDOVERS, INITIAL_86_ITEMS } from './data';
import { KitchenTimer } from './types';
import { formatDuration } from './utils';

// --- HIGH-PERFORMANCE IN-FILE TIMER ENGINE ---
// Uses Date.now() directly inside render, triggered dynamically by the parent's tick state.
const TimerDisplay: React.FC<{ timer: KitchenTimer }> = ({ timer }) => {
  const isRunning = timer.status === 'running';
  const now = Date.now();
  const timeSinceStart = isRunning ? now - (timer.startTime || now) : 0;
  const remainingMs = timer.durationMs - timer.elapsedMs - timeSinceStart;
  
  const isAlarm = remainingMs <= 0;
  const displayTime = formatDuration(remainingMs);

  const statusColor = isAlarm ? 'text-red-500 animate-pulse font-black' : 
                      isRunning ? 'text-emerald-400 font-bold' : 'text-zinc-500';

  return (
    <div className={`flex justify-between items-center p-4 rounded-lg bg-zinc-950 border transition-colors ${isAlarm ? 'border-red-600 bg-red-950/20' : 'border-zinc-800'}`}>
      <div>
        <p className="text-sm font-bold text-zinc-100 uppercase tracking-tight">{timer.label}</p>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Station: <span className="text-zinc-300">{timer.station}</span></p>
      </div>
      <div className={`font-mono text-2xl tracking-tighter ${statusColor}`}>
        {displayTime}
      </div>
    </div>
  );
};
// --- END TIMER ENGINE ---


export default function DashboardView() {
  const { prepItems, timers, recipes } = useKitchenState();
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
              handovers={INITIAL_HANDOVERS}
              items86={INITIAL_86_ITEMS}
            />
          </div>
        </div>

        {/* Right 2/3 Panel: Active Kitchen Timers */}
        <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-900 rounded-xl p-5 space-y-4">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Active Kitchen Timers</h3>
          </div>
          <div className="pt-2 space-y-2.5">
            {timers.length > 0 ? (
              timers.map(timer => (
                <TimerDisplay key={timer.id} timer={timer} />
              ))
            ) : (
              <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-600 uppercase tracking-widest flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500">
                  <Timer className="w-4 h-4" />
                </div>
                <span>No active timers registered.</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
