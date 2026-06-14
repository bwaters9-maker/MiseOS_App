import React, { useState } from 'react';
import { Recipe } from './types';

interface RecipeSpecSheetProps {
  recipe?: Recipe;
  onBack?: () => void;
}

export const RecipeSpecSheet: React.FC<RecipeSpecSheetProps> = ({ recipe, onBack }) => {
  const [scalingFactor, setScalingFactor] = useState(1);

  if (!recipe) {
    return (
      <div className="p-6 text-zinc-400 font-mono">
        No recipe selected. Select a card from the dashboard to display specifications.
      </div>
    );
  }

  // Calculate total batch cost based on individual ingredients configuration
  const calculatedTotalCost = recipe.ingredients?.reduce((sum, ing) => {
    const ingredientCost = (ing.quantity * ing.costPerUnit) / (ing.yieldPercent / 100);
    return sum + (ingredientCost || 0);
  }, 0) || 0;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-zinc-950 text-zinc-100 font-mono tracking-tight selection:bg-emerald-800">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 mb-8 gap-4">
        <div>
          <button onClick={onBack} className="text-xs text-zinc-500 hover:text-emerald-400 mb-2 transition-colors">
            &larr; BACK TO THE PASS
          </button>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{recipe.name}</h1>
          <p className="text-xs text-zinc-400 mt-1">STATION: <span className="text-emerald-400 font-bold">{recipe.station}</span></p>
        </div>
        <div className="flex gap-3">
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-center">
            <span className="block text-[10px] text-zinc-500 uppercase font-bold">Menu Price</span>
            <span className="text-lg font-bold text-emerald-400">${recipe.salePrice?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-center">
            <span className="block text-[10px] text-zinc-500 uppercase font-bold">Food Cost</span>
            <span className="text-lg font-bold text-zinc-300">
              {recipe.salePrice && calculatedTotalCost 
                ? ((calculatedTotalCost / recipe.salePrice) * 100).toFixed(1) 
                : '0.0'}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Components and Scaling */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-b border-zinc-800/80 pb-3">
              <h2 className="text-sm font-bold tracking-widest text-zinc-400 uppercase">Ingredient Specifications</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500">SCALE MULTIPLIER:</label>
                <select 
                  value={scalingFactor} 
                  onChange={(e) => setScalingFactor(Number(e.target.value))}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value={1}>1x (Base)</option>
                  <option value={2}>2x (Double)</option>
                  <option value={4}>4x (Batch)</option>
                  <option value={0.5}>0.5x (Half)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-bold">
                    <th className="py-2">INGREDIENT COMPONENT</th>
                    <th className="py-2 text-right">BASE QTY</th>
                    <th className="py-2 text-right text-emerald-400">SCALED QTY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {recipe.ingredients?.map((ing, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/20 text-zinc-300">
                      <td className="py-2.5 font-medium">{ing.name}</td>
                      <td className="py-2.5 text-right text-zinc-500">{ing.quantity} {ing.unit}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        {(ing.quantity * scalingFactor).toFixed(2)} {ing.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Step Mechanics */}
        <div className="space-y-6">
          <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md">
            <h2 className="text-sm font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800/80 pb-3 mb-4">
              Execution Methodology
            </h2>
            <ol className="space-y-4 text-xs text-zinc-300 list-decimal list-inside">
              {recipe.steps?.map((step, idx) => (
                <li key={idx} className="leading-relaxed pl-1 marker:text-zinc-500 marker:font-bold">
                  <span className="text-zinc-200">{step}</span>
                </li>
              )) || <p className="text-zinc-500 italic">No method steps configured.</p>}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
