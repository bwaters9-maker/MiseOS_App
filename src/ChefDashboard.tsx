import React, { useState } from 'react';
import { LayoutDashboard, Users, CalendarDays, AlertTriangle, Clock, Printer, Star, Plus, X } from 'lucide-react';
import { addDoc } from 'firebase/firestore';
import { rCollection } from './lib/firestorePaths';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useRestaurantId } from './components/AuthContext';
import { useStationPresets } from './hooks/useStationPresets';
import { featureFieldsFromRecipe } from './lib/costEngine';
import { COURSES, BLANK as BLANK_FEATURE, toDoc as featureToDoc, type FormState as FeatureFormState } from './Features';
import { todayDateKey, formatTime12h } from './utils';
import type { Employee, Shift, KitchenEvent, Client, KitchenAlert, Feature, Recipe, Ingredient } from './types';

interface ChefDashboardProps {
  onNavigate?: (view: string) => void;
}

export default function ChefDashboard({ onNavigate }: ChefDashboardProps) {
  const restaurantId = useRestaurantId();
  const staff = (useKitchenSelector((s: any) => s.staff) as Employee[]) ?? [];
  const shifts = (useKitchenSelector((s: any) => s.shifts) as Shift[]) ?? [];
  const events = (useKitchenSelector((s: any) => s.events) as KitchenEvent[]) ?? [];
  const clients = (useKitchenSelector((s: any) => s.clients) as Client[]) ?? [];
  const alerts = (useKitchenSelector((s: any) => s.alerts) as KitchenAlert[]) ?? [];
  const features = (useKitchenSelector((s: any) => s.features) as Feature[]) ?? [];
  const allRecipes = (useKitchenSelector((s: any) => s.recipes) as Recipe[]) ?? [];
  const allIngredients = (useKitchenSelector((s: any) => s.ingredients) as Ingredient[]) ?? [];
  const { presets: stationPresets } = useStationPresets();

  const todayStr = todayDateKey();
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const staffById = new Map(staff.map(e => [e.id, e]));
  const clientsById = new Map(clients.map(c => [c.id, c]));
  const menuRecipes = allRecipes.filter(r => r.recipeType === 'menu').sort((a, b) => a.name.localeCompare(b.name));

  // Read-only snapshot: filters/derives only. Add Feature below is the one
  // deliberate write exception — see CLAUDE.md.
  const todayShifts = [...shifts]
    .filter(sh => sh.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const unassignedShifts = todayShifts.filter(sh => !sh.station);

  const todayEvents = [...events]
    .filter(e => e.date === todayStr)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const activeAlerts = alerts.filter(a => !a.resolved);

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
        <button
          onClick={() => onNavigate?.('alert-history')}
          className={`flex items-center gap-[8px] px-[13px] py-[8px] rounded-card border transition-colors duration-[144ms] ${
            activeAlerts.length > 0
              ? 'text-red-400 border-red-400/40 bg-red-400/10 hover:bg-red-400/20'
              : 'text-slate border-line hover:text-navy'
          }`}
          title="View Alert History"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-bold tabular-nums">{activeAlerts.length}</span>
        </button>
      </div>

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

      {/* QUICK ACTIONS */}
      <div className="bg-surface border border-line rounded-card p-[21px]">
        <h2 className="text-xs font-bold uppercase tracking-widest text-navy mb-[13px]">Quick Actions</h2>
        <div className="flex flex-wrap gap-[13px]">
          <button
            onClick={() => onNavigate?.('timers')}
            className="flex items-center gap-[8px] px-[13px] py-[8px] bg-navy text-cream rounded-card text-xs font-bold hover:bg-navy-deep transition-colors duration-[144ms]"
          >
            <Clock className="w-3.5 h-3.5" /> Kitchen Timers
          </button>
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
