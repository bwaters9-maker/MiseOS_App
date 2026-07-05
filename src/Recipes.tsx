import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChefHat, Plus, Trash2, X, Check, Search, Layers, UtensilsCrossed, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { db } from './firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useRecipeCategories } from './hooks/useRecipeCategories';
import { AlertDialog } from './components/AlertDialog';
import {
  recipeCost, costPerPortion, fcPercent, suggestedPrice, wouldCreateCycle, fcColor,
} from './lib/costEngine';
import {
  toBase, displayUnitsFor, defaultDisplayUnit, smartUnit, costPerDisplayUnit,
} from './lib/units';
import { callAi, parseAiJson } from './lib/ai';
import type { Ingredient, Recipe, RecipeLine, MeasureType, RecipeCategory } from './types';
import type { UnitSystem, DisplayUnit } from './lib/units';

const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';
const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';

const pantrySystemPrompt = (unitSystem: UnitSystem): string => `You are a professional chef proposing ingredients for a dish from a specific restaurant's Master Pantry inventory. You will receive the recipe's name, category, recipe type, and the pantry as a JSON list of { id, name }.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"suggestions":[{"ingredientId":"...","qty":0,"unit":"...","why":"..."}],"notInPantry":["..."]}

Rules:
- Every "ingredientId" must be copied exactly from the provided pantry list. Never invent an ingredient or an id that is not in the list.
- Only suggest ingredients that genuinely belong in this dish.
- "qty" is the amount of that ingredient needed for one batch of this recipe, as a plain number.
- "unit" must be one of: ${unitSystem === 'imperial' ? '"oz", "lb", "fl oz", "qt", "each"' : '"g", "kg", "ml", "L", "each"'} — use weight units for solids, volume units for liquids, and "each" for countable items like whole shallots, eggs, or lemons.
- "why" is one short phrase (under 8 words) naming the ingredient's role in the dish.
- "notInPantry" lists ingredient names this dish would typically need that are not in the provided pantry list. Informational only — never invent a matching id for these.
- If nothing in the pantry fits, return empty arrays for both fields.`;

const METHOD_SYSTEM_PROMPT = `You are a professional chef writing a kitchen method (procedure) for a restaurant back-of-house team. You will receive the recipe's name, recipe type, batch yield, and its current ingredient lines with quantities.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"steps":["...","..."]}

Rules:
- Each entry in "steps" is one procedural step, written in plain professional kitchen prose.
- Do not include markdown, numbering, or bullet characters in the step text — the UI numbers steps itself.
- Be direct and specific: state temperatures, times, and techniques where relevant.
- Cover the full batch from mise en place through finish.
- If there are no ingredient lines yet, write general best-practice steps for a dish with this name.`;

interface PantrySuggestion {
  key: string;
  ingredientId: string;
  qtyDisplay: string;
  aiUnit: string;
  why: string;
}

const categoryLabel = (r: Recipe, categories: RecipeCategory[]): string => {
  const cat = categories.find(c => c.id === r.categoryId);
  if (cat) return cat.name;
  const legacy = r.course?.trim();
  return legacy ? `${legacy} (uncategorized)` : 'Uncategorized';
};

interface LineDraft {
  key: string;
  type: 'ingredient' | 'recipe';
  refId: string;
  qtyDisplay: string;
  qtyUnit: DisplayUnit;
  note: string;
}

interface FormState {
  name: string;
  recipeType: 'sub' | 'menu';
  course: string;
  categoryId: string;
  batchYieldMeasureType: MeasureType;
  batchYieldQtyDisplay: string;
  batchYieldUnit: DisplayUnit;
  portions: string;
  lines: LineDraft[];
  methodSteps: string[];
  menuPrice: string;
}

const BLANK = (recipeType: 'sub' | 'menu', unitSystem: UnitSystem): FormState => ({
  name: '',
  recipeType,
  course: '',
  categoryId: '',
  batchYieldMeasureType: 'weight',
  batchYieldQtyDisplay: '',
  batchYieldUnit: defaultDisplayUnit('weight', unitSystem),
  portions: '1',
  lines: [],
  methodSteps: [],
  menuPrice: '',
});

const lineMeasureType = (line: LineDraft | RecipeLine, ingredients: Ingredient[], recipes: Recipe[]): MeasureType => {
  if (line.type === 'ingredient') {
    return ingredients.find(i => i.id === line.refId)?.measureType ?? 'weight';
  }
  return recipes.find(r => r.id === line.refId)?.batchYield.measureType ?? 'weight';
};

