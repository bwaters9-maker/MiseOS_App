import { describe, it, expect } from 'vitest';
import {
  DISH_DRAFT_SYSTEM_PROMPT,
  EMPTY_DISH_DRAFT,
  normalizeDishDraft,
  normalizeIngredientName,
  reconcileRefinement,
  stripPriceMentions,
} from './dishExtraction';
import type { DishDraft, Ingredient } from '../types';

const mkIng = (o: Partial<Ingredient> & { id: string; name: string }): Ingredient => ({
  category: 'Protein',
  measureType: 'weight',
  purchaseUnit: 'unit',
  purchaseCost: 0,
  purchaseQty: 1,
  yieldPercent: 100,
  lastVerified: '',
  priceSource: 'manual',
  ...o,
});

const PANTRY: Ingredient[] = [
  mkIng({ id: 'i-corn', name: 'Corn' }),
  mkIng({ id: 'i-butter', name: 'Unsalted Butter' }),
  mkIng({ id: 'i-rice-cake', name: 'Rice Cake' }),
  mkIng({ id: 'i-gochujang', name: 'Gochujang' }),
  mkIng({ id: 'i-fish-cake', name: 'Fish Cake' }),
];

describe('DISH_DRAFT_SYSTEM_PROMPT', () => {
  const prompt = DISH_DRAFT_SYSTEM_PROMPT('imperial');

  it('carries no persona text', () => {
    // The retired persona named a character, gave it a backstory, and
    // framed the intake as a conversation with that character. None of
    // that survives P-026 — this is a pure extraction/refinement
    // instruction now.
    expect(prompt.toLowerCase()).not.toContain('sous');
    expect(prompt.toLowerCase()).not.toContain('chef matthew');
    expect(prompt.toLowerCase()).not.toContain('chat');
    expect(prompt.toLowerCase()).not.toContain('conversation');
    expect(prompt.toLowerCase()).not.toContain('transcript');
    expect(prompt.toLowerCase()).not.toContain('brainstorm');
  });

  it('carries no scope, cuisine, or refusal language (item 7c)', () => {
    // E-004: Sous once declined a request as "not my lane." The intake
    // has no conversational surface left to refuse from, and the prompt
    // itself must not introduce any basis for one.
    const lower = prompt.toLowerCase();
    for (const term of ['cuisine', 'lane', 'scope', 'appropriate', 'refuse', 'decline', 'not able to help', "can't help"]) {
      expect(lower).not.toContain(term);
    }
  });

  it('documents both input shapes', () => {
    expect(prompt).toContain('"description"');
    expect(prompt).toContain('"currentDraft"');
    expect(prompt).toContain('"refinement"');
    expect(prompt).toContain('"pantry"');
  });

  it('instructs against stating a price', () => {
    expect(prompt.toLowerCase()).toContain('never state a price');
  });
});

describe('normalizeDishDraft — invariant (a): no prices', () => {
  it('strips a $-denominated figure from a method step', () => {
    const parsed = {
      dishName: 'Test Dish',
      batchYield: null,
      portions: null,
      lines: [],
      notInPantry: [],
      methodSteps: ['Portion at $12 per plate for the pass.'],
    };
    const draft = normalizeDishDraft(parsed, PANTRY, 'imperial');
    expect(draft.methodSteps[0]).not.toContain('$');
    expect(draft.methodSteps[0]).not.toMatch(/\d/);
    expect(draft.methodSteps[0]).toBe('Portion at per plate for the pass.');
  });

  it('strips a $-denominated figure from a line note', () => {
    const parsed = {
      dishName: 'Test Dish',
      batchYield: null,
      portions: null,
      lines: [{ ingredientId: 'i-corn', qty: 2, unit: 'each', note: 'costs about $0.45 each' }],
      notInPantry: [],
      methodSteps: [],
    };
    const draft = normalizeDishDraft(parsed, PANTRY, 'imperial');
    expect(draft.lines[0].note).not.toContain('$');
  });

  it('leaves prose with no currency figure untouched', () => {
    expect(stripPriceMentions('sear until golden, about 4 minutes per side')).toBe('sear until golden, about 4 minutes per side');
  });
});

describe('normalizeDishDraft — invariant (b): always a draft, never prose', () => {
  it('a too-thin description normalizes to the same empty shape as EMPTY_DISH_DRAFT', () => {
    // The model returned syntactically valid JSON with nothing usable in
    // it — the "description too thin to extract" case. This already
    // converges on EMPTY_DISH_DRAFT with no special-casing: the field-
    // level defaults do the work.
    const draft = normalizeDishDraft({}, PANTRY, 'imperial');
    expect(draft).toEqual(EMPTY_DISH_DRAFT);
  });

  it('EMPTY_DISH_DRAFT is fully empty and flagged — the parser-rejection fallback the caller renders on a JSON parse failure', () => {
    // parseAiJson throwing (prose instead of structure, E-003) is handled
    // by the caller (DishBuildPanel.handleExtract/handleRefine): it never
    // reaches normalizeDishDraft at all, and renders EMPTY_DISH_DRAFT
    // directly instead of surfacing an error toast. This asserts the
    // shape that guarantee depends on stays exactly empty.
    expect(EMPTY_DISH_DRAFT.dishName).toBe('');
    expect(EMPTY_DISH_DRAFT.batchYield).toBeNull();
    expect(EMPTY_DISH_DRAFT.portions).toBeNull();
    expect(EMPTY_DISH_DRAFT.lines).toEqual([]);
    expect(EMPTY_DISH_DRAFT.notInPantry).toEqual([]);
    expect(EMPTY_DISH_DRAFT.methodSteps).toEqual([]);
  });
});

