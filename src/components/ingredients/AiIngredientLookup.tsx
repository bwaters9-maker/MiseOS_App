import React, { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, PenLine } from 'lucide-react';
import { db } from '../../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { callAi, parseAiJson } from '../../lib/ai';
import { smartUnit, defaultDisplayUnit } from '../../lib/units';
import { yieldReferenceText } from '../../lib/yieldReference';
import { withRegionContext } from '../../lib/regionContext';
import { useKitchenSelector } from '../KitchenStateContext';
import {
  IngredientForm, BLANK, toDoc, toProposalDoc, CATEGORIES,
  INPUT, FIELD_LABEL, BTN_PRIMARY, BTN_GHOST,
} from './IngredientForm';
import type { FormState } from './IngredientForm';
import type { IngredientCategory, MeasureType, Allergen, Vendor, RestaurantProfile } from '../../types';
import type { UnitSystem } from '../../lib/units';

const ALL_ALLERGENS: Allergen[] = ['milk', 'eggs', 'fish', 'shellfish', 'treeNuts', 'peanuts', 'wheat', 'soybeans', 'sesame', 'gluten', 'sulfites'];

const LOOKUP_SYSTEM_PROMPT = `You are helping a chef add a new ingredient to a restaurant's Master Pantry from just an ingredient name. You will receive a single ingredient name and must propose a plausible Master Pantry entry, including a rough US foodservice price estimate.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"cleanName":"...","category":"...","measureType":"...","purchaseUnit":"...","packQtyInBaseUnits":0,"baseUnit":"...","estimatedPackCost":0,"yieldPercent":100,"allergens":["..."],"nutritionPer100g":{"calories":0,"totalFat":0,"saturatedFat":0,"transFat":0,"cholesterol":0,"sodium":0,"totalCarbs":0,"fiber":0,"sugars":0,"addedSugars":0,"protein":0}}

Rules:
- "cleanName" is a clean, professional ingredient name (title case, no brand or SKU codes).
- "category" must be exactly one of: "Produce", "Protein", "Dairy", "Dry Goods", "Frozen", "Beverage", "Other", "Spices", "Oils & Fats", "Sauces", "Beverages", "Bakery".
- "measureType" must be exactly one of: "weight", "volume", "each".
- "purchaseUnit" is a typical foodservice pack size description (e.g. "50 lb bag", "case of 6", "5 lb tub").
- "packQtyInBaseUnits" is that pack's quantity converted to the canonical base unit: grams if measureType is "weight", milliliters if "volume", or a plain count if "each".
- "baseUnit" must be "g" if measureType is "weight", "ml" if "volume", or "each" if "each".
- "estimatedPackCost" is a rough current US foodservice-distributor price, in dollars, for that whole pack — a reasonable estimate, not a live price.
- "yieldPercent" is the usable-yield percentage after trim/waste, from 1 to 100 (use 100 if not applicable). A chef-standard yield reference chart is provided below — when the ingredient (or a close equivalent at a comparable fabrication state) appears in it, use that value instead of your own estimate. For ranges, use the midpoint. For items not in the chart, estimate consistently with the closest comparable item.
- "allergens" is an array containing zero or more of: "milk", "eggs", "fish", "shellfish", "treeNuts", "peanuts", "wheat", "soybeans", "sesame", "gluten", "sulfites" — only ones this ingredient genuinely contains or commonly derives from. Empty array if none apply.
- "nutritionPer100g" gives typical nutrition values per 100g of the raw ingredient (calories in kcal, all others in grams except cholesterol and sodium in mg). Use your best estimate; omit a field entirely if genuinely unknown rather than guessing 0.
- If the name is not a recognizable food or beverage ingredient, respond with {"error":"not a recognizable ingredient"} instead.

Yield reference chart (usable-yield percentages by fabrication state):
${yieldReferenceText()}`;

const isValidCategory = (c: any): c is IngredientCategory => CATEGORIES.includes(c);
const isValidMeasureType = (m: any): m is MeasureType => m === 'weight' || m === 'volume' || m === 'each';
const isValidAllergen = (a: any): a is Allergen => ALL_ALLERGENS.includes(a);

const numOrUndefined = (v: any): number | undefined =>
  typeof v === 'number' && isFinite(v) ? v : undefined;

const buildProposalForm = (name: string, proposal: any, unitSystem: UnitSystem): FormState => {
  const measureType: MeasureType = isValidMeasureType(proposal.measureType) ? proposal.measureType : 'weight';
  const category: IngredientCategory | '' = isValidCategory(proposal.category) ? proposal.category : '';
  const baseQty = typeof proposal.packQtyInBaseUnits === 'number' && proposal.packQtyInBaseUnits > 0
    ? proposal.packQtyInBaseUnits
    : 0;
  const { value, unit } = baseQty > 0
    ? smartUnit(baseQty, measureType, unitSystem)
    : { value: 0, unit: defaultDisplayUnit(measureType, unitSystem) };
  const allergens = Array.isArray(proposal.allergens) ? proposal.allergens.filter(isValidAllergen) : [];
  const yieldPercent = typeof proposal.yieldPercent === 'number' && proposal.yieldPercent >= 1 && proposal.yieldPercent <= 100
    ? String(proposal.yieldPercent)
    : '100';
  const n = proposal.nutritionPer100g && typeof proposal.nutritionPer100g === 'object' ? proposal.nutritionPer100g : {};
  const numStr = (v: any) => { const n = numOrUndefined(v); return n != null ? String(n) : ''; };

  return {
    name: typeof proposal.cleanName === 'string' && proposal.cleanName.trim() ? proposal.cleanName.trim() : name,
    category,
    measureType,
    purchaseUnit: typeof proposal.purchaseUnit === 'string' ? proposal.purchaseUnit : '',
    purchaseCost: typeof proposal.estimatedPackCost === 'number' && proposal.estimatedPackCost > 0 ? String(proposal.estimatedPackCost) : '',
    purchaseQtyDisplay: value > 0 ? value.toFixed(value >= 10 ? 2 : 3).replace(/\.?0+$/, '') : '',
    purchaseQtyUnit: unit,
    yieldPercent,
    pieceWeightDisplay: '',
    pieceWeightUnit: (unitSystem === 'imperial' ? 'oz' : 'g') as 'oz' | 'g',
    calories: numStr(n.calories), totalFat: numStr(n.totalFat), saturatedFat: numStr(n.saturatedFat), transFat: numStr(n.transFat),
    cholesterol: numStr(n.cholesterol), sodium: numStr(n.sodium), totalCarbs: numStr(n.totalCarbs), fiber: numStr(n.fiber),
    sugars: numStr(n.sugars), addedSugars: numStr(n.addedSugars), protein: numStr(n.protein),
    allergens,
    vendorId: '',
  };
};

