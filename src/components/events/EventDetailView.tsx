import React, { useState } from 'react';
import { ArrowLeft, Clock, Plus, Pencil, Trash2, Check, X, Search, ChefHat, Contact, History, Flag, Users, Link2, Unlink, ChevronDown, ScrollText } from 'lucide-react';
import { updateDoc } from 'firebase/firestore';
import { rDoc } from '../../lib/firestorePaths';
import { useRestaurantId } from '../AuthContext';
import type { KitchenEvent, Client, Employee, Shift, Recipe, Ingredient, RecipeCategory, EventMilestone, TentativeMenuLine, EventChangeLogEntry } from '../../types';
import { costPerPortion } from '../../lib/costEngine';
import { todayDateKey, formatTime12h } from '../../utils';

const readAttendees = (e: KitchenEvent): number | undefined =>
  e.attendees ?? (e as unknown as { covers?: number }).covers;

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

const getToday = todayDateKey;

const CARD = 'bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px]';
const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';
const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';
const PANEL_LABEL = 'text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-[8px] mb-[13px]';

// ===================================================================
// TIMELINE PANEL
// ===================================================================

interface MilestoneFormState {
  time: string;
  label: string;
}

const BLANK_MILESTONE = (): MilestoneFormState => ({ time: '', label: '' });

