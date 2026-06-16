import React from 'react';
import { CostCalculationRecipe } from '@/lib/costEngine';

interface RecipeCostSummaryProps {
  recipe: CostCalculationRecipe;
}

export const RecipeCostSummary: React.FC<RecipeCostSummaryProps> = ({ recipe }) => {
  const menuPrice = Number(recipe.menu_price) || 0;
  const targetFoodCostPercent = Number(recipe.target_food_cost_percent) || 30; // default 30%
  const targetCost = menuPrice * (targetFoodCostPercent / 100);
  
  const totalCost = Number(recipe.total_cost) || 0;
  const costPerPortion = Number(recipe.cost_per_portion) || 0;
  const foodCostPercent = Number(recipe.food_cost_percent) || 0;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-6 shadow-md">
      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Financial Matrix</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-zinc-300">Total Cost</span>
          <span className="text-lg font-black text-white">${totalCost.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-zinc-300">Cost/Portion</span>
          <span className="text-lg font-black text-white">${costPerPortion.toFixed(2)}</span>
        </div>

        <div className="p-4 bg-zinc-950/50 rounded-lg border border-zinc-850">
          <div className="flex justify-between mb-2">
            <span className="text-xs font-bold uppercase text-zinc-400">Food Cost %</span>
            <span className={`text-xs font-black ${foodCostPercent > targetFoodCostPercent ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {foodCostPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${foodCostPercent > targetFoodCostPercent ? 'bg-red-500' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(foodCostPercent, 100)}%` }} 
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">
            Target Cost: ${targetCost.toFixed(2)} ({targetFoodCostPercent}%)
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecipeCostSummary;
