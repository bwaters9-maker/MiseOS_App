import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Receipt, Upload, Loader2, AlertTriangle, X, Check, FileWarning, Plus } from 'lucide-react';
import { db } from '../../firebaseConfig';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { callAi, parseAiJson } from '../../lib/ai';
import { toBase, displayUnitsFor, defaultDisplayUnit, smartUnit } from '../../lib/units';
import { yieldReferenceText } from '../../lib/yieldReference';
import type { Ingredient, IngredientCategory, MeasureType, Allergen } from '../../types';
import type { UnitSystem, DisplayUnit } from '../../lib/units';

const CATEGORIES: IngredientCategory[] = ['Produce', 'Protein', 'Dairy', 'Dry Goods', 'Frozen', 'Beverage', 'Other', 'Spices', 'Oils & Fats', 'Sauces', 'Beverages', 'Bakery'];
const ALL_ALLERGENS: Allergen[] = ['milk', 'eggs', 'fish', 'shellfish', 'treeNuts', 'peanuts', 'wheat', 'soybeans', 'sesame', 'gluten', 'sulfites'];

const INVOICE_SYSTEM_PROMPT = `You are extracting line items from a restaurant supplier invoice (a photo or PDF). Extract ONLY food and beverage product line items — ignore delivery fees, taxes, fuel surcharges, account numbers, terms, and any other non-product lines.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"vendor":"...","invoiceDate":"...","items":[{"name":"...","packCost":0,"packDescription":"..."}]}

Rules:
- "vendor" is the supplier name as printed on the invoice, or "" if not legible.
- "invoiceDate" is the invoice date in YYYY-MM-DD format, or "" if not legible.
- "name" is the product name as printed on the invoice.
- "packCost" is the total price charged for that line's purchase unit, as a plain number with no currency symbol. If no price is legible for a line, use 0.
- "packDescription" is the pack size or unit as invoiced (e.g. "50 lb bag", "case of 6", "1 gal jug").
- If the image is unreadable or contains no product lines, return {"vendor":"","invoiceDate":"","items":[]}.`;

const ADD_TO_PANTRY_SYSTEM_PROMPT = `You are helping a chef add new ingredients to a restaurant's Master Pantry from invoice line items that had no existing pantry match. You will receive a JSON list of { invoiceName, packDescription } pairs.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"suggestions":[{"invoiceName":"...","cleanName":"...","category":"...","measureType":"...","packQtyInBaseUnits":0,"baseUnit":"...","yieldPercent":100,"allergens":["..."]}]}

Rules:
- "invoiceName" must exactly match the invoiceName you were given for that line, so suggestions can be matched back to the correct row.
- "cleanName" is a clean, professional ingredient name (title case, no pack size, no brand or SKU codes) suitable for a Master Pantry entry.
- "category" must be exactly one of: "Produce", "Protein", "Dairy", "Dry Goods", "Frozen", "Beverage", "Other", "Spices", "Oils & Fats", "Sauces", "Beverages", "Bakery".
- "measureType" must be exactly one of: "weight", "volume", "each".
- "packQtyInBaseUnits" is the pack quantity from packDescription converted to the canonical base unit: grams if measureType is "weight", milliliters if "volume", or a plain count if "each".
- "baseUnit" must be "g" if measureType is "weight", "ml" if "volume", or "each" if "each".
- "yieldPercent" is the usable-yield percentage after trim/waste for this ingredient, from 1 to 100 (use 100 if unsure or not applicable). A chef-standard yield reference chart is provided below — when the ingredient (or a close equivalent at a comparable fabrication state) appears in it, use that value instead of your own estimate. For ranges, use the midpoint.
- "allergens" is an array containing zero or more of: "milk", "eggs", "fish", "shellfish", "treeNuts", "peanuts", "wheat", "soybeans", "sesame", "gluten", "sulfites" — only ones this ingredient genuinely contains or commonly derives from. Empty array if none apply.
- If you cannot make a reasonable suggestion for a line, omit it from "suggestions" entirely.

Yield reference chart (usable-yield percentages by fabrication state):
${yieldReferenceText()}`;