type Stage = 'name' | 'looking-up' | 'review' | 'failed' | 'manual';

interface AiIngredientLookupProps {
  unitSystem: UnitSystem;
  vendors: Vendor[];
  onCancel: () => void;
  onSaved: () => void;
}

export const AiIngredientLookup: React.FC<AiIngredientLookupProps> = ({ unitSystem, vendors, onCancel, onSaved }) => {
  const restaurantProfile = useKitchenSelector((s: any) => s.restaurantProfile) as RestaurantProfile | null;
  const [stage, setStage] = useState<Stage>('name');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewFormRaw] = useState<FormState | null>(null);
  const [costEdited, setCostEdited] = useState(false);
  const [manualForm, setManualForm] = useState<FormState>(BLANK(unitSystem));
  const [saving, setSaving] = useState(false);

  const setReviewForm = (f: FormState) => {
    if (reviewForm && f.purchaseCost !== reviewForm.purchaseCost) setCostEdited(true);
    setReviewFormRaw(f);
  };

  const runLookup = async () => {
    if (!name.trim()) return;
    setStage('looking-up');
    setError(null);
    try {
      const raw = await callAi(withRegionContext(LOOKUP_SYSTEM_PROMPT, restaurantProfile), name.trim(), 1500);
      const parsed = parseAiJson(raw);
      if (parsed?.error) {
        throw new Error(`Could not identify "${name.trim()}" as an ingredient. Try a more specific name, or enter it manually.`);
      }
      setReviewFormRaw(buildProposalForm(name.trim(), parsed, unitSystem));
      setCostEdited(false);
      setStage('review');
    } catch (e: any) {
      setError(e?.message || 'Could not look that up. Try again.');
      setStage('failed');
    }
  };

  const goManual = () => {
    setManualForm({ ...BLANK(unitSystem), name: name.trim() });
    setError(null);
    setStage('manual');
  };

  const handleSaveProposal = async () => {
    if (!reviewForm || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'ingredients'), toProposalDoc(reviewForm, costEdited));
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManual = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'ingredients'), toDoc(manualForm));
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  if (stage === 'name') {
    return (
      <div className="space-y-[13px]">
        <div>
          <label className={FIELD_LABEL}>Ingredient Name</label>
          <div className="flex gap-[8px]">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runLookup(); }}
              placeholder="e.g. Guanciale"
              className={INPUT}
              autoFocus
            />
            <button
              onClick={runLookup}
              disabled={!name.trim()}
              className={`${BTN_PRIMARY} flex items-center gap-[8px] whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Look Up
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={goManual} className="text-[11px] text-zinc-500 hover:text-zinc-300 underline transition-colors duration-[144ms] inline-flex items-center gap-[5px]">
            <PenLine className="w-3 h-3" />
            Enter manually instead
          </button>
          <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        </div>
      </div>
    );
  }

  if (stage === 'looking-up') {
    return (
      <div className="p-[34px] text-center space-y-[13px]">
        <Loader2 className="w-8 h-8 text-emerald-400 mx-auto animate-spin" />
        <p className="text-xs text-zinc-400">Looking up "{name.trim()}"…</p>
      </div>
    );
  }

  if (stage === 'failed') {
    return (
      <div className="p-[21px] text-center space-y-[13px]">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-xs text-red-300">{error}</p>
        <div className="flex items-center justify-center gap-[8px]">
          <button onClick={runLookup} className={BTN_PRIMARY}>Retry</button>
          <button onClick={goManual} className={BTN_GHOST}>Enter Manually</button>
          <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        </div>
      </div>
    );
  }

  if (stage === 'review' && reviewForm) {
    return (
      <div className="space-y-[13px]">
        <div className="flex items-start gap-[8px] bg-emerald-950/20 border border-emerald-900 rounded-[8px] px-[13px] py-[8px]">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 mt-[2px] shrink-0" />
          <p className="text-[11px] text-emerald-300/80 leading-relaxed">
            AI proposal for "{name.trim()}" — review every field before saving. Cost, pack size, and nutrition are estimates until you confirm them.
          </p>
        </div>
        <IngredientForm
          form={reviewForm}
          setForm={setReviewForm}
          onSave={handleSaveProposal}
          onCancel={onCancel}
          saving={saving}
          unitSystem={unitSystem}
          vendors={vendors}
          costEstimateBadge={!costEdited}
        />
      </div>
    );
  }

  return (
    <div className="space-y-[13px]">
      <IngredientForm
        form={manualForm}
        setForm={setManualForm}
        onSave={handleSaveManual}
        onCancel={onCancel}
        saving={saving}
        unitSystem={unitSystem}
        vendors={vendors}
        showManualCaution
      />
    </div>
  );
};

export default AiIngredientLookup;
