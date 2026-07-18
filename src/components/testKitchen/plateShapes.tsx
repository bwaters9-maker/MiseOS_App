import React from 'react';
import { findSauceTechnique } from './sauceTechniques';
import type { PlateShape, PlateComponentType } from '../../types';

/**
 * Plate Designer (Test Kitchen Phase D) shape library — clean top-down SVG,
 * no images. All plate/component geometry is centered so callers can wrap
 * it in their own <g transform="translate(x y) rotate(r) scale(s)">.
 * Colors use the brand token CSS custom properties (see src/index.css)
 * so every shape auto-flips under [data-surface="service"] like the rest
 * of the app.
 */

const RIM_FILL = 'var(--color-surface)';
const WELL_FILL = 'var(--color-bg-cool)';
const LINE = 'var(--color-line)';
const NAVY = 'var(--color-navy)';

export const PLATE_SHAPES: { value: PlateShape; label: string }[] = [
  { value: 'round-rimmed', label: 'Round Rimmed' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'bowl', label: 'Bowl' },
  { value: 'wide-rim-bowl', label: 'Wide-Rim Bowl' },
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'square', label: 'Square' },
  { value: 'offset', label: 'Offset' },
];

/** Renders just the plate silhouette — embed inside a viewBox="0 0 400 400" <svg>. */
export const PlateShapeBackground: React.FC<{ shape: PlateShape }> = ({ shape }) => {
  switch (shape) {
    case 'round-rimmed':
      return (
        <g>
          <circle cx={200} cy={200} r={185} fill={RIM_FILL} stroke={LINE} strokeWidth={2} />
          <circle cx={200} cy={200} r={130} fill={WELL_FILL} stroke={LINE} strokeWidth={1.5} />
        </g>
      );
    case 'coupe':
      return (
        <g>
          <circle cx={200} cy={200} r={175} fill={RIM_FILL} stroke={LINE} strokeWidth={2} />
          <circle cx={200} cy={200} r={163} fill="none" stroke={LINE} strokeWidth={1} opacity={0.5} />
        </g>
      );
    case 'bowl':
      return (
        <g>
          <circle cx={200} cy={200} r={175} fill={RIM_FILL} stroke={NAVY} strokeWidth={3} />
          <circle cx={200} cy={200} r={105} fill={WELL_FILL} stroke={LINE} strokeWidth={1.5} />
        </g>
      );
    case 'wide-rim-bowl':
      return (
        <g>
          <circle cx={200} cy={200} r={185} fill={RIM_FILL} stroke={LINE} strokeWidth={2} />
          <circle cx={200} cy={200} r={85} fill={WELL_FILL} stroke={LINE} strokeWidth={1.5} />
        </g>
      );
    case 'rectangle':
      return (
        <g>
          <rect x={40} y={110} width={320} height={180} rx={18} fill={RIM_FILL} stroke={LINE} strokeWidth={2} />
          <rect x={70} y={138} width={260} height={124} rx={12} fill={WELL_FILL} stroke={LINE} strokeWidth={1.5} />
        </g>
      );
    case 'square':
      return (
        <g>
          <rect x={55} y={55} width={290} height={290} rx={20} fill={RIM_FILL} stroke={LINE} strokeWidth={2} />
          <rect x={90} y={90} width={220} height={220} rx={14} fill={WELL_FILL} stroke={LINE} strokeWidth={1.5} />
        </g>
      );
    case 'offset':
      return (
        <g>
          <path
            d="M200,35 C275,30 345,80 360,165 C374,245 320,335 225,358 C130,380 45,325 32,235 C20,145 90,55 200,35 Z"
            fill={RIM_FILL}
            stroke={LINE}
            strokeWidth={2}
          />
          <path
            d="M200,95 C245,92 285,120 293,168 C301,215 268,265 215,278 C162,290 115,258 108,208 C101,158 140,100 200,95 Z"
            fill={WELL_FILL}
            stroke={LINE}
            strokeWidth={1.5}
          />
        </g>
      );
  }
};

export const PLATE_COMPONENT_TYPES: { value: PlateComponentType; label: string }[] = [
  { value: 'protein', label: 'Protein' },
  { value: 'starch', label: 'Starch' },
  { value: 'vegetable', label: 'Vegetable' },
  { value: 'sauceSmear', label: 'Sauce Smear' },
  { value: 'sauceDots', label: 'Sauce Dots' },
  { value: 'garnish', label: 'Garnish' },
  { value: 'sauceTechnique', label: 'Sauce' },
];