describe('normalizeDishDraft — invariant (c): no refusal by scope', () => {
  it('an out-of-cuisine dish (Tteokbokki) yields a draft with lines, not an empty or refused result', () => {
    // Simulates a well-behaved model response to "Tteokbokki, 6 portions,
    // gochujang, rice cakes, fish cake" — proving nothing on the client
    // filters out a non-Western dish's ingredients.
    const parsed = {
      dishName: 'Tteokbokki',
      batchYield: { qty: 6, measureType: 'each', unit: 'each' },
      portions: 6,
      lines: [
        { ingredientId: 'i-rice-cake', qty: 6, unit: 'each' },
        { ingredientId: 'i-gochujang', qty: 3, unit: 'oz' },
        { ingredientId: 'i-fish-cake', qty: 6, unit: 'each' },
      ],
      notInPantry: [],
      methodSteps: ['Simmer rice cakes and fish cake in gochujang sauce until glossy.'],
    };
    const draft = normalizeDishDraft(parsed, PANTRY, 'imperial');
    expect(draft.dishName).toBe('Tteokbokki');
    expect(draft.lines.length).toBe(3);
    expect(draft.lines.map(l => l.name)).toEqual(['Rice Cake', 'Gochujang', 'Fish Cake']);
  });
});

describe('reconcileRefinement', () => {
  const oldDraft: DishDraft = {
    dishName: 'Corn Side',
    batchYield: { qty: 4, measureType: 'each', unit: 'each' },
    portions: 4,
    lines: [
      { ingredientId: 'i-corn', name: 'Corn', qty: 2, unit: 'each' },
      { ingredientId: 'i-butter', name: 'Unsalted Butter', qty: 1, unit: 'lb' },
    ],
    notInPantry: [],
    methodSteps: [],
  };

  it('never modifies or removes a kept line, even if the model tries', () => {
    const keptLines = new Set([0, 1]); // both kept
    const revised: DishDraft = {
      ...oldDraft,
      portions: 6,
      lines: [
        { ingredientId: 'i-corn', name: 'Corn', qty: 999, unit: 'lb' }, // model tampered with a kept line
      ],
    };
    const { draft, keptLines: newKept } = reconcileRefinement(oldDraft, keptLines, revised);
    expect(draft.lines).toEqual(oldDraft.lines); // both kept lines survive untouched
    expect(draft.portions).toBe(6); // non-line field IS accepted from the model
    expect(newKept).toEqual(new Set([0, 1]));
  });

  it('accepts a new line the model adds', () => {
    const keptLines = new Set([0, 1]);
    const revised: DishDraft = {
      ...oldDraft,
      lines: [
        { ingredientId: 'i-corn', name: 'Corn', qty: 2, unit: 'each' },
        { ingredientId: 'i-butter', name: 'Unsalted Butter', qty: 1, unit: 'lb' },
        { ingredientId: 'i-fish-cake', name: 'Fish Cake', qty: 1, unit: 'each' }, // new
      ],
    };
    const { draft } = reconcileRefinement(oldDraft, keptLines, revised);
    expect(draft.lines.length).toBe(3);
    expect(draft.lines[2].name).toBe('Fish Cake');
  });

  it('accepts a modification to a line the chef had not kept', () => {
    const keptLines = new Set([0]); // only corn kept; butter not kept
    const revised: DishDraft = {
      ...oldDraft,
      lines: [
        { ingredientId: 'i-corn', name: 'Corn', qty: 2, unit: 'each' },
        { ingredientId: 'i-butter', name: 'Unsalted Butter', qty: 2, unit: 'lb' }, // model revised the unkept line
      ],
    };
    const { draft } = reconcileRefinement(oldDraft, keptLines, revised);
    const butterLine = draft.lines.find(l => normalizeIngredientName(l.name) === normalizeIngredientName('Unsalted Butter'));
    expect(butterLine?.qty).toBe(2);
  });

  it('a kept line missing from the revision stays — omission is not a removal signal', () => {
    const keptLines = new Set([0, 1]);
    const revised: DishDraft = { ...oldDraft, lines: [] }; // model dropped everything
    const { draft } = reconcileRefinement(oldDraft, keptLines, revised);
    expect(draft.lines).toEqual(oldDraft.lines);
  });

  it('matches kept lines by normalized name, not exact string equality', () => {
    const keptLines = new Set([0]); // corn kept
    const revised: DishDraft = {
      ...oldDraft,
      lines: [{ ingredientId: 'i-corn', name: '  CORN  ', qty: 999, unit: 'lb' }],
    };
    const { draft } = reconcileRefinement(oldDraft, keptLines, revised);
    expect(draft.lines).toEqual([oldDraft.lines[0]]); // the model's corn line was discarded as a match
  });
});
