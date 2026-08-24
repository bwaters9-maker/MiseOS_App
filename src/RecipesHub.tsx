import React, { Suspense, useEffect, useState } from 'react';
import { ChefHat, UtensilsCrossed, Layers, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
  /** Pending sub-tab request from another view (e.g. the Dashboard's
   * trends strip asking for Development); consumed once, then cleared. */
  recipesSubTab?: string | null;
  setRecipesSubTab?: (t: string | null) => void;
}

type RecipesSubTab = 'recipes' | 'menu' | 'collections' | 'development';

/** Compact segmented control: one connected bar, active segment filled teal,
 * inactive segments quiet. Deliberately lighter than the page's own headings so
 * it reads as a switch rather than as content. */
const SEG_BASE =
  'px-[11px] py-[5px] text-[11px] font-display font-semibold flex items-center gap-[5px] border-r border-line last:border-r-0 transition-colors duration-[144ms]';
const segClass = (active: boolean) =>
  `${SEG_BASE} ${active
    ? 'bg-teal text-cream'
    : 'bg-surface text-slate hover:text-navy'}`;

const SUB_TABS: { key: RecipesSubTab; label: string; Icon: LucideIcon }[] = [
  { key: 'recipes', label: 'Recipe Builder', Icon: ChefHat },
  { key: 'menu', label: 'Menu', Icon: UtensilsCrossed },
  { key: 'collections', label: 'Collections', Icon: Layers },
  { key: 'development', label: 'Development', Icon: Sparkles },
];

export default function RecipesHub(props: RecipesHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<RecipesSubTab>('recipes');

  // Jumping to a specific recipe (e.g. from the Menu row click, or Events &
  // Clients' tentative menu) must land on the Recipe Builder sub-tab even
  // if the chef last left this tab showing Menu or Features.
  useEffect(() => {
    if (props.selectedRecipeId) setActiveSubTab('recipes');
  }, [props.selectedRecipeId]);

  useEffect(() => {
    const requested = props.recipesSubTab;
    if (!requested) return;
    if (requested === 'recipes' || requested === 'menu' || requested === 'collections' || requested === 'development') {
      setActiveSubTab(requested);
    }
    props.setRecipesSubTab?.(null);
  }, [props.recipesSubTab]);

  return (
    <div>
      <div className="max-w-[1597px] mx-auto px-[21px] pt-[21px] flex justify-end">
        <div className="inline-flex items-stretch rounded-[8px] border border-line overflow-hidden">
          {SUB_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSubTab(key)}
              aria-pressed={activeSubTab === key}
              className={segClass(activeSubTab === key)}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
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
