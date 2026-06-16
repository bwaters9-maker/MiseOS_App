import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot, query, where, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { Ingredient, Recipe, PrepStation } from '../../types';
import { Plus, X, FileText, Save } from 'lucide-react';

interface RecipeIngredient extends Ingredient {
  recipeQuantity: number;
}

export const RecipeBuilder: React.FC = () => {
  const [recipeName, setRecipeName] = useState('');
  const [yieldPortion, setYieldPortion] = useState(1);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  
  // Autocomplete state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Generated output state
  const [generatedProtocol, setGeneratedProtocol] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Firestore listener for autocomplete search
  // useEffect(() => {
  //   if (searchTerm.trim().length < 2) {
  //     setSearchResults([]);
  //     return;
  //   }
  // 
  //   const q = query(
  //     collection(db, 'ingredients'),
  //     where('name', '>=', searchTerm),
  //     where('name', '<=', searchTerm + '\uf8ff'),
  //     limit(5)
  //   );
  // 
  //   const unsubscribe = onSnapshot(q, (snapshot) => {
  //     const results = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ingredient));
  //     setSearchResults(results);
  //   });
  // 
  //   return () => unsubscribe();
  // }, [searchTerm]);

  const addIngredient = (ingredient: Ingredient) => {
    if (!recipeIngredients.find(i => i.id === ingredient.id)) {
      setRecipeIngredients(prev => [...prev, { ...ingredient, recipeQuantity: 1 }]);
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

  const totalCost = useMemo(() => {
    return recipeIngredients.reduce((sum, ing) => {
      const price = ing.costPerUnit ?? 0;
      const quantity = ing.recipeQuantity ?? 0;
      return sum + (price * quantity);
    }, 0);
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
        station: 'Sauté' as PrepStation, // Fallback to Sauté station
        ingredients: recipeIngredients.map(ing => ({
          name: ing.name,
          quantity: ing.recipeQuantity,
          unit: ing.unit,
          costPerUnit: ing.costPerUnit ?? 0,
          purchaseUnit: ing.purchaseUnit ?? 'kg',
          yieldPercent: ing.yieldPercent ?? 100
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Recipe Name" className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-sm" />
        <input type="number" value={yieldPortion} onChange={(e) => setYieldPortion(parseInt(e.target.value, 10) || 1)} placeholder="Yield/Portion" className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-sm" min={1} />
      </div>

      {/* Ingredient List */}
      <div className="space-y-2">
        {recipeIngredients.map(ing => (
          <div key={ing.id} className="flex items-center gap-2 p-2 bg-zinc-900 rounded-lg border border-zinc-800">
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
            {searchResults.map(result => (
              <div key={result.id} onClick={() => addIngredient(result)} className="p-3 text-sm text-zinc-300 hover:bg-emerald-900/40 cursor-pointer">
                {result.name}
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
