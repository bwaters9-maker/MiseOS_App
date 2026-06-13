import React, { useState } from 'react';
import { LayoutDashboard, Apple, UtensilsCrossed, ClipboardList, Truck, Menu as MenuIcon, Layers, Beaker, LogOut } from 'lucide-react';
import RecipeSpecSheetBuilder from './RecipeSpecSheet';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('Recipes');

  const navigationItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Ingredients', label: 'Ingredients', icon: Apple },
    { id: 'Recipes', label: 'Recipes', icon: UtensilsCrossed },
    { id: 'Inventory', label: 'Inventory', icon: ClipboardList },
    { id: 'Vendors', label: 'Vendors', icon: Truck },
    { id: 'Menu', label: 'Menu', icon: MenuIcon },
    { id: 'Collections', label: 'Collections', icon: Layers },
    { id: 'TestKitchen', label: 'Test Kitchen', icon: Beaker },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-mono tracking-tight antialiased">
      
      {/* PERSISTENT LEFT SIDEBAR DOCK */}
      <div className="w-64 bg-blue-900/90 border-r border-blue-950 flex flex-col justify-between p-4 shrink-0 selection:bg-blue-800">
        <div className="space-y-6">
          
          {/* Brand Identity Header Block */}
          <div className="text-center py-6 border-b border-blue-950/60 space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-600/20 border border-rose-500/40 mb-1">
              <span className="text-rose-400 text-lg">🍷</span>
            </div>
            <h2 className="text-base font-black tracking-widest uppercase text-white font-sans">
              BACCHUS
            </h2>
            <p className="text-[10px] font-bold text-blue-200/70 tracking-widest uppercase">
              Wine Bar & Restaurant
            </p>
            <p className="text-[9px] text-blue-300/50 uppercase font-sans tracking-wider">
              56 W. Chippewa • Buffalo, NY
            </p>
          </div>

          {/* Navigation Matrix Loop */}
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentRoute(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                    isActive
                      ? 'bg-zinc-950 border-zinc-900 text-emerald-400 shadow-md font-extrabold'
                      : 'border-transparent text-blue-100 hover:bg-blue-950/40 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-blue-300/60'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Global Exit Operations */}
        <div className="border-t border-blue-950/60 pt-4">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-blue-300/60 hover:text-rose-400 rounded-lg transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC BACK-OF-HOUSE VIEWPORT */}
      <main className="flex-1 overflow-y-auto bg-zinc-950">
        {currentRoute === 'Recipes' && <RecipeSpecSheetBuilder />}
        {currentRoute !== 'Recipes' && (
          <div className="p-8 text-center text-xs text-zinc-600 uppercase tracking-widest pt-24 border border-zinc-900/40 m-6 rounded-xl bg-zinc-900/10">
            View segment link [{currentRoute}] mapped successfully. Awaiting template node population.
          </div>
        )}
      </main>

    </div>
  );
}