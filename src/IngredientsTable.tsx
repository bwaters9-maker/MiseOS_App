import React from 'react';
import { Trash2, Edit2, PlusCircle, TrendingUp, ArrowUpRight, ArrowRight } from 'lucide-react';

const DETAILED_INGREDIENTS_DATA = [
  { name: "Extra Virgin Olive Oil", category: "Oils & Fats", allergens: "—", vendor: "Mediterranean Imports", purchase: "$24.00 / 3 liter", yieldPct: 100, costUnit: "$0.1180 / tbsp", status: "High" },
  { name: "Heavy Cream", category: "Dairy", allergens: "—", vendor: "Dairy Direct", purchase: "$8.75 / 1 gallon", yieldPct: 100, costUnit: "$0.5470 / cup", status: "Rising" },
  { name: "Saffron Threads", category: "Spices", allergens: "—", vendor: "Spice World", purchase: "$28.00 / 5 g", yieldPct: 100, costUnit: "$5.6000 / g", status: "Steady" },
  { name: "Atlantic Salmon Fillet", category: "Protein", allergens: "—", vendor: "Ocean Fresh", purchase: "$14.50 / 1 lb", yieldPct: 80, costUnit: "$1.1320 / oz", status: "Rising" },
  { name: "Butter (unsalted)", category: "Dairy", allergens: "—", vendor: "—", purchase: "$0.00 / 1 lb", yieldPct: 100, costUnit: "$0.0000 / oz", status: "Rising" },
  { name: "Eggs (Large)", category: "Dairy", allergens: "—", vendor: "GFS", purchase: "$59.99 / 180 case", yieldPct: 95, costUnit: "$0.3500 / each", status: "Rising" },
  { name: "Romaine Lettuce", category: "Produce", allergens: "—", vendor: "Tarantino Foods", purchase: "$28.99 / 24 case", yieldPct: 85, costUnit: "$0.1000 / oz", status: "Rising" },
  { name: "Chicken Breast (Boneless/Skinless)", category: "Protein", allergens: "—", vendor: "GFS / Tarantino Foods", purchase: "$87.99 / 40 lb", yieldPct: 95, costUnit: "$0.1500 / oz", status: "High" },
  { name: "Heavy Whipping Cream", category: "Dairy", allergens: "—", vendor: "GFS", purchase: "$9.99 / 1 gallon", yieldPct: 100, costUnit: "$0.6300 / cup", status: "Rising" },
  { name: "Olive Oil (Pure)", category: "Oils & Fats", allergens: "—", vendor: "GFS", purchase: "$16.99 / 1 gallon", yieldPct: 100, costUnit: "$0.3200 / tbsp", status: "Rising" },
  { name: "Chicken breast", category: "Protein", allergens: "—", vendor: "—", purchase: "$0.00 / 1 lb", yieldPct: 90, costUnit: "$0.0000 / oz", status: "Rising" },
  { name: "Russet Potatoes", category: "Produce", allergens: "—", vendor: "Tarantino Foods", purchase: "$16.99 / 50 bag", yieldPct: 90, costUnit: "$0.3800 / lb", status: "Steady" }
];

export default function IngredientsTable() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-mono text-zinc-100 selection:bg-emerald-800">
      
      {/* HEADER BAR */}
      <div className="border-b border-zinc-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-wider uppercase">Master Ingredients</h1>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">Cost breakups, matrix profiles, and yield indicators</p>
        </div>
        <button className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-zinc-100 text-xs uppercase px-4 py-2.5 rounded-lg font-bold tracking-wider flex items-center gap-2 transition-all shadow-md">
          <PlusCircle className="w-4 h-4" /> Add Ingredient
        </button>
      </div>

      {/* MATRIX DATABASE TABLE */}
      <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/60 shadow-xl overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs min-w-[900px]">
          <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-widest text-[9px] border-b border-zinc-900">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Allergens</th>
              <th className="p-4">Vendor</th>
              <th className="p-4">Purchase</th>
              <th className="p-4">Yield</th>
              <th className="p-4">Cost/Unit</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            {DETAILED_INGREDIENTS_DATA.map((ing, i) => (
              <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                <td className="p-4 font-bold text-zinc-100 whitespace-nowrap">{ing.name}</td>
                <td className="p-4">
                  <span className="text-[9px] uppercase font-bold border border-zinc-800 bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 tracking-wider">
                    {ing.category}
                  </span>
                </td>
                <td className="p-4 text-zinc-600">{ing.allergens}</td>
                <td className="p-4 text-zinc-400 max-w-[150px] truncate">{ing.vendor}</td>
                <td className="p-4 text-zinc-400 whitespace-nowrap">{ing.purchase}</td>
                <td className="p-4 text-zinc-300 font-bold">{ing.yieldPct}%</td>
                <td className="p-4 whitespace-nowrap font-bold">
                  <span className="text-blue-400">{ing.costUnit.split(' ')[0]}</span>
                  <span className="text-zinc-600 font-normal"> {ing.costUnit.split(' ').slice(1).join(' ')}</span>
                  
                  {/* Status Badges Matching Styles */}
                  <span className={`inline-flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded ml-2 border ${
                    ing.status === 'High' ? 'bg-red-950/40 border-red-900/40 text-red-400' :
                    ing.status === 'Rising' ? 'bg-amber-950/40 border-amber-900/40 text-amber-400' :
                    'bg-blue-950/40 border-blue-900/40 text-blue-400'
                  }`}>
                    {ing.status === 'Steady' ? '→' : '↑'} {ing.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex justify-center gap-3">
                    <button className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1">
                      Add to Prep
                    </button>
                    <button className="text-zinc-600 hover:text-zinc-300 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button className="text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER BULK ACTIONS PANEL */}
      <div className="flex justify-end">
        <button className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2">
          <span>Market Analysis Overview</span> <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}