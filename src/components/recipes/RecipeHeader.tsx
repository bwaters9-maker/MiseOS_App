import React from 'react';
import { Recipe } from '@/types';

interface RecipeHeaderProps {
  recipe: Recipe;
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({ recipe }) => {
  return (
    <div className="border-b border-zinc-800 pb-4 mb-6">
      <h2 className="text-xl font-bold text-white uppercase tracking-tight">{recipe.name}</h2>
      <p className="text-xs text-zinc-400 mt-0.5">STATION: <span className="text-emerald-400 font-bold">{recipe.station}</span></p>
    </div>
  );
};

export default RecipeHeader;
