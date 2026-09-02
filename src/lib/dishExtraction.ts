/**
 * src/lib/dishExtraction.ts
 * Pure logic behind the Development workspace's dish-description intake
 * (P-026, replacing the retired Sous chat): the shared extraction/
 * refinement system prompt, response normalization, and the refinement-
 * reconciliation merge. Extracted from DishBuildPanel.tsx so this is
 * unit-tested without mounting the panel — same pattern as
 * dishDraftToRecipe.ts.
 *
 * One prompt serves two input shapes:
 *   extraction: { description, pantry }
 *   refinement: { description, currentDraft, refinement, pantry }
 * (Ruling, P-026 continuation.) The output JSON contract is identical
 * either way, so normalizeDishDraft below handles both response shapes
 * unchanged.
 */
import { displayUnitsFor, type UnitSystem } from './units';
import type { DishDraft, DishDraftLine, Ingredient, MeasureType } from '../types';

export const MEASURE_TYPES: MeasureType[] = ['weight', 'volume', 'each'];

/** A draft with every field at its empty/unset default — the invariant-(b)
 * fallback when the model's response can't be read as JSON at all (E-003:
 * prose instead of structure). Never an error toast; always a draft the
 * chef can work from, per the SOUS-EVAL-derived intake rules. */
export const EMPTY_DISH_DRAFT: DishDraft = {
  dishName: '',
  batchYield: null,
  portions: null,
  lines: [],
  notInPantry: [],
  methodSteps: [],
};

export const DISH_DRAFT_SYSTEM_PROMPT = (unitSystem: UnitSystem): string => `You are extracting a working recipe draft from a chef's dish description, so it can be reviewed and sent to the kitchen's Recipe Builder for costing. You will receive one of two JSON payloads:
- A fresh description: {"description":"...","pantry":[{"id":"...","name":"..."}]}
- A refinement of an existing draft: {"description":"...","currentDraft":{...same shape as your output below...},"refinement":"...","pantry":[{"id":"...","name":"..."}]}

For a refinement payload, start from "currentDraft" and apply only the change described in "refinement" — do not invent unrelated changes, and leave every field "refinement" doesn't address exactly as it was in "currentDraft". "currentDraft" is the sole source of truth for every numeric field: portions, batchYield, and line quantities. "description" is context for ingredient identity and method only. Where "description" and "currentDraft" disagree on a number, "currentDraft" wins — the chef has already changed it. Relative instructions ("double", "halve", "one more") are computed from "currentDraft"'s value, never from a number in "description".

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"dishName":"...","batchYield":{"qty":0,"measureType":"weight","unit":"..."},"portions":0,"lines":[{"ingredientId":"...","qty":0,"unit":"...","note":"..."}],"notInPantry":["..."],"methodSteps":["..."]}

Rules:
- "dishName" is the working name of the dish. Use "" if no name or clear concept has emerged yet.
- "batchYield": "qty" is the total batch size as a plain number, "measureType" is exactly one of "weight", "volume", "each", "unit" is one of the same units listed below for ingredient lines (matching measureType — "each" for measureType "each"). Set "batchYield" to null (the whole field, not just qty) if the description gives no real basis for a batch size — never guess one.
- "portions" is the number of servings as a plain integer, or null if not stated.
- "lines" is one entry per ingredient genuinely part of this dish that matches an item in the provided pantry list by name.
  - "ingredientId" must be copied exactly from the provided pantry list. Never invent an ingredient or an id that is not in the list.
  - "qty" is the amount needed for one batch, as a plain number.
  - "unit" must be one of: ${unitSystem === 'imperial' ? '"oz", "lb", "fl oz", "qt", "each"' : '"g", "kg", "ml", "L", "each"'} — weight units for solids, volume units for liquids, "each" for countable items.
  - "note" is optional, one short phrase, only if genuinely useful (e.g. "diced small").
- "notInPantry" lists ingredient names the dish needs that have no match in the provided pantry list. Informational only — never invent a matching id for these.
- "methodSteps" is a short ordered list of the prep/cooking steps actually described, in plain sentences. Empty array if no method was given.
- Only pull from what was actually stated. Never invent an ingredient, quantity, or step that wasn't at least implied — if the description hasn't covered it yet, leave the field empty/null rather than guessing.
- Never state a price, cost, or food-cost percentage anywhere in your response — costing happens later in the Recipe Builder, from real pantry data you do not have access to.`;

