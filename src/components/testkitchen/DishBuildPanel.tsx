/**
 * src/components/testkitchen/DishBuildPanel.tsx
 * The "Recipe Build" zone of the unified Test Kitchen room. Holds a
 * client-only DishDraft (never written to Firestore itself) pulled from
 * the Sous conversation via a structured extraction pass. Read-only
 * rendering with per-line accept/drop checkboxes (Option A) — all other
 * editing happens after hand-off, in the real Recipe Builder.
 *
 * Reads ingredients/restaurantProfile directly via useKitchenSelector
 * (same pattern as IngredientAdvisor) rather than having them threaded
 * down as props — no new Firestore listener, reuses the ones
 * useKitchenState.ts already owns. `messages` (the chat transcript),
 * `unitSystem`, and `onOpenRecipe` come from the parent since they're not
 * part of the shared kitchen state.
 *
 * "Send to Recipe Builder" writes through the same rCollection(...,
 * 'recipes') / addDoc path Recipes.tsx itself uses — no new collection,
 * no bypass of the established data model — then hands off via
 * onOpenRecipe, the same prop AppShell already threads to every view for
 * jumping into the Recipe Builder on a specific recipe.
 */
import React, { useState } from 'react';
import { ChefHat, AlertCircle, Plus, X } from 'lucide-react';
import { addDoc } from 'firebase/firestore';
import { useKitchenSelector } from '../KitchenStateContext';
import { useRestaurantId } from '../AuthContext';
import { rCollection } from '../../lib/firestorePaths';
import { callAi, parseAiJson } from '../../lib/ai';
import { withRegionContext } from '../../lib/regionContext';
import { toBase, displayUnitsFor, defaultDisplayUnit, type UnitSystem, type DisplayUnit } from '../../lib/units';
import { AiIngredientLookup } from '../ingredients/AiIngredientLookup';
import type { DishDraft, DishDraftLine, Ingredient, MeasureType, Recipe, RecipeLine, RestaurantProfile, Vendor } from '../../types';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface DishBuildPanelProps {
  messages: ChatMessage[];
  unitSystem: UnitSystem;
  onOpenRecipe: (recipeId: string) => void;
}

const MEASURE_TYPES: MeasureType[] = ['weight', 'volume', 'each'];

const DISH_DRAFT_SYSTEM_PROMPT = (unitSystem: UnitSystem): string => `You are extracting a working recipe draft from a chef's brainstorming conversation with a sous chef, so it can be reviewed and sent to the kitchen's Recipe Builder for costing. You will receive the full chat transcript and the restaurant's Master Pantry as a JSON list of { id, name }.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"dishName":"...","batchYield":{"qty":0,"measureType":"weight","unit":"..."},"portions":0,"lines":[{"ingredientId":"...","qty":0,"unit":"...","note":"..."}],"notInPantry":["..."],"methodSteps":["..."]}

Rules:
- "dishName" is the working name of the dish under discussion. Use "" if no name or clear concept has emerged yet.
- "batchYield": "qty" is the total batch size as a plain number, "measureType" is exactly one of "weight", "volume", "each", "unit" is one of the same units listed below for ingredient lines (matching measureType — "each" for measureType "each"). Set "batchYield" to null (the whole field, not just qty) if the conversation gives no real basis for a batch size — never guess one.
- "portions" is the number of servings as a plain integer, or null if not discussed.
- "lines" is one entry per ingredient genuinely part of this dish that matches an item in the provided pantry list by name.
  - "ingredientId" must be copied exactly from the provided pantry list. Never invent an ingredient or an id that is not in the list.
  - "qty" is the amount needed for one batch, as a plain number.
  - "unit" must be one of: ${unitSystem === 'imperial' ? '"oz", "lb", "fl oz", "qt", "each"' : '"g", "kg", "ml", "L", "each"'} — weight units for solids, volume units for liquids, "each" for countable items.
  - "note" is optional, one short phrase, only if genuinely useful (e.g. "diced small").
- "notInPantry" lists ingredient names the dish needs that have no match in the provided pantry list. Informational only — never invent a matching id for these.
- "methodSteps" is a short ordered list of the prep/cooking steps actually discussed, in plain sentences. Empty array if no method was discussed.
- Only pull from what was actually discussed in the conversation. Never invent an ingredient, quantity, or step that wasn't at least implied — if the conversation hasn't gotten there yet, leave the field empty/null rather than guessing.`;

