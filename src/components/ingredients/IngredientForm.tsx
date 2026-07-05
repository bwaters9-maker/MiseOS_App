import React, { useState } from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { computeCostPerBaseUnit } from '../../lib/costEngine';
import { toBase, displayUnitsFor, defaultDisplayUnit, smartUnit, costPerDisplayUnit } from '../../lib/units';
import type { Ingredient, IngredientCategory, MeasureType, Allergen, NutritionPer100g } from '../../types';
import type { UnitSystem, DisplayUnit } from '../../lib/units';

export const CATEGORIES: IngredientCategory[] = ['Produce', 'Protein', 'Dairy', 'Dry Goods', 'Frozen', 'Beverage', 'Other', 'Spices', 'Oils & Fats', 'Sauces', 'Beverages', 'Bakery'];
export const FDA_BIG_9: Allergen[] = ['milk', 'eggs', 'fish', 'shellfish', 'treeNuts', 'peanuts', 'wheat', 'soybeans', 'sesame'];
export const ADDITIONAL_DISCLOSURES: Allergen[] = ['gluten', 'sulfites'];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  milk: 'Milk', eggs: 'Eggs', fish: 'Fish', shellfish: 'Shellfish',
  treeNuts: 'Tree Nuts', peanuts: 'Peanuts', wheat: 'Wheat', soybeans: 'Soybeans', sesame: 'Sesame',
  gluten: 'Gluten', sulfites: 'Sulfites',
};

export interface FormState {
  name: string;
  category: IngredientCategory | '';
  measureType: MeasureType;
  purchaseUnit: string;
  purchaseCost: string;
  purchaseQtyDisplay: string;
  purchaseQtyUnit: DisplayUnit;
  yieldPercent: string;
  calories: string; totalFat: string; saturatedFat: string; transFat: string;
  cholesterol: string; sodium: string; totalCarbs: string; fiber: string;
  sugars: string; addedSugars: string; protein: string;
  allergens: Allergen[];
}

export const BLANK = (unitSystem: UnitSystem): FormState => ({
  name: '', category: '', measureType: 'weight',
  purchaseUnit: '', purchaseCost: '',
  purchaseQtyDisplay: '', purchaseQtyUnit: defaultDisplayUnit('weight', unitSystem),
  yieldPercent: '100',
  calories: '', totalFat: '', saturatedFat: '', transFat: '',
  cholesterol: '', sodium: '', totalCarbs: '', fiber: '',
  sugars: '', addedSugars: '', protein: '',
  allergens: [],
});

export const toForm = (ing: Ingredient, unitSystem: UnitSystem): FormState => {
  const { value, unit } = smartUnit(ing.purchaseQty, ing.measureType, unitSystem);
  const n = ing.nutritionPer100g ?? {};
  return {
    name: ing.name,
    category: ing.category,
    measureType: ing.measureType,
    purchaseUnit: ing.purchaseUnit,
    purchaseCost: String(ing.purchaseCost),
    purchaseQtyDisplay: value.toFixed(value >= 10 ? 2 : 3).replace(/\.?0+$/, ''),
    purchaseQtyUnit: unit,
    yieldPercent: String(ing.yieldPercent),
    calories: n.calories != null ? String(n.calories) : '',
    totalFat: n.totalFat != null ? String(n.totalFat) : '',
    saturatedFat: n.saturatedFat != null ? String(n.saturatedFat) : '',
    transFat: n.transFat != null ? String(n.transFat) : '',
    cholesterol: n.cholesterol != null ? String(n.cholesterol) : '',
    sodium: n.sodium != null ? String(n.sodium) : '',
    totalCarbs: n.totalCarbs != null ? String(n.totalCarbs) : '',
    fiber: n.fiber != null ? String(n.fiber) : '',
    sugars: n.sugars != null ? String(n.sugars) : '',
    addedSugars: n.addedSugars != null ? String(n.addedSugars) : '',
    protein: n.protein != null ? String(n.protein) : '',
    allergens: ing.allergens ?? [],
  };
};