/** Strips $-denominated currency figures from model output (E-002: Sous
 * once invented a per-plate breakdown and a 24% FC at $45 from no data at
 * all). This is the guarantee, not the prompt instruction above — applied
 * to every text field the model can populate, so a model that states a
 * price anyway can never land one. Client-side only, and only ever run on
 * model output: chef-typed and chef-edited text is never touched, since
 * the model proposes and the chef disposes. */
export const stripPriceMentions = (text: string): string =>
  text.replace(/\$\s?\d+(?:\.\d{1,2})?/g, '').replace(/\s{2,}/g, ' ').trim();

/** InvoicePriceUpdate.tsx's normalization convention (lowercase, strip
 * punctuation, collapse whitespace) — reused here rather than
 * reimplemented, per the ruling that this codebase has one normalization
 * rule, not two. Used only to match a refinement response's lines against
 * the chef's already-kept lines by name; never to prose-match the
 * refinement instruction itself. */
export const normalizeIngredientName = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Defensive normalization, same posture as normalizeTrendResponse and
 * Recipes.tsx's handleBuildFromPantry — never trusts the model's
 * ingredientId blindly, always re-checks it against the live pantry.
 * Shared by both extraction and refinement responses; the output shape is
 * identical either way. */
export const normalizeDishDraft = (parsed: any, ingredients: Ingredient[], unitSystem: UnitSystem): DishDraft => {
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
    // as the line unit flag, so the hand-off's unit fallback never fires for an
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
      ...(typeof l.note === 'string' && l.note.trim() && { note: stripPriceMentions(l.note.trim()) }),
    }));

  const notInPantry: string[] = Array.isArray(parsed?.notInPantry)
    ? parsed.notInPantry.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim())
    : [];

  const methodSteps: string[] = Array.isArray(parsed?.methodSteps)
    ? parsed.methodSteps.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => stripPriceMentions(x.trim()))
    : [];

  return { dishName, batchYield, portions, lines, notInPantry, methodSteps };
};

/**
 * Reconciles a refinement response against the chef's kept lines (ruling,
 * P-026 continuation): a kept line is immutable to the model, full stop —
 * enforced here, not trusted from the prompt. The model's revised lines
 * are matched against kept lines by normalized name; any match is
 * discarded in favor of the chef's original, untouched line. Everything
 * else in the model's response (new lines, revisions to lines the chef
 * hadn't kept, dish name/yield/portions/method) is accepted as-is — a
 * refinement like "make it 6 portions" is expected to actually change
 * those fields.
 *
 * Kept-line indices are recomputed for the merged array: the (unchanged)
 * kept lines occupy the first N slots, in their original relative order.
 */
export const reconcileRefinement = (
  oldDraft: DishDraft,
  keptLines: Set<number>,
  revised: DishDraft,
): { draft: DishDraft; keptLines: Set<number> } => {
  const keptOldLines = oldDraft.lines.filter((_, i) => keptLines.has(i));
  const keptNames = new Set(keptOldLines.map(l => normalizeIngredientName(l.name)));
  const acceptedRevisedLines = revised.lines.filter(l => !keptNames.has(normalizeIngredientName(l.name)));
  return {
    draft: { ...revised, lines: [...keptOldLines, ...acceptedRevisedLines] },
    keptLines: new Set(keptOldLines.map((_, i) => i)),
  };
};
