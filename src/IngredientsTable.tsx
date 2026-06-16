import React from 'react';
import { Trash2, Edit2, PlusCircle, Minus, Save } from 'lucide-react';
import { useKitchenState } from '@/hooks/useKitchenState';
import { Ingredient } from '@/types';

export default function IngredientsTable() {
  const { recipes, setRecipes } = useKitchenState();

  // Aggregate all unique ingredients from all recipes
  const allIngredients = recipes.reduce((acc: Ingredient[], recipe) => {
    recipe.ingredients.forEach(ing => {
      if (!acc.find(a => a.name.toLowerCase() === ing.name.toLowerCase())) {
        acc.push(ing);
      }
    });
    return acc;
  }, []);

  const handleQuantityChange = (ingredientName: string, newQuantity: number) => {
    const updatedRecipes = recipes.map(recipe => ({
      ...recipe,
      ingredients: recipe.ingredients.map(ing => 
        ing.name.toLowerCase() === ingredientName.toLowerCase()
          ? { ...ing, quantity: newQuantity }
          : ing
      ),
    }));
    setRecipes(updatedRecipes);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-mono text-zinc-100 selection:bg-emerald-800">
      <div className="border-b border-zinc-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-wider uppercase">Master Ingredients</h1>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">Live inventory levels, cost breakups, and yield indicators</p>
        </div>
        <button className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-zinc-100 text-xs uppercase px-4 py-2.5 rounded-lg font-bold tracking-wider flex items-center gap-2 transition-all shadow-md">
          <PlusCircle className="w-4 h-4" /> Add Ingredient
        </button>
      </div>

      <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/60 shadow-xl overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs min-w-[900px]">
          <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-widest text-[9px] border-b border-zinc-900">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4 text-center">On-Hand Qty</th>
              <th className="p-4">Cost/Unit</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            {allIngredients.map((ing, i) => (
              <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                <td className="p-4 font-bold text-zinc-100 whitespace-nowrap">{ing.name}</td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleQuantityChange(ing.name, ing.quantity - 1)} className="p-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={ing.quantity}
                      onChange={(e) => handleQuantityChange(ing.name, parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 bg-zinc-900 border border-zinc-700 text-center font-mono rounded-md"
                    />
                    <button onClick={() => handleQuantityChange(ing.name, ing.quantity + 1)} className="p-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors">
                      <PlusCircle className="w-3 h-3" />
                    </button>
                     <span className="w-12 text-left text-sm text-zinc-400 pl-2">{ing.unit}</span>
                  </div>
                </td>
                <td className="p-4 whitespace-nowrap font-bold text-blue-400">
                  ${ing.costPerUnit.toFixed(4)}
                  <span className="text-zinc-600 font-normal"> / {ing.purchaseUnit}</span>
                </td>
                <td className="p-4">
                  <div className="flex justify-center gap-3">
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
    </div>
  );
}