import React, { useMemo, useRef, useState } from 'react';
import { Plus, Save, Trash2, Copy, Minus, RotateCcw, RotateCw, Droplet, ChevronDown } from 'lucide-react';
import { addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { rCollection, rDoc } from '../../lib/firestorePaths';
import { useRestaurantId } from '../AuthContext';
import { usePlateDesigns } from '../../hooks/usePlateDesigns';
import {
  PLATE_SHAPES,
  PLATE_COMPONENT_TYPES,
  PALETTE_COMPONENT_TYPES,
  PLATE_COMPONENT_COLORS,
  PlateShapeBackground,
  PlateComponentShape,
} from './plateShapes';
import { SAUCE_TECHNIQUES, findSauceTechnique } from './sauceTechniques';
import type { PlateDesign, PlateComponent, PlateShape, PlateComponentType } from '../../types';

interface ArmedPlacement {
  type: PlateComponentType;
  techniqueId?: string;
}

const VIEWBOX = 400;
const SCALE_MIN = 0.5;
const SCALE_MAX = 2;
const SCALE_STEP = 0.1;
const ROTATE_STEP = 15;

interface WorkingState {
  name: string;
  plateShape: PlateShape;
  components: PlateComponent[];
}

const BLANK_STATE: WorkingState = { name: '', plateShape: 'round-rimmed', components: [] };

const snapshotKey = (s: WorkingState): string => JSON.stringify(s);

const formatUpdated = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const shapeLabel = (shape: PlateShape) => PLATE_SHAPES.find(s => s.value === shape)?.label ?? shape;
const typeLabel = (type: PlateComponentType) => PLATE_COMPONENT_TYPES.find(t => t.value === type)?.label ?? type;

/** 'sauceTechnique' components show the specific technique name, not just "Sauce". */
const componentLabel = (c: PlateComponent): string => {
  if (c.type === 'sauceTechnique') {
    const technique = findSauceTechnique(c.techniqueId);
    return technique ? `Sauce — ${technique.name}` : 'Sauce (unknown technique)';
  }
  return typeLabel(c.type);
};

const armedLabel = (armed: ArmedPlacement): string => {
  if (armed.type === 'sauceTechnique') {
    return findSauceTechnique(armed.techniqueId)?.name ?? 'Sauce';
  }
  return typeLabel(armed.type);
};

const PlateDesigner: React.FC = () => {
  const restaurantId = useRestaurantId();
  const { designs, loading } = usePlateDesigns();

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState(BLANK_STATE.name);
  const [plateShape, setPlateShape] = useState<PlateShape>(BLANK_STATE.plateShape);
  const [components, setComponents] = useState<PlateComponent[]>(BLANK_STATE.components);
  const [baseline, setBaseline] = useState(snapshotKey(BLANK_STATE));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [armed, setArmed] = useState<ArmedPlacement | null>(null);
  const [sauceExpanded, setSauceExpanded] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingDiscardAction, setPendingDiscardAction] = useState<(() => void) | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const isDirty = snapshotKey({ name, plateShape, components }) !== baseline;
  const selected = components.find(c => c.id === selectedId) ?? null;
  const orderedComponents = useMemo(() => [...components].sort((a, b) => a.z - b.z), [components]);

  const runOrConfirmDiscard = (action: () => void) => {
    if (isDirty) setPendingDiscardAction(() => action);
    else action();
  };

  const resetToBlank = () => {
    setCurrentId(null);
    setName(BLANK_STATE.name);
    setPlateShape(BLANK_STATE.plateShape);
    setComponents(BLANK_STATE.components);
    setBaseline(snapshotKey(BLANK_STATE));
    setSelectedId(null);
    setArmed(null);
    setSaveError(null);
  };

  const loadDesign = (d: PlateDesign) => {
    setCurrentId(d.id);
    setName(d.name);
    setPlateShape(d.plateShape);
    setComponents(d.components);
    setBaseline(snapshotKey({ name: d.name, plateShape: d.plateShape, components: d.components }));
    setSelectedId(null);
    setArmed(null);
    setSaveError(null);
  };

  const handleNewDesign = () => runOrConfirmDiscard(resetToBlank);
  const handleOpenDesign = (d: PlateDesign) => runOrConfirmDiscard(() => loadDesign(d));

  const toViewBoxPoint = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: VIEWBOX / 2, y: VIEWBOX / 2 };
    const x = clamp(((clientX - rect.left) / rect.width) * VIEWBOX, 20, VIEWBOX - 20);
    const y = clamp(((clientY - rect.top) / rect.height) * VIEWBOX, 20, VIEWBOX - 20);
    return { x, y };
  };

  const addComponentAt = (type: PlateComponentType, x: number, y: number, techniqueId?: string) => {
    const nextZ = components.length === 0 ? 1 : Math.max(...components.map(c => c.z)) + 1;
    const newComp: PlateComponent = {
      id: crypto.randomUUID(), type, x, y, scale: 1, rotation: 0, z: nextZ,
      ...(techniqueId ? { techniqueId } : {}),
    };
    setComponents(prev => [...prev, newComp]);
    setSelectedId(newComp.id);
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    let parsed: ArmedPlacement | null = null;
    try {
      parsed = JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch {
      return;
    }
    if (!parsed || !PLATE_COMPONENT_TYPES.some(t => t.value === parsed!.type)) return;
    if (parsed.type === 'sauceTechnique' && !findSauceTechnique(parsed.techniqueId)) return;
    const { x, y } = toViewBoxPoint(e.clientX, e.clientY);
    addComponentAt(parsed.type, x, y, parsed.techniqueId);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (armed) {
      const { x, y } = toViewBoxPoint(e.clientX, e.clientY);
      addComponentAt(armed.type, x, y, armed.techniqueId);
      setArmed(null);
    } else {
      setSelectedId(null);
    }
  };

  const handleComponentPointerDown = (e: React.PointerEvent<SVGGElement>, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedId(id);
    setArmed(null);
    setDraggingId(id);
  };

  const handleComponentPointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!draggingId) return;
    const { x, y } = toViewBoxPoint(e.clientX, e.clientY);
    setComponents(prev => prev.map(c => (c.id === draggingId ? { ...c, x, y } : c)));
  };

  const handleComponentPointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (draggingId) e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingId(null);
  };

  const updateSelected = (patch: Partial<PlateComponent>) => {
    if (!selectedId) return;
    setComponents(prev => prev.map(c => (c.id === selectedId ? { ...c, ...patch } : c)));
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setComponents(prev => prev.filter(c => c.id !== selectedId));
    setSelectedId(null);
  };

  const handleBringForward = () => {
    if (!selected) return;
    const sorted = orderedComponents;
    const idx = sorted.findIndex(c => c.id === selected.id);
    if (idx === -1 || idx === sorted.length - 1) return;
    const next = sorted[idx + 1];
    setComponents(prev => prev.map(c => {
      if (c.id === selected.id) return { ...c, z: next.z };
      if (c.id === next.id) return { ...c, z: selected.z };
      return c;
    }));
  };

  const handleSendBackward = () => {
    if (!selected) return;
    const sorted = orderedComponents;
    const idx = sorted.findIndex(c => c.id === selected.id);
    if (idx <= 0) return;
    const prevComp = sorted[idx - 1];
    setComponents(prev => prev.map(c => {
      if (c.id === selected.id) return { ...c, z: prevComp.z };
      if (c.id === prevComp.id) return { ...c, z: selected.z };
      return c;
    }));
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const now = new Date().toISOString();
      if (currentId) {
        await updateDoc(rDoc(restaurantId, 'plateDesigns', currentId), {
          name: trimmed, plateShape, components, updatedAt: now,
        });
      } else {
        const ref = await addDoc(rCollection(restaurantId, 'plateDesigns'), {
          name: trimmed, plateShape, components, createdAt: now, updatedAt: now,
        });
        setCurrentId(ref.id);
      }
      setName(trimmed);
      setBaseline(snapshotKey({ name: trimmed, plateShape, components }));
    } catch {
      setSaveError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (d: PlateDesign) => {
    setSaving(true);
    setSaveError(null);
    try {
      const now = new Date().toISOString();
      await addDoc(rCollection(restaurantId, 'plateDesigns'), {
        name: `${d.name} (Copy)`, plateShape: d.plateShape, components: d.components, createdAt: now, updatedAt: now,
      });
    } catch {
      setSaveError('Could not duplicate. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDesign = async (d: PlateDesign) => {
    setSaving(true);
    try {
      await deleteDoc(rDoc(restaurantId, 'plateDesigns', d.id));
      setConfirmDeleteId(null);
      if (currentId === d.id) resetToBlank();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-[13px]">
      {pendingDiscardAction && (
        <div className="bg-saffron-soft border border-saffron/40 rounded-card p-[13px] flex flex-wrap items-center justify-between gap-[13px]">
          <p className="text-[11px] text-saffron-text font-bold">
            This dish has unsaved changes — discard them?
          </p>
          <div className="flex items-center gap-[8px] shrink-0">
            <button
              type="button"
              onClick={() => { pendingDiscardAction(); setPendingDiscardAction(null); }}
              className="text-[10px] font-bold uppercase text-white bg-danger rounded-[8px] px-[13px] py-[5px]"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={() => setPendingDiscardAction(null)}
              className="text-[10px] font-bold uppercase text-slate px-[8px] py-[5px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* PLATE SHAPE PICKER */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Plate Shape</p>
        <div className="flex flex-wrap gap-[8px]">
          {PLATE_SHAPES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setPlateShape(s.value)}
              title={s.label}
              aria-pressed={plateShape === s.value}
              className={`shrink-0 w-[44px] h-[44px] rounded-[8px] border-2 overflow-hidden transition-colors duration-[144ms] ${
                plateShape === s.value ? 'border-teal' : 'border-line hover:border-slate/50'
              }`}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <PlateShapeBackground shape={s.value} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* NAME + SAVE */}
      <div className="flex flex-wrap items-center gap-[8px]">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Dish name"
          className="flex-1 min-w-[160px] bg-bg-cool border border-line rounded-[8px] px-[13px] py-[8px] text-sm text-navy placeholder:text-slate/60 focus:outline-none focus:border-teal"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || saving || !isDirty}
          className="flex items-center gap-[5px] px-[13px] py-[8px] bg-teal text-white rounded-[8px] text-xs font-bold disabled:opacity-40 transition-opacity duration-[144ms]"
        >
          <Save className="w-3.5 h-3.5" /> {currentId ? 'Save' : 'Save New'}
        </button>
        <button
          type="button"
          onClick={handleNewDesign}
          className="flex items-center gap-[5px] px-[13px] py-[8px] border border-line rounded-[8px] text-xs font-bold text-slate hover:text-navy transition-colors duration-[144ms]"
        >
          <Plus className="w-3.5 h-3.5" /> New Design
        </button>
        {isDirty && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-saffron-text flex items-center gap-[5px]">
            <span className="w-[6px] h-[6px] rounded-full bg-saffron" /> Unsaved changes
          </span>
        )}
      </div>
      {!name.trim() && (
        <p className="text-[10px] text-slate -mt-[5px]">Name the dish to save this design.</p>
      )}
      {saveError && <p className="text-[10px] text-danger -mt-[5px]">{saveError}</p>}

      {/* COMPONENT PALETTE */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Component Palette</p>
        <div className="flex flex-wrap gap-[8px]">
          {PALETTE_COMPONENT_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              draggable
              onDragStart={e => { setArmed(null); e.dataTransfer.setData('text/plain', JSON.stringify({ type: t.value })); e.dataTransfer.effectAllowed = 'copy'; }}
              onClick={() => setArmed(cur => (cur && cur.type === t.value ? null : { type: t.value }))}
              aria-pressed={armed?.type === t.value}
              className={`flex items-center gap-[5px] px-[8px] py-[5px] rounded-[8px] border-2 text-[10px] font-bold text-navy transition-colors duration-[144ms] cursor-grab active:cursor-grabbing ${
                armed?.type === t.value ? 'border-teal bg-accent-wash' : 'border-line hover:border-slate/50'
              }`}
            >
              <svg viewBox="-30 -30 60 60" className="w-[18px] h-[18px] shrink-0">
                <PlateComponentShape type={t.value} />
              </svg>
              {t.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSauceExpanded(x => !x)}
            aria-expanded={sauceExpanded}
            className={`flex items-center gap-[5px] px-[8px] py-[5px] rounded-[8px] border-2 text-[10px] font-bold text-navy transition-colors duration-[144ms] ${
              sauceExpanded || armed?.type === 'sauceTechnique' ? 'border-teal bg-accent-wash' : 'border-line hover:border-slate/50'
            }`}
          >
            <Droplet className="w-[18px] h-[18px] shrink-0" style={{ color: PLATE_COMPONENT_COLORS.sauceTechnique }} />
            Sauce
            <ChevronDown className={`w-3 h-3 transition-transform duration-[144ms] ${sauceExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {sauceExpanded && (
          <div className="mt-[8px] grid grid-cols-2 sm:grid-cols-4 gap-[8px] bg-bg-cool border border-line rounded-card p-[8px]">
            {SAUCE_TECHNIQUES.map(tech => (
              <button
                key={tech.id}
                type="button"
                draggable
                onDragStart={e => { setArmed(null); e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'sauceTechnique', techniqueId: tech.id })); e.dataTransfer.effectAllowed = 'copy'; }}
                onClick={() => setArmed(cur => (cur?.techniqueId === tech.id ? null : { type: 'sauceTechnique', techniqueId: tech.id }))}
                aria-pressed={armed?.techniqueId === tech.id}
                title={tech.description}
                className={`flex flex-col items-center gap-[3px] p-[5px] rounded-[8px] border-2 text-center transition-colors duration-[144ms] cursor-grab active:cursor-grabbing ${
                  armed?.techniqueId === tech.id ? 'border-teal bg-accent-wash' : 'border-line bg-surface hover:border-slate/50'
                }`}
              >
                <svg viewBox="0 0 1000 1000" className="w-[36px] h-[36px] rounded-[5px] bg-bg-cool shrink-0">
                  <tech.Render color={PLATE_COMPONENT_COLORS.sauceTechnique} />
                </svg>
                <span className="text-[9px] font-bold text-navy leading-tight">{tech.name}</span>
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-slate mt-[5px]">
          {armed
            ? `Tap the plate to place ${armedLabel(armed)}.`
            : 'Drag onto the plate, or tap a component then tap the plate to place it.'}
        </p>
      </div>

      {/* CANVAS */}
      <div
        ref={canvasRef}
        onDragOver={e => e.preventDefault()}
        onDrop={handleCanvasDrop}
        onClick={handleCanvasClick}
        className="w-full max-w-[377px] mx-auto aspect-square"
        style={{ touchAction: 'none' }}
      >
        <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="w-full h-full rounded-card border border-line bg-bg-cool">
          <PlateShapeBackground shape={plateShape} />
          {orderedComponents.map(c => (
            <g
              key={c.id}
              transform={`translate(${c.x} ${c.y}) rotate(${c.rotation}) scale(${c.scale})`}
              onPointerDown={e => handleComponentPointerDown(e, c.id)}
              onPointerMove={handleComponentPointerMove}
              onPointerUp={handleComponentPointerUp}
              onClick={e => e.stopPropagation()}
              style={{ cursor: 'grab', touchAction: 'none' }}
            >
              <PlateComponentShape type={c.type} techniqueId={c.techniqueId} />
              {selectedId === c.id && (
                <circle r={46} fill="none" stroke="var(--color-teal)" strokeWidth={2} strokeDasharray="5 4" />
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* SELECTED ITEM CONTROLS */}
      <div className="bg-surface border border-line rounded-card p-[13px]">
        {!selected ? (
          <p className="text-xs text-slate italic">No component selected — click one on the plate, or add one from the palette.</p>
        ) : (
          <div className="flex flex-col gap-[13px]">
            <div className="flex items-center justify-between gap-[8px]">
              <span className="flex items-center gap-[8px] text-xs font-bold text-navy">
                <span
                  className="w-[13px] h-[13px] rounded-full shrink-0"
                  style={{ backgroundColor: PLATE_COMPONENT_COLORS[selected.type] }}
                />
                {componentLabel(selected)}
              </span>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex items-center gap-[5px] text-[10px] font-bold uppercase text-danger hover:opacity-70 transition-opacity duration-[144ms]"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-[13px]">
              <div className="flex items-center gap-[5px]">
                <span className="text-[10px] font-bold uppercase text-slate w-[40px]">Scale</span>
                <button type="button" onClick={() => updateSelected({ scale: clamp(selected.scale - SCALE_STEP, SCALE_MIN, SCALE_MAX) })} className="w-[24px] h-[24px] flex items-center justify-center border border-line rounded-[5px] text-slate hover:text-navy"><Minus className="w-3 h-3" /></button>
                <input
                  type="range"
                  min={SCALE_MIN}
                  max={SCALE_MAX}
                  step={0.05}
                  value={selected.scale}
                  onChange={e => updateSelected({ scale: Number(e.target.value) })}
                  className="w-[89px] accent-teal"
                />
                <button type="button" onClick={() => updateSelected({ scale: clamp(selected.scale + SCALE_STEP, SCALE_MIN, SCALE_MAX) })} className="w-[24px] h-[24px] flex items-center justify-center border border-line rounded-[5px] text-slate hover:text-navy"><Plus className="w-3 h-3" /></button>
                <span className="text-[10px] font-mono text-slate w-[34px]">{Math.round(selected.scale * 100)}%</span>
              </div>

              <div className="flex items-center gap-[5px]">
                <span className="text-[10px] font-bold uppercase text-slate w-[40px]">Rotate</span>
                <button type="button" onClick={() => updateSelected({ rotation: (selected.rotation - ROTATE_STEP + 360) % 360 })} className="w-[24px] h-[24px] flex items-center justify-center border border-line rounded-[5px] text-slate hover:text-navy"><RotateCcw className="w-3 h-3" /></button>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={selected.rotation}
                  onChange={e => updateSelected({ rotation: Number(e.target.value) })}
                  className="w-[89px] accent-teal"
                />
                <button type="button" onClick={() => updateSelected({ rotation: (selected.rotation + ROTATE_STEP) % 360 })} className="w-[24px] h-[24px] flex items-center justify-center border border-line rounded-[5px] text-slate hover:text-navy"><RotateCw className="w-3 h-3" /></button>
                <span className="text-[10px] font-mono text-slate w-[34px]">{Math.round(selected.rotation)}°</span>
              </div>

              <div className="flex items-center gap-[5px]">
                <button type="button" onClick={handleSendBackward} className="text-[10px] font-bold uppercase text-slate hover:text-navy border border-line rounded-[5px] px-[8px] py-[5px]">Send Backward</button>
                <button type="button" onClick={handleBringForward} className="text-[10px] font-bold uppercase text-slate hover:text-navy border border-line rounded-[5px] px-[8px] py-[5px]">Bring Forward</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SAVED DESIGNS */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Saved Designs</p>
        {loading ? (
          <p className="text-xs text-slate">Loading…</p>
        ) : designs.length === 0 ? (
          <p className="text-xs text-slate italic">No saved plate designs yet.</p>
        ) : (
          <div className="flex flex-col gap-[5px]">
            {designs.map(d => {
              const isOpen = currentId === d.id;
              const isConfirm = confirmDeleteId === d.id;
              return (
                <div
                  key={d.id}
                  className={`flex flex-wrap items-center justify-between gap-[8px] bg-surface border rounded-card px-[13px] py-[8px] ${
                    isOpen ? 'border-teal' : 'border-line'
                  }`}
                >
                  <button type="button" onClick={() => handleOpenDesign(d)} className="flex items-baseline gap-[8px] text-left min-w-0">
                    <span className="text-sm font-bold text-navy truncate">{d.name}</span>
                    <span className="text-[10px] text-slate shrink-0">{shapeLabel(d.plateShape)} · {formatUpdated(d.updatedAt)}</span>
                    {isOpen && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-teal text-white rounded-full px-[8px] py-[1px]">Open</span>}
                  </button>
                  <div className="flex items-center gap-[8px] shrink-0">
                    <button type="button" onClick={() => handleDuplicate(d)} disabled={saving} className="flex items-center gap-[5px] text-[10px] font-bold uppercase text-slate hover:text-navy"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
                    {isConfirm ? (
                      <>
                        <button type="button" onClick={() => handleDeleteDesign(d)} disabled={saving} className="text-[10px] font-bold uppercase text-white bg-danger rounded-[8px] px-[13px] py-[5px]">Confirm Delete</button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-[10px] font-bold uppercase text-slate px-[8px] py-[5px]">Cancel</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirmDeleteId(d.id)} className="text-slate hover:text-danger transition-colors duration-[144ms]" aria-label={`Delete ${d.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlateDesigner;
