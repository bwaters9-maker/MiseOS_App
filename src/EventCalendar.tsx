import React, { useState } from 'react';
import { CalendarDays, Plus, Pencil, Trash2, X, Check, ChevronDown } from 'lucide-react';
import { db } from './firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useKitchenSelector } from './components/KitchenStateContext';
import type { KitchenEvent, EventType } from './types';

const EVENT_TYPES: EventType[] = ['Private Dining', 'Buyout', 'Special Event'];
const getToday = () => new Date().toISOString().slice(0, 10);

interface FormState {
  title: string;
  eventType: EventType | '';
  date: string;
  time: string;
  covers: string;
  notes: string;
}

const BLANK = (): FormState => ({
  title: '',
  eventType: '',
  date: getToday(),
  time: '',
  covers: '',
  notes: '',
});

const toForm = (e: KitchenEvent): FormState => ({
  title: e.title,
  eventType: e.eventType ?? '',
  date: e.date ?? getToday(),
  time: e.time ?? '',
  covers: e.covers != null ? String(e.covers) : '',
  notes: e.notes ?? '',
});

const toDoc = (f: FormState) => ({
  title: f.title.trim(),
  ...(f.eventType && { eventType: f.eventType }),
  date: f.date,
  ...(f.time && { time: f.time }),
  ...(f.covers !== '' && !isNaN(parseInt(f.covers, 10)) && { covers: parseInt(f.covers, 10) }),
  ...(f.notes.trim() && { notes: f.notes.trim() }),
});

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

const typeBadge = (et: EventType) => {
  const base = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border shrink-0';
  if (et === 'Private Dining') return `${base} text-purple-300 border-purple-900 bg-purple-950/30`;
  if (et === 'Buyout')         return `${base} text-amber-300 border-amber-900 bg-amber-950/30`;
  return `${base} text-emerald-300 border-emerald-900 bg-emerald-950/30`;
};

const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';
const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';

