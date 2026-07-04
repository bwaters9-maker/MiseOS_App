import React, { useState } from 'react';
import { Package, Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, Search, ChevronsUpDown } from 'lucide-react';
import { db } from './firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useKitchenSelector } from './components/KitchenStateContext';
import { computeCostPerBaseUnit } from './lib/costEngine';
import {
  toBase, fromBase, displayUnitsFor, defaultDisplayUnit, smartUnit, costPerDisplayUnit,
} from './lib/units';
import type { Ingredient, IngredientCategory, MeasureType, Allergen, NutritionPer100g } from './types';
import type { UnitSystem, DisplayUnit } from './lib/units';

const CATEGORIES: IngredientCategory[] = ['Produce', 'Protein', 'Dairy', 'Dry Goods', 'Frozen', 'Beverage', 'Other'];
const ALL_ALLERGENS: Allergen[] = ['milk', 'eggs', 'fish', 'shellfish', 'treeNuts', 'peanuts', 'wheat', 'soybeans', 'sesame'];

const ALLERGEN_LABELS: Record<Allergen, string> = {
  milk: 'Milk', eggs: 'Eggs', fish: 'Fish', shellfish: 'Shellfish',
  treeNuts: 'Tree Nuts', peanuts: 'Peanuts', wheat: 'Wheat', soybeans: 'Soybeans', sesame: 'Sesame',
};

const CATEGORY_STYLE: Record<IngredientCategory, string> = {
  Produce:    'text-emerald-300 border-emerald-900 bg-emerald-950/30',
  Protein:    'text-red-300    border-red-900    bg-red-950/30',
  Dairy:      'text-blue-300   border-blue-900   bg-blue-950/30',
  'Dry Goods':'text-amber-300  border-amber-900  bg-amber-950/30',
  Frozen:     'text-cyan-300   border-cyan-900   bg-cyan-950/30',
  Beverage:   'text-purple-300 border-purple-900 bg-purple-950/30',
  Other:      'text-zinc-400   border-zinc-700   bg-zinc-900/30',
};

interface FormState {
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

const BLANK = (unitSystem: UnitSystem): FormState => ({
  name: '', category: '', measureType: 'weight',
  purchaseUnit: '', purchaseCost: '',
  purchaseQtyDisplay: '', purchaseQtyUnit: defaultDisplayUnit('weight', unitSystem),
  yieldPercent: '100',
  calories: '', totalFat: '', saturatedFat: '', transFat: '',
  cholesterol: '', sodium: '', totalCarbs: '', fiber: '',
  sugars: '', addedSugars: '', protein: '',
  allergens: [],
});

const toForm = (ing: Ingredient, unitSystem: UnitSystem): FormState => {
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

const toDoc = (f: FormState): Omit<Ingredient, 'id'> => {
  const purchaseQtyBase = toBase(parseFloat(f.purchaseQtyDisplay) || 0, f.purchaseQtyUnit);
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
  return {
    name: f.name.trim(),
    category: f.category as IngredientCategory,
    measureType: f.measureType,
    purchaseUnit: f.purchaseUnit.trim(),
    purchaseCost: parseFloat(f.purchaseCost) || 0,
    purchaseQty: purchaseQtyBase,
    yieldPercent: parseFloat(f.yieldPercent) || 100,
    ...(Object.keys(nutrition).length > 0 && { nutritionPer100g: nutrition }),
    ...(f.allergens.length > 0 && { allergens: f.allergens }),
    lastVerified: new Date().toISOString().slice(0, 10),
  };
};

const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';
const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';

const NutritionAllergenSection: React.FC<{
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
          <div>
            <p className={`${FIELD_LABEL} mb-[8px]`}>Allergens (FDA Big-9)</p>
            <div className="flex flex-wrap gap-[5px]">
              {ALL_ALLERGENS.map(a => (
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
      )}
    </div>
  );
};

const IngredientForm: React.FC<{
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  unitSystem: UnitSystem;
}> = ({ form, setForm, onSave, onCancel, saving, unitSystem }) => {
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

  const canSave = form.name.trim() !== ''
    && form.category !== ''
    && parseFloat(form.purchaseCost) > 0
    && parseFloat(form.purchaseQtyDisplay) > 0;

  const qtyUnits = displayUnitsFor(form.measureType, unitSystem);

  return (
    <div className="space-y-[13px]">
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
          <label className={FIELD_LABEL}>Purchase Cost ($)</label>
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

type SortField = 'name' | 'category' | 'cost';
type SortDir = 'asc' | 'desc';

interface IngredientsProps {
  unitSystem?: UnitSystem;
}

const Ingredients: React.FC<IngredientsProps> = ({ unitSystem = 'imperial' }) => {
  const allIngredients = (useKitchenSelector((s: any) => s.ingredients) as Ingredient[]) ?? [];

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(BLANK(unitSystem));
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(BLANK(unitSystem));
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = allIngredients.filter(ing =>
    ing.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
    else if (sortField === 'cost') {
      const ca = computeCostPerBaseUnit(a.purchaseCost, a.purchaseQty, a.yieldPercent);
      const cb = computeCostPerBaseUnit(b.purchaseCost, b.purchaseQty, b.yieldPercent);
      cmp = ca - cb;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleAdd = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'ingredients'), toDoc(addForm));
      setAddForm(BLANK(unitSystem));
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (saving || !editId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'ingredients', editId), toDoc(editForm));
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'ingredients', id));
    setDeleteConfirmId(null);
    if (editId === id) setEditId(null);
  };