const TimelinePanel: React.FC<{ event: KitchenEvent }> = ({ event }) => {
  const restaurantId = useRestaurantId();
  const milestones = event.milestones ?? [];
  const sorted = milestones
    .map((m, idx) => ({ ...m, idx }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<MilestoneFormState>(BLANK_MILESTONE());
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MilestoneFormState>(BLANK_MILESTONE());
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const writeMilestones = async (next: EventMilestone[]) => {
    setSaving(true);
    try {
      await updateDoc(rDoc(restaurantId, 'events', event.id), { milestones: next });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.time || !addForm.label.trim() || saving) return;
    await writeMilestones([...milestones, { time: addForm.time, label: addForm.label.trim() }]);
    setAddForm(BLANK_MILESTONE());
    setShowAdd(false);
  };

  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setEditForm({ time: milestones[idx].time, label: milestones[idx].label });
    setDeleteConfirmIdx(null);
    setShowAdd(false);
  };

  const handleEdit = async () => {
    if (editIdx === null || !editForm.time || !editForm.label.trim() || saving) return;
    const next = milestones.map((m, i) => i === editIdx ? { time: editForm.time, label: editForm.label.trim() } : m);
    await writeMilestones(next);
    setEditIdx(null);
  };

  const handleDelete = async (idx: number) => {
    await writeMilestones(milestones.filter((_, i) => i !== idx));
    setDeleteConfirmIdx(null);
  };

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-[13px]">
        <h2 className={`${PANEL_LABEL} text-purple-400 !mb-0`}>
          <Clock className="w-3.5 h-3.5" />
          Event Timeline
        </h2>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); setEditIdx(null); }} className="p-[5px] text-zinc-600 hover:text-purple-300 transition-colors duration-[144ms]" title="Add milestone">
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {sorted.length === 0 && !showAdd && (
        <p className="text-xs text-zinc-500 italic py-[8px]">No milestones yet.</p>
      )}

      <div className="space-y-[5px]">
        {sorted.map(m => {
          if (editIdx === m.idx) {
            return (
              <div key={m.idx} className="bg-zinc-900/50 border border-zinc-800 rounded-[8px] p-[13px] space-y-[8px]">
                <div className="grid grid-cols-[auto_1fr] gap-[8px]">
                  <input type="time" value={editForm.time} onChange={e => setEditForm({ ...editForm, time: e.target.value })} className={INPUT} autoFocus />
                  <input type="text" value={editForm.label} onChange={e => setEditForm({ ...editForm, label: e.target.value })} placeholder="Milestone" className={INPUT} />
                </div>
                <div className="flex gap-[8px] justify-end">
                  <button onClick={() => setEditIdx(null)} className={BTN_GHOST}>Cancel</button>
                  <button onClick={handleEdit} disabled={!editForm.time || !editForm.label.trim() || saving} className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}>Save</button>
                </div>
              </div>
            );
          }
          return (
            <div key={m.idx} className="flex items-center justify-between gap-[13px] py-[8px] border-b border-zinc-900 last:border-b-0 text-xs">
              <div className="flex items-baseline gap-[13px] min-w-0">
                <span className="text-purple-300 tabular-nums font-bold shrink-0">{formatTime12h(m.time)}</span>
                <span className="text-zinc-200 truncate">{m.label}</span>
              </div>
              <div className="flex items-center gap-[5px] shrink-0">
                {deleteConfirmIdx === m.idx ? (
                  <>
                    <button onClick={() => handleDelete(m.idx)} className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}><Check className="w-3 h-3" /></button>
                    <button onClick={() => setDeleteConfirmIdx(null)} className={`${BADGE} text-zinc-400 border-zinc-700 hover:text-zinc-200 transition-colors duration-[144ms]`}><X className="w-3 h-3" /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(m.idx)} className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteConfirmIdx(m.idx)} className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-[8px] p-[13px] mt-[8px] space-y-[8px]">
          <div className="grid grid-cols-[auto_1fr] gap-[8px]">
            <input type="time" value={addForm.time} onChange={e => setAddForm({ ...addForm, time: e.target.value })} className={INPUT} autoFocus />
            <input type="text" value={addForm.label} onChange={e => setAddForm({ ...addForm, label: e.target.value })} placeholder="e.g. Ceremony begins" className={INPUT} />
          </div>
          <div className="flex gap-[8px] justify-end">
            <button onClick={() => setShowAdd(false)} className={BTN_GHOST}>Cancel</button>
            <button onClick={handleAdd} disabled={!addForm.time || !addForm.label.trim() || saving} className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// TENTATIVE MENU PANEL
// ===================================================================

const MenuRecipeSearchBox: React.FC<{
  recipes: Recipe[];
  categories: RecipeCategory[];
  onPick: (r: Recipe) => void;
}> = ({ recipes, categories, onPick }) => {
  const [term, setTerm] = useState('');
  const [focused, setFocused] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const isBrowsing = term.trim().length >= 1 || categoryFilter !== null;
  const matches = isBrowsing
    ? recipes
        .filter(r => r.recipeType === 'menu')
        .filter(r => term.trim().length === 0 || r.name.toLowerCase().includes(term.toLowerCase()))
        .filter(r => !categoryFilter || r.categoryId === categoryFilter)
        .slice(0, 8)
    : [];

  const pick = (r: Recipe) => {
    onPick(r);
    setTerm('');
    setFocused(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
        <input
          type="text"
          value={term}
          onChange={e => setTerm(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search menu recipes…"
          className={`${INPUT} pl-[26px]`}
        />
      </div>
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-[5px] mt-[5px]">
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setCategoryFilter(null); setFocused(true); }}
            className={`${BADGE} transition-colors duration-[144ms] ${categoryFilter === null ? 'text-emerald-300 border-emerald-700 bg-emerald-950/40' : 'text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}>
            All
          </button>
          {categories.map(c => (
            <button key={c.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setCategoryFilter(prev => prev === c.id ? null : c.id); setFocused(true); }}
              className={`${BADGE} transition-colors duration-[144ms] ${categoryFilter === c.id ? 'text-emerald-300 border-emerald-700 bg-emerald-950/40' : 'text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {focused && isBrowsing && (
        <div className="absolute z-10 w-full mt-[5px] bg-zinc-950 border border-zinc-800 rounded-[8px] shadow-lg max-h-64 overflow-y-auto">
          {matches.length === 0 && <p className="p-[13px] text-xs text-zinc-600 italic">No matching menu recipes.</p>}
          {matches.map(r => (
            <div key={r.id} onMouseDown={() => pick(r)} className="flex justify-between items-center px-[13px] py-[8px] text-xs text-zinc-300 hover:bg-emerald-900/30 cursor-pointer transition-colors duration-[144ms]">
              <span>{r.name}</span>
              <span className={`${BADGE} text-zinc-500 border-zinc-700`}>Menu Recipe</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface MenuLineFormState {
  course: string;
  text: string;
  recipeId: string;
}

const BLANK_MENU_LINE = (defaultCourse: string): MenuLineFormState => ({ course: defaultCourse, text: '', recipeId: '' });

const MenuLineForm: React.FC<{
  form: MenuLineFormState;
  setForm: (f: MenuLineFormState) => void;
  categories: RecipeCategory[];
  recipes: Recipe[];
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ form, setForm, categories, recipes, onSave, onCancel, saving }) => {
  const linkedRecipe = form.recipeId ? recipes.find(r => r.id === form.recipeId) : undefined;

  return (
    <div className="space-y-[8px]">
      <div>
        <label className={FIELD_LABEL}>Course</label>
        <select value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className={INPUT}>
          <option value="">— Select course —</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      {linkedRecipe ? (
        <div>
          <label className={FIELD_LABEL}>Dish</label>
          <div className="flex items-center justify-between gap-[8px] bg-zinc-900 border border-emerald-800 rounded-[5px] px-[8px] py-[5px]">
            <span className="flex items-center gap-[5px] text-xs text-emerald-300">
              <Link2 className="w-3 h-3" />
              {linkedRecipe.name}
            </span>
            <button type="button" onClick={() => setForm({ ...form, recipeId: '', text: '' })} className="flex items-center gap-[3px] text-[10px] text-zinc-500 hover:text-red-400 transition-colors duration-[144ms]">
              <Unlink className="w-3 h-3" />
              Unlink
            </button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label className={FIELD_LABEL}>Dish (free text)</label>
            <input type="text" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="e.g. Chef's choice seasonal soup" className={INPUT} />
          </div>
          <div>
            <label className={FIELD_LABEL}>Or link to a menu recipe</label>
            <MenuRecipeSearchBox recipes={recipes} categories={categories} onPick={r => setForm({ ...form, text: r.name, recipeId: r.id })} />
          </div>
        </>
      )}
      <div className="flex gap-[8px] justify-end pt-[5px]">
        <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        <button onClick={onSave} disabled={!form.course || !form.text.trim() || saving} className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}>Save</button>
      </div>
    </div>
  );
};

const MenuPanel: React.FC<{
  event: KitchenEvent;
  recipes: Recipe[];
  ingredients: Ingredient[];
  categories: RecipeCategory[];
}> = ({ event, recipes, ingredients, categories }) => {
  const restaurantId = useRestaurantId();
  const lines = event.tentativeMenu ?? [];
  const recipesById = new Map(recipes.map(r => [r.id, r]));
  const attendees = readAttendees(event);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<MenuLineFormState>(BLANK_MENU_LINE(categories[0]?.name ?? ''));
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MenuLineFormState>(BLANK_MENU_LINE(''));
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const writeLines = async (next: TentativeMenuLine[], logText?: string) => {
    setSaving(true);
    try {
      const patch: Partial<KitchenEvent> = { tentativeMenu: next };
      if (logText) patch.changeLog = [...(event.changeLog ?? []), { date: getToday(), text: logText }];
      await updateDoc(rDoc(restaurantId, 'events', event.id), patch);
    } finally {
      setSaving(false);
    }
  };

  const toLine = (f: MenuLineFormState): TentativeMenuLine => ({
    course: f.course,
    text: f.text.trim(),
    ...(f.recipeId && { recipeId: f.recipeId }),
  });

  const handleAdd = async () => {
    if (!addForm.course || !addForm.text.trim() || saving) return;
    const line = toLine(addForm);
    await writeLines([...lines, line], `Added to ${line.course}: ${line.text}`);
    setAddForm(BLANK_MENU_LINE(categories[0]?.name ?? ''));
    setShowAdd(false);
  };

  const startEdit = (idx: number) => {
    const l = lines[idx];
    setEditIdx(idx);
    setEditForm({ course: l.course, text: l.text, recipeId: l.recipeId ?? '' });
    setDeleteConfirmIdx(null);
    setShowAdd(false);
  };

  const handleEdit = async () => {
    if (editIdx === null || !editForm.course || !editForm.text.trim() || saving) return;
    const oldLine = lines[editIdx];
    const newLine = toLine(editForm);
    const next = lines.map((l, i) => i === editIdx ? newLine : l);
    let logText: string | undefined;
    if (oldLine.text !== newLine.text) {
      logText = `${newLine.course}: ${oldLine.text} → ${newLine.text}`;
    } else if (oldLine.course !== newLine.course) {
      logText = `${oldLine.text} moved from ${oldLine.course} to ${newLine.course}`;
    }
    await writeLines(next, logText);
    setEditIdx(null);
  };

  const handleDelete = async (idx: number) => {
    const line = lines[idx];
    await writeLines(lines.filter((_, i) => i !== idx), `Removed from ${line.course}: ${line.text}`);
    setDeleteConfirmIdx(null);
  };

  const groups = new Map<string, { line: TentativeMenuLine; idx: number }[]>();
  lines.forEach((line, idx) => {
    if (!groups.has(line.course)) groups.set(line.course, []);
    groups.get(line.course)!.push({ line, idx });
  });

  const linkedCosts = lines
    .filter(l => l.recipeId)
    .map(l => {
      const r = recipesById.get(l.recipeId!);
      return r ? costPerPortion(r, ingredients, recipes) : 0;
    });
  const perPortionTotal = linkedCosts.reduce((a, b) => a + b, 0);
  const projectedTotal = attendees != null ? attendees * perPortionTotal : null;
  const hasLinkedLines = linkedCosts.length > 0;

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-[13px]">
        <h2 className={`${PANEL_LABEL} text-emerald-400 !mb-0`}>
          <ChefHat className="w-3.5 h-3.5" />
          Tentative Menu
        </h2>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); setEditIdx(null); setAddForm(BLANK_MENU_LINE(categories[0]?.name ?? '')); }} className="p-[5px] text-zinc-600 hover:text-emerald-300 transition-colors duration-[144ms]" title="Add menu line">
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {groups.size === 0 && !showAdd && (
        <p className="text-xs text-zinc-500 italic py-[8px]">No menu lines yet.</p>
      )}

      <div className="space-y-[13px]">
        {Array.from(groups.entries()).map(([course, courseLines]) => (
          <div key={course}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]">{course}</p>
            <div className="space-y-[5px]">
              {courseLines.map(({ line, idx }) => {
                if (editIdx === idx) {
                  return (
                    <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-[8px] p-[13px]">
                      <MenuLineForm form={editForm} setForm={setEditForm} categories={categories} recipes={recipes} onSave={handleEdit} onCancel={() => setEditIdx(null)} saving={saving} />
                    </div>
                  );
                }
                const recipe = line.recipeId ? recipesById.get(line.recipeId) : undefined;
                const perPortion = recipe ? costPerPortion(recipe, ingredients, recipes) : null;
                return (
                  <div key={idx} className="flex items-center justify-between gap-[13px] py-[8px] border-b border-zinc-900 last:border-b-0 text-xs">
                    <div className="flex items-baseline gap-[8px] min-w-0">
                      {line.recipeId && <Link2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                      <span className="text-zinc-200 truncate">{line.text}</span>
                      {perPortion != null && (
                        <span className="text-zinc-500 shrink-0">${perPortion.toFixed(2)}/portion</span>
                      )}
                    </div>
                    <div className="flex items-center gap-[5px] shrink-0">
                      {deleteConfirmIdx === idx ? (
                        <>
                          <button onClick={() => handleDelete(idx)} className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}><Check className="w-3 h-3" /></button>
                          <button onClick={() => setDeleteConfirmIdx(null)} className={`${BADGE} text-zinc-400 border-zinc-700 hover:text-zinc-200 transition-colors duration-[144ms]`}><X className="w-3 h-3" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(idx)} className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteConfirmIdx(idx)} className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-[8px] p-[13px] mt-[8px]">
          <MenuLineForm form={addForm} setForm={setAddForm} categories={categories} recipes={recipes} onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </div>
      )}

      {hasLinkedLines && (
        <div className="mt-[13px] pt-[13px] border-t border-zinc-900">
          <p className="text-xs text-zinc-300">
            <span className="font-bold">${perPortionTotal.toFixed(2)}</span>
            <span className="text-zinc-500"> / guest</span>
            {projectedTotal != null && (
              <>
                {' — '}
                <span className="font-bold text-emerald-400">${projectedTotal.toFixed(2)}</span>
                <span className="text-zinc-500"> total</span>
              </>
            )}
          </p>
          <p className="text-[10px] text-zinc-600 mt-[3px]">
            {projectedTotal != null
              ? 'Projected, linked items only — free-text lines aren’t costed.'
              : 'Set attendees on this event to project a total. Projected, linked items only.'}
          </p>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// CLIENT PANEL
// ===================================================================

const ClientPanel: React.FC<{
  event: KitchenEvent;
  client: Client | undefined;
  allEvents: KitchenEvent[];
  onNavigateToEvent: (id: string) => void;
}> = ({ event, client, allEvents, onNavigateToEvent }) => {
  const [expanded, setExpanded] = useState(false);

  if (!client) {
    return (
      <div className={CARD}>
        <h2 className={`${PANEL_LABEL} text-blue-400`}>
          <Contact className="w-3.5 h-3.5" />
          Client
        </h2>
        <p className="text-xs text-zinc-500 italic py-[8px]">No client linked — walk-in event.</p>
      </div>
    );
  }

  const today = getToday();
  const clientEvents = allEvents
    .filter(e => e.clientId === client.id && e.id !== event.id)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const pastEventsCount = clientEvents.filter(e => !!e.date && e.date! < today).length;

  return (
    <div className={CARD}>
      <h2 className={`${PANEL_LABEL} text-blue-400`}>
        <Contact className="w-3.5 h-3.5" />
        Client
      </h2>
      <div className="space-y-[5px] text-xs">
        <p className="font-bold text-zinc-100">{client.name}</p>
        {client.contactName && <p className="text-zinc-400">{client.contactName}</p>}
        {client.phone && <p className="text-zinc-500">{client.phone}</p>}
        {client.email && <p className="text-zinc-500">{client.email}</p>}
      </div>
      <button
        onClick={() => setExpanded(x => !x)}
        disabled={clientEvents.length === 0}
        className="flex items-center gap-[5px] mt-[13px] pt-[13px] border-t border-zinc-900 text-zinc-500 text-xs w-full hover:text-zinc-300 transition-colors duration-[144ms] disabled:hover:text-zinc-500 disabled:cursor-default"
      >
        <History className="w-3.5 h-3.5" />
        {pastEventsCount} past {pastEventsCount === 1 ? 'event' : 'events'}
        {clientEvents.length > 0 && (
          <ChevronDown className={`w-3 h-3 ml-auto transition-transform duration-[144ms] ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>
      {expanded && clientEvents.length > 0 && (
        <div className="mt-[8px] space-y-[3px]">
          {clientEvents.map(e => (
            <button
              key={e.id}
              onClick={() => onNavigateToEvent(e.id)}
              className="flex items-center justify-between gap-[8px] w-full text-left px-[8px] py-[5px] rounded-[5px] hover:bg-zinc-900/50 transition-colors duration-[144ms]"
            >
              <span className="flex items-center gap-[8px] min-w-0">
                <span className="text-zinc-400 text-xs shrink-0">{e.date ? formatDate(e.date) : 'No date'}</span>
                {e.eventType && (
                  <span className={`${BADGE} text-purple-300 border-purple-900 bg-purple-950/30 shrink-0`}>{e.eventType}</span>
                )}
              </span>
              {readAttendees(e) != null && <span className="text-zinc-500 text-xs shrink-0">{readAttendees(e)}&nbsp;attendees</span>}
            </button>
          ))}
        </div>
      )}
      {client.flagNote && (
        <div className="flex items-start gap-[8px] mt-[13px] pt-[13px] border-t border-zinc-900 text-amber-400">
          <Flag className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
          <span className="text-xs">{client.flagNote}</span>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// CHANGE LOG PANEL
// ===================================================================

const ChangeLogPanel: React.FC<{ event: KitchenEvent }> = ({ event }) => {
  const restaurantId = useRestaurantId();
  const entries = event.changeLog ?? [];
  const reversed = [...entries].reverse();

  const [showAdd, setShowAdd] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const next: EventChangeLogEntry[] = [...entries, { date: getToday(), text: text.trim() }];
      await updateDoc(rDoc(restaurantId, 'events', event.id), { changeLog: next });
      setText('');
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-[13px]">
        <h2 className={`${PANEL_LABEL} text-zinc-400 !mb-0`}>
          <ScrollText className="w-3.5 h-3.5" />
          Change Log
        </h2>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]" title="Add log entry">
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {reversed.length === 0 && !showAdd && (
        <p className="text-xs text-zinc-500 italic py-[8px]">No changes logged yet.</p>
      )}

      <div className="space-y-[5px]">
        {reversed.map((entry, i) => (
          <p key={i} className="text-xs py-[5px] border-b border-zinc-900 last:border-b-0">
            <span className="text-zinc-500 tabular-nums">{entry.date}</span>
            <span className="text-zinc-200"> — {entry.text}</span>
          </p>
        ))}
      </div>

      {showAdd && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-[8px] p-[13px] mt-[8px] space-y-[8px]">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="e.g. Client confirmed final guest count by phone"
            className={INPUT}
            autoFocus
          />
          <div className="flex gap-[8px] justify-end">
            <button onClick={() => { setShowAdd(false); setText(''); }} className={BTN_GHOST}>Cancel</button>
            <button onClick={handleAdd} disabled={!text.trim() || saving} className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// MAIN VIEW
// ===================================================================

export const EventDetailView: React.FC<{
  event: KitchenEvent;
  client: Client | undefined;
  allEvents: KitchenEvent[];
  staff: Employee[];
  shifts: Shift[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  recipeCategories: RecipeCategory[];
  onBack: () => void;
  onNavigateToEvent: (id: string) => void;
}> = ({ event, client, allEvents, staff, shifts, recipes, ingredients, recipeCategories, onBack, onNavigateToEvent }) => {
  const staffById = new Map(staff.map(s => [s.id, s]));
  const dateShifts = event.date ? shifts.filter(sh => sh.date === event.date) : [];
  const shiftNotes = dateShifts.filter(sh => sh.note);
  const attendees = readAttendees(event);

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px] font-mono">
      <button onClick={onBack} className="flex items-center gap-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors duration-[144ms] mb-[21px]">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Events
      </button>

      <div className={`${CARD} mb-[21px]`}>
        <div className="flex flex-wrap items-baseline gap-[13px] mb-[8px]">
          {event.eventType && (
            <span className={`${BADGE} text-purple-300 border-purple-900 bg-purple-950/30`}>{event.eventType}</span>
          )}
          <h1 className="text-xl font-black uppercase tracking-wider text-white">{event.title}</h1>
        </div>
        <div className="flex flex-wrap items-baseline gap-[21px] text-xs text-zinc-400">
          {event.date && <span>{formatDate(event.date)}</span>}
          {event.time && <span className="tabular-nums">{formatTime12h(event.time)}</span>}
          {attendees != null && <span>{attendees}&nbsp;attendees</span>}
        </div>
        <div className="flex items-start gap-[8px] mt-[13px] pt-[13px] border-t border-zinc-900 text-zinc-400 text-xs">
          <Users className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
          <div>
            <p>{dateShifts.length} staff scheduled</p>
            {shiftNotes.length > 0 && (
              <div className="mt-[5px] space-y-[3px]">
                {shiftNotes.map(sh => (
                  <p key={sh.id} className="text-zinc-500">
                    <span className="text-zinc-400">{staffById.get(sh.staffId)?.name ?? 'Unknown'}:</span> {sh.note}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[21px]">
        <TimelinePanel event={event} />
        <MenuPanel event={event} recipes={recipes} ingredients={ingredients} categories={recipeCategories} />
        <ClientPanel event={event} client={client} allEvents={allEvents} onNavigateToEvent={onNavigateToEvent} />
        <ChangeLogPanel event={event} />
      </div>
    </div>
  );
};
