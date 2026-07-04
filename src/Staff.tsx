import React, { useState } from 'react';
import { Users, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { db } from './firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useKitchenSelector } from './components/KitchenStateContext';
import type { StaffMember, PrepStation } from './types';

const STATIONS: PrepStation[] = ['Sauté', 'Grill', 'Garde Manger', 'Pastry'];
const todayStr = () => new Date().toISOString().slice(0, 10);

interface FormState {
  name: string;
  role: string;
  station: PrepStation | '';
  clockIn: string;
  date: string;
}

const BLANK = (): FormState => ({
  name: '',
  role: '',
  station: '',
  clockIn: '',
  date: todayStr(),
});

const toForm = (s: StaffMember): FormState => ({
  name: s.name,
  role: s.role,
  station: s.station ?? '',
  clockIn: s.clockIn ?? '',
  date: s.date ?? todayStr(),
});

const toDoc = (f: FormState) => ({
  name: f.name.trim(),
  role: f.role.trim(),
  ...(f.station && { station: f.station }),
  ...(f.clockIn && { clockIn: f.clockIn }),
  date: f.date,
});

const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';
const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';

const StaffForm: React.FC<{
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ form, setForm, onSave, onCancel, saving }) => {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <div className="space-y-[13px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Full name"
            className={INPUT}
            autoFocus
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Role</label>
          <input
            type="text"
            value={form.role}
            onChange={e => set('role', e.target.value)}
            placeholder="e.g. Sous Chef, CDP, Line Cook"
            className={INPUT}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Station</label>
          <select
            value={form.station}
            onChange={e => set('station', e.target.value as PrepStation | '')}
            className={INPUT}
          >
            <option value="">— None —</option>
            {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Clock-In</label>
          <input
            type="time"
            value={form.clockIn}
            onChange={e => set('clockIn', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className={INPUT}
          />
        </div>
      </div>
      <div className="flex gap-[8px] justify-end pt-[5px]">
        <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        <button
          onClick={onSave}
          disabled={!form.name.trim() || !form.role.trim() || saving}
          className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

const Staff: React.FC = () => {
  const allStaff = (useKitchenSelector((s: any) => s.staff) as StaffMember[]) ?? [];
  const today = todayStr();
  const todayStaff = [...allStaff]
    .filter(s => s.date === today)
    .sort((a, b) => (a.clockIn ?? '').localeCompare(b.clockIn ?? ''));

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(BLANK());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(BLANK());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.role.trim() || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'staff'), toDoc(addForm));
      setAddForm(BLANK());
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm.name.trim() || !editForm.role.trim() || saving || !editId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'staff', editId), toDoc(editForm));
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'staff', id));
    setDeleteConfirmId(null);
  };

  const startEdit = (s: StaffMember) => {
    setEditId(s.id);
    setEditForm(toForm(s));
    setDeleteConfirmId(null);
    setShowAdd(false);
  };

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px] font-mono">

      <div className="flex items-start justify-between mb-[34px]">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
            <Users className="w-5 h-5 text-blue-400" />
            Staff
          </h1>
          <p className="text-xs text-zinc-500 mt-[5px]">Today's roster — feeds the Crib Sheet</p>
        </div>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setAddForm(BLANK()); setEditId(null); }}
            className={`${BTN_PRIMARY} flex items-center gap-[8px]`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] mb-[21px]">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400 mb-[13px]">Add Staff Member</p>
          <StaffForm
            form={addForm}
            setForm={setAddForm}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={saving}
          />
        </div>
      )}

      {todayStaff.length === 0 && !showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[34px] text-center">
          <p className="text-xs text-zinc-500 italic">No staff clocked in.</p>
        </div>
      )}

      {todayStaff.length > 0 && (
        <div className="space-y-[8px]">
          {todayStaff.map(s => {
            const isEditing = editId === s.id;
            const isConfirmDelete = deleteConfirmId === s.id;

            return (
              <div key={s.id} className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px]">
                {isEditing ? (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit</p>
                    <StaffForm
                      form={editForm}
                      setForm={setEditForm}
                      onSave={handleEdit}
                      onCancel={() => setEditId(null)}
                      saving={saving}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-[21px]">
                    <div className="flex items-baseline gap-[13px] min-w-0">
                      <span className="font-bold text-zinc-100 shrink-0">{s.name}</span>
                      <span className="text-zinc-500 text-xs">{s.role}</span>
                      {s.station && (
                        <span className={`${BADGE} text-zinc-400 border-zinc-800 bg-zinc-900/30 shrink-0`}>
                          {s.station}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-[8px] shrink-0">
                      {s.clockIn && (
                        <span className="text-zinc-500 text-xs tabular-nums">{s.clockIn}</span>
                      )}
                      {isConfirmDelete ? (
                        <div className="flex items-center gap-[5px]">
                          <button
                            onClick={() => handleDelete(s.id)}
                            className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}
                            title="Confirm remove"
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
                            onClick={() => startEdit(s)}
                            className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setDeleteConfirmId(s.id); setEditId(null); }}
                            className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]"
                            title="Remove"
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

export default Staff;