const toForm = (recipe: Recipe, unitSystem: UnitSystem, ingredients: Ingredient[], recipes: Recipe[]): FormState => {
  const { value: batchYieldValue, unit: batchYieldUnit } = smartUnit(recipe.batchYield.qty, recipe.batchYield.measureType, unitSystem);
  return {
    name: recipe.name,
    recipeType: recipe.recipeType,
    course: recipe.course,
    categoryId: recipe.categoryId ?? '',
    batchYieldMeasureType: recipe.batchYield.measureType,
    batchYieldQtyDisplay: batchYieldValue.toFixed(batchYieldValue >= 10 ? 2 : 3).replace(/\.?0+$/, ''),
    batchYieldUnit,
    portions: String(recipe.portions),
    lines: recipe.lines.map((line, idx) => {
      const mt = lineMeasureType(line, ingredients, recipes);
      const { value, unit } = smartUnit(line.qty, mt, unitSystem);
      return {
        key: `${line.type}:${line.refId}:${idx}`,
        type: line.type,
        refId: line.refId,
        qtyDisplay: value.toFixed(value >= 10 ? 2 : 3).replace(/\.?0+$/, ''),
        qtyUnit: unit,
        note: line.note ?? '',
      };
    }),
    methodSteps: recipe.methodSteps.length > 0 ? [...recipe.methodSteps] : [],
    menuPrice: recipe.menuPrice != null ? String(recipe.menuPrice) : '',
  };
};

const toDoc = (form: FormState): Omit<Recipe, 'id'> => ({
  name: form.name.trim(),
  recipeType: form.recipeType,
  course: form.course.trim(),
  ...(form.categoryId && { categoryId: form.categoryId }),
  batchYield: {
    qty: toBase(parseFloat(form.batchYieldQtyDisplay) || 0, form.batchYieldUnit),
    measureType: form.batchYieldMeasureType,
  },
  portions: form.recipeType === 'menu' ? (parseFloat(form.portions) || 0) : 1,
  lines: form.lines.map((l): RecipeLine => ({
    type: l.type,
    refId: l.refId,
    qty: toBase(parseFloat(l.qtyDisplay) || 0, l.qtyUnit),
    ...(l.note.trim() && { note: l.note.trim() }),
  })),
  methodSteps: form.methodSteps.map(s => s.trim()).filter(Boolean),
  ...(form.recipeType === 'menu' && form.menuPrice !== '' && !isNaN(parseFloat(form.menuPrice))
    ? { menuPrice: parseFloat(form.menuPrice) }
    : {}),
  updatedAt: new Date().toISOString(),
});

const virtualRecipe = (form: FormState, id: string): Recipe => ({
  id,
  name: form.name,
  recipeType: form.recipeType,
  course: form.course,
  categoryId: form.categoryId || undefined,
  batchYield: {
    qty: toBase(parseFloat(form.batchYieldQtyDisplay) || 0, form.batchYieldUnit),
    measureType: form.batchYieldMeasureType,
  },
  portions: form.recipeType === 'menu' ? (parseFloat(form.portions) || 0) : 1,
  lines: form.lines.map((l): RecipeLine => ({
    type: l.type,
    refId: l.refId,
    qty: toBase(parseFloat(l.qtyDisplay) || 0, l.qtyUnit),
    ...(l.note.trim() && { note: l.note.trim() }),
  })),
  methodSteps: form.methodSteps,
  menuPrice: form.menuPrice !== '' && !isNaN(parseFloat(form.menuPrice)) ? parseFloat(form.menuPrice) : undefined,
  updatedAt: '',
});

const scaleRecipe = (recipe: Recipe, factor: number): Recipe => {
  if (factor === 1) return recipe;
  return {
    ...recipe,
    batchYield: { ...recipe.batchYield, qty: recipe.batchYield.qty * factor },
    portions: recipe.portions * factor,
    lines: recipe.lines.map(l => ({ ...l, qty: l.qty * factor })),
  };
};