const buildNutrition = (f: FormState): NutritionPer100g => {
  const nutrition: NutritionPer100g = {};
  const numField = (v: string) => v !== '' && !isNaN(parseFloat(v)) ? parseFloat(v) : undefined;
  if (numField(f.calories) != null) nutrition.calories = numField(f.calories)!;
  if (numField(f.totalFat) != null) nutrition.totalFat = numField(f.totalFat)!;
  if (numField(f.saturatedFat) != null) nutrition.saturatedFat = numField(f.saturatedFat)!;
  if (numField(f.transFat) != null) nutrition.transFat = numField(f.transFat)!;
  if (numField(f.cholesterol) != null) nutrition.cholesterol = numField(f.cholesterol)!;
  if (numField(f.sodium) != null) nutrition.sodium = numField(f.sodium)!;
  if (numField(f.totalCarbs) != null) nutrition.totalCarbs = numField(f.totalCarbs)!;
  if (numField(f.fiber) != null) nutrition.fiber = numField(f.fiber)!;
  if (numField(f.sugars) != null) nutrition.sugars = numField(f.sugars)!;
  if (numField(f.addedSugars) != null) nutrition.addedSugars = numField(f.addedSugars)!;
  if (numField(f.protein) != null) nutrition.protein = numField(f.protein)!;
  return nutrition;
};

/** Manual-entry path (blank Add, or editing any existing ingredient) — always
 * a chef-typed, just-verified price, so priceSource/lastVerified/nutritionSource
 * are stamped unconditionally regardless of which fields were actually touched. */
export const toDoc = (f: FormState): Omit<Ingredient, 'id'> => {
  const purchaseQtyBase = toBase(parseFloat(f.purchaseQtyDisplay) || 0, f.purchaseQtyUnit);
  const nutrition = buildNutrition(f);
  return {
    name: f.name.trim(),
    category: f.category as IngredientCategory,
    measureType: f.measureType,
    purchaseUnit: f.purchaseUnit.trim(),
    purchaseCost: parseFloat(f.purchaseCost) || 0,
    purchaseQty: purchaseQtyBase,
    yieldPercent: parseFloat(f.yieldPercent) || 100,
    ...(Object.keys(nutrition).length > 0 && { nutritionPer100g: nutrition, nutritionSource: 'manual' }),
    ...(f.allergens.length > 0 && { allergens: f.allergens }),
    lastVerified: new Date().toISOString().slice(0, 10),
    priceSource: 'manual',
  };
};

/** AI-lookup path — cost stays a flagged estimate (priceSource
 * 'regional-estimate', lastVerified '' so the existing unverified-dot
 * convention picks it up) unless the chef edited the proposed cost, which
 * counts as verification. Nutrition provenance is 'ai' regardless of minor
 * edits to the proposed values, since the estimate itself came from the AI. */
export const toProposalDoc = (f: FormState, costEdited: boolean): Omit<Ingredient, 'id'> => {
  const purchaseQtyBase = toBase(parseFloat(f.purchaseQtyDisplay) || 0, f.purchaseQtyUnit);
  const nutrition = buildNutrition(f);
  return {
    name: f.name.trim(),
    category: f.category as IngredientCategory,
    measureType: f.measureType,
    purchaseUnit: f.purchaseUnit.trim(),
    purchaseCost: parseFloat(f.purchaseCost) || 0,
    purchaseQty: purchaseQtyBase,
    yieldPercent: parseFloat(f.yieldPercent) || 100,
    ...(Object.keys(nutrition).length > 0 && { nutritionPer100g: nutrition, nutritionSource: 'ai' as const }),
    ...(f.allergens.length > 0 && { allergens: f.allergens }),
    lastVerified: costEdited ? new Date().toISOString().slice(0, 10) : '',
    priceSource: costEdited ? 'manual' : 'regional-estimate',
  };
};

export const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
export const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';
export const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
export const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';
export const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';