  const startEdit = (ing: Ingredient) => {
    setEditId(ing.id);
    setEditForm(toForm(ing, unitSystem));
    setDeleteConfirmId(null);
    setShowAdd(false);
  };

  const SortHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-[5px] text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors duration-[144ms]"
    >
      {children}
      {sortField === field
        ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
        : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
    </button>
  );

  return (
    <div className="max-w-[1597px] mx-auto px-[21px] py-[34px] font-mono">

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-[13px] mb-[34px]">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
            <Package className="w-5 h-5 text-amber-400" />
            Master Pantry
          </h1>
          <p className="text-xs text-zinc-500 mt-[5px]">
            Human-verified. {allIngredients.length} ingredient{allIngredients.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <div className="flex items-center gap-[8px]">
          <div className="relative">
            <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="bg-zinc-900 border border-zinc-700 rounded-[8px] pl-[26px] pr-[8px] py-[8px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600 w-[200px]"
            />
          </div>
          {!showAdd && (
            <button
              onClick={() => { setShowAdd(true); setAddForm(BLANK(unitSystem)); setEditId(null); }}
              className={`${BTN_PRIMARY} flex items-center gap-[8px] whitespace-nowrap`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Ingredient
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] mb-[21px]">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400 mb-[13px]">New Ingredient</p>
          <IngredientForm
            form={addForm}
            setForm={setAddForm}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={saving}
            unitSystem={unitSystem}
          />
        </div>
      )}

      {sorted.length === 0 && !showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[55px] text-center">
          <Package className="w-8 h-8 text-zinc-700 mx-auto mb-[13px]" />
          <p className="text-xs text-zinc-500">
            {search ? 'No ingredients match your search.' : 'Master Pantry is empty. Every ingredient added here is human-verified.'}
          </p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[800px]">
              <thead className="border-b border-zinc-800">
                <tr>
                  <th className="px-[21px] py-[13px]"><SortHeader field="name">Name</SortHeader></th>
                  <th className="px-[13px] py-[13px]"><SortHeader field="category">Category</SortHeader></th>
                  <th className="px-[13px] py-[13px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Purchase Unit</th>
                  <th className="px-[13px] py-[13px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Cost</th>
                  <th className="px-[13px] py-[13px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Yield</th>
                  <th className="px-[13px] py-[13px]"><SortHeader field="cost">Cost / Unit</SortHeader></th>
                  <th className="px-[13px] py-[13px]" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(ing => {
                  if (editId === ing.id) {
                    return (
                      <tr key={ing.id} className="border-t border-zinc-800 bg-zinc-900/30">
                        <td colSpan={7} className="px-[21px] py-[21px]">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit — {ing.name}</p>
                          <IngredientForm
                            form={editForm}
                            setForm={setEditForm}
                            onSave={handleEdit}
                            onCancel={() => setEditId(null)}
                            saving={saving}
                            unitSystem={unitSystem}
                          />
                        </td>
                      </tr>
                    );
                  }

                  const costPerBase = computeCostPerBaseUnit(ing.purchaseCost, ing.purchaseQty, ing.yieldPercent);
                  const { cost: displayCost, unit: displayUnit } = costPerDisplayUnit(costPerBase, ing.measureType, unitSystem);
                  const isConfirm = deleteConfirmId === ing.id;

                  return (
                    <tr key={ing.id} className="border-t border-zinc-900 hover:bg-zinc-900/20 transition-colors duration-[144ms]">
                      <td className="px-[21px] py-[13px] font-bold text-zinc-100">{ing.name}</td>
                      <td className="px-[13px] py-[13px]">
                        <span className={`${BADGE} ${CATEGORY_STYLE[ing.category]}`}>{ing.category}</span>
                      </td>
                      <td className="px-[13px] py-[13px] text-zinc-400">{ing.purchaseUnit || '—'}</td>
                      <td className="px-[13px] py-[13px] text-zinc-300 tabular-nums">${ing.purchaseCost.toFixed(2)}</td>
                      <td className="px-[13px] py-[13px] text-zinc-400 tabular-nums">{ing.yieldPercent}%</td>
                      <td className="px-[13px] py-[13px] text-emerald-400 font-bold tabular-nums">
                        {displayCost > 0 ? `$${displayCost.toFixed(4)}/${displayUnit}` : '—'}
                      </td>
                      <td className="px-[13px] py-[13px]">
                        <div className="flex items-center gap-[5px] justify-end">
                          {isConfirm ? (
                            <>
                              <button
                                onClick={() => handleDelete(ing.id)}
                                className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}
                                title="Confirm delete"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className={`${BADGE} text-zinc-400 border-zinc-700 hover:text-zinc-200 transition-colors duration-[144ms]`}
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(ing)}
                                className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setDeleteConfirmId(ing.id); setEditId(null); }}
                                className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ingredients;