/**
 * Palette-eligible non-sauce types. Sauce placement goes through the
 * technique picker (SAUCE_TECHNIQUES in sauceTechniques.tsx) instead of a
 * flat palette chip — 'sauceSmear'/'sauceDots' stay out of the palette
 * entirely (v1.0 shapes, load-only) and 'sauceTechnique' has its own UI.
 */
export const PALETTE_COMPONENT_TYPES = PLATE_COMPONENT_TYPES.filter(
  t => t.value !== 'sauceSmear' && t.value !== 'sauceDots' && t.value !== 'sauceTechnique'
);

/**
 * Local content palette for color-coding component types on the canvas —
 * deliberately distinct from the brand chrome tokens (saffron is signal-
 * only, danger is destructive-only per CLAUDE.md). Same precedent as the
 * Seasonal Matrix's own local SEASON_GREEN/GOLD/OFF palette elsewhere in
 * TestKitchenHub.tsx: this is plated content the chef is designing, not UI.
 */
export const PLATE_COMPONENT_COLORS: Record<PlateComponentType, string> = {
  protein: '#A9603C',
  starch: '#D6C08A',
  vegetable: '#6F8F5A',
  sauceSmear: '#7A4A63',
  sauceDots: '#5B7A93',
  garnish: '#3F6B4A',
  sauceTechnique: '#7A4A63',
};

/** Sauce technique blueprints are authored in 1000x1000 space; this scales
 * them down to the same footprint the other components use on the 400-unit
 * canvas. Picker thumbnails render the raw 1000x1000 geometry directly
 * instead (viewBox="0 0 1000 1000"), so this only applies at placement time. */
export const SAUCE_TECHNIQUE_SCALE = 0.16;

const EDGE_STROKE = 'rgba(0,0,0,0.18)';

/** Renders one component shape centered at local (0,0) — wrap in a <g transform>. */
export const PlateComponentShape: React.FC<{ type: PlateComponentType; techniqueId?: string }> = ({ type, techniqueId }) => {
  const fill = PLATE_COMPONENT_COLORS[type];
  switch (type) {
    case 'protein':
      return (
        <path
          d="M -38,-10 C -30,-28 10,-30 30,-14 C 46,-2 40,20 18,28 C -6,36 -34,24 -40,4 C -43,-2 -42,-6 -38,-10 Z"
          fill={fill}
          stroke={EDGE_STROKE}
          strokeWidth={1.5}
        />
      );
    case 'starch':
      return (
        <path
          d="M -30,20 C -34,-4 -14,-26 10,-24 C 34,-22 42,2 34,20 C 26,34 -22,34 -30,20 Z"
          fill={fill}
          stroke={EDGE_STROKE}
          strokeWidth={1.5}
        />
      );
    case 'vegetable':
      return (
        <g fill={fill} stroke={EDGE_STROKE} strokeWidth={1.5}>
          <circle cx={-14} cy={-6} r={10} />
          <circle cx={12} cy={-10} r={9} />
          <circle cx={0} cy={14} r={11} />
        </g>
      );
    case 'sauceSmear':
      return (
        <path
          d="M -36,10 C -30,-20 0,-30 20,-18 C 34,-10 30,6 14,10 C 26,12 34,20 24,28 C 8,38 -30,32 -36,10 Z"
          fill={fill}
          stroke={EDGE_STROKE}
          strokeWidth={1.5}
        />
      );
    case 'sauceDots':
      return (
        <g fill={fill} stroke={EDGE_STROKE} strokeWidth={1.5}>
          <circle cx={-24} cy={-16} r={6} />
          <circle cx={0} cy={0} r={6} />
          <circle cx={24} cy={16} r={6} />
        </g>
      );
    case 'garnish':
      return (
        <g fill={fill} stroke={EDGE_STROKE} strokeWidth={1}>
          <path d="M 0,4 C -6,-10 -4,-26 0,-34 C 4,-26 6,-10 0,4 Z" transform="rotate(-24)" />
          <path d="M 0,4 C -6,-10 -4,-26 0,-34 C 4,-26 6,-10 0,4 Z" transform="rotate(24)" />
          <path d="M 0,4 C -6,-10 -4,-26 0,-34 C 4,-26 6,-10 0,4 Z" />
        </g>
      );
    case 'sauceTechnique': {
      const technique = findSauceTechnique(techniqueId);
      if (!technique) return null;
      const Render = technique.Render;
      return (
        <g transform={`scale(${SAUCE_TECHNIQUE_SCALE}) translate(-500,-500)`}>
          <Render color={fill} />
        </g>
      );
    }
  }
};
