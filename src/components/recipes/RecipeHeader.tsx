import React from 'react';
import { Recipe } from '../../database/documents';
import AllergenBadges from './allergens/AllergenBadges';
import { Clock, Users, Utensils } from 'lucide-react';

interface RecipeHeaderProps {
  recipe: Recipe;
}

const RecipeHeader: React.FC<RecipeHeaderProps> = ({ recipe }) => {
  return (
    <div className="mise-card space-y-4">
      {/* Top Row: Meta Info & Status */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="px-2 py-0.5 rounded-full bg-[var(--row)] text-[var(--muted)] text-[10px] font-black uppercase tracking-widest border border-[var(--border)]">
            {recipe.menuSection || 'Uncategorized'}
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--primary)]">
            {recipe.name}
          </h1>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${
            recipe.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {recipe.status || 'Draft'}
          </span>
        </div>
      </div>

      {/* Grid: Station & Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <div className="flex items-center gap-2">
          <Utensils size={16} className="text-[var(--muted)]" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Station</p>
            <p className="text-sm font-bold">{recipe.station}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--muted)]" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Time</p>
            <p className="text-sm font-bold">{recipe.timeMinutes || '--'} Min</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Users size={16} className="text-[var(--muted)]" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Yield</p>
            <p className="text-sm font-bold">{recipe.targetCovers} Covers</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-l border-[var(--border)] pl-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Target FC</p>
            <p className="text-sm font-black text-green-600">{recipe.targetFoodCostPercentage}%</p>
          </div>
        </div>
      </div>

      {/* Safety Layer */}
      <div className="pt-2 border-t border-[var(--border)]">
        <AllergenBadges allergens={recipe.allergens} />
      </div>
    </div>
  );
};

export default RecipeHeader;