const normalize = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Only an exact match after normalization (case, punctuation, spacing —
 * e.g. "Butter Unsalted" vs "Butter (Unsalted)") auto-matches. A
 * containment-only match (one name strictly inside the other) always carries
 * extra words beyond the shared core, and that's exactly where false
 * positives like "Pineapple Mango Salsa" → "Pineapple" or "Yuzu Kosho" →
 * "Yuzu" come from — so containment never auto-matches. The full ingredient
 * list is always available in the row's dropdown for the chef to pick
 * manually. */
const findMatch = (invoiceName: string, ingredients: Ingredient[]): Ingredient | null => {
  const norm = normalize(invoiceName);
  if (!norm) return null;
  return ingredients.find(ing => normalize(ing.name) === norm) ?? null;
};

const PACK_UNIT_ALIASES: Record<string, { factor: number; family: 'weight' | 'volume' | 'count' }> = {
  lb: { factor: 453.592, family: 'weight' }, lbs: { factor: 453.592, family: 'weight' },
  pound: { factor: 453.592, family: 'weight' }, pounds: { factor: 453.592, family: 'weight' },
  oz: { factor: 28.3495, family: 'weight' }, ounce: { factor: 28.3495, family: 'weight' }, ounces: { factor: 28.3495, family: 'weight' },
  kg: { factor: 1000, family: 'weight' }, kilogram: { factor: 1000, family: 'weight' }, kilograms: { factor: 1000, family: 'weight' },
  g: { factor: 1, family: 'weight' }, gram: { factor: 1, family: 'weight' }, grams: { factor: 1, family: 'weight' },
  gal: { factor: 3785.41, family: 'volume' }, gallon: { factor: 3785.41, family: 'volume' }, gallons: { factor: 3785.41, family: 'volume' },
  qt: { factor: 946.353, family: 'volume' }, quart: { factor: 946.353, family: 'volume' }, quarts: { factor: 946.353, family: 'volume' },
  l: { factor: 1000, family: 'volume' }, liter: { factor: 1000, family: 'volume' }, liters: { factor: 1000, family: 'volume' }, litre: { factor: 1000, family: 'volume' }, litres: { factor: 1000, family: 'volume' },
  ml: { factor: 1, family: 'volume' }, milliliter: { factor: 1, family: 'volume' }, milliliters: { factor: 1, family: 'volume' },
  each: { factor: 1, family: 'count' }, ct: { factor: 1, family: 'count' }, count: { factor: 1, family: 'count' },
  dozen: { factor: 12, family: 'count' }, doz: { factor: 12, family: 'count' },
};

const extractPack = (desc: string): { base: number; family: 'weight' | 'volume' | 'count' } | null => {
  const m = normalize(desc).match(/([\d.]+)\s*([a-z]+)/);
  if (!m) return null;
  const qty = parseFloat(m[1]);
  const alias = PACK_UNIT_ALIASES[m[2]];
  if (!alias || isNaN(qty) || qty <= 0) return null;
  return { base: qty * alias.factor, family: alias.family };
};

/** Never used to auto-convert anything — purely a warning signal for the chef. */
const packSizeMismatch = (pantryPack: string, invoicePack: string): boolean => {
  const a = normalize(pantryPack);
  const b = normalize(invoicePack);
  if (!a || !b || a === b) return false;
  const pa = extractPack(pantryPack);
  const pb = extractPack(invoicePack);
  if (pa && pb) {
    if (pa.family !== pb.family) return true;
    const ratio = pa.base / pb.base;
    return ratio < 0.7 || ratio > 1.3;
  }
  return !(a.includes(b) || b.includes(a));
};

const isValidCategory = (c: any): c is IngredientCategory => CATEGORIES.includes(c);
const isValidMeasureType = (m: any): m is MeasureType => m === 'weight' || m === 'volume' || m === 'each';
const isValidAllergen = (a: any): a is Allergen => ALL_ALLERGENS.includes(a);

interface ExtractedItem {
  name: string;
  packCost: number;
  packDescription: string;
}