/** Defensive normalization, same posture as normalizeTrendResponse and
 * Recipes.tsx's handleBuildFromPantry — never trusts the model's
 * ingredientId blindly, always re-checks it against the live pantry. */
const normalizeDishDraft = (parsed: any, ingredients: Ingredient[], unitSystem: UnitSystem): DishDraft => {
  const validIds = new Set(ingredients.map(i => i.id));
  const byId = new Map(ingredients.map(i => [i.id, i.name]));

  const dishName = typeof parsed?.dishName === 'string' ? parsed.dishName.trim() : '';

  const rawYield = parsed?.batchYield;
  let batchYield: DishDraft['batchYield'] = null;
  if (rawYield && typeof rawYield.qty === 'number' && rawYield.qty > 0 && MEASURE_TYPES.includes(rawYield.measureType)) {
    const measureType = rawYield.measureType as MeasureType;
    const rawUnit = typeof rawYield.unit === 'string' ? rawYield.unit.trim() : '';
    // Keep the qty + measureType extraction got right, but never trust the
    // unit blindly: if it doesn't fit the measure type, blank it so the
    // panel's unit select shows empty and the chef must pick — same posture
    // as the line unit flag, so resolveUnit's fallback never fires for an
    // untouched AI yield unit either.
    const unit = (displayUnitsFor(measureType, unitSystem) as string[]).includes(rawUnit) ? rawUnit : '';
    batchYield = { qty: rawYield.qty, measureType, unit };
  }

  const portions = typeof parsed?.portions === 'number' && parsed.portions > 0 ? Math.round(parsed.portions) : null;

  const lines: DishDraftLine[] = (Array.isArray(parsed?.lines) ? parsed.lines : [])
    .filter((l: any) => l && typeof l.ingredientId === 'string' && validIds.has(l.ingredientId) && typeof l.qty === 'number' && l.qty > 0)
    .map((l: any) => ({
      ingredientId: l.ingredientId as string,
      name: byId.get(l.ingredientId) ?? l.ingredientId,
      qty: l.qty,
      unit: typeof l.unit === 'string' ? l.unit : '',
      ...(typeof l.note === 'string' && l.note.trim() && { note: l.note.trim() }),
    }));

  const notInPantry: string[] = Array.isArray(parsed?.notInPantry)
    ? parsed.notInPantry.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim())
    : [];

  const methodSteps: string[] = Array.isArray(parsed?.methodSteps)
    ? parsed.methodSteps.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim())
    : [];

  return { dishName, batchYield, portions, lines, notInPantry, methodSteps };
};

