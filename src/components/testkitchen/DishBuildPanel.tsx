/**
 * src/components/testkitchen/DishBuildPanel.tsx
 * The "Recipe Build" zone of the Development workspace. Owns the whole
 * dish-description intake (P-026, replacing the retired Sous chat): a
 * "Describe the dish" textarea drives the initial extraction; once a
 * draft exists, a lightweight refinement input applies incremental edits
 * ("make it 6 portions") without re-describing the whole dish. Holds a
 * client-only DishDraft (never written to Firestore itself). Read-only
 * rendering with per-line accept/drop checkboxes (Option A) — all other
 * editing happens after hand-off, in the real Recipe Builder.
 *
 * Reads ingredients/restaurantProfile directly via useKitchenSelector
 * (same pattern as IngredientAdvisor) rather than having them threaded
 * down as props — no new Firestore listener, reuses the ones
 * useKitchenState.ts already owns. `unitSystem` and `onOpenRecipe` come
 * from the parent since they're not part of the shared kitchen state.
 *
 * The extraction/refinement prompt, response normalization, and the
 * refinement-reconciliation merge are pure functions in
 * src/lib/dishExtraction.ts — unit-tested there without mounting this
 * component, same pattern as dishDraftToRecipe.ts for the hand-off.
 *
 * "Send to Recipe Builder" writes through the same rCollection(...,
 * 'recipes') / addDoc path Recipes.tsx itself uses — no new collection,
 * no bypass of the established data model — then hands off via
 * onOpenRecipe, the same prop AppShell already threads to every view for
 * jumping into the Recipe Builder on a specific recipe.
 */
import React, { useState, type FormEvent } from 'react';
import { AlertCircle, Plus, X, RotateCcw } from 'lucide-react';
import { addDoc } from 'firebase/firestore';
import { useKitchenSelector } from '../KitchenStateContext';
import { useRestaurantId } from '../AuthContext';
import { rCollection } from '../../lib/firestorePaths';
import { callAi, parseAiJson } from '../../lib/ai';
import { withRegionContext } from '../../lib/regionContext';
import { displayUnitsFor, defaultDisplayUnit, type UnitSystem, type DisplayUnit } from '../../lib/units';
import { dishDraftToRecipeDoc } from '../../lib/dishDraftToRecipe';
import {
  DISH_DRAFT_SYSTEM_PROMPT,
  EMPTY_DISH_DRAFT,
  MEASURE_TYPES,
  guardNullFields,
  normalizeDishDraft,
  normalizeIngredientName,
  reconcileRefinement,
  type NullGuardedField,
} from '../../lib/dishExtraction';
import { AiIngredientLookup } from '../ingredients/AiIngredientLookup';
import type { DishDraft, DishDraftLine, Ingredient, MeasureType, RestaurantProfile, Vendor } from '../../types';

interface DishBuildPanelProps {
  unitSystem: UnitSystem;
  onOpenRecipe: (recipeId: string) => void;
}

// UX limit on refinement rounds per draft — not tied to any server-side
// caller cap. Each extraction/refinement call is now a single structured
// JSON payload in one user turn (no growing multi-turn transcript), so
// the message-count ceiling that motivated the old chat's 30-message
// window no longer applies here; this cap exists purely so a draft
// doesn't accumulate an unbounded refinement trail.
const REFINEMENT_CAP = 10;

// Inline, per-field line shown in the refineError slot when the null-field
// guard (guardNullFields, P-032 item 2) held a field back: the refinement
// tried to populate a field the draft had null, without supplying a value
// of its own. The rest of the refinement still applied.
const nullFieldHeldMessage = (field: NullGuardedField, unitSystem: UnitSystem): string =>
  field === 'batchYield'
    ? `Batch yield isn't set — give me the yield (e.g. '2 ${unitSystem === 'imperial' ? 'qt' : 'L'}') and I'll apply it.`
    : "Portions aren't set — tell me how many.";

