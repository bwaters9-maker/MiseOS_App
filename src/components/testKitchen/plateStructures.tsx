import React from 'react';
import type { PlateComponentType } from '../../types';

/**
 * Plate Designer — structural variant registries for the solid component
 * types (Protein / Starch / Vegetable / Garnish). Same conventions as
 * sauceTechniques.tsx: geometry authored in raw 1000x1000 blueprint space
 * centered at (500,500), no hardcoded blueprint colors — every asset takes
 * a `color` prop so the caller routes it through PLATE_COMPONENT_COLORS.
 *
 * Corrections applied against the source blueprints:
 * - Focal Seared Duck Breast: the sear-line accents were NOT wrapped in the
 *   same rotate(-15 520 595) transform as the rect they sit on top of, so
 *   they'd render unrotated and visually detached from the rotated block.
 *   Fixed by wrapping the whole asset (rect + lines) in one <g> transform.
 * - Central Tournedos Filet: the "height indicator" arc was drawn with the
 *   same center/radius as the outline ellipse itself (A 120,120 tracing
 *   the ellipse's own top half) — a redundant duplicate of the outline,
 *   not an actual depth cue. Replaced with a flattened dashed ellipse
 *   near the base to suggest the cylinder's far rim.
 */

export interface StructureProps {
  color: string;
}

export interface PlateStructure {
  id: string;
  name: string;
  description: string;
  Render: React.FC<StructureProps>;
}

// ===================================================================
// PROTEIN
// ===================================================================

const FocalSearedDuckBreast: React.FC<StructureProps> = ({ color }) => (
  <g transform="rotate(-15 520 595)">
    <rect x={380} y={520} width={280} height={150} rx={30} ry={30} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={6} />
    <line x1={430} y1={550} x2={490} y2={610} stroke={color} strokeWidth={3} opacity={0.55} />
    <line x1={480} y1={535} x2={540} y2={595} stroke={color} strokeWidth={3} opacity={0.55} />
    <line x1={530} y1={520} x2={590} y2={580} stroke={color} strokeWidth={3} opacity={0.55} />
  </g>
);

const CentralTournedosFilet: React.FC<StructureProps> = ({ color }) => (
  <>
    <ellipse cx={500} cy={530} rx={120} ry={120} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={6} />
    <ellipse cx={500} cy={575} rx={100} ry={30} fill="none" stroke={color} strokeWidth={3} strokeDasharray="8,8" opacity={0.6} />
  </>
);

export const PROTEIN_STRUCTURES: PlateStructure[] = [
  { id: 'focalSearedDuckBreast', name: 'Seared Duck Breast', description: 'Angled rectangular block anchoring the plate, with sear-line texture.', Render: FocalSearedDuckBreast },
  { id: 'centralTournedosFilet', name: 'Tournedos Filet', description: 'Centered cylinder with a flattened base rim suggesting depth.', Render: CentralTournedosFilet },
];

// ===================================================================
// STARCH
// ===================================================================

const LinearPotatoPave: React.FC<StructureProps> = ({ color }) => (
  <g transform="rotate(35 650 325)">
    <rect x={520} y={280} width={260} height={90} fill={color} opacity={0.85} stroke={color} strokeWidth={4} />
    <line x1={535} y1={310} x2={750} y2={310} stroke={color} strokeWidth={2} opacity={0.4} />
    <line x1={535} y1={330} x2={750} y2={330} stroke={color} strokeWidth={2} opacity={0.4} />
  </g>
);

const CleanQuenelle: React.FC<StructureProps> = ({ color }) => (
  <>
    <path d="M 400,450 C 460,400 540,400 600,450 C 540,500 460,500 400,450 Z" fill={color} opacity={0.85} stroke={color} strokeWidth={4} />
    <path d="M 400,450 C 470,440 530,440 600,450" fill="none" stroke={color} strokeWidth={2} opacity={0.5} />
  </>
);

export const STARCH_STRUCTURES: PlateStructure[] = [
  { id: 'linearPotatoPave', name: 'Potato Pavé', description: 'Layered architectural block, angled across the plate.', Render: LinearPotatoPave },
  { id: 'cleanQuenelle', name: 'Quenelle', description: 'Tapered three-sided scoop for purees or rillettes.', Render: CleanQuenelle },
];