interface AddSuggestion {
  invoiceName: string;
  cleanName?: string;
  category?: string;
  measureType?: string;
  packQtyInBaseUnits?: number;
  baseUnit?: string;
  yieldPercent?: number;
  allergens?: string[];
}

interface AddForm {
  name: string;
  category: IngredientCategory | '';
  measureType: MeasureType;
  purchaseUnit: string;
  purchaseQtyDisplay: string;
  purchaseQtyUnit: DisplayUnit;
  purchaseCost: string;
  yieldPercent: string;
  allergens: Allergen[];
}

interface ReviewRow {
  key: string;
  invoiceName: string;
  packDescription: string;
  ingredientId: string | null;
  newPackCostDisplay: string;
  accepted: boolean;
  addExpanded: boolean;
  addForm: AddForm | null;
  added: boolean;
}

const buildAddForm = (row: ReviewRow, suggestion: AddSuggestion | undefined, unitSystem: UnitSystem): AddForm => {
  const measureType: MeasureType = suggestion && isValidMeasureType(suggestion.measureType) ? suggestion.measureType as MeasureType : 'weight';
  const category: IngredientCategory | '' = suggestion && isValidCategory(suggestion.category) ? suggestion.category as IngredientCategory : '';
  const baseQty = suggestion && typeof suggestion.packQtyInBaseUnits === 'number' && suggestion.packQtyInBaseUnits > 0
    ? suggestion.packQtyInBaseUnits
    : 0;
  const { value, unit } = baseQty > 0
    ? smartUnit(baseQty, measureType, unitSystem)
    : { value: 0, unit: defaultDisplayUnit(measureType, unitSystem) };
  const allergens = Array.isArray(suggestion?.allergens) ? suggestion!.allergens.filter(isValidAllergen) : [];
  const yieldPercent = suggestion && typeof suggestion.yieldPercent === 'number' && suggestion.yieldPercent >= 1 && suggestion.yieldPercent <= 100
    ? String(suggestion.yieldPercent)
    : '100';
  return {
    name: suggestion?.cleanName?.trim() || row.invoiceName,
    category,
    measureType,
    purchaseUnit: row.packDescription,
    purchaseQtyDisplay: value > 0 ? value.toFixed(value >= 10 ? 2 : 3).replace(/\.?0+$/, '') : '',
    purchaseQtyUnit: unit,
    purchaseCost: row.newPackCostDisplay,
    yieldPercent,
    allergens,
  };
};

const canConfirmAdd = (f: AddForm): boolean =>
  f.name.trim() !== '' && f.category !== '' && parseFloat(f.purchaseQtyDisplay) > 0 && parseFloat(f.purchaseCost) > 0;

type Stage = 'idle' | 'reading' | 'review' | 'failed' | 'empty';

const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[3px]';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';

const readFileAsBase64 = (file: File): Promise<{ base64: string; mediaType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        reject(new Error('Could not read that file.'));
        return;
      }
      resolve({ mediaType: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });

interface InvoicePriceUpdateProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  unitSystem?: UnitSystem;
}

