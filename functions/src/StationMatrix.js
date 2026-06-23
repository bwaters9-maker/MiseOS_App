import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, collectionGroup } from 'firebase/firestore';

const StationMatrix = () => {
  const [stationData, setStationData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStationData = async () => {
      try {
        const db = getFirestore();

        // 1. Fetch all recipes and ingredients in parallel for efficiency.
        const [recipesSnapshot, ingredientsSnapshot] = await Promise.all([
          getDocs(collection(db, 'recipes')),
          getDocs(collection(db, 'ingredients'))
        ]);

        const recipes = {};
        recipesSnapshot.forEach(doc => {
          recipes[doc.id] = { id: doc.id, ...doc.data(), components: [] };
        });

        const ingredients = {};
        ingredientsSnapshot.forEach(doc => {
          ingredients[doc.id] = { id: doc.id, ...doc.data() };
        });

        // 2. Fetch all recipeComponents using a collection group query.
        const componentsSnapshot = await getDocs(collectionGroup(db, 'recipeComponents'));

        componentsSnapshot.forEach(doc => {
          const component = doc.data();
          const recipeId = doc.ref.parent.parent.id;

          if (recipes[recipeId] && component.ingredient_id) {
            const ingredientId = component.ingredient_id.id; // Assuming ingredient_id is a reference
            recipes[recipeId].components.push({
              ...component,
              ingredientName: ingredients[ingredientId]?.name || 'Unknown Ingredient',
              unit: ingredients[ingredientId]?.unit || 'unit'
            });
          }
        });

        // 3. Group the fully-hydrated recipes by their assigned station.
        const groupedByStation = {};
        Object.values(recipes).forEach(recipe => {
          const stationName = recipe.station || 'Unassigned';
          if (!groupedByStation[stationName]) {
            groupedByStation[stationName] = [];
          }
          groupedByStation[stationName].push(recipe);
        });

        setStationData(groupedByStation);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStationData();
  }, []);

  return (
    <div className="widget station-matrix bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md">
      <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800/80 pb-3 mb-4">Station Matrix</h3>
      {loading && <p className="text-xs text-zinc-500">Loading station data...</p>}
      {error && <p className="text-xs text-red-500">Error: {error}</p>}
      {!loading && !error && (
        <div className="space-y-4">
          {Object.keys(stationData).sort().map(stationName => (
            <div key={stationName} className="station-card bg-zinc-800/40 p-4 rounded-lg">
              <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">{stationName}</h4>
              <div className="mt-3 space-y-3">
                {stationData[stationName].map(recipe => (
                  <div key={recipe.id} className="recipe-task bg-zinc-900/50 p-3 rounded-md border border-zinc-700/50">
                    <h5 className="text-xs font-semibold text-zinc-300">{recipe.title}</h5>
                    <ul className="pl-4 mt-2 space-y-1 list-disc list-inside text-xs text-zinc-400">
                      {recipe.components.length > 0 ? recipe.components.map((component, index) => (
                        <li key={index}>
                          {component.quantity} {component.unit} - {component.ingredientName}
                        </li>
                      )) : <li className="italic text-zinc-500">No components listed.</li>}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-zinc-600 mt-4">Note: Manual task prioritization can be added with a drag-and-drop interface in a future iteration.</p>
    </div>
  );
};

export default StationMatrix;