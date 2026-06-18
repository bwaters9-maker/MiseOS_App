import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot, query, where, limit, addDoc, serverTimestamp, getDocs, doc } from 'firebase/firestore';
import { Ingredient, Recipe, PrepStation } from '../../types';
import { Plus, X, FileText, Save, AlertTriangle } from 'lucide-react';

interface RecipeIngredient extends Partial<Ingredient> {
  id: string; // id is always required
  recipeQuantity: number;
  isSubRecipe?: boolean;
  isCostMissing?: boolean;
}

export const RecipeBuilder: React.FC = () => {
  console.log("RecipeBuilder mounting...");
  const [recipeName, setRecipeName] = useState('');
  const [yieldPortion, setYieldPortion] = useState(1);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [station, setStation] = useState<PrepStation>('Sauté');
  
  // Autocomplete state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Generated output state
  const [generatedProtocol, setGeneratedProtocol] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [totalCost, setTotalCost] = useState(0);

  // Firestore listener for autocomplete search
  useEffect(() => {
    const fetchResults = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      const ingredientsQuery = query(
        collection(db, 'ingredients'),
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(3)
      );
      const recipesQuery = query(
        collection(db, 'recipes'),
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(3)
      );

      const [ingredientsSnapshot, recipesSnapshot] = await Promise.all([
        getDocs(ingredientsQuery),
        getDocs(recipesQuery),
      ]);

      const ingredientResults = ingredientsSnapshot.docs.map(doc => ({ ...(doc.data() as Ingredient), id: doc.id, type: 'ingredient' }));
      const recipeResults = recipesSnapshot.docs.map(doc => ({ ...(doc.data() as Recipe), id: doc.id, type: 'recipe' }));

      setSearchResults([...ingredientResults, ...recipeResults] as (Ingredient & { type: string })[]);
    };

    const debounceTimeout = setTimeout(() => fetchResults(), 200);
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);

  const addIngredient = (ingredient: Ingredient & { type?: string }) => {
    // Add a flag if costPerUnit is missing for visual feedback
    const newIngredient: RecipeIngredient = { ...ingredient, recipeQuantity: 1, isSubRecipe: ingredient.type === 'recipe' };
    if (!newIngredient.isSubRecipe && (newIngredient.costPerUnit === undefined || newIngredient.costPerUnit <= 0)) {
      newIngredient.isCostMissing = true;
    }
    if (!recipeIngredients.find(i => i.id === newIngredient.id)) {
      setRecipeIngredients(prev => [...prev, newIngredient]);
    }
    setSearchTerm('');
    setSearchResults([]);
    setIsSearchFocused(false);
  };
  
  const removeIngredient = (id: string) => {
    setRecipeIngredients(prev => prev.filter(i => i.id !== id));
  };
  
  const updateIngredientQuantity = (id: string, quantity: number) => {
    setRecipeIngredients(prev =>
      prev.map(i => (i.id === id ? { ...i, recipeQuantity: quantity } : i))
    );
  };

  useEffect(() => {
    const calculateTotalCost = async () => {
      console.log('[Dry-Run] Recalculating total cost...');
      let sum = 0;
      const missingCostIds = new Set<string>();

      for (const ing of recipeIngredients) {
        if (ing.isSubRecipe) {
          const subRecipeDoc = await getDoc(doc(db, 'recipes', ing.id));
          if (subRecipeDoc.exists()) {
            const subRecipe = subRecipeDoc.data() as Recipe;
            if (subRecipe.totalCost !== undefined && subRecipe.targetCovers > 0) {
              const costPerBasePortion = subRecipe.totalCost / subRecipe.targetCovers;
              const contribution = costPerBasePortion * ing.recipeQuantity;
              sum += contribution;
              console.log(`[Dry-Run] Sub-Recipe Cost: Calculating cost for sub-recipe "${ing.name}" (ID: ${ing.id}). Cost per base portion: $${costPerBasePortion.toFixed(2)}. Quantity: ${ing.recipeQuantity}. Contribution: $${contribution.toFixed(2)}`);
            } else {
              missingCostIds.add(ing.id);
              console.warn(`[Dry-Run] Sub-recipe "${ing.name}" (ID: ${ing.id}) has invalid costing data.`);
            }
          } else {
            missingCostIds.add(ing.id);
            console.warn(`[Dry-Run] Sub-recipe "${ing.name}" (ID: ${ing.id}) not found. This will be flagged as missing cost.`);
          }
        } else {
          if (ing.costPerUnit === undefined || ing.costPerUnit <= 0) {
            missingCostIds.add(ing.id);
          } else {
            const contribution = (ing.costPerUnit ?? 0) * ing.recipeQuantity;
            sum += contribution;
            console.log(`[Dry-Run] Ingredient Cost: Calculating cost for ingredient "${ing.name}". Unit Cost: $${(ing.costPerUnit ?? 0).toFixed(2)}. Quantity: ${ing.recipeQuantity}. Contribution: $${contribution.toFixed(2)}`);
          }
        }
      }
      setTotalCost(sum);
      console.log(`[Dry-Run] Total Recipe Cost Calculated: $${sum.toFixed(2)}`);

      // Update isCostMissing flags for UI feedback
      setRecipeIngredients(prev =>
        prev.map(ing => ({
          ...ing,
          isCostMissing: missingCostIds.has(ing.id),
        }))
      );
    };

    calculateTotalCost();
  }, [recipeIngredients]);

  const costPerPortion = useMemo(() => {
    return yieldPortion > 0 ? totalCost / yieldPortion : 0;
  }, [totalCost, yieldPortion]);

  const generateProtocol = () => {
    let protocol = `RECIPE PROTOCOL: ${recipeName.toUpperCase()}
`;
    protocol += `==================================================
`;
    protocol += `YIELD: ${yieldPortion} Portions
`;
    protocol += `TOTAL COST: $${totalCost.toFixed(2)}
`;
    protocol += `COST PER PORTION: $${costPerPortion.toFixed(2)}
`;
    protocol += `--------------------------------------------------
`;
    protocol += `INGREDIENTS:

`;

    recipeIngredients.forEach(ing => {
      const cost = (ing.costPerUnit ?? 0) * (ing.recipeQuantity ?? 0);
      protocol += `- ${ing.name}: ${ing.recipeQuantity} ${ing.unit} (@ $${cost.toFixed(2)})
`;
    });

    protocol += `
--------------------------------------------------
`;
    protocol += `GENERATED ON: ${new Date().toLocaleString()}
`;
    
    setGeneratedProtocol(protocol);
  };

  const saveRecipe = async () => {
    // Prevent saving if any ingredient has a missing cost
    if (recipeIngredients.some(ing => ing.isCostMissing)) {
      alert("Cannot save recipe: Some ingredients have missing cost data. Please update them first.");
      return;
    }
    if (!recipeName.trim() || recipeIngredients.length === 0) return;
    setSaveStatus('saving');

    try {
      // Shape the data to conform to the strict Recipe interface and firestore.rules
      const customId = `recipe-${Date.now()}`;
      await addDoc(collection(db, 'recipes'), {
        id: customId,
        name: recipeName.trim(),
        originalCovers: 1,
        targetCovers: yieldPortion,
        station: station, // Use state
        totalCost: totalCost, // Save calculated cost
        ingredients: recipeIngredients.map(ing => ({
          name: ing.name,
          quantity: ing.recipeQuantity,
          unit: ing.unit,
          costPerUnit: ing.costPerUnit ?? 0,
          purchaseUnit: ing.purchaseUnit ?? 'kg',
          yieldPercent: ing.yieldPercent ?? 100,
          isSubRecipe: ing.isSubRecipe ?? false,
        })),
        steps: generatedProtocol ? [generatedProtocol] : ['No method configured.'],
        salePrice: parseFloat((costPerPortion * 3.3).toFixed(2)), // standard 30% target food cost multiplier
        createdAt: serverTimestamp()
      });

      // Clear form
      setRecipeName('');
      setYieldPortion(1);
      setRecipeIngredients([]);
      setGeneratedProtocol(null);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error("Save failed", e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-6 font-mono selection:bg-emerald-800">
      <h2 className="text-lg font-extrabold tracking-wider uppercase text-white">Recipe Builder</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input type="text" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Recipe Name" className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-sm" />
        <input type="number" value={yieldPortion} onChange={(e) => setYieldPortion(parseInt(e.target.value, 10) || 1)} placeholder="Yield/Portion" className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-sm" min={1} />
        <select value={station} onChange={(e) => setStation(e.target.value as PrepStation)} className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-sm">
            <option value="Sauté">Sauté</option>
            <option value="Grill">Grill</option>
            <option value="Garde Manger">Garde Manger</option>
            <option value="Pastry">Pastry</option>
        </select>
      </div>

      {/* Ingredient List */}
      <div className="space-y-2">
        {recipeIngredients.map(ing => (
          <div key={ing.id} className={`flex items-center gap-2 p-2 bg-zinc-900 rounded-lg border ${ing.isCostMissing ? 'border-red-500' : 'border-zinc-800'}`}>
            {ing.isCostMissing && (
              <div title="Cost data missing or zero. Update ingredient in master list." className="text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}

            <span className="flex-1 text-sm font-bold text-zinc-200">{ing.name}</span>
            <input type="number" value={ing.recipeQuantity} onChange={(e) => ing.id && updateIngredientQuantity(ing.id, parseFloat(e.target.value) || 0)} className="w-20 bg-zinc-950 border border-zinc-700 p-2 rounded-md text-xs text-center" />
            <span className="text-xs text-zinc-500 w-12">{ing.unit}</span>
            <span className="text-xs text-blue-400 font-mono w-24 text-right">${((ing.costPerUnit ?? 0) * ing.recipeQuantity).toFixed(2)}</span>
            <button onClick={() => ing.id && removeIngredient(ing.id)} className="p-1 text-zinc-500 hover:text-red-400"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {/* Add Ingredient Autocomplete */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            placeholder="+ Add Ingredient via Search..."
            className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-sm"
          />
        </div>
        {isSearchFocused && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((result: Ingredient & { type?: string }) => (
              <div key={result.id} onClick={() => addIngredient(result)} className="flex justify-between items-center p-3 text-sm text-zinc-300 hover:bg-emerald-900/40 cursor-pointer">
                <span>{result.name}</span>
                {result.type === 'recipe' && <span className="text-[9px] font-bold uppercase bg-purple-900/50 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">Sub-Recipe</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-zinc-900/60 gap-4">
        <div>
          {saveStatus === 'saving' && <span className="text-xs text-zinc-500 uppercase tracking-widest animate-pulse">Saving recipe...</span>}
          {saveStatus === 'success' && <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest animate-pulse">✓ Recipe saved to Pass!</span>}
          {saveStatus === 'error' && <span className="text-xs text-red-500 font-bold uppercase tracking-widest animate-pulse">✗ Save failed! check rules.</span>}
        </div>
        
        <div className="flex gap-2">
          <button onClick={generateProtocol} className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-sm uppercase font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
            <FileText className="w-4 h-4" /> Protocol
          </button>
          <button onClick={saveRecipe} disabled={saveStatus === 'saving' || !recipeName.trim() || recipeIngredients.length === 0} className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 disabled:opacity-40 disabled:hover:bg-emerald-700 text-white text-sm uppercase font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-md">
            <Save className="w-4 h-4" /> Save Recipe
          </button>
        </div>
      </div>

      {generatedProtocol && (
        <div className="pt-4 border-t border-zinc-900/60">
            <h3 className="text-sm font-bold uppercase text-zinc-400 mb-2">Generated Protocol</h3>
            <pre className="bg-zinc-950 p-4 rounded-lg text-xs text-zinc-300 whitespace-pre-wrap">{generatedProtocol}</pre>
        </div>
      )}
    </div>
  );
};
