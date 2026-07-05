import React, { useMemo, useState } from 'react';
import { UtensilsCrossed, AlertTriangle, ChevronRight, Eye } from 'lucide-react';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useRecipeCategories } from './hooks/useRecipeCategories';
import { costPerPortion, fcPercent, fcColor, recipeUsesEstimatedPricing } from './lib/costEngine';
import GuestMenuPreview, { type GuestMenuGroup } from './components/GuestMenuPreview';
import type { Ingredient, Recipe, MenuTemplate } from './types';

const STAT_CARD = 'bg-zinc-950 border border-zinc-800 rounded-[13px] p-[13px]';
const STAT_LABEL = 'text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';

interface MenuRow {
  recipe: Recipe;
  perPortion: number;
  fc: number | null;
  error: string | null;
  usesEstimate: boolean;
}

interface MenuGroup {
  key: string;
  label: string;
  rows: MenuRow[];
}

interface MenuProps {
  targetFcPercent?: number;
  onOpenRecipe?: (recipeId: string) => void;
  menuTemplate?: MenuTemplate;
  setMenuTemplate?: (t: MenuTemplate) => void;
}

const Menu: React.FC<MenuProps> = ({ targetFcPercent = 30, onOpenRecipe, menuTemplate = 'clean', setMenuTemplate = () => {} }) => {
  const allRecipes = (useKitchenSelector((s: any) => s.recipes) as Recipe[]) ?? [];
  const allIngredients = (useKitchenSelector((s: any) => s.ingredients) as Ingredient[]) ?? [];
  const { categories } = useRecipeCategories();
  const [previewMode, setPreviewMode] = useState(false);

  const menuRecipes = useMemo(() => allRecipes.filter(r => r.recipeType === 'menu'), [allRecipes]);

  const rows = useMemo<MenuRow[]>(() => menuRecipes.map(recipe => {
    try {
      const perPortion = costPerPortion(recipe, allIngredients, allRecipes);
      const hasPrice = typeof recipe.menuPrice === 'number' && recipe.menuPrice > 0;
      const fc = hasPrice ? fcPercent(perPortion, recipe.menuPrice as number) : null;
      const usesEstimate = recipeUsesEstimatedPricing(recipe, allIngredients, allRecipes);
      return { recipe, perPortion, fc, error: null, usesEstimate };
    } catch (e: any) {
      return { recipe, perPortion: 0, fc: null, error: e.message as string, usesEstimate: false };
    }
  }), [menuRecipes, allIngredients, allRecipes]);

  const groups = useMemo<MenuGroup[]>(() => {
    const list: MenuGroup[] = [];
    categories.forEach(c => {
      const groupRows = rows
        .filter(r => r.recipe.categoryId === c.id)
        .sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));
      if (groupRows.length > 0) list.push({ key: c.id, label: c.name, rows: groupRows });
    });
    const uncategorized = rows
      .filter(r => !categories.some(c => c.id === r.recipe.categoryId))
      .sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));
    if (uncategorized.length > 0) list.push({ key: '__uncategorized__', label: 'Uncategorized', rows: uncategorized });
    return list;
  }, [categories, rows]);

  const guestGroups = useMemo<GuestMenuGroup[]>(() => groups
    .map(g => ({
      key: g.key,
      label: g.label,
      recipes: g.rows
        .filter(r => typeof r.recipe.menuPrice === 'number' && r.recipe.menuPrice > 0)
        .map(r => r.recipe),
    }))
    .filter(g => g.recipes.length > 0), [groups]);

  const pricedRows = rows.filter(r => r.fc != null);
  const avgFc = pricedRows.length > 0
    ? pricedRows.reduce((sum, r) => sum + (r.fc as number), 0) / pricedRows.length
    : null;
  const missingPriceCount = rows.filter(r => !(typeof r.recipe.menuPrice === 'number' && r.recipe.menuPrice > 0)).length;
  const estimateCount = rows.filter(r => r.usesEstimate).length;

  if (previewMode) {
    return (
      <div className="max-w-[1597px] mx-auto px-[21px] py-[34px] font-mono">
        <GuestMenuPreview
          groups={guestGroups}
          template={menuTemplate}
          onTemplateChange={setMenuTemplate}
          onExit={() => setPreviewMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1597px] mx-auto px-[21px] py-[34px] font-mono">
      <div className="mb-[34px] flex items-start justify-between gap-[13px]">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
            <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
            Menu
          </h1>
          <p className="text-xs text-zinc-500 mt-[5px]">
            Read-only operational view — edit recipes in the Recipe Builder.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreviewMode(true)}
          className="shrink-0 flex items-center gap-[8px] px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-300 hover:text-emerald-400 hover:border-emerald-700 transition-colors duration-[144ms]"
        >
          <Eye className="w-3.5 h-3.5" />
          Guest Preview
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-[13px] mb-[34px]">
        <div className={STAT_CARD}>
          <p className={STAT_LABEL}>Menu Items</p>
          <p className="text-lg font-black text-white tabular-nums">{rows.length}</p>
        </div>
        <div className={STAT_CARD}>
          <p className={STAT_LABEL}>Avg Food Cost %</p>
          <p className={`text-lg font-black tabular-nums ${avgFc != null ? fcColor(avgFc, targetFcPercent) : 'text-zinc-600'}`}>
            {avgFc != null ? `${avgFc.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className={STAT_CARD}>
          <p className={STAT_LABEL}>Missing Menu Price</p>
          <p className={`text-lg font-black tabular-nums ${missingPriceCount > 0 ? 'text-amber-400' : 'text-white'}`}>
            {missingPriceCount}
          </p>
        </div>
        <div className={STAT_CARD}>
          <p className={STAT_LABEL}>Estimate-Based Costs</p>
          <p className={`text-lg font-black tabular-nums ${estimateCount > 0 ? 'text-amber-400' : 'text-white'}`}>
            {estimateCount}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[55px] text-center">
          <UtensilsCrossed className="w-8 h-8 text-zinc-700 mx-auto mb-[13px]" />
          <p className="text-xs text-zinc-500">No menu recipes yet. Mark recipes as Menu type in the Recipe Builder.</p>
        </div>
      ) : (
        <div className="space-y-[21px]">
          <div className="hidden md:flex items-center gap-[13px] px-[21px] text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            <span className="flex-1">Name</span>
            <span className="w-[89px] text-right">Price</span>
            <span className="w-[89px] text-right">Cost / Portion</span>
            <span className="w-[55px] text-right">FC%</span>
            <span className="w-[21px]" />
          </div>

          {groups.map(group => (
            <div key={group.key} className="space-y-[8px]">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 px-[21px]">{group.label}</p>
              <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] overflow-hidden">
                {group.rows.map((row, idx) => (
                  <button
                    key={row.recipe.id}
                    type="button"
                    onClick={() => onOpenRecipe?.(row.recipe.id)}
                    className={`w-full flex items-center gap-[13px] px-[21px] py-[13px] text-left hover:bg-zinc-900/40 transition-colors duration-[144ms] ${idx > 0 ? 'border-t border-zinc-900' : ''}`}
                  >
                    <span className="flex-1 min-w-0 text-sm font-bold text-zinc-100 truncate">{row.recipe.name}</span>

                    <span className="w-[89px] text-right text-xs text-zinc-300 tabular-nums shrink-0">
                      {typeof row.recipe.menuPrice === 'number' && row.recipe.menuPrice > 0
                        ? `$${row.recipe.menuPrice.toFixed(2)}`
                        : '—'}
                    </span>

                    <span className="w-[89px] text-right text-xs text-zinc-400 tabular-nums shrink-0 flex items-center justify-end gap-[3px]">
                      {row.error ? (
                        <span title={row.error}>
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        </span>
                      ) : (
                        <>
                          ${row.perPortion.toFixed(2)}
                          {row.usesEstimate && (
                            <span title="Cost includes estimated ingredient prices." className="text-amber-500 font-black">~</span>
                          )}
                        </>
                      )}
                    </span>

                    <span className={`w-[55px] text-right text-xs font-black tabular-nums shrink-0 ${row.fc != null ? fcColor(row.fc, targetFcPercent) : 'text-zinc-600'}`}>
                      {row.fc != null ? `${row.fc.toFixed(1)}%` : '—'}
                    </span>

                    <ChevronRight className="w-[13px] h-[13px] text-zinc-700 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Menu;
