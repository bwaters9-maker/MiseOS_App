import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

interface KPICardProps {
  label: string;
  value: string | number;
}

const KPICard: React.FC<KPICardProps> = ({ label, value }) => (
  <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-5 shadow-lg">
    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">{label}</span>
    <span className="text-3xl font-mono font-black text-zinc-100 block mt-1 tracking-tighter">{value}</span>
  </div>
);

export const MetricsHUD: React.FC = () => {
  const [ingredientCount, setIngredientCount] = useState<number>(0);
  const [recipeCount, setRecipeCount] = useState<number>(0);
  const [totalSpend, setTotalSpend] = useState<number>(0);

  useEffect(() => {
    // Listener for ingredients collection
    const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      setIngredientCount(snapshot.size);
      
      // Calculate total spend from inventory items
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Support both local schema (costPerUnit) and price fallback
        const price = data.costPerUnit ?? data.price ?? 0;
        const quantity = data.quantity ?? 0;
        total += (price * quantity);
      });
      setTotalSpend(total);
    });

    // Listener for recipes collection
    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      setRecipeCount(snapshot.size);
    });

    return () => {
      unsubIngredients();
      unsubRecipes();
    };
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard label="Total Ingredients" value={ingredientCount} />
      <KPICard label="Total Recipes" value={recipeCount} />
      <KPICard label="Total Current Spend" value={`$${totalSpend.toFixed(2)}`} />
      <KPICard label="Target Food Cost %" value="30%" />
    </div>
  );
};