const EventForm: React.FC<{
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
          <label className={FIELD_LABEL}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Event name"
            className={INPUT}
            autoFocus
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Type</label>
          <select
            value={form.eventType}
            onChange={e => set('eventType', e.target.value as EventType | '')}
            className={INPUT}
          >
            <option value="">— Select type —</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Time</label>
          <input
            type="time"
            value={form.time}
            onChange={e => set('time', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Covers</label>
          <input
            type="number"
            value={form.covers}
            onChange={e => set('covers', e.target.value)}
            placeholder="0"
            min="0"
            className={INPUT}
          />
        </div>
      </div>
      <div>
        <label className={FIELD_LABEL}>Notes</label>
        <input
          type="text"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any special notes or requirements"
          className={INPUT}
        />
      </div>
      <div className="flex gap-[8px] justify-end pt-[5px]">
        <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        <button
          onClick={onSave}
          disabled={!form.title.trim() || !form.date || saving}
          className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

const EventRow: React.FC<{
  event: KitchenEvent;
  onEdit: (e: KitchenEvent) => void;
  onDelete: (id: string) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
}> = ({ event: e, onEdit, onDelete, deleteConfirmId, setDeleteConfirmId }) => {
  const isConfirm = deleteConfirmId === e.id;

  return (
    <div className="flex items-start justify-between gap-[21px] py-[13px] border-b border-zinc-900 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-[8px] min-w-0">
        {e.eventType && <span className={typeBadge(e.eventType)}>{e.eventType}</span>}
        <span className="font-bold text-zinc-100">{e.title}</span>
        {e.time && <span className="text-zinc-400 tabular-nums text-xs">{e.time}</span>}
        {e.covers != null && (
          <span className="text-zinc-500 text-xs">{e.covers}&nbsp;cvr</span>
        )}
        {e.notes && (
          <span className="text-zinc-500 text-xs truncate hidden md:inline">{e.notes}</span>
        )}
      </div>
      <div className="flex items-center gap-[5px] shrink-0">
        {isConfirm ? (
          <>
            <button
              onClick={() => onDelete(e.id)}
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
          </>
        ) : (
          <>
            <button
              onClick={() => onEdit(e)}
              className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteConfirmId(e.id)}
              className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]"
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const EventCalendar: React.FC = () => {
  const allEvents = (useKitchenSelector((s: any) => s.events) as KitchenEvent[]) ?? [];
  const today = getToday();

  const upcoming = [...allEvents]
    .filter(e => !e.date || e.date >= today)
    .sort((a, b) => {
      const da = a.date ?? '9999-99-99';
      const db = b.date ?? '9999-99-99';
      if (da !== db) return da.localeCompare(db);
      return (a.time ?? '').localeCompare(b.time ?? '');
    });

  const past = [...allEvents]
    .filter(e => !!e.date && e.date < today)
    .sort((a, b) => {
      if (a.date !== b.date) return b.date!.localeCompare(a.date!);
      return (a.time ?? '').localeCompare(b.time ?? '');
    });

  const upcomingByDate = new Map<string, KitchenEvent[]>();
  for (const e of upcoming) {
    const key = e.date ?? 'no-date';
    if (!upcomingByDate.has(key)) upcomingByDate.set(key, []);
    upcomingByDate.get(key)!.push(e);
  }

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(BLANK());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(BLANK());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!addForm.title.trim() || !addForm.date || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'events'), toDoc(addForm));
      setAddForm(BLANK());
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm.title.trim() || !editForm.date || saving || !editId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'events', editId), toDoc(editForm));
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'events', id));
    setDeleteConfirmId(null);
    if (editId === id) setEditId(null);
  };

  const startEdit = (e: KitchenEvent) => {
    setEditId(e.id);
    setEditForm(toForm(e));
    setDeleteConfirmId(null);
    setShowAdd(false);
  };

  const cancelEdit = () => setEditId(null);

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px] font-mono">

      <div className="flex items-start justify-between mb-[34px]">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
            <CalendarDays className="w-5 h-5 text-purple-400" />
            Events
          </h1>
          <p className="text-xs text-zinc-500 mt-[5px]">Private dining, buyouts, and special events — feeds the Crib Sheet</p>
        </div>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setAddForm(BLANK()); setEditId(null); }}
            className={`${BTN_PRIMARY} flex items-center gap-[8px]`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] mb-[21px]">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-400 mb-[13px]">New Event</p>
          <EventForm
            form={addForm}
            setForm={setAddForm}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={saving}
          />
        </div>
      )}

      {upcomingByDate.size === 0 && !showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[34px] text-center">
          <p className="text-xs text-zinc-500 italic">No events scheduled.</p>
        </div>
      )}

      {upcomingByDate.size > 0 && (
        <div className="space-y-[21px]">
          {Array.from(upcomingByDate.entries()).map(([dateKey, group]) => (
            <div key={dateKey} className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px]">
              <div className="flex items-center justify-between mb-[8px]">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-400">
                  {dateKey === 'no-date' ? 'No date set' : formatDate(dateKey)}
                </p>
                <span className="text-[10px] text-zinc-600">
                  {group.length} {group.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              {group.map(e => {
                if (editId === e.id) {
                  return (
                    <div key={e.id} className="py-[13px] border-b border-zinc-900 last:border-b-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit</p>
                      <EventForm
                        form={editForm}
                        setForm={setEditForm}
                        onSave={handleEdit}
                        onCancel={cancelEdit}
                        saving={saving}
                      />
                    </div>
                  );
                }
                return (
                  <EventRow
                    key={e.id}
                    event={e}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    deleteConfirmId={deleteConfirmId}
                    setDeleteConfirmId={setDeleteConfirmId}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-[34px]">
          <button
            onClick={() => setShowPast(p => !p)}
            className="flex items-center gap-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors duration-[144ms] mb-[13px]"
          >
            <ChevronDown className={`w-3 h-3 transition-transform duration-[144ms] ${showPast ? 'rotate-180' : ''}`} />
            {showPast ? 'Hide past events' : `Show past events (${past.length})`}
          </button>
          {showPast && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] opacity-60">
              {past.map(e => {
                if (editId === e.id) {
                  return (
                    <div key={e.id} className="py-[13px] border-b border-zinc-900 last:border-b-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit</p>
                      <EventForm
                        form={editForm}
                        setForm={setEditForm}
                        onSave={handleEdit}
                        onCancel={cancelEdit}
                        saving={saving}
                      />
                    </div>
                  );
                }
                return (
                  <div key={e.id} className="py-[13px] border-b border-zinc-900 last:border-b-0">
                    <div className="flex items-start justify-between gap-[21px]">
                      <div className="flex flex-wrap items-baseline gap-[8px] min-w-0">
                        <span className="text-zinc-600 text-xs tabular-nums shrink-0">
                          {e.date ? formatDate(e.date) : ''}
                        </span>
                        {e.eventType && (
                          <span className={`px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border text-zinc-500 border-zinc-800 bg-zinc-900/30 shrink-0`}>
                            {e.eventType}
                          </span>
                        )}
                        <span className="text-zinc-500">{e.title}</span>
                        {e.covers != null && (
                          <span className="text-zinc-600 text-xs">{e.covers}&nbsp;cvr</span>
                        )}
                      </div>
                      <div className="flex items-center gap-[5px] shrink-0">
                        <button
                          onClick={() => startEdit(e)}
                          className="p-[5px] text-zinc-700 hover:text-zinc-400 transition-colors duration-[144ms]"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirmId === e.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(e.id)}
                              className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className={`${BADGE} text-zinc-400 border-zinc-700 hover:text-zinc-200 transition-colors duration-[144ms]`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(e.id)}
                            className="p-[5px] text-zinc-700 hover:text-red-400 transition-colors duration-[144ms]"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