export const NutritionAllergenSection: React.FC<{
  form: FormState;
  setForm: (f: FormState) => void;
}> = ({ form, setForm }) => {
  const [open, setOpen] = useState(false);
  const setN = (k: keyof FormState, v: string) => setForm({ ...form, [k]: v });

  const toggleAllergen = (a: Allergen) => {
    const next = form.allergens.includes(a)
      ? form.allergens.filter(x => x !== a)
      : [...form.allergens, a];
    setForm({ ...form, allergens: next });
  };

  const NROW = [
    { label: 'Calories', key: 'calories' as const, unit: 'kcal' },
    { label: 'Total Fat', key: 'totalFat' as const, unit: 'g' },
    { label: 'Saturated Fat', key: 'saturatedFat' as const, unit: 'g' },
    { label: 'Trans Fat', key: 'transFat' as const, unit: 'g' },
    { label: 'Cholesterol', key: 'cholesterol' as const, unit: 'mg' },
    { label: 'Sodium', key: 'sodium' as const, unit: 'mg' },
    { label: 'Total Carbs', key: 'totalCarbs' as const, unit: 'g' },
    { label: 'Fiber', key: 'fiber' as const, unit: 'g' },
    { label: 'Sugars', key: 'sugars' as const, unit: 'g' },
    { label: 'Added Sugars', key: 'addedSugars' as const, unit: 'g' },
    { label: 'Protein', key: 'protein' as const, unit: 'g' },
  ];

  return (
    <div className="border border-zinc-800 rounded-[8px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors duration-[144ms] bg-zinc-900/40"
      >
        Nutrition & Allergens (optional)
        <ChevronDown className={`w-3 h-3 transition-transform duration-[144ms] ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="p-[13px] space-y-[13px] bg-zinc-950/50">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Per 100g</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-[8px]">
            {NROW.map(({ label, key, unit }) => (
              <div key={key}>
                <label className={FIELD_LABEL}>{label} ({unit})</label>
                <input
                  type="number"
                  value={form[key]}
                  onChange={e => setN(key, e.target.value)}
                  placeholder="—"
                  min="0"
                  step="0.1"
                  className={INPUT}
                />
              </div>
            ))}
          </div>
          <div className="space-y-[13px]">
            <div>
              <p className={`${FIELD_LABEL} mb-[8px]`}>Allergens — FDA Big-9</p>
              <div className="flex flex-wrap gap-[5px]">
                {FDA_BIG_9.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAllergen(a)}
                    className={`${BADGE} transition-colors duration-[144ms] ${
                      form.allergens.includes(a)
                        ? 'text-amber-300 border-amber-700 bg-amber-950/50'
                        : 'text-zinc-600 border-zinc-800 hover:text-zinc-400'
                    }`}
                  >
                    {ALLERGEN_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={`${FIELD_LABEL} mb-[8px]`}>Additional Disclosures</p>
              <div className="flex flex-wrap gap-[5px]">
                {ADDITIONAL_DISCLOSURES.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAllergen(a)}
                    className={`${BADGE} transition-colors duration-[144ms] ${
                      form.allergens.includes(a)
                        ? 'text-amber-300 border-amber-700 bg-amber-950/50'
                        : 'text-zinc-600 border-zinc-800 hover:text-zinc-400'
                    }`}
                  >
                    {ALLERGEN_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const canSaveIngredientForm = (f: FormState): boolean =>
  f.name.trim() !== ''
  && f.category !== ''
  && parseFloat(f.purchaseCost) > 0
  && parseFloat(f.purchaseQtyDisplay) > 0;

export const IngredientForm: React.FC<{
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  unitSystem: UnitSystem;
  /** Manual entry (blank Add) and editing any existing ingredient — pack size
   * and yield errors compound into large costing errors over time. */
  showManualCaution?: boolean;
  /** AI-lookup review — cost is a proposed estimate until the chef edits it. */
  costEstimateBadge?: boolean;
}> = ({ form, setForm, onSave, onCancel, saving, unitSystem, showManualCaution, costEstimateBadge }) => {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });

  const handleMeasureTypeChange = (mt: MeasureType) => {
    setForm({ ...form, measureType: mt, purchaseQtyUnit: defaultDisplayUnit(mt, unitSystem) });
  };

  const purchaseCostNum = parseFloat(form.purchaseCost) || 0;
  const purchaseQtyNum = parseFloat(form.purchaseQtyDisplay) || 0;
  const purchaseQtyBase = toBase(purchaseQtyNum, form.purchaseQtyUnit);
  const yieldNum = parseFloat(form.yieldPercent) || 100;
  const costPerBase = computeCostPerBaseUnit(purchaseCostNum, purchaseQtyBase, yieldNum);
  const { cost: displayCost, unit: displayCostUnit } = costPerDisplayUnit(costPerBase, form.measureType, unitSystem);

  const canSave = canSaveIngredientForm(form);
  const qtyUnits = displayUnitsFor(form.measureType, unitSystem);

  return (
    <div className="space-y-[13px]">
      {showManualCaution && (
        <div className="flex items-start gap-[8px] bg-amber-950/20 border border-amber-900 rounded-[8px] px-[13px] py-[8px]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-[2px] shrink-0" />
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            Manual entry warning: small input errors in pack size or yield compound into large costing errors over time. Extreme care recommended.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Ingredient name"
            className={INPUT}
            autoFocus
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Category</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value as IngredientCategory)}
            className={INPUT}
          >
            <option value="">— Select category —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Measure Type</label>
          <select
            value={form.measureType}
            onChange={e => handleMeasureTypeChange(e.target.value as MeasureType)}
            className={INPUT}
          >
            <option value="weight">Weight</option>
            <option value="volume">Volume</option>
            <option value="each">Each / Count</option>
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Purchase Unit Label</label>
          <input
            type="text"
            value={form.purchaseUnit}
            onChange={e => set('purchaseUnit', e.target.value)}
            placeholder="e.g. case, 50 lb bag"
            className={INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>
            Purchase Cost ($)
            {costEstimateBadge && (
              <span className="ml-[8px] px-[5px] py-[1px] rounded-[3px] text-[9px] font-bold uppercase tracking-wider border text-amber-300 border-amber-800 bg-amber-950/40 normal-case tracking-normal">
                Estimate
              </span>
            )}
          </label>
          <input
            type="number"
            value={form.purchaseCost}
            onChange={e => set('purchaseCost', e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[13px]">
        <div className="col-span-1">
          <label className={FIELD_LABEL}>Qty in Purchase Unit</label>
          <input
            type="number"
            value={form.purchaseQtyDisplay}
            onChange={e => set('purchaseQtyDisplay', e.target.value)}
            placeholder="0"
            min="0"
            step="any"
            className={INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Unit</label>
          <select
            value={form.purchaseQtyUnit}
            onChange={e => set('purchaseQtyUnit', e.target.value as DisplayUnit)}
            className={INPUT}
            disabled={form.measureType === 'each'}
          >
            {qtyUnits.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Yield %</label>
          <input
            type="number"
            value={form.yieldPercent}
            onChange={e => set('yieldPercent', e.target.value)}
            placeholder="100"
            min="1"
            max="100"
            className={INPUT}
          />
        </div>
      </div>

      <div className="flex items-center gap-[13px] bg-zinc-900/60 border border-zinc-800 rounded-[8px] px-[13px] py-[8px]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Cost per usable unit</span>
        <span className="text-sm font-bold text-emerald-400 font-mono">
          {canSave && displayCost > 0
            ? `$${displayCost.toFixed(4)} / ${displayCostUnit}`
            : '—'}
        </span>
      </div>

      <NutritionAllergenSection form={form} setForm={setForm} />

      <div className="flex gap-[8px] justify-end pt-[5px]">
        <button type="button" onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || saving}
          className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};
