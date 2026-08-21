import React, { useState } from 'react';
import { LayoutDashboard, Users, CalendarDays, Printer, Star, Plus, X, Sprout, FlaskConical, ChevronRight } from 'lucide-react';
import { addDoc } from 'firebase/firestore';
import { rCollection } from './lib/firestorePaths';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useRestaurantId } from './components/AuthContext';
import { useStationPresets } from './hooks/useStationPresets';
import { featureFieldsFromRecipe, costPerPortion, fcPercent, fcColor, isRecipeInDevelopment } from './lib/costEngine';
import { regionForState, itemsForRegion } from './lib/seasonalData';
import { monthStatus, STATUS_LABEL } from './components/testkitchen/trendsDisplay';
import { COURSES, BLANK as BLANK_FEATURE, toDoc as featureToDoc, type FormState as FeatureFormState } from './Features';
import { todayDateKey, formatTime12h } from './utils';
import { MAX_RECIPE_VARIANTS } from './types';
import type { Employee, Shift, KitchenEvent, Client, Feature, Recipe, Ingredient, RestaurantProfile, TrendReport } from './types';

interface ChefDashboardProps {
  onNavigate?: (view: string) => void;
  onOpenRecipe?: (recipeId: string) => void;
  onOpenDevelopment?: () => void;
  targetFcPercent?: number;
}

