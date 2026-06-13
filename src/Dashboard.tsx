import React from 'react';
import { Apple, Utensils, DollarSign, TrendingUp, ChevronLeft, ChevronRight, MessageSquare, Calendar, Printer } from 'lucide-react';

export default function DashboardView() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-mono text-zinc-100 selection:bg-emerald-800">
      
      {/* HEADER SECTION */}
      <div className="border-b border-zinc-900 pb-4">
        <h1 className="text-xl font-extrabold tracking-wider uppercase">Dashboard</h1>
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">Your kitchen at a glance</p>
      </div>

      {/* METRIC CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Ingredients */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Ingredients</span>
            <span className="text-2xl font-black text-zinc-100 block">369</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Apple className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Recipes */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Recipes</span>
            <span className="text-2xl font-black text-zinc-100 block">0</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Utensils className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Spend */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Total Ingredient Spend</span>
            <span className="text-2xl font-black text-zinc-100 block">$1672.28</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Avg Food Cost */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Avg Food Cost %</span>
            <span className="text-2xl font-black text-zinc-400 block">—</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* VIRTUAL SOUS-CHEF COACHING GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Coach 1: Chefington */}
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500 flex items-center justify-center text-xs">👨‍🍳</div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Chefington</h4>
                <span className="text-[9px] uppercase font-bold text-blue-400 tracking-widest px-1.5 py-0.5 rounded bg-blue-950/50 border border-blue-900/40">Recipe Cost</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-600">
              <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-500">2/6</span>
              <ChevronRight className="w-4 h-4 cursor-pointer hover:text-zinc-400" />
            </div>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed italic">
            "If your food cost is creeping above 32%, start with your proteins. A small trim in portion size, applied consistently, can recover serious margin over a full week of service."
          </p>
          <div className="pt-2 flex gap-3 border-t border-zinc-900">
            <button className="text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-300 tracking-wider">Review Recipes →</button>
            <button className="text-[10px] font-bold uppercase text-blue-400 hover:text-blue-300 tracking-wider flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Chat with Chefington
            </button>
          </div>
        </div>

        {/* Coach 2: Vivienne */}
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-600/20 border border-amber-500 flex items-center justify-center text-xs">👩‍💼</div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Vivienne</h4>
                <span className="text-[9px] uppercase font-bold text-amber-400 tracking-widest px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-900/40">Staff Scheduling</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-600">
              <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-500">2/6</span>
              <ChevronRight className="w-4 h-4 cursor-pointer hover:text-zinc-400" />
            </div>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed italic">
            "A-Team Standard: never schedule your weakest server on a peak night. Rotate your high performers strategically across Friday and Saturday to anchor every section."
          </p>
          <div className="pt-2 flex gap-3 border-t border-zinc-900">
            <button className="text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-300 tracking-wider">View Staff Schedule →</button>
            <button className="text-[10px] font-bold uppercase text-amber-400 hover:text-amber-300 tracking-wider flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Chat with Vivienne
            </button>
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
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Saturday, June 13</span>
          </div>
          <div className="pt-2 space-y-2">
            <div className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Catering Events</div>
            <p className="text-xs text-zinc-500 italic">No catering events logged for this service window.</p>
          </div>
        </div>

        {/* Right 2/3 Panel: Recently Updated Recipes */}
        <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-900 rounded-xl p-5 space-y-4">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Recently Updated Recipes</h3>
          </div>
          <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-600 uppercase tracking-widest flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500">⚙️</div>
            <span>No recipes currently registered in active ledger pipeline.</span>
          </div>
        </div>

      </div>

    </div>
  );
}