export default function DishBuildPanel({ unitSystem, onOpenRecipe }: DishBuildPanelProps) {
  const restaurantId = useRestaurantId();
  const restaurantProfile = useKitchenSelector((s: any) => s.restaurantProfile) as RestaurantProfile | null;
  const ingredients = useKitchenSelector((s: any) => s.ingredients) as Ingredient[];
  const vendors = useKitchenSelector((s: any) => s.vendors) as Vendor[];

  const [description, setDescription] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [draft, setDraft] = useState<DishDraft | null>(null);
  // Set only when the model's response couldn't be read as JSON at all
  // (E-003: prose instead of structure) — never surfaced as an error
  // toast. The chef still gets a draft (EMPTY_DISH_DRAFT) to work from;
  // this flag just explains why it's empty.
  const [parseFailed, setParseFailed] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [keptLines, setKeptLines] = useState<Set<number>>(new Set());
  const [handingOff, setHandingOff] = useState(false);
  const [handOffError, setHandOffError] = useState<string | null>(null);
  // The NOT-IN-PANTRY chip the chef is adding to the pantry, if any.
  const [addingChip, setAddingChip] = useState<{ index: number; name: string } | null>(null);

  const [refinementInput, setRefinementInput] = useState('');
  const [refinementHistory, setRefinementHistory] = useState<string[]>([]);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

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
   * can only be discarded, never silently handed off through the unit
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
    const createdNorm = normalizeIngredientName(created.name);
    const matchIdx = draft.notInPantry.findIndex(n => normalizeIngredientName(n) === createdNorm);
    const removeIdx = matchIdx >= 0 ? matchIdx : chip.index;
    const newIndex = draft.lines.length;
    setDraft({
      ...draft,
      notInPantry: draft.notInPantry.filter((_, i) => i !== removeIdx),
      lines: [...draft.lines, { ingredientId: created.id, name: created.name, qty: 0, unit: '' }],
    });
    setKeptLines(prev => new Set(prev).add(newIndex));
  };

  const handleExtract = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!description.trim() || extracting) return;
    setExtracting(true);
    setExtractError(null);
    setParseFailed(false);
    const desc = description.trim();
    try {
      const userContent = JSON.stringify({
        description: desc,
        pantry: ingredients.map(i => ({ id: i.id, name: i.name })),
      });
      const raw = await callAi(withRegionContext(DISH_DRAFT_SYSTEM_PROMPT(unitSystem), restaurantProfile), userContent, 2048);
      let parsed: any;
      try {
        parsed = parseAiJson(raw);
      } catch {
        // Invariant (b): a response that isn't readable as structured JSON
        // never surfaces as an error toast — it becomes the same empty,
        // fully-flagged draft a too-thin description would produce, with
        // a caption explaining why. The chef always gets a draft to work
        // from, never a conversational non-answer (E-003).
        setDraft(EMPTY_DISH_DRAFT);
        setKeptLines(new Set());
        setParseFailed(true);
        setOriginalDescription(desc);
        setDescription('');
        return;
      }
      const normalized = normalizeDishDraft(parsed, ingredients, unitSystem);
      setDraft(normalized);
      setKeptLines(new Set(normalized.lines.map((_, i) => i)));
      setOriginalDescription(desc);
      setDescription('');
      setRefinementHistory([]);
    } catch (e: any) {
      setExtractError(e?.message || 'Could not extract a dish draft. Try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleRefine = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!refinementInput.trim() || refining || !draft || refinementHistory.length >= REFINEMENT_CAP) return;
    setRefining(true);
    setRefineError(null);
    const instruction = refinementInput.trim();
    try {
      const userContent = JSON.stringify({
        description: originalDescription,
        currentDraft: draft,
        refinement: instruction,
        pantry: ingredients.map(i => ({ id: i.id, name: i.name })),
      });
      const raw = await callAi(withRegionContext(DISH_DRAFT_SYSTEM_PROMPT(unitSystem), restaurantProfile), userContent, 2048);
      let parsed: any;
      try {
        parsed = parseAiJson(raw);
      } catch {
        // Same non-error-toast posture as extraction's parse failure, but
        // a refinement never discards an already-confirmed draft — it
        // leaves the draft exactly as it was and reports inline.
        setRefineError("Couldn't apply that — try rephrasing the change.");
        return;
      }
      const normalized = normalizeDishDraft(parsed, ingredients, unitSystem);
      const { draft: merged, keptLines: mergedKept } = reconcileRefinement(draft, keptLines, normalized);
      // Null-field guard runs on the reconciled draft, so kept lines are
      // already settled before it looks at yield/portions — it never
      // touches lines, and hasUnresolvedLines / canHandOff read the
      // result exactly as they read any draft (P-032 item 2).
      const { draft: guarded, reverted } = guardNullFields(draft, merged, instruction);
      setDraft(guarded);
      setKeptLines(mergedKept);
      setParseFailed(false);
      setRefinementHistory(prev => [...prev, instruction]);
      setRefinementInput('');
      if (reverted.length > 0) {
        setRefineError(reverted.map(f => nullFieldHeldMessage(f, unitSystem)).join('\n'));
      }
    } catch (e: any) {
      setRefineError(e?.message || 'Could not apply that refinement. Try again.');
    } finally {
      setRefining(false);
    }
  };

  const handleStartOver = () => {
    setDraft(null);
    setDescription('');
    setOriginalDescription('');
    setParseFailed(false);
    setKeptLines(new Set());
    setExtractError(null);
    setHandOffError(null);
    setRefinementInput('');
    setRefinementHistory([]);
    setRefineError(null);
  };

  const canHandOff = !!draft && !!draft.dishName.trim() && !!draft.batchYield && draft.portions != null;

  // Any kept line still carrying an invalid/missing unit or quantity blocks
  // hand-off until the chef resolves or discards it (Item 1).
  const hasUnresolvedLines = !!draft && draft.lines.some((l, i) => keptLines.has(i) && lineNeedsAttention(l));

  // A batch yield whose unit isn't valid for its measure type — the
  // untouched extracted draft normalizeDishDraft blanked to '' being the
  // common case — must be resolved before hand-off, or the unit fallback would
  // silently substitute the default on the empty string. Blocks Send the
  // same way an unresolved line does.
  const yieldNeedsAttention = !!draft && !!draft.batchYield
    && !(displayUnitsFor(draft.batchYield.measureType, unitSystem) as string[]).includes(draft.batchYield.unit);

  const handleSendToRecipeBuilder = async () => {
    if (!draft || !draft.batchYield || draft.portions == null || !draft.dishName.trim() || hasUnresolvedLines || yieldNeedsAttention) return;
    setHandingOff(true);
    setHandOffError(null);
    try {
      const newRecipe = dishDraftToRecipeDoc(draft, keptLines, ingredients, unitSystem, new Date().toISOString());
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
      <div className="flex items-center justify-between border-b border-line pb-[8px]">
        <h3 className="text-xs font-bold uppercase tracking-widest text-navy">Recipe Build</h3>
        {draft && (
          <button
            type="button"
            onClick={handleStartOver}
            className="flex items-center gap-[3px] text-[10px] font-bold uppercase text-slate hover:text-navy"
          >
            <RotateCcw className="w-3 h-3" /> Start Over
          </button>
        )}
      </div>

      {extractError && (
        <div className="flex items-start justify-between gap-[8px] mt-[13px] text-[10px] text-danger">
          <span className="flex items-start gap-[5px]"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />{extractError}</span>
          <button onClick={() => setExtractError(null)} className="text-slate hover:text-navy shrink-0 uppercase font-bold text-[9px]">Dismiss</button>
        </div>
      )}

      {handOffError && (
        <div className="flex items-start justify-between gap-[8px] mt-[13px] text-[10px] text-danger">
          <span className="flex items-start gap-[5px]"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />{handOffError}</span>
          <button onClick={() => setHandOffError(null)} className="text-slate hover:text-navy shrink-0 uppercase font-bold text-[9px]">Dismiss</button>
        </div>
      )}

      {!draft ? (
        <form onSubmit={handleExtract} className="mt-[13px] space-y-[8px]">
          <p className="text-xs text-slate leading-relaxed">
            Describe the dish — ingredients, yield, portions, method, whatever you have. Extraction builds a working draft from it.
          </p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. A corn side dish with 2 oz corn, 1 lb unsalted butter, and 3 shallots. Makes 4 portions."
            rows={7}
            disabled={extracting}
            className="w-full bg-bg-cool border border-line p-[13px] rounded-card text-xs focus:outline-none focus:border-teal text-navy placeholder:text-slate font-body disabled:opacity-50 resize-none"
          />
          <button
            type="submit"
            disabled={extracting || !description.trim()}
            className="w-full px-[13px] py-[8px] rounded-[8px] bg-navy text-on-navy text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 hover:opacity-90 transition-opacity duration-[144ms]"
          >
            {extracting ? 'Extracting…' : 'Extract'}
          </button>
        </form>
      ) : (
        <div className="mt-[13px] space-y-[13px]">
          {parseFailed && (
            <div className="flex items-start gap-[5px] rounded-[8px] border border-line bg-saffron-soft px-[8px] py-[5px] text-[10px] text-navy leading-snug">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
              Couldn't read that — try describing the dish again.
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[3px]">Dish</p>
            <input
              type="text"
              value={draft.dishName}
              onChange={e => setDishName(e.target.value)}
              placeholder="Name this dish"
              className="w-full bg-surface border border-line rounded-[5px] px-[8px] py-[5px] text-sm font-display font-bold text-navy placeholder:font-body placeholder:font-normal placeholder:text-slate"
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
                className="mt-[3px] text-[10px] font-bold uppercase tracking-wider text-teal disabled:text-slate disabled:cursor-not-allowed hover:opacity-80 transition-opacity duration-[144ms]"
              >
                Same as portions
              </button>
              {yieldNeedsAttention && (
                <p className="flex items-start gap-[5px] mt-[3px] text-[10px] text-navy leading-snug">
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
                      className={flagged ? 'rounded-[8px] border border-line bg-saffron-soft px-[8px] py-[5px]' : ''}
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
                        <p className="flex items-start gap-[5px] mt-[3px] text-[10px] text-navy leading-snug">
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

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Refine the Draft</p>
            {refinementHistory.length > 0 && (
              <ul className="space-y-[2px] mb-[5px]">
                {refinementHistory.map((r, i) => (
                  <li key={i} className="text-[10px] text-slate italic">"{r}"</li>
                ))}
              </ul>
            )}
            {refineError && (
              <div className="flex items-start justify-between gap-[8px] mb-[5px] text-[10px] text-danger">
                <span className="flex items-start gap-[5px] whitespace-pre-line"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />{refineError}</span>
                <button onClick={() => setRefineError(null)} className="text-slate hover:text-navy shrink-0 uppercase font-bold text-[9px]">Dismiss</button>
              </div>
            )}
            {refinementHistory.length >= REFINEMENT_CAP ? (
              <p className="text-xs text-slate italic">Refinement limit reached for this draft — start over to continue.</p>
            ) : (
              <form onSubmit={handleRefine} className="flex gap-[5px]">
                <input
                  type="text"
                  value={refinementInput}
                  onChange={e => setRefinementInput(e.target.value)}
                  placeholder='e.g. "make it 6 portions"'
                  disabled={refining}
                  className="flex-1 bg-bg-cool border border-line rounded-[5px] px-[8px] py-[5px] text-xs text-navy placeholder:text-slate focus:outline-none focus:border-teal disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={refining || !refinementInput.trim()}
                  className="px-[13px] py-[5px] rounded-[5px] border border-line text-navy text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-bg-cool transition-colors duration-[144ms]"
                >
                  {refining ? 'Applying…' : 'Apply'}
                </button>
              </form>
            )}
          </div>

          <button
            onClick={handleSendToRecipeBuilder}
            disabled={!canHandOff || handingOff || hasUnresolvedLines || yieldNeedsAttention}
            className="w-full px-[13px] py-[8px] rounded-[8px] bg-navy text-on-navy text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 hover:opacity-90 transition-opacity duration-[144ms]"
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
