import React, { useId } from 'react';

/**
 * Plate Designer v1.1 — Sauce Technique registry (8 core plating techniques).
 * Geometry lives in raw 1000x1000 blueprint space, centered at (500,500),
 * with each blueprint's own embedded plate-circle background stripped —
 * the canvas already draws the plate. Callers choose how to embed this:
 * a picker thumbnail uses viewBox="0 0 1000 1000" directly; placement on
 * the real canvas scales it down (see SAUCE_TECHNIQUE_SCALE in
 * plateShapes.tsx). Color is never hardcoded here — every technique takes
 * a `color` prop so the caller can route it through the same local
 * sauce/content palette the other component types use, keeping it
 * consistent across Day/Service surfaces. Where a blueprint used two
 * distinct hues (e.g. a solid arc plus a lighter guide line), that's
 * reproduced as the one color at two different opacities instead.
 */

export interface SauceTechniqueProps {
  color: string;
}

export interface SauceTechnique {
  id: string;
  name: string;
  description: string;
  Render: React.FC<SauceTechniqueProps>;
}

const ClassicSwoosh: React.FC<SauceTechniqueProps> = ({ color }) => (
  <>
    <path d="M 250,700 A 320,320 0 0,1 750,300" fill="none" stroke={color} strokeWidth={50} strokeLinecap="round" opacity={0.85} />
    <path d="M 230,720 A 350,350 0 0,1 780,270" fill="none" stroke={color} strokeWidth={3} strokeDasharray="10,10" opacity={0.55} />
  </>
);

const ProgressiveLinearDots: React.FC<SauceTechniqueProps> = ({ color }) => (
  <g fill={color}>
    <circle cx={250} cy={500} r={45} />
    <circle cx={370} cy={500} r={35} />
    <circle cx={480} cy={500} r={27} />
    <circle cx={580} cy={500} r={20} />
    <circle cx={670} cy={500} r={14} />
    <circle cx={750} cy={500} r={9} />
  </g>
);

const PastryBrushSweep: React.FC<SauceTechniqueProps> = ({ color }) => (
  <g stroke={color} strokeWidth={6} opacity={0.85} transform="rotate(-15 500 500)">
    <line x1={200} y1={440} x2={800} y2={440} />
    <line x1={180} y1={465} x2={820} y2={465} strokeWidth={12} />
    <line x1={190} y1={490} x2={810} y2={490} strokeWidth={8} />
    <line x1={175} y1={515} x2={825} y2={515} strokeWidth={14} />
    <line x1={210} y1={540} x2={790} y2={540} strokeWidth={5} />
    <line x1={230} y1={560} x2={770} y2={560} />
  </g>
);

const ConcentricOrbit: React.FC<SauceTechniqueProps> = ({ color }) => (
  <>
    <circle cx={500} cy={500} r={280} fill="none" stroke={color} strokeWidth={4} strokeDasharray="15,15" opacity={0.4} />
    <g fill={color}>
      <circle cx={500} cy={220} r={22} />
      <circle cx={780} cy={500} r={22} />
      <circle cx={500} cy={780} r={22} />
      <circle cx={220} cy={500} r={22} />
      <circle cx={698} cy={302} r={16} opacity={0.7} />
      <circle cx={698} cy={698} r={16} opacity={0.7} />
      <circle cx={302} cy={698} r={16} opacity={0.7} />
      <circle cx={302} cy={302} r={16} opacity={0.7} />
    </g>
  </>
);

/** Needs a unique gradient id per instance — a hardcoded id would collide
 * if this technique is placed more than once on the same canvas. */
const OffCenterBisection: React.FC<SauceTechniqueProps> = ({ color }) => {
  const gradId = useId();
  return (
    <>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <rect x={250} y={300} width={450} height={350} fill={`url(#${gradId})`} transform="rotate(-20 500 500)" />
      <line x1={330} y1={210} x2={120} y2={780} stroke={color} strokeWidth={8} opacity={0.9} />
    </>
  );
};

