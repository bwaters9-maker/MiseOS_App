import React, { useState } from 'react';
import { Star, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { db } from './firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useKitchenSelector } from './components/KitchenStateContext';
import type { Feature } from './types';

const COURSES = ['Amuse', 'Appetizer', 'Soup', 'Fish', 'Intermezzo', 'Entrée', 'Cheese', 'Dessert', 'Mignardise'];
const COURSE_ORDER = Object.fromEntries(COURSES.map((c, i) => [c, i]));

interface FormState {
  course: string;
  name: string;
  description: string;
  price: string;
  cost: string;
  activeFrom: string;
  activeTo: string;
  is86d: boolean;
}

const BLANK: FormState = {
  course: 'Entrée',
  name: '',
  description: '',
  price: '',
  cost: '',
  activeFrom: '',
  activeTo: '',
  is86d: false,
};

const toForm = (f: Feature): FormState => ({
  course: f.course,
  name: f.name,
  description: f.description ?? '',
  price: f.price != null ? String(f.price) : '',
  cost: f.cost != null ? String(f.cost) : '',
  activeFrom: f.activeFrom ?? '',
  activeTo: f.activeTo ?? '',
  is86d: f.is86d ?? false,
});

const toDoc = (f: FormState) => ({
  course: f.course,
  name: f.name.trim(),
  ...(f.description.trim() && { description: f.description.trim() }),
  ...(f.price !== '' && !isNaN(parseFloat(f.price)) && { price: parseFloat(f.price) }),
  ...(f.cost !== '' && !isNaN(parseFloat(f.cost)) && { cost: parseFloat(f.cost) }),
  ...(f.activeFrom && { activeFrom: f.activeFrom }),
  ...(f.activeTo && { activeTo: f.activeTo }),
  is86d: f.is86d,
});

const fcColor = (fc: number) => fc < 28 ? 'text-emerald-400' : fc < 34 ? 'text-amber-400' : 'text-red-400';

const computeFc = (price: string, cost: string): number | null => {
  const p = parseFloat(price);
  const c = parseFloat(cost);
  return !isNaN(p) && !isNaN(c) && p > 0 ? Math.round((c / p) * 100) : null;
};

const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';
const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';

const FeatureForm: React.FC<{
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ form, setForm, onSave, onCancel, saving }) => {
  const set = (k: keyof FormState, v: string | boolean) => setForm({ ...form, [k]: v });
  const fc = computeFc(form.price, form.cost);

  return (
    <div className="space-y-[13px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Course</label>
          <select value={form.course} onChange={e => set('course', e.target.value)} className={INPUT}>
            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Feature name"
            className={INPUT}
            autoFocus
          />
        </div>
      </div>
      <div>
        <label className={FIELD_LABEL}>Description</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Brief description for the crib sheet"
          rows={2}
          className={`${INPUT} resize-none`}
        />
      </div>
      <div className="grid grid-cols-3 gap-[13px] items-end">
        <div>
          <label className={FIELD_LABEL}>Price ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={e => set('price', e.target.value)}
            placeholder="0.00"
            className={INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Cost ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.cost}
            onChange={e => set('cost', e.target.value)}
            placeholder="0.00"
            className={INPUT}
          />
        </div>
        <div className="pb-[5px]">
          {fc != null ? (
            <span className={`text-sm font-black tabular-nums ${fcColor(fc)}`}>FC {fc}%</span>
          ) : (
            <span className="text-xs text-zinc-600 tabular-nums">FC —</span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Active From</label>
          <input type="date" value={form.activeFrom} onChange={e => set('activeFrom', e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={FIELD_LABEL}>Active To</label>
          <input type="date" value={form.activeTo} onChange={e => set('activeTo', e.target.value)} className={INPUT} />
        </div>
      </div>
      <div className="flex gap-[8px] justify-end pt-[5px]">
        <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        <button
          onClick={onSave}
          disabled={!form.name.trim() || saving}
          className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

const Features: React.FC = () => {
  const allFeatures = (useKitchenSelector((s: any) => s.features) as Feature[]) ?? [];
  const features = [...allFeatures].sort(
    (a, b) => (COURSE_ORDER[a.course] ?? 99) - (COURSE_ORDER[b.course] ?? 99)
  );

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>({ ...BLANK });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>({ ...BLANK });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!addForm.name.trim() || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'features'), toDoc(addForm));
      setAddForm({ ...BLANK });
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm.name.trim() || saving || !editId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'features', editId), toDoc(editForm));
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'features', id));
    setDeleteConfirmId(null);
  };

  const toggle86 = async (f: Feature) => {
    await updateDoc(doc(db, 'features', f.id), { is86d: !f.is86d });
  };

  const startEdit = (f: Feature) => {
    setEditId(f.id);
    setEditForm(toForm(f));
    setDeleteConfirmId(null);
    setShowAdd(false);
  };

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px] font-mono">

      <div className="flex items-start justify-between mb-[34px]">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
            <Star className="w-5 h-5 text-emerald-400" />
            Features
          </h1>
          <p className="text-xs text-zinc-500 mt-[5px]">Nightly specials — active range controls Crib Sheet visibility</p>
        </div>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setAddForm({ ...BLANK }); setEditId(null); }}
            className={`${BTN_PRIMARY} flex items-center gap-[8px]`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Feature
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] mb-[21px]">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400 mb-[13px]">New Feature</p>
          <FeatureForm
            form={addForm}
            setForm={setAddForm}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={saving}
          />
        </div>
      )}

      {features.length === 0 && !showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[34px] text-center">
          <p className="text-xs text-zinc-500 italic">No features scheduled.</p>
        </div>
      )}

      {features.length > 0 && (
        <div className="space-y-[13px]">
          {features.map(f => {
            const fc = computeFc(String(f.price ?? ''), String(f.cost ?? ''));
            const isEditing = editId === f.id;
            const isConfirmDelete = deleteConfirmId === f.id;

            return (
              <div
                key={f.id}
                className={`bg-zinc-950 border rounded-[13px] p-[21px] transition-colors duration-[144ms] ${
                  f.is86d ? 'border-red-900/60' : 'border-zinc-800'
                }`}
              >
                {isEditing ? (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit Feature</p>
                    <FeatureForm
                      form={editForm}
                      setForm={setEditForm}
                      onSave={handleEdit}
                      onCancel={() => setEditId(null)}
                      saving={saving}
                    />
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-[21px]">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-[8px] flex-wrap mb-[5px]">
                        <span className={`${BADGE} text-zinc-400 border-zinc-700 bg-zinc-900/30 shrink-0`}>{f.course}</span>
                        <span className={`text-sm font-bold ${f.is86d ? 'line-through text-zinc-600' : 'text-zinc-100'}`}>
                          {f.name}
                        </span>
                        {f.is86d && (
                          <span className={`${BADGE} text-red-300 border-red-900 bg-red-950/30`}>86'd</span>
                        )}
                      </div>
                      {f.description && (
                        <p className="text-xs text-zinc-500 mb-[5px] leading-relaxed">{f.description}</p>
                      )}
                      {(f.activeFrom || f.activeTo) && (
                        <p className="text-[10px] text-zinc-600 tabular-nums">
                          {f.activeFrom || '—'} → {f.activeTo || '—'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-[8px] shrink-0 flex-wrap justify-end">
                      {f.price != null && (
                        <span className="text-sm text-zinc-300 tabular-nums font-bold">${f.price.toFixed(2)}</span>
                      )}
                      {fc != null && (
                        <span className={`text-xs font-bold tabular-nums ${fcColor(fc)}`}>FC {fc}%</span>
                      )}

                      <button
                        onClick={() => toggle86(f)}
                        className={`${BADGE} transition-colors duration-[144ms] ${
                          f.is86d
                            ? 'text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50'
                            : 'text-zinc-500 border-zinc-700 bg-transparent hover:text-red-400 hover:border-red-800'
                        }`}
                      >
                        {f.is86d ? 'Restore' : '86'}
                      </button>

                      {isConfirmDelete ? (
                        <div className="flex items-center gap-[5px]">
                          <button
                            onClick={() => handleDelete(f.id)}
                            className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}
                            title="Confirm delete"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className={`${BADGE} text-zinc-400 border-zinc-700 hover:text-zinc-200 transition-colors duration-[144ms]`}
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-[5px]">
                          <button
                            onClick={() => startEdit(f)}
                            className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setDeleteConfirmId(f.id); setEditId(null); }}
                            className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Features;
