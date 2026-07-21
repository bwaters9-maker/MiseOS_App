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
 * useKitchenState.ts already owns. `messages` (the chat transcript) and
 * `unitSystem` come from the parent since they're not part of the shared
 * kitchen state.
 *
 * The "Send to Recipe Builder" hand-off (addDoc + navigation) lands in
 * the next build step — the button stays disabled-only for now.
 */
import React, { useState } from 'react';
import { ChefHat, AlertCircle } from 'lucide-react';
import { useKitchenSelector } from '../KitchenStateContext';
import { callAi, parseAiJson } from '../../lib/ai';
import { withRegionContext } from '../../lib/regionContext';
import type { UnitSystem } from '../../lib/units';
import type { DishDraft, DishDraftLine, Ingredient, MeasureType, RestaurantProfile } from '../../types';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface DishBuildPanelProps {
  messages: ChatMessage[];
  unitSystem: UnitSystem;
}

const MEASURE_TYPES: MeasureType[] = ['weight', 'volume', 'each'];

const DISH_DRAFT_SYSTEM_PROMPT = (unitSystem: UnitSystem): string => `You are extracting a working recipe draft from a chef's brainstorming conversation with a sous chef, so it can be reviewed and sent to the kitchen's Recipe Builder for costing. You will receive the full chat transcript and the restaurant's Master Pantry as a JSON list of { id, name }.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"dishName":"...","batchYield":{"qty":0,"measureType":"weight"},"portions":0,"lines":[{"ingredientId":"...","qty":0,"unit":"...","note":"..."}],"notInPantry":["..."],"methodSteps":["..."]}

Rules:
- "dishName" is the working name of the dish under discussion. Use "" if no name or clear concept has emerged yet.
- "batchYield": "qty" is the total batch size as a plain number, "measureType" is exactly one of "weight", "volume", "each". Set "batchYield" to null (the whole field, not just qty) if the conversation gives no real basis for a batch size — never guess one.
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
const normalizeDishDraft = (parsed: any, ingredients: Ingredient[]): DishDraft => {
  const validIds = new Set(ingredients.map(i => i.id));
  const byId = new Map(ingredients.map(i => [i.id, i.name]));

  const dishName = typeof parsed?.dishName === 'string' ? parsed.dishName.trim() : '';

  const rawYield = parsed?.batchYield;
  const batchYield =
    rawYield && typeof rawYield.qty === 'number' && rawYield.qty > 0 && MEASURE_TYPES.includes(rawYield.measureType)
      ? { qty: rawYield.qty, measureType: rawYield.measureType as MeasureType }
      : null;

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

export default function DishBuildPanel({ messages, unitSystem }: DishBuildPanelProps) {
  const restaurantProfile = useKitchenSelector((s: any) => s.restaurantProfile) as RestaurantProfile | null;
  const ingredients = useKitchenSelector((s: any) => s.ingredients) as Ingredient[];

  const [draft, setDraft] = useState<DishDraft | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [keptLines, setKeptLines] = useState<Set<number>>(new Set());

  const toggleLine = (index: number) => {
    setKeptLines(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
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
      const normalized = normalizeDishDraft(parsed, ingredients);
      setDraft(normalized);
      setKeptLines(new Set(normalized.lines.map((_, i) => i)));
    } catch (e: any) {
      setExtractError(e?.message || 'Could not extract a dish draft. Try again.');
    } finally {
      setExtracting(false);
    }
  };

  const canHandOff = !!draft && !!draft.dishName.trim() && !!draft.batchYield && draft.portions != null;

  return (
    <div className="bg-surface border border-line rounded-card p-[21px] h-full min-h-0 overflow-y-auto">
      <h3 className="text-xs font-bold uppercase tracking-widest text-navy border-b border-line pb-[8px]">Recipe Build</h3>

      {extractError && (
        <div className="flex items-start justify-between gap-[8px] mt-[13px] text-[10px] text-red-400">
          <span className="flex items-start gap-[5px]"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />{extractError}</span>
          <button onClick={() => setExtractError(null)} className="text-slate hover:text-navy shrink-0 uppercase font-bold text-[9px]">Dismiss</button>
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
            <p className="text-sm font-display font-bold text-navy">{draft.dishName || 'Untitled'}</p>
          </div>

          <div className="flex gap-[21px]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[3px]">Yield</p>
              <p className="text-xs text-navy">{draft.batchYield ? `${draft.batchYield.qty} ${draft.batchYield.measureType}` : 'Not specified'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[3px]">Portions</p>
              <p className="text-xs text-navy">{draft.portions ?? 'Not specified'}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Ingredients</p>
            {draft.lines.length === 0 ? (
              <p className="text-xs text-slate italic">No ingredients added yet.</p>
            ) : (
              <div className="space-y-[3px]">
                {draft.lines.map((line, i) => (
                  <label key={i} className="flex items-center gap-[8px] text-xs text-navy cursor-pointer">
                    <input type="checkbox" checked={keptLines.has(i)} onChange={() => toggleLine(i)} className="accent-teal" />
                    <span className="flex-1">{line.name}</span>
                    <span className="text-slate shrink-0">{line.qty} {line.unit}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {draft.notInPantry.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Not in Pantry</p>
              <div className="flex flex-wrap gap-[5px]">
                {draft.notInPantry.map((name, i) => (
                  <span key={i} className="px-[8px] py-[2px] rounded-[13px] border border-line bg-bg-cool text-[10px] text-slate">{name}</span>
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
            disabled={extracting}
            className="w-full px-[13px] py-[8px] rounded-[8px] border border-line text-navy text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-bg-cool transition-colors duration-[144ms]"
          >
            {extracting ? 'Re-extracting…' : 'Re-extract from Chat'}
          </button>

          <button
            disabled={!canHandOff}
            className="w-full px-[13px] py-[8px] rounded-[8px] bg-navy text-cream text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 hover:opacity-90 transition-opacity duration-[144ms]"
          >
            Send to Recipe Builder
          </button>
        </div>
      )}
    </div>
  );
}