const KineticSplatter: React.FC<SauceTechniqueProps> = ({ color }) => (
  <g stroke={color} fill={color}>
    <circle cx={500} cy={500} r={55} />
    <path d="M 500,500 Q 530,420 560,310 Q 570,280 555,270" fill="none" strokeWidth={12} strokeLinecap="round" />
    <path d="M 500,500 Q 610,480 730,450 Q 760,440 755,465" fill="none" strokeWidth={9} strokeLinecap="round" />
    <path d="M 500,500 Q 420,580 310,690" fill="none" strokeWidth={14} strokeLinecap="round" />
    <path d="M 500,500 Q 550,590 620,740" fill="none" strokeWidth={10} strokeLinecap="round" />
    <path d="M 500,500 Q 380,440 220,400" fill="none" strokeWidth={8} strokeLinecap="round" />
    <circle cx={570} cy={230} r={10} />
    <circle cx={790} cy={450} r={7} />
    <circle cx={270} cy={730} r={12} />
    <circle cx={180} cy={390} r={6} />
  </g>
);

/**
 * The original blueprint's arc chain is malformed: most of its `A rx,ry`
 * segments specify a radius smaller than half the distance between their
 * own start/end points (e.g. r=90 connecting points 240 apart, which
 * needs r>=120), which is geometrically impossible — SVG's arc renderer
 * silently scales such radii up just enough to connect the points, so
 * the shape that would actually render is a lumpy, uneven wobble, not a
 * spiral. Redrawn here as a real sampled Archimedean spiral (radius
 * grows linearly with angle) that keeps the original's intent — a trail
 * dispensed outward from the plate center while it spins.
 */
const buildSpiralPath = (turns: number, maxRadius: number, steps: number): string => {
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * turns * 2 * Math.PI;
    const r = maxRadius * t;
    const x = 500 + r * Math.cos(theta - Math.PI / 2);
    const y = 500 + r * Math.sin(theta - Math.PI / 2);
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
};

const ROTATING_SPIRAL_PATH = buildSpiralPath(2.75, 320, 120);

const RotatingSpiral: React.FC<SauceTechniqueProps> = ({ color }) => (
  <path d={ROTATING_SPIRAL_PATH} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" opacity={0.85} />
);

const CrosshatchMesh: React.FC<SauceTechniqueProps> = ({ color }) => (
  <g stroke={color} strokeWidth={12} opacity={0.75}>
    <line x1={300} y1={300} x2={700} y2={300} />
    <line x1={300} y1={380} x2={700} y2={380} />
    <line x1={300} y1={460} x2={700} y2={460} />
    <line x1={300} y1={540} x2={700} y2={540} />
    <line x1={300} y1={620} x2={700} y2={620} />
    <line x1={300} y1={700} x2={700} y2={700} />
    <line x1={300} y1={300} x2={300} y2={700} />
    <line x1={380} y1={300} x2={380} y2={700} />
    <line x1={460} y1={300} x2={460} y2={700} />
    <line x1={540} y1={300} x2={540} y2={700} />
    <line x1={620} y1={300} x2={620} y2={700} />
    <line x1={700} y1={300} x2={700} y2={700} />
  </g>
);

export const SAUCE_TECHNIQUES: SauceTechnique[] = [
  { id: 'classicSwoosh', name: 'Classic Swoosh', description: 'A dense dollop dragged with the back of a spoon into a tapering crescent arc.', Render: ClassicSwoosh },
  { id: 'progressiveLinearDots', name: 'Progressive Linear Dots', description: 'A squeeze-bottle sequence of drops shifting from large to small along a line.', Render: ProgressiveLinearDots },
  { id: 'pastryBrushSweep', name: 'Pastry Brush Sweep', description: 'A puree painted across the plate with a silicone brush, showing bristle texture.', Render: PastryBrushSweep },
  { id: 'concentricOrbit', name: 'Concentric Orbit', description: 'Evenly spaced drops ringing the focal zone in geometric symmetry.', Render: ConcentricOrbit },
  { id: 'offCenterBisection', name: 'Off-Center Bisection', description: 'A dropped line of sauce dragged flat with an offset spatula into a fading band.', Render: OffCenterBisection },
  { id: 'kineticSplatter', name: 'Kinetic Splatter', description: 'A tapped pool of reduction exploding into abstract radiating branches.', Render: KineticSplatter },
  { id: 'rotatingSpiral', name: 'Rotating Spiral', description: 'A turntable-spun spiral dispensed outward from the plate center.', Render: RotatingSpiral },
  { id: 'crosshatchMesh', name: 'Crosshatch Mesh', description: 'A notched comb pulled across two axes, leaving an open geometric grid.', Render: CrosshatchMesh },
];

export const findSauceTechnique = (id: string | undefined): SauceTechnique | undefined =>
  id === undefined ? undefined : SAUCE_TECHNIQUES.find(t => t.id === id);
