/**
 * src/components/testkitchen/DishBuildPanel.tsx
 * The "Recipe Build" zone of the unified Test Kitchen room. Holds a
 * client-only DishDraft (never written to Firestore itself) pulled from
 * the Sous conversation via a structured extraction pass. Read-only
 * rendering with per-line accept/drop checkboxes (Option A) — all other
 * editing happens after hand-off, in the real Recipe Builder.
 *
 * This step builds the empty state and the draft-loaded UI against local
 * component state only. The extraction call itself (prompt, pantry
 * matching, parsing) and the "Send to Recipe Builder" hand-off are wired
 * in later build steps — handleExtract is a placeholder until then.
 */
import React, { useState } from 'react';
import { ChefHat } from 'lucide-react';
import type { DishDraft } from '../../types';

export default function DishBuildPanel() {
  const [draft, setDraft] = useState<DishDraft | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [keptLines, setKeptLines] = useState<Set<number>>(new Set());

  const toggleLine = (index: number) => {
    setKeptLines(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const handleExtract = () => {
    // The real /api/ai extraction call (chat transcript + live pantry in,
    // DishDraft out) lands in the next build step. Left as a placeholder
    // so this step's empty state and draft-loaded UI can be verified on
    // their own first.
    setExtracting(false);
  };

  const canHandOff = !!draft && !!draft.dishName.trim() && !!draft.batchYield && draft.portions != null;

  return (
    <div className="bg-surface border border-line rounded-card p-[21px] h-full min-h-0 overflow-y-auto">
      <h3 className="text-xs font-bold uppercase tracking-widest text-navy border-b border-line pb-[8px]">Recipe Build</h3>

      {!draft ? (
        <div className="flex flex-col items-center text-center gap-[13px] py-[34px]">
          <ChefHat className="w-6 h-6 text-slate/40" />
          <p className="text-xs text-slate leading-relaxed max-w-[210px]">No dish yet — extract from the conversation to start one.</p>
          <button
            onClick={handleExtract}
            disabled={extracting}
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