// ===================================================================
// VEGETABLE
// ===================================================================

const BattonetGlazedCarrots: React.FC<StructureProps> = ({ color }) => (
  <g fill={color} stroke={color} strokeWidth={4} opacity={0.85} transform="rotate(-35 600 350)">
    <rect x={500} y={260} width={180} height={45} rx={10} ry={10} />
    <rect x={530} y={315} width={180} height={45} rx={10} ry={10} />
    <rect x={560} y={370} width={180} height={45} rx={10} ry={10} />
  </g>
);

const TurnedAsparagusSpears: React.FC<StructureProps> = ({ color }) => (
  <g stroke={color} strokeWidth={12} strokeLinecap="round" opacity={0.85}>
    <line x1={300} y1={650} x2={700} y2={250} />
    <path d="M 680,270 L 710,240 L 670,230 Z" fill={color} />
    <line x1={340} y1={680} x2={740} y2={280} />
    <path d="M 720,300 L 750,270 L 710,260 Z" fill={color} />
  </g>
);

export const VEGETABLE_STRUCTURES: PlateStructure[] = [
  { id: 'battonetGlazedCarrots', name: 'Glazed Carrots', description: 'Three tiered battonet-cut logs.', Render: BattonetGlazedCarrots },
  { id: 'turnedAsparagusSpears', name: 'Asparagus Spears', description: 'Two long turned spears with pointed tips.', Render: TurnedAsparagusSpears },
];

// ===================================================================
// GARNISH
// ===================================================================

const ScatteredMicrogreens: React.FC<StructureProps> = ({ color }) => (
  <g fill={color} stroke={color} strokeWidth={2} opacity={0.85}>
    <ellipse cx={440} cy={540} rx={15} ry={10} transform="rotate(30 440 540)" />
    <ellipse cx={460} cy={545} rx={15} ry={10} transform="rotate(-20 460 545)" />
    <ellipse cx={510} cy={510} rx={12} ry={8} transform="rotate(15 510 510)" />
    <ellipse cx={525} cy={515} rx={12} ry={8} transform="rotate(-40 525 515)" />
    <ellipse cx={580} cy={490} rx={16} ry={11} transform="rotate(45 580 490)" />
    <ellipse cx={600} cy={500} rx={16} ry={11} transform="rotate(-10 600 500)" />
  </g>
);

const ToastedPepitas: React.FC<StructureProps> = ({ color }) => (
  <g fill={color} stroke={color} strokeWidth={2} opacity={0.85}>
    <path d="M 420,580 Q 430,565 435,585 Q 425,595 420,580 Z" />
    <path d="M 480,560 Q 490,545 495,565 Q 485,575 480,560 Z" transform="rotate(45 485 560)" />
    <path d="M 550,540 Q 560,525 565,545 Q 555,555 550,540 Z" transform="rotate(-15 555 540)" />
    <path d="M 620,520 Q 630,505 635,525 Q 625,535 620,520 Z" transform="rotate(80 625 520)" />
  </g>
);

export const GARNISH_STRUCTURES: PlateStructure[] = [
  { id: 'scatteredMicrogreens', name: 'Microgreens', description: 'Scattered dual-leaf herb clusters.', Render: ScatteredMicrogreens },
  { id: 'toastedPepitas', name: 'Toasted Pepitas', description: 'Small pointed toasted-seed drops.', Render: ToastedPepitas },
];

// ===================================================================
// LOOKUP
// ===================================================================

const STRUCTURE_REGISTRIES: Partial<Record<PlateComponentType, PlateStructure[]>> = {
  protein: PROTEIN_STRUCTURES,
  starch: STARCH_STRUCTURES,
  vegetable: VEGETABLE_STRUCTURES,
  garnish: GARNISH_STRUCTURES,
};

export const structuresFor = (type: PlateComponentType): PlateStructure[] => STRUCTURE_REGISTRIES[type] ?? [];

export const findStructure = (type: PlateComponentType, id: string | undefined): PlateStructure | undefined =>
  id === undefined ? undefined : structuresFor(type).find(s => s.id === id);
