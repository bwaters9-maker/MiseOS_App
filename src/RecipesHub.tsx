import React, { useEffect, useState } from 'react';
import { ChefHat, UtensilsCrossed } from 'lucide-react';
import Recipes from './Recipes';
import Menu from './Menu';
import type { UnitSystem } from './lib/units';
import type { MenuTemplate } from './types';

interface RecipesHubProps {
  unitSystem?: UnitSystem;
  targetFcPercent?: number;
  selectedRecipeId?: string | null;
  setSelectedRecipeId?: (id: string | null) => void;
  menuTemplate?: MenuTemplate;
  setMenuTemplate?: (t: MenuTemplate) => void;
  onOpenRecipe?: (recipeId: string) => void;
}

type RecipesSubTab = 'recipes' | 'menu';

const TAB_BTN = 'px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-colors flex items-center gap-2';
const tabBtnClass = (active: boolean) =>
  `${TAB_BTN} ${active
    ? 'bg-emerald-700 text-white border-emerald-600'
    : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700/50 hover:text-zinc-200'}`;

export default function RecipesHub(props: RecipesHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<RecipesSubTab>('recipes');

  // Jumping to a specific recipe (e.g. from the Menu row click, or Events &
  // Clients' tentative menu) must land on the Recipe Builder sub-tab even
  // if the chef last left this tab showing Menu or Features.
  useEffect(() => {
    if (props.selectedRecipeId) setActiveSubTab('recipes');
  }, [props.selectedRecipeId]);

  return (
    <div>
      <div className="max-w-[1597px] mx-auto px-[21px] pt-[21px] flex justify-end">
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveSubTab('recipes')} className={tabBtnClass(activeSubTab === 'recipes')}>
            <ChefHat className="w-3.5 h-3.5" /> Recipe Builder
          </button>
          <button onClick={() => setActiveSubTab('menu')} className={tabBtnClass(activeSubTab === 'menu')}>
            <UtensilsCrossed className="w-3.5 h-3.5" /> Menu
          </button>
        </div>
      </div>

      {activeSubTab === 'recipes' && (
        <Recipes
          unitSystem={props.unitSystem}
          targetFcPercent={props.targetFcPercent}
          selectedRecipeId={props.selectedRecipeId}
          setSelectedRecipeId={props.setSelectedRecipeId}
          onViewMenu={() => setActiveSubTab('menu')}
        />
      )}
      {activeSubTab === 'menu' && (
        <Menu
          targetFcPercent={props.targetFcPercent}
          onOpenRecipe={props.onOpenRecipe}
          menuTemplate={props.menuTemplate}
          setMenuTemplate={props.setMenuTemplate}
        />
      )}
    </div>
  );
}