const LineSearchBox: React.FC<{
  currentRecipeId: string;
  ingredients: Ingredient[];
  recipes: Recipe[];
  categories: RecipeCategory[];
  unitSystem: UnitSystem;
  onAdd: (line: LineDraft) => void;
}> = ({ currentRecipeId, ingredients, recipes, categories, unitSystem, onAdd }) => {
  const [term, setTerm] = useState('');
  const [focused, setFocused] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const counter = useRef(0);

  const isBrowsing = term.trim().length >= 1 || categoryFilter !== null;

  const ingredientMatches = term.trim().length >= 1
    ? ingredients.filter(i => i.name.toLowerCase().includes(term.toLowerCase())).slice(0, 6)
    : [];
  const subRecipeMatches = isBrowsing
    ? recipes
        .filter(r => r.recipeType === 'sub')
        .filter(r => term.trim().length === 0 || r.name.toLowerCase().includes(term.toLowerCase()))
        .filter(r => !categoryFilter || r.categoryId === categoryFilter)
        .slice(0, 8)
    : [];

  const addIngredient = (ing: Ingredient) => {
    const unit = defaultDisplayUnit(ing.measureType, unitSystem);
    counter.current += 1;
    onAdd({ key: `ingredient:${ing.id}:${counter.current}`, type: 'ingredient', refId: ing.id, qtyDisplay: '', qtyUnit: unit, note: '' });
    setTerm('');
    setFocused(false);
  };

  const addRecipe = (r: Recipe, blocked: boolean) => {
    if (blocked) return;
    const unit = defaultDisplayUnit(r.batchYield.measureType, unitSystem);
    counter.current += 1;
    onAdd({ key: `recipe:${r.id}:${counter.current}`, type: 'recipe', refId: r.id, qtyDisplay: '', qtyUnit: unit, note: '' });
    setTerm('');
    setFocused(false);
  };

  const hasResults = ingredientMatches.length > 0 || subRecipeMatches.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
        <input
          type="text"
          value={term}
          onChange={e => setTerm(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="+ Add ingredient or sub-recipe…"
          className={`${INPUT} pl-[26px]`}
        />
      </div>
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-[5px] mt-[5px]">
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { setCategoryFilter(null); setFocused(true); }}
            className={`${BADGE} transition-colors duration-[144ms] ${
              categoryFilter === null ? 'text-purple-300 border-purple-700 bg-purple-950/40' : 'text-zinc-500 border-zinc-700 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { setCategoryFilter(prev => prev === c.id ? null : c.id); setFocused(true); }}
              className={`${BADGE} transition-colors duration-[144ms] ${
                categoryFilter === c.id ? 'text-purple-300 border-purple-700 bg-purple-950/40' : 'text-zinc-500 border-zinc-700 hover:text-zinc-300'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {focused && isBrowsing && (
        <div className="absolute z-10 w-full mt-[5px] bg-zinc-950 border border-zinc-800 rounded-[8px] shadow-lg max-h-64 overflow-y-auto">
          {!hasResults && (
            <p className="p-[13px] text-xs text-zinc-600 italic">No matches.</p>
          )}
          {ingredientMatches.map(ing => (
            <div
              key={ing.id}
              onMouseDown={() => addIngredient(ing)}
              className="flex justify-between items-center px-[13px] py-[8px] text-xs text-zinc-300 hover:bg-emerald-900/30 cursor-pointer transition-colors duration-[144ms]"
            >
              <span>{ing.name}</span>
              <span className={`${BADGE} text-zinc-500 border-zinc-700`}>Ingredient</span>
            </div>
          ))}
          {subRecipeMatches.map(r => {
            const blocked = wouldCreateCycle(currentRecipeId, r.id, recipes);
            return (
              <div
                key={r.id}
                onMouseDown={() => addRecipe(r, blocked)}
                className={`flex justify-between items-center px-[13px] py-[8px] text-xs transition-colors duration-[144ms] ${
                  blocked ? 'text-zinc-600 cursor-not-allowed opacity-60' : 'text-zinc-300 hover:bg-purple-900/30 cursor-pointer'
                }`}
                title={blocked ? 'Circular reference — this would create a cycle' : undefined}
              >
                <span className="flex items-center gap-[5px]">
                  {blocked && <AlertTriangle className="w-3 h-3 text-red-500" />}
                  {r.name}
                </span>
                <span className={`${BADGE} ${blocked ? 'text-red-300 border-red-900 bg-red-950/30' : 'text-purple-300 border-purple-800 bg-purple-950/30'}`}>
                  {blocked ? 'Circular reference' : 'Sub-Recipe'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RecipeEditor: React.FC<{
  form: FormState;
  setForm: (f: FormState) => void;
  currentRecipeId: string;
  ingredients: Ingredient[];
  recipes: Recipe[];
  categories: RecipeCategory[];
  unitSystem: UnitSystem;
}> = ({ form, setForm, currentRecipeId, ingredients, recipes, categories, unitSystem }) => {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });

  const handleCategoryChange = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    setForm({ ...form, categoryId, course: cat ? cat.name : form.course });
  };

  const legacyUncategorized = !categories.some(c => c.id === form.categoryId) && form.course.trim().length > 0;

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setForm({ ...form, lines: form.lines.map(l => l.key === key ? { ...l, ...patch } : l) });
  };
  const removeLine = (key: string) => {
    setForm({ ...form, lines: form.lines.filter(l => l.key !== key) });
  };
  const addLine = (line: LineDraft) => {
    setForm({ ...form, lines: [...form.lines, line] });
  };

  const handleBatchMeasureTypeChange = (mt: MeasureType) => {
    setForm({ ...form, batchYieldMeasureType: mt, batchYieldUnit: defaultDisplayUnit(mt, unitSystem) });
  };

  const addStep = () => setForm({ ...form, methodSteps: [...form.methodSteps, ''] });
  const updateStep = (idx: number, v: string) => setForm({ ...form, methodSteps: form.methodSteps.map((s, i) => i === idx ? v : s) });
  const removeStep = (idx: number) => setForm({ ...form, methodSteps: form.methodSteps.filter((_, i) => i !== idx) });

  const batchYieldUnits = displayUnitsFor(form.batchYieldMeasureType, unitSystem);

  const suggestionCounter = useRef(0);
  const [pantryLoading, setPantryLoading] = useState(false);
  const [pantryError, setPantryError] = useState<string | null>(null);
  const [pantrySuggestions, setPantrySuggestions] = useState<PantrySuggestion[]>([]);
  const [notInPantry, setNotInPantry] = useState<string[]>([]);

  const handleBuildFromPantry = async () => {
    setPantryLoading(true);
    setPantryError(null);
    try {
      const categoryName = categories.find(c => c.id === form.categoryId)?.name || form.course.trim() || '(uncategorized)';
      const userContent = JSON.stringify({
        recipeName: form.name.trim() || '(untitled)',
        category: categoryName,
        recipeType: form.recipeType,
        pantry: ingredients.map(i => ({ id: i.id, name: i.name })),
      });
      const raw = await callAi(pantrySystemPrompt(unitSystem), userContent, 2048);
      let parsed: any;
      try {
        parsed = parseAiJson(raw);
      } catch {
        throw new Error('The AI response could not be read. Try again.');
      }
      const validIds = new Set(ingredients.map(i => i.id));
      const alreadyOnRecipe = new Set(form.lines.filter(l => l.type === 'ingredient').map(l => l.refId));
      const suggestions: PantrySuggestion[] = (Array.isArray(parsed.suggestions) ? parsed.suggestions : [])
        .filter((s: any) => s && typeof s.ingredientId === 'string' && validIds.has(s.ingredientId) && !alreadyOnRecipe.has(s.ingredientId))
        .map((s: any, idx: number) => ({
          key: `${s.ingredientId}-${idx}`,
          ingredientId: s.ingredientId as string,
          qtyDisplay: String(s.qty ?? ''),
          aiUnit: typeof s.unit === 'string' ? s.unit : '',
          why: typeof s.why === 'string' ? s.why : '',
        }));
      setPantrySuggestions(suggestions);
      setNotInPantry(Array.isArray(parsed.notInPantry) ? parsed.notInPantry.filter((x: any) => typeof x === 'string') : []);
    } catch (e: any) {
      setPantryError(e?.message || 'Could not reach the AI service.');
    } finally {
      setPantryLoading(false);
    }
  };

  const acceptSuggestion = (s: PantrySuggestion) => {
    const ing = ingredients.find(i => i.id === s.ingredientId);
    if (!ing) return;
    const validUnits = displayUnitsFor(ing.measureType, unitSystem) as string[];
    const unit = (validUnits.includes(s.aiUnit) ? s.aiUnit : defaultDisplayUnit(ing.measureType, unitSystem)) as DisplayUnit;
    suggestionCounter.current += 1;
    addLine({
      key: `ingredient:${s.ingredientId}:sugg-${suggestionCounter.current}`,
      type: 'ingredient',
      refId: s.ingredientId,
      qtyDisplay: s.qtyDisplay,
      qtyUnit: unit,
      note: '',
    });
    setPantrySuggestions(prev => prev.filter(x => x.key !== s.key));
  };

  const dismissSuggestion = (key: string) => setPantrySuggestions(prev => prev.filter(x => x.key !== key));

  const [methodLoading, setMethodLoading] = useState(false);
  const [methodError, setMethodError] = useState<string | null>(null);
  const [confirmReplaceMethod, setConfirmReplaceMethod] = useState(false);

  const runDraftMethod = async () => {
    setConfirmReplaceMethod(false);
    setMethodLoading(true);
    setMethodError(null);
    try {
      const lineSummaries = form.lines.map(l => {
        const ref = l.type === 'ingredient' ? ingredients.find(i => i.id === l.refId) : recipes.find(r => r.id === l.refId);
        return { name: ref?.name ?? 'unknown ingredient', qty: l.qtyDisplay, unit: l.qtyUnit };
      });
      const userContent = JSON.stringify({
        recipeName: form.name.trim() || '(untitled)',
        recipeType: form.recipeType,
        batchYield: { qty: form.batchYieldQtyDisplay, unit: form.batchYieldUnit },
        ingredients: lineSummaries,
      });
      const raw = await callAi(METHOD_SYSTEM_PROMPT, userContent, 2048);
      let parsed: any;
      try {
        parsed = parseAiJson(raw);
      } catch {
        throw new Error('The AI response could not be read. Try again.');
      }
      const steps = Array.isArray(parsed.steps) ? parsed.steps.filter((s: any) => typeof s === 'string' && s.trim().length > 0) : [];
      if (steps.length === 0) throw new Error('The AI did not return any method steps.');
      setForm({ ...form, methodSteps: steps });
    } catch (e: any) {
      setMethodError(e?.message || 'Could not reach the AI service.');
    } finally {
      setMethodLoading(false);
    }
  };

  const handleDraftMethodClick = () => {
    const hasExisting = form.methodSteps.some(s => s.trim().length > 0);
    if (hasExisting) {
      setConfirmReplaceMethod(true);
    } else {
      runDraftMethod();
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] space-y-[21px]">
      <div className="flex items-center gap-[8px] bg-zinc-900/60 border border-zinc-800 rounded-[8px] p-[5px] w-fit">
        <button
          type="button"
          onClick={() => set('recipeType', 'menu')}
          className={`px-[13px] py-[5px] text-[10px] font-bold uppercase tracking-wider rounded-[5px] transition-colors duration-[144ms] ${
            form.recipeType === 'menu' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'text-zinc-500 border border-transparent hover:text-zinc-300'
          }`}
        >
          Menu Recipe
        </button>
        <button
          type="button"
          onClick={() => set('recipeType', 'sub')}
          className={`px-[13px] py-[5px] text-[10px] font-bold uppercase tracking-wider rounded-[5px] transition-colors duration-[144ms] ${
            form.recipeType === 'sub' ? 'bg-purple-900/60 text-purple-300 border border-purple-700' : 'text-zinc-500 border border-transparent hover:text-zinc-300'
          }`}
        >
          Sub-Recipe
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Name</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Recipe name" className={INPUT} autoFocus />
        </div>
        <div>
          <label className={FIELD_LABEL}>Category</label>
          <select value={form.categoryId} onChange={e => handleCategoryChange(e.target.value)} className={INPUT}>
            <option value="">Select category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {legacyUncategorized && (
            <p className="text-[10px] text-amber-500 mt-[5px]">
              Currently "{form.course}" (uncategorized) — select a category to migrate.
            </p>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${form.recipeType === 'menu' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-[13px]`}>
        <div>
          <label className={FIELD_LABEL}>Measurement Type</label>
          <select value={form.batchYieldMeasureType} onChange={e => handleBatchMeasureTypeChange(e.target.value as MeasureType)} className={INPUT}>
            <option value="weight">Weight</option>
            <option value="volume">Volume</option>
            <option value="each">Each / Count</option>
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Amount</label>
          <input type="number" value={form.batchYieldQtyDisplay} onChange={e => set('batchYieldQtyDisplay', e.target.value)} placeholder="0" min="0" step="any" className={INPUT} />
        </div>
        <div>
          <label className={FIELD_LABEL}>Measurement Unit</label>
          <select value={form.batchYieldUnit} onChange={e => set('batchYieldUnit', e.target.value as DisplayUnit)} className={INPUT} disabled={form.batchYieldMeasureType === 'each'}>
            {batchYieldUnits.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        {form.recipeType === 'menu' && (
          <div>
            <label className={FIELD_LABEL}>Portions</label>
            <input type="number" value={form.portions} onChange={e => set('portions', e.target.value)} min="1" step="1" className={INPUT} />
          </div>
        )}
      </div>

      <div className="space-y-[8px]">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ingredients & Sub-Recipes</h3>
          <button
            type="button"
            onClick={handleBuildFromPantry}
            disabled={pantryLoading}
            className={`${BTN_GHOST} flex items-center gap-[5px] disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {pantryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {pantryLoading ? 'Consulting pantry…' : 'Build From Pantry'}
          </button>
        </div>
        {pantryError && (
          <div className="bg-red-950/30 border border-red-900 rounded-[8px] p-[8px] flex items-start gap-[8px]">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-[1px]" />
            <p className="text-[11px] text-red-300">{pantryError}</p>
          </div>
        )}
        <div className="space-y-[5px]">
          {form.lines.map(line => {
            const mt = lineMeasureType(line, ingredients, recipes);
            const units = displayUnitsFor(mt, unitSystem);
            const ref = line.type === 'ingredient'
              ? ingredients.find(i => i.id === line.refId)
              : recipes.find(r => r.id === line.refId);
            return (
              <div key={line.key} className="flex items-center gap-[8px] bg-zinc-900/40 border border-zinc-800 rounded-[8px] p-[8px]">
                {line.type === 'recipe' && <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                <span className="flex-1 text-xs font-bold text-zinc-200 truncate">{ref?.name ?? '(deleted)'}</span>
                <input
                  type="number"
                  value={line.qtyDisplay}
                  onChange={e => updateLine(line.key, { qtyDisplay: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="any"
                  className="w-20 bg-zinc-950 border border-zinc-700 rounded-[5px] p-[5px] text-xs text-center"
                />
                <select
                  value={line.qtyUnit}
                  onChange={e => updateLine(line.key, { qtyUnit: e.target.value as DisplayUnit })}
                  className="bg-zinc-950 border border-zinc-700 rounded-[5px] p-[5px] text-xs w-16"
                  disabled={mt === 'each'}
                >
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input
                  type="text"
                  value={line.note}
                  onChange={e => updateLine(line.key, { note: e.target.value })}
                  placeholder="note (optional)"
                  className="w-28 bg-zinc-950 border border-zinc-700 rounded-[5px] p-[5px] text-xs text-zinc-400"
                />
                <button onClick={() => removeLine(line.key)} className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {pantrySuggestions.length > 0 && (
          <div className="space-y-[5px] bg-purple-950/10 border border-purple-900/50 rounded-[8px] p-[8px]">
            <p className="text-[9px] font-black uppercase tracking-wider text-purple-400">AI Suggestions — Review</p>
            {pantrySuggestions.map(s => {
              const ing = ingredients.find(i => i.id === s.ingredientId);
              return (
                <div key={s.key} className="flex items-center gap-[8px] bg-zinc-900/40 border border-zinc-800 rounded-[8px] p-[8px]">
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-zinc-200 truncate">{ing?.name ?? s.ingredientId}</span>
                    {s.why && <span className="block text-[10px] text-zinc-500 truncate">{s.why}</span>}
                  </span>
                  <span className="text-xs text-zinc-400 tabular-nums shrink-0">{s.qtyDisplay} {s.aiUnit}</span>
                  <button onClick={() => acceptSuggestion(s)} className="p-[5px] text-emerald-500 hover:text-emerald-300 transition-colors duration-[144ms]" title="Accept">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => dismissSuggestion(s.key)} className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]" title="Dismiss">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {notInPantry.length > 0 && (
          <p className="text-[10px] text-zinc-500 italic">Not in your pantry: {notInPantry.join(', ')}</p>
        )}

        <LineSearchBox
          currentRecipeId={currentRecipeId}
          ingredients={ingredients}
          recipes={recipes}
          categories={categories}
          unitSystem={unitSystem}
          onAdd={addLine}
        />
      </div>

      <div className="space-y-[8px]">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Method</h3>
          <button
            type="button"
            onClick={handleDraftMethodClick}
            disabled={methodLoading}
            className={`${BTN_GHOST} flex items-center gap-[5px] disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {methodLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {methodLoading ? 'Drafting…' : 'Draft Method'}
          </button>
        </div>
        {methodError && (
          <div className="bg-red-950/30 border border-red-900 rounded-[8px] p-[8px] flex items-start gap-[8px]">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-[1px]" />
            <p className="text-[11px] text-red-300">{methodError}</p>
          </div>
        )}
        <div className="space-y-[5px]">
          {form.methodSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-[8px]">
              <span className="text-[10px] font-black text-zinc-600 pt-[8px] w-[21px] text-right shrink-0">{idx + 1}.</span>
              <textarea
                value={step}
                onChange={e => updateStep(idx, e.target.value)}
                rows={2}
                className={`${INPUT} resize-none flex-1`}
                placeholder="Method step"
              />
              <button onClick={() => removeStep(idx)} className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms] mt-[5px]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addStep} className={`${BTN_GHOST} flex items-center gap-[5px]`}>
          <Plus className="w-3 h-3" /> Add Step
        </button>
      </div>

      <AlertDialog
        isOpen={confirmReplaceMethod}
        onClose={() => setConfirmReplaceMethod(false)}
        onConfirm={runDraftMethod}
        title="Replace Method?"
        confirmText="Replace"
      >
        This recipe already has method steps. Drafting a new method will replace them.
      </AlertDialog>
    </div>
  );
};

const ListRow: React.FC<{
  r: Recipe;
  isActive: boolean;
  isConfirm: boolean;
  onOpen: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}> = ({ r, isActive, isConfirm, onOpen, onRequestDelete, onConfirmDelete, onCancelDelete }) => {
  return (
    <div
      className={`group flex items-center justify-between gap-[8px] px-[13px] py-[8px] rounded-[8px] cursor-pointer transition-colors duration-[144ms] ${
        isActive ? 'bg-emerald-900/30 border border-emerald-800' : 'hover:bg-zinc-900/60 border border-transparent'
      }`}
      onClick={() => !isConfirm && onOpen()}
    >
      <span className={`text-xs font-bold truncate ${isActive ? 'text-emerald-300' : 'text-zinc-200'}`}>{r.name}</span>
      {isConfirm ? (
        <div className="flex items-center gap-[5px] shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onConfirmDelete(); }}
            className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}
            title="Confirm delete"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onCancelDelete(); }}
            className={`${BADGE} text-zinc-400 border-zinc-700 hover:text-zinc-200 transition-colors duration-[144ms]`}
            title="Cancel"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-[3px] shrink-0 opacity-0 group-hover:opacity-100">
          <button
            onClick={e => { e.stopPropagation(); onRequestDelete(); }}
            className="p-[3px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

const CostPanel: React.FC<{
  form: FormState;
  setForm: (f: FormState) => void;
  currentRecipeId: string;
  ingredients: Ingredient[];
  recipes: Recipe[];
  unitSystem: UnitSystem;
  targetFcPercent: number;
}> = ({ form, setForm, currentRecipeId, ingredients, recipes, unitSystem, targetFcPercent }) => {
  const [scaleFactor, setScaleFactor] = useState(1);
  const [customScale, setCustomScale] = useState('');

  const base = virtualRecipe(form, currentRecipeId);
  const scaled = scaleRecipe(base, scaleFactor);

  const { batchCost, perPortion, error } = useMemo(() => {
    try {
      const cost = recipeCost(scaled, ingredients, recipes);
      const pp = form.recipeType === 'menu' ? costPerPortion(scaled, ingredients, recipes) : 0;
      return { batchCost: cost, perPortion: pp, error: null as string | null };
    } catch (e: any) {
      return { batchCost: 0, perPortion: 0, error: e.message as string };
    }
  }, [scaled, ingredients, recipes, form.recipeType]);

  const costPerBaseUnit = scaled.batchYield.qty > 0 ? batchCost / scaled.batchYield.qty : 0;
  const menuPriceNum = parseFloat(form.menuPrice) || 0;
  const fc = form.recipeType === 'menu' ? fcPercent(perPortion, menuPriceNum) : 0;
  const suggested = form.recipeType === 'menu' ? suggestedPrice(perPortion, targetFcPercent) : 0;

  const { cost: displayCostPerBase, unit: baseUnitLabel } = costPerDisplayUnit(costPerBaseUnit, scaled.batchYield.measureType, unitSystem);

  const applyScale = (f: number) => { setScaleFactor(f); setCustomScale(''); };
  const applyCustomScale = () => {
    const v = parseFloat(customScale);
    if (v > 0) setScaleFactor(v);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] space-y-[21px] sticky top-[89px]">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-900 pb-[13px]">Live Cost Analysis</h3>

      {error && (
        <div className="bg-red-950/30 border border-red-900 rounded-[8px] p-[13px] flex items-start gap-[8px]">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-[1px]" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-[8px]">
        <p className={FIELD_LABEL}>Batch Scale</p>
        <div className="flex items-center gap-[5px]">
          <button onClick={() => applyScale(0.5)} className={`${scaleFactor === 0.5 ? BTN_PRIMARY : BTN_GHOST}`}>0.5×</button>
          <button onClick={() => applyScale(1)} className={`${scaleFactor === 1 ? BTN_PRIMARY : BTN_GHOST}`}>1×</button>
          <button onClick={() => applyScale(2)} className={`${scaleFactor === 2 ? BTN_PRIMARY : BTN_GHOST}`}>2×</button>
          <input
            type="number"
            value={customScale}
            onChange={e => setCustomScale(e.target.value)}
            onBlur={applyCustomScale}
            onKeyDown={e => e.key === 'Enter' && applyCustomScale()}
            placeholder="custom"
            min="0"
            step="any"
            className="w-20 bg-zinc-900 border border-zinc-700 rounded-[5px] p-[5px] text-xs text-center"
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-zinc-400">Batch Cost</span>
        <span className="text-lg font-black text-white tabular-nums">${batchCost.toFixed(2)}</span>
      </div>

      {form.recipeType === 'sub' ? (
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-zinc-400">Cost / {baseUnitLabel}</span>
          <span className="text-lg font-black text-emerald-400 tabular-nums">${displayCostPerBase.toFixed(4)}</span>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-400">Cost / Portion</span>
            <span className="text-lg font-black text-white tabular-nums">${perPortion.toFixed(2)}</span>
          </div>

          <div>
            <label className={FIELD_LABEL}>Menu Price ($)</label>
            <input
              type="number"
              value={form.menuPrice}
              onChange={e => setForm({ ...form, menuPrice: e.target.value })}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={INPUT}
            />
          </div>

          <div className="p-[13px] bg-zinc-900/50 rounded-[8px] border border-zinc-850">
            <div className="flex justify-between mb-[8px]">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Food Cost %</span>
              <span className={`text-xs font-black tabular-nums ${fcColor(fc, targetFcPercent)}`}>
                {menuPriceNum > 0 ? `${fc.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="w-full h-[5px] bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${fc <= targetFcPercent ? 'bg-emerald-400' : fc <= targetFcPercent + 5 ? 'bg-amber-400' : 'bg-red-500'}`}
                style={{ width: `${Math.min(fc, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-[8px]">
              Suggested price at {targetFcPercent}% target: <span className="text-emerald-400 font-bold">${suggested.toFixed(2)}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

interface RecipesProps {
  unitSystem?: UnitSystem;
  targetFcPercent?: number;
  selectedRecipeId?: string | null;
  setSelectedRecipeId?: (id: string | null) => void;
}

const Recipes: React.FC<RecipesProps> = ({ unitSystem = 'imperial', targetFcPercent = 30, selectedRecipeId, setSelectedRecipeId }) => {
  const allRecipes = (useKitchenSelector((s: any) => s.recipes) as Recipe[]) ?? [];
  const allIngredients = (useKitchenSelector((s: any) => s.ingredients) as Ingredient[]) ?? [];
  const { categories } = useRecipeCategories();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorSession, setEditorSession] = useState(0);

  const filtered = allRecipes
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .filter(r => !categoryFilter || r.categoryId === categoryFilter);
  const menuRecipes = filtered.filter(r => r.recipeType === 'menu').sort((a, b) => a.name.localeCompare(b.name));
  const subRecipes = filtered.filter(r => r.recipeType === 'sub').sort((a, b) => a.name.localeCompare(b.name));

  const menuByCourse = useMemo(() => {
    const groups: Record<string, Recipe[]> = {};
    menuRecipes.forEach(r => {
      const key = categoryLabel(r, categories);
      (groups[key] ??= []).push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [menuRecipes, categories]);

  const openRecipe = (r: Recipe) => {
    setSelectedId(r.id);
    setIsCreating(false);
    setForm(toForm(r, unitSystem, allIngredients, allRecipes));
    setDeleteConfirmId(null);
    setEditorSession(s => s + 1);
  };

  // Consumes a pending navigation request (e.g. from the Menu view's row
  // click) — waits for allRecipes to be populated if the listener hasn't
  // delivered yet, rather than dropping the request.
  useEffect(() => {
    if (!selectedRecipeId) return;
    const target = allRecipes.find(r => r.id === selectedRecipeId);
    if (target) {
      openRecipe(target);
      setSelectedRecipeId?.(null);
    }
  }, [selectedRecipeId, allRecipes]);

  const startCreate = (recipeType: 'sub' | 'menu') => {
    setSelectedId(null);
    setIsCreating(true);
    setForm(BLANK(recipeType, unitSystem));
    setDeleteConfirmId(null);
    setEditorSession(s => s + 1);
  };

  const closeEditor = () => {
    setSelectedId(null);
    setIsCreating(false);
    setForm(null);
  };

  const handleSave = async () => {
    if (!form || saving || !form.name.trim()) return;
    setSaving(true);
    try {
      const docData = toDoc(form);
      if (selectedId) {
        await updateDoc(doc(db, 'recipes', selectedId), docData);
      } else {
        const ref = await addDoc(collection(db, 'recipes'), docData);
        setSelectedId(ref.id);
        setIsCreating(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'recipes', id));
    setDeleteConfirmId(null);
    if (selectedId === id) closeEditor();
  };

  return (
    <div className="max-w-[1597px] mx-auto px-[21px] py-[34px] font-mono">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-[13px] mb-[34px]">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
            <ChefHat className="w-5 h-5 text-emerald-400" />
            Recipes
          </h1>
          <p className="text-xs text-zinc-500 mt-[5px]">
            {allRecipes.length} recipe{allRecipes.length !== 1 ? 's' : ''} — {menuRecipes.length} menu, {subRecipes.length} sub
          </p>
        </div>
      </div>

      {allRecipes.length === 0 && !isCreating && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[55px] text-center mb-[21px]">
          <ChefHat className="w-8 h-8 text-zinc-700 mx-auto mb-[13px]" />
          <p className="text-xs text-zinc-500">No recipes yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[377px_1fr] gap-[21px] items-start">
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[13px] space-y-[13px]">
          <div className="relative">
            <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recipes…"
              className={`${INPUT} pl-[26px]`}
            />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-[5px]">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`${BADGE} transition-colors duration-[144ms] ${
                  categoryFilter === null ? 'text-emerald-300 border-emerald-700 bg-emerald-950/40' : 'text-zinc-500 border-zinc-700 hover:text-zinc-300'
                }`}
              >
                All
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(prev => prev === c.id ? null : c.id)}
                  className={`${BADGE} transition-colors duration-[144ms] ${
                    categoryFilter === c.id ? 'text-emerald-300 border-emerald-700 bg-emerald-950/40' : 'text-zinc-500 border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-[8px]">
            <button onClick={() => startCreate('menu')} className={`${BTN_PRIMARY} flex-1 flex items-center justify-center gap-[5px]`}>
              <Plus className="w-3 h-3" /> Menu Recipe
            </button>
            <button onClick={() => startCreate('sub')} className={`${BTN_GHOST} flex-1 flex items-center justify-center gap-[5px]`}>
              <Plus className="w-3 h-3" /> Sub-Recipe
            </button>
          </div>

          <div className="space-y-[13px] max-h-[610px] overflow-y-auto">
            {menuRecipes.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-[8px] flex items-center gap-[5px]">
                  <UtensilsCrossed className="w-3 h-3" /> Menu Recipes
                </p>
                <div className="space-y-[13px]">
                  {menuByCourse.map(([course, list]) => (
                    <div key={course} className="space-y-[3px]">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 px-[13px]">{course}</p>
                      <div className="space-y-[2px]">
                        {list.map(r => (
                          <ListRow
                            key={r.id}
                            r={r}
                            isActive={selectedId === r.id}
                            isConfirm={deleteConfirmId === r.id}
                            onOpen={() => openRecipe(r)}
                            onRequestDelete={() => setDeleteConfirmId(r.id)}
                            onConfirmDelete={() => handleDelete(r.id)}
                            onCancelDelete={() => setDeleteConfirmId(null)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subRecipes.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-[8px] flex items-center gap-[5px]">
                  <Layers className="w-3 h-3" /> Sub-Recipes
                </p>
                <div className="space-y-[2px]">
                  {subRecipes.map(r => (
                    <ListRow
                      key={r.id}
                      r={r}
                      isActive={selectedId === r.id}
                      isConfirm={deleteConfirmId === r.id}
                      onOpen={() => openRecipe(r)}
                      onRequestDelete={() => setDeleteConfirmId(r.id)}
                      onConfirmDelete={() => handleDelete(r.id)}
                      onCancelDelete={() => setDeleteConfirmId(null)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 && (search || categoryFilter) && (
              <p className="text-xs text-zinc-600 italic text-center py-[13px]">No recipes match your search or filter.</p>
            )}
          </div>
        </div>

        <div>
          {form ? (
            <div className="space-y-[13px]">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400">
                  {isCreating ? 'New Recipe' : 'Edit Recipe'}
                </p>
                <div className="flex gap-[8px]">
                  <button onClick={closeEditor} className={BTN_GHOST}>Close</button>
                  <button
                    onClick={handleSave}
                    disabled={!form.name.trim() || saving}
                    className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-[61.8%_38.2%] gap-[21px] items-start">
                <RecipeEditor
                  key={`editor-${editorSession}`}
                  form={form}
                  setForm={setForm}
                  currentRecipeId={selectedId ?? '__draft__'}
                  ingredients={allIngredients}
                  recipes={allRecipes}
                  categories={categories}
                  unitSystem={unitSystem}
                />
                <CostPanel
                  key={`cost-${editorSession}`}
                  form={form}
                  setForm={setForm}
                  currentRecipeId={selectedId ?? '__draft__'}
                  ingredients={allIngredients}
                  recipes={allRecipes}
                  unitSystem={unitSystem}
                  targetFcPercent={targetFcPercent}
                />
              </div>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[55px] text-center">
              <p className="text-xs text-zinc-500">Select a recipe from the list, or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Recipes;
