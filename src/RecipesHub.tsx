import React, { Suspense, useEffect, useState } from 'react';
import { ChefHat, UtensilsCrossed, Layers, Sparkles } from 'lucide-react';
import Recipes from './Recipes';
import Menu from './Menu';
import RecipeCollections from './RecipeCollections';

import type { UnitSystem } from './lib/units';
import type { MenuTemplate } from './types';
// Development (formerly the Test Kitchen nav tab) stays lazy — it pulls in the
// trends rail, full-report drawer, Sous chat, and the Recipe Build panel, none
// of which the Recipe Builder / Menu / Collections sub-tabs need.
const DevelopmentWorkspace = React.lazy(() => import('./TestKitchenHub'));


interface RecipesHubProps {
  unitSystem?: UnitSystem;
  targetFcPercent?: number;
  selectedRecipeId?: string | null;
  setSelectedRecipeId?: (id: string | null) => void;
  menuTemplate?: MenuTemplate;
  setMenuTemplate?: (t: MenuTemplate) => void;
  onOpenRecipe?: (recipeId: string) => void;
}

type RecipesSubTab = 'recipes' | 'menu' | 'collections' | 'development';

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
          <button onClick={() => setActiveSubTab('collections')} className={tabBtnClass(activeSubTab === 'collections')}>
            <Layers className="w-3.5 h-3.5" /> Collections
          </button>
          <button onClick={() => setActiveSubTab('development')} className={tabBtnClass(activeSubTab === 'development')}>
            <Sparkles className="w-3.5 h-3.5" /> Development
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
      {activeSubTab === 'collections' && <RecipeCollections />}
      {activeSubTab === 'development' && (
        <Suspense fallback={<div className="p-12 text-center text-sm text-slate">Loading...</div>}>
          <DevelopmentWorkspace
            unitSystem={props.unitSystem ?? 'imperial'}
            onOpenRecipe={props.onOpenRecipe ?? (() => {})}
          />
        </Suspense>
      )}
    </div>
  );
}
