export default function RecipeCostSummary({ recipe }) {
  const targetCost = (recipe.menu_price || 0) * (recipe.target_food_cost_percent / 100 || 0.3);
  
  return (
    <div className="mise-card space-y-6">
      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Financial Matrix</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total Cost</span>
          <span className="text-lg font-black text-[var(--primary)]">${(recipe.total_cost || 0).toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Cost/Portion</span>
          <span className="text-lg font-black text-[var(--primary)]">${(recipe.cost_per_portion || 0).toFixed(2)}</span>
        </div>

        <div className="p-4 bg-[var(--row)] rounded-lg border border-[var(--border)]">
          <div className="flex justify-between mb-2">
            <span className="text-xs font-bold uppercase">Food Cost %</span>
            <span className={`text-xs font-black ${recipe.food_cost_percent > recipe.target_food_cost_percent ? 'text-red-500' : 'text-[var(--accent)]'}`}>
              {recipe.food_cost_percent?.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--accent)]" 
              style={{ width: `${Math.min(recipe.food_cost_percent || 0, 100)}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}