export default function DishBuildPanel({ messages, unitSystem, onOpenRecipe }: DishBuildPanelProps) {
  const restaurantId = useRestaurantId();
  const restaurantProfile = useKitchenSelector((s: any) => s.restaurantProfile) as RestaurantProfile | null;
  const ingredients = useKitchenSelector((s: any) => s.ingredients) as Ingredient[];
  const vendors = useKitchenSelector((s: any) => s.vendors) as Vendor[];

  const [draft, setDraft] = useState<DishDraft | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [keptLines, setKeptLines] = useState<Set<number>>(new Set());
  const [handingOff, setHandingOff] = useState(false);
  const [handOffError, setHandOffError] = useState<string | null>(null);
  // The NOT-IN-PANTRY chip the chef is adding to the pantry, if any.
  const [addingChip, setAddingChip] = useState<{ index: number; name: string } | null>(null);

  const toggleLine = (index: number) => {
    setKeptLines(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const updateLine = (index: number, patch: Partial<DishDraftLine>) => {
    setDraft(prev => (prev ? { ...prev, lines: prev.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) } : prev));
  };

  /** A line needs chef attention when its unit isn't valid for the matched
   * ingredient's measure type (the silent-substitution case Item 1 kills),
   * when it carries no quantity, or when its ingredient has vanished from
   * the pantry mid-session (no measure type to validate against — so it
   * can only be discarded, never silently handed off through resolveUnit's
   * 'each' fallback). A kept, flagged line blocks hand-off. */
  const lineNeedsAttention = (line: DishDraftLine): boolean => {
    const ing = ingredients.find(i => i.id === line.ingredientId);
    if (!ing) return true;
    const valid = displayUnitsFor(ing.measureType, unitSystem) as string[];
    return !valid.includes(line.unit) || !(line.qty > 0);
  };

  const setDishName = (name: string) => setDraft(prev => (prev ? { ...prev, dishName: name } : prev));

  const setPortions = (raw: string) => {
    const n = parseInt(raw, 10);
    setDraft(prev => (prev ? { ...prev, portions: isFinite(n) && n > 0 ? n : null } : prev));
  };

  // batchYield stays the single source of truth (no parallel local state).
  // A qty <= 0 clears it back to null so canHandOff — unchanged — reads
  // "no yield" exactly as extraction's own null does; the measure-type and
  // unit selects only apply once a qty exists, and default to a plated
  // dish's each/each.
  const setYieldQty = (raw: string) => {
    const n = parseFloat(raw);
    setDraft(prev => {
      if (!prev) return prev;
      if (!(n > 0)) return { ...prev, batchYield: null };
      return {
        ...prev,
        batchYield: prev.batchYield ? { ...prev.batchYield, qty: n } : { qty: n, measureType: 'each', unit: 'each' },
      };
    });
  };

  const setYieldMeasureType = (measureType: MeasureType) => {
    setDraft(prev =>
      prev && prev.batchYield
        ? { ...prev, batchYield: { ...prev.batchYield, measureType, unit: defaultDisplayUnit(measureType, unitSystem) } }
        : prev,
    );
  };

  const setYieldUnit = (unit: string) => {
    setDraft(prev => (prev && prev.batchYield ? { ...prev, batchYield: { ...prev.batchYield, unit } } : prev));
  };

  // Plated-dish shortcut where yield-vs-portions is redundant.
  const yieldSameAsPortions = () => {
    setDraft(prev =>
      prev && prev.portions != null && prev.portions > 0
        ? { ...prev, batchYield: { qty: prev.portions, measureType: 'each', unit: 'each' } }
        : prev,
    );
  };

  // The chef added a real pantry ingredient for a NOT-IN-PANTRY mention.
  // Drop that mention (matched by normalized name, falling back to the chip
  // the modal was opened from) and append it as a kept line with qty 0 /
  // unit '' — so it surfaces as an Item-1 flagged line the chef completes,
  // then keeps or discards like any other. Never auto-written elsewhere.
  const handleIngredientAdded = (created?: { id: string; name: string }) => {
    const chip = addingChip;
    setAddingChip(null);
    if (!chip || !created || !draft) return;
    const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    const createdNorm = norm(created.name);
    const matchIdx = draft.notInPantry.findIndex(n => norm(n) === createdNorm);
    const removeIdx = matchIdx >= 0 ? matchIdx : chip.index;
    const newIndex = draft.lines.length;
    setDraft({
      ...draft,
      notInPantry: draft.notInPantry.filter((_, i) => i !== removeIdx),
      lines: [...draft.lines, { ingredientId: created.id, name: created.name, qty: 0, unit: '' }],
    });
    setKeptLines(prev => new Set(prev).add(newIndex));
  };

  const handleExtract = async () => {
    setExtracting(true);
    setExtractError(null);
    try {
      const userContent = JSON.stringify({
        transcript: messages.map(m => ({ role: m.role === 'model' ? 'sous' : 'chef', content: m.content })),
        pantry: ingredients.map(i => ({ id: i.id, name: i.name })),
      });
      const raw = await callAi(withRegionContext(DISH_DRAFT_SYSTEM_PROMPT(unitSystem), restaurantProfile), userContent, 2048);
      let parsed: any;
      try {
        parsed = parseAiJson(raw);
      } catch {
        throw new Error('The AI response could not be read. Try again.');
      }
      const normalized = normalizeDishDraft(parsed, ingredients, unitSystem);
      setDraft(normalized);
      setKeptLines(new Set(normalized.lines.map((_, i) => i)));
    } catch (e: any) {
      setExtractError(e?.message || 'Could not extract a dish draft. Try again.');
    } finally {
      setExtracting(false);
    }
  };

  const canHandOff = !!draft && !!draft.dishName.trim() && !!draft.batchYield && draft.portions != null;

  // Any kept line still carrying an invalid/missing unit or quantity blocks
  // hand-off until the chef resolves or discards it (Item 1).
  const hasUnresolvedLines = !!draft && draft.lines.some((l, i) => keptLines.has(i) && lineNeedsAttention(l));

  // A batch yield whose unit isn't valid for its measure type — the
  // untouched extracted draft normalizeDishDraft blanked to '' being the
  // common case — must be resolved before hand-off, or resolveUnit would
  // silently substitute the default on the empty string. Blocks Send the
  // same way an unresolved line does.
  const yieldNeedsAttention = !!draft && !!draft.batchYield
    && !(displayUnitsFor(draft.batchYield.measureType, unitSystem) as string[]).includes(draft.batchYield.unit);

  /** Resolves an AI-returned display unit against what's actually valid
   * for a measure type, falling back to the system default when it
   * doesn't match — same defensive pattern Recipes.tsx's acceptSuggestion
   * uses for pantry-suggestion units. */
  const resolveUnit = (aiUnit: string, measureType: MeasureType): DisplayUnit => {
    const validUnits = displayUnitsFor(measureType, unitSystem) as string[];
    return (validUnits.includes(aiUnit) ? aiUnit : defaultDisplayUnit(measureType, unitSystem)) as DisplayUnit;
  };

  const handleSendToRecipeBuilder = async () => {
    if (!draft || !draft.batchYield || draft.portions == null || !draft.dishName.trim() || hasUnresolvedLines || yieldNeedsAttention) return;
    setHandingOff(true);
    setHandOffError(null);
    try {
      const yieldUnit = resolveUnit(draft.batchYield.unit, draft.batchYield.measureType);
      const lines: RecipeLine[] = draft.lines
        .filter((_, i) => keptLines.has(i))
        .map((line): RecipeLine => {
          const ing = ingredients.find(i => i.id === line.ingredientId);
          const unit = ing ? resolveUnit(line.unit, ing.measureType) : ('each' as DisplayUnit);
          return {
            type: 'ingredient',
            refId: line.ingredientId!,
            qty: toBase(line.qty, unit),
            ...(line.note && { note: line.note }),
          };
        });

      const newRecipe: Omit<Recipe, 'id'> = {
        name: draft.dishName.trim(),
        recipeType: 'menu',
        course: '',
        batchYield: { qty: toBase(draft.batchYield.qty, yieldUnit), measureType: draft.batchYield.measureType },
        portions: draft.portions,
        lines,
        methodSteps: draft.methodSteps,
        // A freshly extracted dish is not on the menu until the chef puts it
        // there deliberately from the Recipes library. Explicit false rather
        // than relying on isRecipeOnMenu's `?? true` legacy default, which
        // stays untouched so existing recipes keep their current behavior.
        onMenu: false,
        updatedAt: new Date().toISOString(),
      };
      const ref = await addDoc(rCollection(restaurantId, 'recipes'), newRecipe);
      onOpenRecipe(ref.id);
    } catch (e: any) {
      setHandOffError(e?.message || 'Could not create the recipe. Try again.');
    } finally {
      setHandingOff(false);
    }
  };

  return (
    <>
    <div className="bg-surface border border-line rounded-card p-[21px] h-full min-h-0 overflow-y-auto">
      <h3 className="text-xs font-bold uppercase tracking-widest text-navy border-b border-line pb-[8px]">Recipe Build</h3>

      {extractError && (
        <div className="flex items-start justify-between gap-[8px] mt-[13px] text-[10px] text-red-400">
          <span className="flex items-start gap-[5px]"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />{extractError}</span>
          <button onClick={() => setExtractError(null)} className="text-slate hover:text-navy shrink-0 uppercase font-bold text-[9px]">Dismiss</button>
        </div>
      )}

      {handOffError && (
        <div className="flex items-start justify-between gap-[8px] mt-[13px] text-[10px] text-red-400">
          <span className="flex items-start gap-[5px]"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />{handOffError}</span>
          <button onClick={() => setHandOffError(null)} className="text-slate hover:text-navy shrink-0 uppercase font-bold text-[9px]">Dismiss</button>
        </div>
      )}

      {!draft ? (
        <div className="flex flex-col items-center text-center gap-[13px] py-[34px]">
          <ChefHat className="w-6 h-6 text-slate/40" />
          <p className="text-xs text-slate leading-relaxed max-w-[210px]">No dish yet — extract from the conversation to start one.</p>
          <button
            onClick={handleExtract}
            disabled={extracting || messages.length === 0}
            className="px-[13px] py-[8px] rounded-[8px] bg-navy text-cream text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 hover:opacity-90 transition-opacity duration-[144ms]"
          >
            {extracting ? 'Extracting…' : 'Extract from Chat'}
          </button>
        </div>
      ) : (
        <div className="mt-[13px] space-y-[13px]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[3px]">Dish</p>
            <input
              type="text"
              value={draft.dishName}
              onChange={e => setDishName(e.target.value)}
              placeholder="Name this dish"
              className="w-full bg-surface border border-line rounded-[5px] px-[8px] py-[5px] text-sm font-display font-bold text-navy placeholder:font-body placeholder:font-normal placeholder:text-slate/60"
            />
          </div>

          <div className="flex gap-[21px]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[3px]">Batch Yield</p>
              <div className="flex items-center gap-[5px]">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={draft.batchYield ? draft.batchYield.qty : ''}
                  onChange={e => setYieldQty(e.target.value)}
                  placeholder="qty"
                  className="w-[56px] bg-surface border border-line rounded-[5px] px-[5px] py-[3px] text-xs text-navy font-mono text-right"
                />
                <select
                  value={draft.batchYield?.measureType ?? 'each'}
                  disabled={!draft.batchYield}
                  onChange={e => setYieldMeasureType(e.target.value as MeasureType)}
                  className="bg-surface border border-line rounded-[5px] px-[5px] py-[3px] text-xs text-navy disabled:opacity-40"
                >
                  {MEASURE_TYPES.map(mt => <option key={mt} value={mt}>{mt}</option>)}
                </select>
                <select
                  value={draft.batchYield?.unit ?? ''}
                  disabled={!draft.batchYield}
                  onChange={e => setYieldUnit(e.target.value)}
                  className="bg-surface border border-line rounded-[5px] px-[5px] py-[3px] text-xs text-navy disabled:opacity-40"
                >
                  <option value="" disabled>unit</option>
                  {(draft.batchYield ? displayUnitsFor(draft.batchYield.measureType, unitSystem) : []).map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={yieldSameAsPortions}
                disabled={draft.portions == null || draft.portions <= 0}
                className="mt-[3px] text-[10px] font-bold uppercase tracking-wider text-teal disabled:text-slate/40 disabled:cursor-not-allowed hover:opacity-80 transition-opacity duration-[144ms]"
              >
                Same as portions
              </button>
              {yieldNeedsAttention && (
                <p className="flex items-start gap-[5px] mt-[3px] text-[10px] text-saffron-text leading-snug">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-[1px]" />
                  Set a batch-yield unit.
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[3px]">Portions</p>
              <input
                type="number"
                min="1"
                step="1"
                value={draft.portions ?? ''}
                onChange={e => setPortions(e.target.value)}
                placeholder="servings"
                className="w-[64px] bg-surface border border-line rounded-[5px] px-[5px] py-[3px] text-xs text-navy font-mono text-right"
              />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Ingredients</p>
            {draft.lines.length === 0 ? (
              <p className="text-xs text-slate italic">No ingredients added yet.</p>
            ) : (
              <div className="space-y-[3px]">
                {draft.lines.map((line, i) => {
                  const ing = ingredients.find(x => x.id === line.ingredientId);
                  const kept = keptLines.has(i);
                  const flagged = kept && lineNeedsAttention(line);
                  const validUnits = ing ? displayUnitsFor(ing.measureType, unitSystem) : [];
                  return (
                    <div
                      key={i}
                      className={flagged ? 'rounded-[8px] border border-saffron bg-saffron-soft px-[8px] py-[5px]' : ''}
                    >
                      <label className="flex items-center gap-[8px] text-xs text-navy cursor-pointer">
                        <input type="checkbox" checked={kept} onChange={() => toggleLine(i)} className="accent-teal" />
                        <span className="flex-1">{line.name}</span>
                        {flagged && ing ? (
                          <span className="flex items-center gap-[5px] shrink-0">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={line.qty > 0 ? line.qty : ''}
                              onChange={e => { const n = parseFloat(e.target.value); updateLine(i, { qty: isFinite(n) ? n : 0 }); }}
                              placeholder="qty"
                              className="w-[52px] bg-surface border border-line rounded-[5px] px-[5px] py-[2px] text-xs text-navy font-mono text-right"
                            />
                            <select
                              value={validUnits.includes(line.unit as DisplayUnit) ? line.unit : ''}
                              onChange={e => updateLine(i, { unit: e.target.value })}
                              className="bg-surface border border-line rounded-[5px] px-[5px] py-[2px] text-xs text-navy"
                            >
                              <option value="" disabled>unit</option>
                              {validUnits.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </span>
                        ) : (
                          <span className="text-slate shrink-0 font-mono">{line.qty} {line.unit}</span>
                        )}
                      </label>
                      {flagged && (
                        <p className="flex items-start gap-[5px] mt-[3px] text-[10px] text-saffron-text leading-snug">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-[1px]" />
                          {!ing
                            ? 'No longer in the pantry — discard this line.'
                            : line.unit.trim()
                              ? `"${line.unit}" isn't a valid ${ing.measureType} unit for ${ing.name} — set a quantity and unit.`
                              : `Set a quantity and unit for ${ing.name}.`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {draft.notInPantry.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Not in Pantry</p>
              <div className="flex flex-wrap gap-[5px]">
                {draft.notInPantry.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAddingChip({ index: i, name })}
                    className="flex items-center gap-[3px] px-[8px] py-[2px] rounded-[13px] border border-line bg-bg-cool text-[10px] text-slate hover:border-teal hover:text-teal transition-colors duration-[144ms]"
                    title={`Add ${name} to the pantry`}
                  >
                    <Plus className="w-3 h-3 shrink-0" />
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Method</p>
            {draft.methodSteps.length === 0 ? (
              <p className="text-xs text-slate italic">No method steps yet.</p>
            ) : (
              <ol className="list-decimal list-inside space-y-[3px] text-xs text-navy">
                {draft.methodSteps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            )}
          </div>

          <button
            onClick={handleExtract}
            disabled={extracting || handingOff}
            className="w-full px-[13px] py-[8px] rounded-[8px] border border-line text-navy text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-bg-cool transition-colors duration-[144ms]"
          >
            {extracting ? 'Re-extracting…' : 'Re-extract from Chat'}
          </button>

          <button
            onClick={handleSendToRecipeBuilder}
            disabled={!canHandOff || handingOff || hasUnresolvedLines || yieldNeedsAttention}
            className="w-full px-[13px] py-[8px] rounded-[8px] bg-navy text-cream text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 hover:opacity-90 transition-opacity duration-[144ms]"
          >
            {handingOff ? 'Sending…' : 'Send to Recipe Builder'}
          </button>
        </div>
      )}
    </div>

    {addingChip && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-[21px]" onClick={() => setAddingChip(null)}>
        <div className="w-full max-w-[440px] max-h-[85vh] overflow-y-auto bg-surface border border-line rounded-card shadow-2xl p-[21px]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-[13px]">
            <h4 className="text-xs font-bold uppercase tracking-widest text-navy">Add to Pantry</h4>
            <button type="button" onClick={() => setAddingChip(null)} className="text-slate hover:text-navy">
              <X className="w-4 h-4" />
            </button>
          </div>
          <AiIngredientLookup
            unitSystem={unitSystem}
            vendors={vendors}
            initialName={addingChip.name}
            onCancel={() => setAddingChip(null)}
            onSaved={handleIngredientAdded}
          />
        </div>
      </div>
    )}
    </>
  );
}
