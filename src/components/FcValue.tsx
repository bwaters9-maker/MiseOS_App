import React from 'react';
import type { FcIndicator } from '../lib/costEngine';

interface FcValueProps {
  indicator: FcIndicator;
  /** Pre-formatted percentage text, e.g. "31.2%" or "FC 31%" — each call site
   * keeps its own existing wording; this component only renders the state. */
  percentText: string;
  className?: string;
  /**
   * Overrides the ink for 'under'/'borderline' — defaults to the indicator's
   * own text-navy. Required on any screen still on the legacy dark-zinc skin
   * (not yet on the Day/Service token cascade, CLAUDE.md's pending-migration
   * list): text-navy is #1B2A41, 1.38:1 against zinc-950 — effectively
   * invisible, not just off-brand. Pass a light ink (e.g. text-zinc-100) there.
   */
  calmClass?: string;
  /** Overrides the ink for 'over' — defaults to text-danger. Same legacy-dark
   * exception: text-danger is 3.66:1 against zinc-950, under AA for normal
   * text; pass the screen's existing alert red (e.g. text-red-400, 7.19:1). */
  escalatedClass?: string;
}

/**
 * Renders an FcIndicator (see costEngine.ts) as text: a fixed-width leading
 * glyph column — so glyphs align down a list even on rows with no glyph —
 * the percentage in tabular-nums, and, for borderline/over only, the delta
 * from target in parentheses. The numeral stays the largest, most opaque
 * element; this is read mid-service, not studied. Only used when fc is a
 * real number — the "no data" case at every call site stays a plain neutral
 * span, unchanged.
 */
export const FcValue: React.FC<FcValueProps> = ({ indicator, percentText, className = '', calmClass, escalatedClass }) => {
  const inkClass = indicator.state === 'over' ? (escalatedClass ?? indicator.textClass) : (calmClass ?? indicator.textClass);
  return (
    <span className={`inline-flex items-baseline gap-[3px] font-mono tabular-nums ${inkClass} ${indicator.weightClass} ${className}`}>
      <span className="inline-block w-[10px] text-center shrink-0" aria-hidden="true">{indicator.glyph}</span>
      <span>
        {percentText}
        {indicator.state !== 'under' && (
          <span className="ml-[3px] opacity-70">({indicator.delta > 0 ? '+' : ''}{indicator.delta.toFixed(1)})</span>
        )}
      </span>
    </span>
  );
};