export default function ChefDashboard({ onNavigate, onOpenRecipe, onOpenDevelopment, targetFcPercent = 30 }: ChefDashboardProps) {
  const restaurantId = useRestaurantId();
  const staff = (useKitchenSelector((s: any) => s.staff) as Employee[]) ?? [];
  const shifts = (useKitchenSelector((s: any) => s.shifts) as Shift[]) ?? [];
  const events = (useKitchenSelector((s: any) => s.events) as KitchenEvent[]) ?? [];
  const clients = (useKitchenSelector((s: any) => s.clients) as Client[]) ?? [];
  const features = (useKitchenSelector((s: any) => s.features) as Feature[]) ?? [];
  const allRecipes = (useKitchenSelector((s: any) => s.recipes) as Recipe[]) ?? [];
  const allIngredients = (useKitchenSelector((s: any) => s.ingredients) as Ingredient[]) ?? [];
  const restaurantProfile = useKitchenSelector((s: any) => s.restaurantProfile) as RestaurantProfile | null;
  const trendReport = useKitchenSelector((s: any) => s.trendReport) as TrendReport | null;
  const { presets: stationPresets } = useStationPresets();

  const todayStr = todayDateKey();
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const staffById = new Map(staff.map(e => [e.id, e]));
  const clientsById = new Map(clients.map(c => [c.id, c]));
  const menuRecipes = allRecipes.filter(r => r.recipeType === 'menu').sort((a, b) => a.name.localeCompare(b.name));

  // Trends strip — a read-only glance at what the Development workspace
  // already loads. Seasonal data is static and bundled (no fetch); the
  // viral-bridge card comes from the live trend_reports/latest doc, and is
  // simply absent until a report has been generated.
  const seasonalStage = (() => {
    const items = itemsForRegion(regionForState(restaurantProfile?.state));
    const month = new Date().getMonth() + 1;
    const rank = { prime: 0, rampUp: 1, tailOff: 2 } as const;
    return items
      .map(i => ({ name: i.name, status: monthStatus(i, month) }))
      .filter((i): i is { name: string; status: 'prime' | 'rampUp' | 'tailOff' } => i.status !== null)
      .sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name))
      .slice(0, 3);
  })();
  const bridgeCard = trendReport?.cards.find(c => c.isViralBridge);
  const showTrendsStrip = seasonalStage.length > 0 || !!bridgeCard;

  // In Development — menu recipes the chef hasn't finished yet. Costed with
  // the same engine the Recipe Builder uses; no writes, no new listeners.
  const developmentRecipes = allRecipes
    .filter(r => r.recipeType === 'menu' && isRecipeInDevelopment(r))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(r => {
      // recipeCost throws on a circular sub-recipe graph. The Recipe
      // Builder blocks creating one, but this view must not crash on a
      // recipe that somehow holds one — it shows no cost instead.
      let perPortion: number | null = null;
      try {
        perPortion = costPerPortion(r, allIngredients, allRecipes);
      } catch {
        perPortion = null;
      }
      const fc = perPortion != null && r.menuPrice ? fcPercent(perPortion, r.menuPrice) : null;
      return { recipe: r, perPortion, fc, variantCount: r.variants?.length ?? 0 };
    });

  // Read-only snapshot: filters/derives only. Add Feature below is the one
  // deliberate write exception — see CLAUDE.md.
  const todayShifts = [...shifts]
    .filter(sh => sh.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const unassignedShifts = todayShifts.filter(sh => !sh.station);

  const todayEvents = [...events]
    .filter(e => e.date === todayStr)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  // Same "tonight" rule as DailyCribSheet's Features Tonight card.
  const tonightFeatures = features.filter(f => {
    if (f.is86d) return false;
    if (f.activeFrom && todayStr < f.activeFrom) return false;
    if (f.activeTo && todayStr > f.activeTo) return false;
    return true;
  });

  const [showAddFeature, setShowAddFeature] = useState(false);
  const [addKind, setAddKind] = useState<'manual' | 'recipe'>('manual');
  const [featureForm, setFeatureForm] = useState<FeatureFormState>({ ...BLANK_FEATURE, activeFrom: todayStr, activeTo: todayStr });
  const [savingFeature, setSavingFeature] = useState(false);

  const pickRecipeForFeature = (recipeId: string) => {
    const recipe = menuRecipes.find(r => r.id === recipeId);
    if (!recipe) return;
    const fields = featureFieldsFromRecipe(recipe, allIngredients, allRecipes);
    setFeatureForm({
      ...featureForm,
      recipeId: recipe.id,
      name: fields.name,
      description: fields.description,
      price: fields.price != null ? String(fields.price) : '',
      cost: String(fields.cost),
    });
  };

  const handleAddFeature = async () => {
    if (!featureForm.name.trim() || savingFeature) return;
    setSavingFeature(true);
    try {
      await addDoc(rCollection(restaurantId, 'features'), featureToDoc(featureForm));
      setFeatureForm({ ...BLANK_FEATURE, activeFrom: todayStr, activeTo: todayStr });
      setAddKind('manual');
      setShowAddFeature(false);
    } finally {
      setSavingFeature(false);
    }
  };

  return (
    <div className="max-w-[1597px] mx-auto px-[21px] py-[34px] font-body">
      <div className="flex items-center justify-between border-b border-line pb-[21px] mb-[34px]">
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight text-navy flex items-center gap-[8px]">
            <LayoutDashboard className="w-5 h-5 text-teal" />
            Dashboard
          </h1>
          <p className="text-xs text-slate mt-[5px]">{todayLabel}</p>
        </div>
      </div>

      {/* TRENDS STRIP — informational signal, single line, never wraps */}
      {showTrendsStrip && (
        <div className="flex items-center gap-[13px] bg-saffron-soft border border-saffron/40 rounded-card px-[13px] py-[8px] mb-[21px] overflow-hidden">
          <Sprout className="w-4 h-4 text-saffron-text shrink-0" />
          <div className="flex items-center gap-[13px] min-w-0 flex-1 whitespace-nowrap overflow-hidden">
            {seasonalStage.length > 0 && (
              <span className="text-xs text-navy truncate">
                {seasonalStage.map(i => `${i.name} (${STATUS_LABEL[i.status].toLowerCase()})`).join(' · ')}
              </span>
            )}
            {bridgeCard && (
              <span className="flex items-baseline gap-[5px] min-w-0 truncate">
                <span className="text-[10px] font-bold uppercase tracking-wider text-saffron-text shrink-0">Viral Bridge</span>
                <span className="text-xs text-navy truncate">{bridgeCard.headline}</span>
              </span>
            )}
          </div>
          <button
            onClick={() => onOpenDevelopment?.()}
            className="shrink-0 flex items-center gap-[3px] text-[10px] font-bold uppercase tracking-wider text-teal hover:text-navy transition-colors duration-[144ms]"
          >
            Open Trends <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[21px] mb-[21px] items-start">
        {/* TODAY'S SCHEDULE */}
        <div className="bg-surface border border-line rounded-card p-[21px]">
          <h2 className="text-xs font-bold uppercase tracking-widest text-navy flex items-center gap-[8px] mb-[13px]">
            <Users className="w-4 h-4 text-teal" /> Today's Schedule
          </h2>
          <p className="text-xs text-slate mb-[13px]">
            {todayShifts.length === 0 ? 'No shifts scheduled today.' : `${todayShifts.length} shift${todayShifts.length !== 1 ? 's' : ''} today.`}
          </p>
          <div className="divide-y divide-line">
            {stationPresets.map(station => {
              const stationShifts = todayShifts.filter(sh => sh.station === station);
              return (
                <div key={station} className="flex items-start justify-between gap-[13px] py-[8px]">
                  <span className="text-xs font-bold text-navy shrink-0">{station}</span>
                  {stationShifts.length === 0 ? (
                    <span className="px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider bg-red-400 text-white shrink-0">
                      Uncovered
                    </span>
                  ) : (
                    <div className="flex flex-col items-end gap-[2px]">
                      {stationShifts.map(sh => (
                        <span key={sh.id} className="text-xs text-slate text-right">
                          {staffById.get(sh.staffId)?.name ?? 'Unknown'} · {formatTime12h(sh.startTime)}–{formatTime12h(sh.endTime)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {unassignedShifts.length > 0 && (
            <div className="mt-[13px] pt-[13px] border-t border-line">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">No Station Assigned</p>
              <div className="space-y-[2px]">
                {unassignedShifts.map(sh => (
                  <div key={sh.id} className="flex items-center justify-between text-xs">
                    <span className="text-navy">{staffById.get(sh.staffId)?.name ?? 'Unknown'}</span>
                    <span className="text-slate">{formatTime12h(sh.startTime)}–{formatTime12h(sh.endTime)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TODAY'S EVENTS */}
        <div className="bg-surface border border-line rounded-card p-[21px]">
          <h2 className="text-xs font-bold uppercase tracking-widest text-navy flex items-center gap-[8px] mb-[13px]">
            <CalendarDays className="w-4 h-4 text-saffron" /> Today's Events
          </h2>
          {todayEvents.length === 0 ? (
            <p className="text-xs text-slate italic">No events today.</p>
          ) : (
            <div className="divide-y divide-line">
              {todayEvents.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-[13px] py-[8px]">
                  <div className="flex items-baseline gap-[8px] min-w-0">
                    {e.time && <span className="text-xs text-slate shrink-0 tabular-nums">{formatTime12h(e.time)}</span>}
                    <span className="text-xs font-bold text-navy truncate">{e.title}</span>
                  </div>
                  {e.clientId && clientsById.get(e.clientId) && (
                    <span className="text-xs text-slate shrink-0 truncate">{clientsById.get(e.clientId)!.name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TONIGHT'S FEATURES */}
      <div className="bg-surface border border-line rounded-card p-[21px] mb-[21px]">
        <div className="flex items-center justify-between mb-[13px]">
          <h2 className="text-xs font-bold uppercase tracking-widest text-navy flex items-center gap-[8px]">
            <Star className="w-4 h-4 text-saffron" /> Tonight's Features
          </h2>
          <button
            onClick={() => onNavigate?.('features')}
            className="text-[10px] font-bold uppercase tracking-wider text-teal hover:text-navy transition-colors duration-[144ms]"
          >
            Manage Features
          </button>
        </div>
        {tonightFeatures.length === 0 ? (
          <p className="text-xs text-slate italic">No features tonight.</p>
        ) : (
          <div className="divide-y divide-line">
            {tonightFeatures.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-[13px] py-[8px]">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-navy">{f.name}</span>
                  {f.description && <p className="text-[10px] text-slate truncate">{f.description}</p>}
                </div>
                {f.price != null && <span className="text-xs text-slate tabular-nums shrink-0">${f.price.toFixed(2)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IN DEVELOPMENT */}
      {developmentRecipes.length > 0 && (
        <div className="bg-surface border border-line rounded-card p-[21px] mb-[21px]">
          <div className="flex items-center justify-between mb-[13px]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-navy flex items-center gap-[8px]">
              <FlaskConical className="w-4 h-4 text-saffron" /> In Development
            </h2>
            <button
              onClick={() => onOpenDevelopment?.()}
              className="text-[10px] font-bold uppercase tracking-wider text-teal hover:text-navy transition-colors duration-[144ms]"
            >
              Open Development
            </button>
          </div>
          <div className="divide-y divide-line">
            {developmentRecipes.map(({ recipe, perPortion, fc, variantCount }) => (
              <button
                key={recipe.id}
                onClick={() => onOpenRecipe?.(recipe.id)}
                className="w-full flex items-center justify-between gap-[13px] py-[8px] text-left hover:bg-bg-cool transition-colors duration-[144ms]"
              >
                <div className="flex items-baseline gap-[8px] min-w-0">
                  <span className="text-xs font-bold text-navy truncate">{recipe.name}</span>
                  {variantCount > 0 && (
                    <span className="text-[10px] text-slate shrink-0 font-mono">
                      v{variantCount} of {MAX_RECIPE_VARIANTS}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-[13px] shrink-0">
                  <span className="text-xs text-slate font-mono">
                    {perPortion != null ? `$${perPortion.toFixed(2)}/portion` : 'No cost'}
                  </span>
                  <span className={`text-xs font-mono ${fc != null ? fcColor(fc, targetFcPercent) : 'text-slate'}`}>
                    {fc != null ? `${fc.toFixed(1)}% FC` : 'Unpriced'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="bg-surface border border-line rounded-card p-[21px]">
        <h2 className="text-xs font-bold uppercase tracking-widest text-navy mb-[13px]">Quick Actions</h2>
        <div className="flex flex-wrap gap-[13px]">
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="flex items-center gap-[8px] px-[13px] py-[8px] bg-surface border border-line rounded-card text-xs font-bold text-navy hover:border-teal transition-colors duration-[144ms]"
          >
            <Printer className="w-3.5 h-3.5" /> View Crib Sheet
          </button>
          <button
            onClick={() => setShowAddFeature(x => !x)}
            className="flex items-center gap-[8px] px-[13px] py-[8px] bg-surface border border-line rounded-card text-xs font-bold text-navy hover:border-teal transition-colors duration-[144ms]"
          >
            {showAddFeature ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            Add Feature
          </button>
        </div>

        {showAddFeature && (
          <div className="mt-[21px] pt-[21px] border-t border-line space-y-[13px]">
            <div className="flex gap-[8px]">
              <button
                onClick={() => setAddKind('manual')}
                className={`px-[13px] py-[8px] rounded-card border text-xs font-bold transition-colors duration-[144ms] ${addKind === 'manual' ? 'bg-navy text-cream border-navy' : 'bg-surface text-slate border-line hover:text-navy'}`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setAddKind('recipe')}
                className={`px-[13px] py-[8px] rounded-card border text-xs font-bold transition-colors duration-[144ms] ${addKind === 'recipe' ? 'bg-navy text-cream border-navy' : 'bg-surface text-slate border-line hover:text-navy'}`}
              >
                From Recipe
              </button>
            </div>

            {addKind === 'recipe' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Recipe</label>
                <select
                  value={featureForm.recipeId ?? ''}
                  onChange={e => pickRecipeForFeature(e.target.value)}
                  className="w-full bg-bg-cool border border-line rounded-[8px] px-[8px] py-[5px] text-xs text-navy focus:outline-none focus:border-teal"
                >
                  <option value="">— Select a menu recipe —</option>
                  {menuRecipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <p className="text-[10px] text-slate mt-[5px]">Copies the recipe's name/description/price/cost — a one-time snapshot, editable below, not a live link.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Course</label>
                <select
                  value={featureForm.course}
                  onChange={e => setFeatureForm({ ...featureForm, course: e.target.value })}
                  className="w-full bg-bg-cool border border-line rounded-[8px] px-[8px] py-[5px] text-xs text-navy focus:outline-none focus:border-teal"
                >
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Name</label>
                <input
                  type="text"
                  value={featureForm.name}
                  onChange={e => setFeatureForm({ ...featureForm, name: e.target.value })}
                  placeholder="Feature name"
                  className="w-full bg-bg-cool border border-line rounded-[8px] px-[8px] py-[5px] text-xs text-navy focus:outline-none focus:border-teal"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Description</label>
              <input
                type="text"
                value={featureForm.description}
                onChange={e => setFeatureForm({ ...featureForm, description: e.target.value })}
                placeholder="Brief description for the crib sheet"
                className="w-full bg-bg-cool border border-line rounded-[8px] px-[8px] py-[5px] text-xs text-navy focus:outline-none focus:border-teal"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[13px]">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Price ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={featureForm.price}
                  onChange={e => setFeatureForm({ ...featureForm, price: e.target.value })}
                  className="w-full bg-bg-cool border border-line rounded-[8px] px-[8px] py-[5px] text-xs text-navy focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Cost ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={featureForm.cost}
                  onChange={e => setFeatureForm({ ...featureForm, cost: e.target.value })}
                  className="w-full bg-bg-cool border border-line rounded-[8px] px-[8px] py-[5px] text-xs text-navy focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Active From</label>
                <input
                  type="date"
                  value={featureForm.activeFrom}
                  onChange={e => setFeatureForm({ ...featureForm, activeFrom: e.target.value })}
                  className="w-full bg-bg-cool border border-line rounded-[8px] px-[8px] py-[5px] text-xs text-navy focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Active To</label>
                <input
                  type="date"
                  value={featureForm.activeTo}
                  onChange={e => setFeatureForm({ ...featureForm, activeTo: e.target.value })}
                  className="w-full bg-bg-cool border border-line rounded-[8px] px-[8px] py-[5px] text-xs text-navy focus:outline-none focus:border-teal"
                />
              </div>
            </div>
            <div className="flex justify-end gap-[8px]">
              <button onClick={() => setShowAddFeature(false)} className="px-[13px] py-[8px] rounded-card border border-line text-xs font-bold text-slate hover:text-navy transition-colors duration-[144ms]">
                Cancel
              </button>
              <button
                onClick={handleAddFeature}
                disabled={!featureForm.name.trim() || savingFeature}
                className="px-[13px] py-[8px] rounded-card bg-navy text-cream text-xs font-bold hover:bg-navy-deep transition-colors duration-[144ms] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingFeature ? 'Saving…' : 'Save Feature'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