export const InvoicePriceUpdate: React.FC<InvoicePriceUpdateProps> = ({ isOpen, onClose, ingredients, unitSystem = 'imperial' }) => {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [vendor, setVendor] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [addSuggestions, setAddSuggestions] = useState<Record<string, AddSuggestion>>({});
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const lastFile = useRef<{ base64: string; mediaType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const ingredientsById = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients]);
  const sortedIngredients = useMemo(() => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)), [ingredients]);

  if (!isOpen) return null;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const fetchAddSuggestions = async (items: { invoiceName: string; packDescription: string }[]) => {
    if (items.length === 0) return;
    setSuggestLoading(true);
    try {
      const raw = await callAi(
        ADD_TO_PANTRY_SYSTEM_PROMPT,
        JSON.stringify({ items }),
        2048,
      );
      const parsed = parseAiJson(raw);
      const list: AddSuggestion[] = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
      const map: Record<string, AddSuggestion> = {};
      for (const s of list) {
        if (s && typeof s.invoiceName === 'string') map[s.invoiceName] = s;
      }
      setAddSuggestions(map);
    } catch {
      // Non-fatal — the add-to-pantry form still works with blank defaults.
    } finally {
      setSuggestLoading(false);
    }
  };

  const runExtraction = async (base64: string, mediaType: string) => {
    setStage('reading');
    setError(null);
    setAddSuggestions({});
    try {
      const contentBlock = mediaType === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } }
        : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
      const raw = await callAi(
        INVOICE_SYSTEM_PROMPT,
        [contentBlock, { type: 'text', text: 'Extract the food and beverage line items from this invoice.' }],
        2048,
      );
      let parsed: any;
      try {
        parsed = parseAiJson(raw);
      } catch {
        throw new Error('The AI response could not be read. Try again.');
      }
      const items: ExtractedItem[] = Array.isArray(parsed.items)
        ? parsed.items
            .filter((it: any) => it && typeof it.name === 'string' && it.name.trim())
            .map((it: any) => ({
              name: it.name.trim(),
              packCost: typeof it.packCost === 'number' ? it.packCost : parseFloat(it.packCost) || 0,
              packDescription: typeof it.packDescription === 'string' ? it.packDescription : '',
            }))
        : [];

      if (items.length === 0) {
        setStage('empty');
        return;
      }

      setVendor(typeof parsed.vendor === 'string' ? parsed.vendor : '');
      setInvoiceDate(typeof parsed.invoiceDate === 'string' ? parsed.invoiceDate : '');
      const builtRows: ReviewRow[] = items.map((item, idx) => {
        const match = findMatch(item.name, ingredients);
        return {
          key: `${idx}-${item.name}`,
          invoiceName: item.name,
          packDescription: item.packDescription,
          ingredientId: match ? match.id : null,
          newPackCostDisplay: item.packCost > 0 ? String(item.packCost) : '',
          accepted: !!match,
          addExpanded: false,
          addForm: null,
          added: false,
        };
      });
      setRows(builtRows);
      setStage('review');

      const unmatched = builtRows.filter(r => r.ingredientId === null);
      if (unmatched.length > 0) {
        fetchAddSuggestions(unmatched.map(r => ({ invoiceName: r.invoiceName, packDescription: r.packDescription })));
      }
    } catch (e: any) {
      setError(e?.message || 'Could not read the invoice. Try again.');
      setStage('failed');
    }
  };

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { base64, mediaType } = await readFileAsBase64(file);
      lastFile.current = { base64, mediaType };
      await runExtraction(base64, mediaType);
    } catch (e: any) {
      setError(e?.message || 'Could not read that file.');
      setStage('failed');
    }
  };

  const handleRetry = () => {
    if (lastFile.current) {
      runExtraction(lastFile.current.base64, lastFile.current.mediaType);
    } else {
      setStage('idle');
      setError(null);
    }
  };

  const toggleAccept = (key: string) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, accepted: !r.accepted } : r));
  };

  const updatePrice = (key: string, value: string) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, newPackCostDisplay: value } : r));
  };

  const handleMatchChange = (key: string, ingredientId: string | null) => {
    setRows(prev => prev.map(r => r.key === key ? {
      ...r,
      ingredientId,
      accepted: ingredientId !== null,
      addExpanded: ingredientId !== null ? false : r.addExpanded,
      addForm: ingredientId !== null ? null : r.addForm,
    } : r));
  };

  const toggleAddExpand = (key: string) => {
    setRows(prev => prev.map(r => {
      if (r.key !== key) return r;
      if (r.addExpanded) return { ...r, addExpanded: false };
      const suggestion = addSuggestions[r.invoiceName];
      return { ...r, addExpanded: true, addForm: r.addForm ?? buildAddForm(r, suggestion, unitSystem) };
    }));
  };

  const updateAddForm = (key: string, patch: Partial<AddForm>) => {
    setRows(prev => prev.map(r => r.key === key && r.addForm ? { ...r, addForm: { ...r.addForm, ...patch } } : r));
  };

  const confirmAdd = async (row: ReviewRow) => {
    if (!row.addForm || addingKey || !canConfirmAdd(row.addForm)) return;
    const f = row.addForm;
    setAddingKey(row.key);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const qtyBase = toBase(parseFloat(f.purchaseQtyDisplay) || 0, f.purchaseQtyUnit);
      await addDoc(collection(db, 'ingredients'), {
        name: f.name.trim(),
        category: f.category as IngredientCategory,
        measureType: f.measureType,
        purchaseUnit: f.purchaseUnit.trim(),
        purchaseCost: parseFloat(f.purchaseCost) || 0,
        purchaseQty: qtyBase,
        yieldPercent: parseFloat(f.yieldPercent) || 100,
        ...(f.allergens.length > 0 && { allergens: f.allergens }),
        lastVerified: today,
        priceSource: 'invoice',
      });
      setRows(prev => prev.map(r => r.key === row.key ? { ...r, added: true, addExpanded: false } : r));
      showToast(`Added "${f.name.trim()}" to Master Pantry.`);
    } finally {
      setAddingKey(null);
    }
  };

  const isEligibleRow = (r: ReviewRow): boolean => {
    if (!r.ingredientId) return false;
    const cost = parseFloat(r.newPackCostDisplay);
    return !isNaN(cost) && cost > 0;
  };

  const eligibleRows = rows.filter(isEligibleRow);
  const acceptedCount = eligibleRows.filter(r => r.accepted).length;

  const resetToIdle = () => {
    setStage('idle');
    setError(null);
    setRows([]);
    setVendor('');
    setInvoiceDate('');
    setAddSuggestions({});
    lastFile.current = null;
  };

  const handleApply = async () => {
    if (applying) return;
    const toApply = eligibleRows.filter(r => r.accepted);
    if (toApply.length === 0) return;
    setApplying(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await Promise.all(toApply.map(r => {
        const cost = parseFloat(r.newPackCostDisplay);
        return updateDoc(doc(db, 'ingredients', r.ingredientId!), {
          purchaseCost: cost,
          priceSource: 'invoice',
          lastVerified: today,
        });
      }));
      showToast(`Updated ${toApply.length} ingredient price${toApply.length !== 1 ? 's' : ''}.`);
      resetToIdle();
    } catch (e: any) {
      setError(e?.message || 'Could not save the price updates.');
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    resetToIdle();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-[21px]">
      <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] shadow-2xl w-full max-w-[1100px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-[21px] py-[13px] border-b border-zinc-900 shrink-0">
          <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
            <Receipt className="w-4 h-4 text-amber-400" />
            Update Prices From Invoice
          </h2>
          <button onClick={handleClose} className="p-[5px] text-zinc-500 hover:text-zinc-200 transition-colors duration-[144ms]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={e => { handleFileSelected(e.target.files?.[0]); e.target.value = ''; }}
        />

        <div className="p-[21px] overflow-y-auto space-y-[13px]">
          {stage === 'idle' && (
            <div className="border-2 border-dashed border-zinc-800 rounded-[13px] p-[55px] text-center space-y-[13px]">
              <Upload className="w-8 h-8 text-zinc-700 mx-auto" />
              <p className="text-xs text-zinc-500">
                Upload or photograph an invoice. Nothing is stored — the image is sent for extraction only.
              </p>
              <button onClick={() => fileInputRef.current?.click()} className={`${BTN_PRIMARY} inline-flex items-center gap-[8px]`}>
                <Upload className="w-3.5 h-3.5" />
                Choose Invoice
              </button>
            </div>
          )}

          {stage === 'reading' && (
            <div className="p-[55px] text-center space-y-[13px]">
              <Loader2 className="w-8 h-8 text-emerald-400 mx-auto animate-spin" />
              <p className="text-xs text-zinc-400">Reading invoice…</p>
            </div>
          )}

          {stage === 'failed' && (
            <div className="p-[34px] text-center space-y-[13px]">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
              <p className="text-xs text-red-300">{error || 'Could not read the invoice.'}</p>
              <div className="flex items-center justify-center gap-[8px]">
                <button onClick={handleRetry} className={BTN_PRIMARY}>Retry</button>
                <button onClick={() => fileInputRef.current?.click()} className={BTN_GHOST}>Choose Different File</button>
              </div>
            </div>
          )}

          {stage === 'empty' && (
            <div className="p-[34px] text-center space-y-[13px]">
              <FileWarning className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-500">No ingredient prices found — try a clearer photo.</p>
              <button onClick={() => fileInputRef.current?.click()} className={BTN_PRIMARY}>Choose Different File</button>
            </div>
          )}

          {stage === 'review' && (
            <div className="space-y-[13px]">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{vendor || 'Vendor not detected'}</span>
                <span>{invoiceDate || 'Date not detected'}</span>
              </div>

              <div className="border border-zinc-800 rounded-[8px] overflow-hidden">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-900/40">
                    <tr>
                      <th className="px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Invoice Item</th>
                      <th className="px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Matched Ingredient</th>
                      <th className="px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Current</th>
                      <th className="px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">New Cost</th>
                      <th className="px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center">Accept / Add</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.flatMap(row => {
                      const ing = row.ingredientId ? ingredientsById.get(row.ingredientId) ?? null : null;
                      const eligible = isEligibleRow(row);
                      const mismatch = ing ? packSizeMismatch(ing.purchaseUnit, row.packDescription) : false;

                      const mainRow = (
                        <tr key={row.key} className="border-t border-zinc-900">
                          <td className="px-[13px] py-[8px]">
                            <span className="block text-zinc-200 font-bold">{row.invoiceName}</span>
                            {row.packDescription && <span className="block text-[10px] text-zinc-600">{row.packDescription}</span>}
                          </td>
                          <td className="px-[13px] py-[8px]">
                            <select
                              value={row.ingredientId ?? ''}
                              onChange={e => handleMatchChange(row.key, e.target.value || null)}
                              disabled={row.added}
                              className={`${INPUT} disabled:opacity-40`}
                            >
                              <option value="">No match</option>
                              {sortedIngredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                          </td>
                          <td className="px-[13px] py-[8px] text-zinc-500 tabular-nums">
                            {ing ? `${ing.purchaseUnit || '—'} — $${ing.purchaseCost.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-[13px] py-[8px]">
                            {ing ? (
                              <>
                                <input
                                  type="number"
                                  value={row.newPackCostDisplay}
                                  onChange={e => updatePrice(row.key, e.target.value)}
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  className={`${INPUT} w-24`}
                                />
                                <div className="flex items-center gap-[5px] mt-[3px]">
                                  {row.packDescription && <span className="text-[10px] text-zinc-600">{row.packDescription}</span>}
                                  {mismatch && (
                                    <span title="Invoice pack may differ from pantry pack — confirm the new cost is for the pantry's pack size">
                                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : '—'}
                          </td>
                          <td className="px-[13px] py-[8px] text-center">
                            {ing ? (
                              <input
                                type="checkbox"
                                checked={row.accepted && eligible}
                                disabled={!eligible}
                                onChange={() => toggleAccept(row.key)}
                                className="w-4 h-4 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                                title={!eligible ? 'Enter a valid cost to accept this line' : undefined}
                              />
                            ) : row.added ? (
                              <span className="text-emerald-400 text-[10px] font-bold uppercase inline-flex items-center gap-[3px]">
                                <Check className="w-3 h-3" /> Added
                              </span>
                            ) : (
                              <button
                                onClick={() => toggleAddExpand(row.key)}
                                disabled={suggestLoading}
                                className={`${BTN_GHOST} text-[10px] px-[8px] py-[5px] inline-flex items-center gap-[3px] disabled:opacity-40 disabled:cursor-not-allowed`}
                              >
                                <Plus className="w-3 h-3" />
                                {suggestLoading ? 'Suggesting…' : row.addExpanded ? 'Cancel' : 'Add to Pantry'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );

                      if (row.ingredientId !== null || !row.addExpanded || !row.addForm || row.added) {
                        return [mainRow];
                      }

                      const f = row.addForm;
                      const formRow = (
                        <tr key={`${row.key}-form`} className="border-t border-zinc-900 bg-zinc-900/30">
                          <td colSpan={5} className="px-[13px] py-[13px]">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px]">
                              <div className="col-span-2 md:col-span-1">
                                <label className={FIELD_LABEL}>Name</label>
                                <input type="text" value={f.name} onChange={e => updateAddForm(row.key, { name: e.target.value })} className={INPUT} />
                              </div>
                              <div>
                                <label className={FIELD_LABEL}>Category</label>
                                <select value={f.category} onChange={e => updateAddForm(row.key, { category: e.target.value as IngredientCategory })} className={INPUT}>
                                  <option value="">— Select —</option>
                                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className={FIELD_LABEL}>Measure Type</label>
                                <select
                                  value={f.measureType}
                                  onChange={e => {
                                    const mt = e.target.value as MeasureType;
                                    updateAddForm(row.key, { measureType: mt, purchaseQtyUnit: defaultDisplayUnit(mt, unitSystem) });
                                  }}
                                  className={INPUT}
                                >
                                  <option value="weight">Weight</option>
                                  <option value="volume">Volume</option>
                                  <option value="each">Each / Count</option>
                                </select>
                              </div>
                              <div>
                                <label className={FIELD_LABEL}>Pack Description</label>
                                <input
                                  type="text"
                                  value={f.purchaseUnit}
                                  onChange={e => updateAddForm(row.key, { purchaseUnit: e.target.value })}
                                  placeholder="e.g. 50 lb bag"
                                  className={INPUT}
                                />
                              </div>
                              <div>
                                <label className={FIELD_LABEL}>Pack Qty</label>
                                <input
                                  type="number"
                                  value={f.purchaseQtyDisplay}
                                  onChange={e => updateAddForm(row.key, { purchaseQtyDisplay: e.target.value })}
                                  min="0"
                                  step="any"
                                  className={INPUT}
                                />
                              </div>
                              <div>
                                <label className={FIELD_LABEL}>Unit</label>
                                <select
                                  value={f.purchaseQtyUnit}
                                  onChange={e => updateAddForm(row.key, { purchaseQtyUnit: e.target.value as DisplayUnit })}
                                  className={INPUT}
                                  disabled={f.measureType === 'each'}
                                >
                                  {displayUnitsFor(f.measureType, unitSystem).map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className={FIELD_LABEL}>Cost ($)</label>
                                <input
                                  type="number"
                                  value={f.purchaseCost}
                                  onChange={e => updateAddForm(row.key, { purchaseCost: e.target.value })}
                                  min="0"
                                  step="0.01"
                                  className={INPUT}
                                />
                              </div>
                              <div>
                                <label className={FIELD_LABEL}>Yield %</label>
                                <input
                                  type="number"
                                  value={f.yieldPercent}
                                  onChange={e => updateAddForm(row.key, { yieldPercent: e.target.value })}
                                  min="1"
                                  max="100"
                                  className={INPUT}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-[8px] mt-[13px]">
                              <button onClick={() => toggleAddExpand(row.key)} className={BTN_GHOST}>Cancel</button>
                              <button
                                onClick={() => confirmAdd(row)}
                                disabled={addingKey === row.key || !canConfirmAdd(f)}
                                className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
                              >
                                {addingKey === row.key ? 'Adding…' : 'Confirm & Add to Pantry'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );

                      return [mainRow, formRow];
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-[5px]">
                <p className="text-xs text-zinc-500">
                  {acceptedCount} of {eligibleRows.length} prices will be updated
                </p>
                <div className="flex items-center gap-[8px]">
                  <button onClick={() => fileInputRef.current?.click()} className={BTN_GHOST}>New Invoice</button>
                  <button
                    onClick={handleApply}
                    disabled={applying || acceptedCount === 0}
                    className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {applying ? 'Applying…' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className="absolute bottom-[21px] left-1/2 -translate-x-1/2 bg-emerald-950/90 border border-emerald-700 rounded-[8px] px-[13px] py-[8px] flex items-center gap-[8px] shadow-lg">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-300">{toast}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePriceUpdate;
