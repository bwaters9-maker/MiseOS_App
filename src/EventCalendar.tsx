import React, { useEffect, useState } from 'react';
import { CalendarDays, Contact, Plus, Pencil, Trash2, X, Check, ChevronDown, Flag } from 'lucide-react';
import { db } from './firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useEventTypes } from './hooks/useEventTypes';
import { useRecipeCategories } from './hooks/useRecipeCategories';
import { EventDetailView } from './components/events/EventDetailView';
import { todayDateKey, formatTime12h } from './utils';
import type { KitchenEvent, Client, Employee, Shift, Recipe, Ingredient, EventChangeLogEntry } from './types';

const getToday = todayDateKey;

// Pre-rename docs may still carry the old `covers` field — read it as a
// fallback for display only; every write from here on uses `attendees`.
const readAttendees = (e: KitchenEvent): number | undefined =>
  e.attendees ?? (e as unknown as { covers?: number }).covers;

interface EventFormState {
  title: string;
  eventType: string;
  date: string;
  time: string;
  attendees: string;
  notes: string;
  clientId: string;
}

const BLANK_EVENT = (): EventFormState => ({
  title: '',
  eventType: '',
  date: getToday(),
  time: '',
  attendees: '',
  notes: '',
  clientId: '',
});

const eventToForm = (e: KitchenEvent): EventFormState => ({
  title: e.title,
  eventType: e.eventType ?? '',
  date: e.date ?? getToday(),
  time: e.time ?? '',
  attendees: readAttendees(e) != null ? String(readAttendees(e)) : '',
  notes: e.notes ?? '',
  clientId: e.clientId ?? '',
});

const eventToDoc = (f: EventFormState) => ({
  title: f.title.trim(),
  ...(f.eventType && { eventType: f.eventType }),
  date: f.date,
  ...(f.time && { time: f.time }),
  ...(f.attendees !== '' && !isNaN(parseInt(f.attendees, 10)) && { attendees: parseInt(f.attendees, 10) }),
  ...(f.notes.trim() && { notes: f.notes.trim() }),
  ...(f.clientId && { clientId: f.clientId }),
});

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';
const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';
const TYPE_BADGE = `${BADGE} text-purple-300 border-purple-900 bg-purple-950/30`;

const EventForm: React.FC<{
  form: EventFormState;
  setForm: (f: EventFormState) => void;
  eventTypeNames: string[];
  clients: Client[];
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ form, setForm, eventTypeNames, clients, onSave, onCancel, saving }) => {
  const set = <K extends keyof EventFormState>(k: K, v: EventFormState[K]) =>
    setForm({ ...form, [k]: v });

  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));

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
            onChange={e => set('eventType', e.target.value)}
            className={INPUT}
          >
            <option value="">— Select type —</option>
            {eventTypeNames.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Client (optional)</label>
          <select
            value={form.clientId}
            onChange={e => set('clientId', e.target.value)}
            className={INPUT}
          >
            <option value="">— No client (walk-in) —</option>
            {sortedClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Attendees</label>
          <input
            type="number"
            value={form.attendees}
            onChange={e => set('attendees', e.target.value)}
            placeholder="0"
            min="0"
            className={INPUT}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-[13px]">
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
  clientName?: string;
  onOpenDetail: (id: string) => void;
  onEdit: (e: KitchenEvent) => void;
  onDelete: (id: string) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
}> = ({ event: e, clientName, onOpenDetail, onEdit, onDelete, deleteConfirmId, setDeleteConfirmId }) => {
  const isConfirm = deleteConfirmId === e.id;
  const attendees = readAttendees(e);

  return (
    <div
      onClick={() => onOpenDetail(e.id)}
      className="flex items-start justify-between gap-[21px] py-[13px] border-b border-zinc-900 last:border-b-0 cursor-pointer hover:bg-zinc-900/30 transition-colors duration-[144ms] -mx-[8px] px-[8px] rounded-[8px]"
    >
      <div className="flex flex-wrap items-baseline gap-[8px] min-w-0">
        {e.eventType && <span className={TYPE_BADGE}>{e.eventType}</span>}
        <span className="font-bold text-zinc-100">{e.title}</span>
        {clientName && <span className="text-zinc-400 text-xs">{clientName}</span>}
        {e.time && <span className="text-zinc-400 tabular-nums text-xs">{formatTime12h(e.time)}</span>}
        {attendees != null && (
          <span className="text-zinc-500 text-xs">{attendees}&nbsp;attendees</span>
        )}
        {e.notes && (
          <span className="text-zinc-500 text-xs truncate hidden md:inline">{e.notes}</span>
        )}
      </div>
      <div className="flex items-center gap-[5px] shrink-0">
        {isConfirm ? (
          <>
            <button
              onClick={e2 => { e2.stopPropagation(); onDelete(e.id); }}
              className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}
              title="Confirm remove"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={e2 => { e2.stopPropagation(); setDeleteConfirmId(null); }}
              className={`${BADGE} text-zinc-400 border-zinc-700 hover:text-zinc-200 transition-colors duration-[144ms]`}
              title="Cancel"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={e2 => { e2.stopPropagation(); onEdit(e); }}
              className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={e2 => { e2.stopPropagation(); setDeleteConfirmId(e.id); }}
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

// ===================================================================
// CLIENTS
// ===================================================================

interface ClientFormState {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  flagNote: string;
}

const BLANK_CLIENT = (): ClientFormState => ({
  name: '',
  contactName: '',
  phone: '',
  email: '',
  flagNote: '',
});

const clientToForm = (c: Client): ClientFormState => ({
  name: c.name,
  contactName: c.contactName ?? '',
  phone: c.phone ?? '',
  email: c.email ?? '',
  flagNote: c.flagNote ?? '',
});

const clientToDoc = (f: ClientFormState) => ({
  name: f.name.trim(),
  contactName: f.contactName.trim(),
  phone: f.phone.trim(),
  email: f.email.trim(),
  ...(f.flagNote.trim() && { flagNote: f.flagNote.trim() }),
});

const ClientForm: React.FC<{
  form: ClientFormState;
  setForm: (f: ClientFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ form, setForm, onSave, onCancel, saving }) => {
  const set = <K extends keyof ClientFormState>(k: K, v: ClientFormState[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <div className="space-y-[13px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Client Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Full name or company"
            className={INPUT}
            autoFocus
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Contact Name</label>
          <input
            type="text"
            value={form.contactName}
            onChange={e => set('contactName', e.target.value)}
            placeholder="If different from client name"
            className={INPUT}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="(000) 000-0000"
            className={INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="name@example.com"
            className={INPUT}
          />
        </div>
      </div>
      <div>
        <label className={FIELD_LABEL}>Flag Note (optional)</label>
        <input
          type="text"
          value={form.flagNote}
          onChange={e => set('flagNote', e.target.value)}
          placeholder="e.g. Always pays late — get deposit up front"
          className={INPUT}
        />
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

const ClientCard: React.FC<{
  client: Client;
  events: KitchenEvent[];
  onOpenEvent: (id: string) => void;
  onEdit: (c: Client) => void;
  onDelete: (id: string) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
}> = ({ client: c, events, onOpenEvent, onEdit, onDelete, deleteConfirmId, setDeleteConfirmId }) => {
  const isConfirm = deleteConfirmId === c.id;
  const [expanded, setExpanded] = useState(false);
  const clientEvents = [...events].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px]">
      <div className="flex items-start justify-between gap-[21px]">
        <div className="flex flex-wrap items-baseline gap-[13px] min-w-0">
          <span className="font-bold text-zinc-100 shrink-0">{c.name}</span>
          {c.contactName && <span className="text-zinc-400 text-xs shrink-0">{c.contactName}</span>}
          {c.phone && <span className="text-zinc-500 text-xs shrink-0">{c.phone}</span>}
          {c.email && <span className="text-zinc-500 text-xs truncate">{c.email}</span>}
        </div>
        <div className="flex items-center gap-[5px] shrink-0">
          {isConfirm ? (
            <>
              <button
                onClick={() => onDelete(c.id)}
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
                onClick={() => onEdit(c)}
                className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeleteConfirmId(c.id)}
                className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      <button
        onClick={() => setExpanded(x => !x)}
        disabled={clientEvents.length === 0}
        className="flex items-center gap-[5px] mt-[13px] pt-[13px] border-t border-zinc-900 text-zinc-500 text-xs w-full hover:text-zinc-300 transition-colors duration-[144ms] disabled:hover:text-zinc-500 disabled:cursor-default"
      >
        {clientEvents.length} {clientEvents.length === 1 ? 'event' : 'events'}
        {clientEvents.length > 0 && (
          <ChevronDown className={`w-3 h-3 ml-auto transition-transform duration-[144ms] ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>
      {expanded && clientEvents.length > 0 && (
        <div className="mt-[8px] space-y-[3px]">
          {clientEvents.map(e => (
            <button
              key={e.id}
              onClick={() => onOpenEvent(e.id)}
              className="flex items-center justify-between gap-[8px] w-full text-left px-[8px] py-[5px] rounded-[5px] hover:bg-zinc-900/50 transition-colors duration-[144ms]"
            >
              <span className="flex items-center gap-[8px] min-w-0">
                <span className="text-zinc-400 text-xs shrink-0">{e.date ? formatDate(e.date) : 'No date'}</span>
                {e.eventType && <span className={TYPE_BADGE}>{e.eventType}</span>}
              </span>
              {readAttendees(e) != null && <span className="text-zinc-500 text-xs shrink-0">{readAttendees(e)}&nbsp;attendees</span>}
            </button>
          ))}
        </div>
      )}
      {c.flagNote && (
        <div className="flex items-start gap-[8px] mt-[13px] pt-[13px] border-t border-zinc-900 text-amber-400">
          <Flag className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
          <span className="text-xs">{c.flagNote}</span>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// MAIN VIEW
// ===================================================================

interface EventCalendarProps {
  selectedEventId?: string | null;
  setSelectedEventId?: (id: string | null) => void;
}

const EventCalendar: React.FC<EventCalendarProps> = ({ selectedEventId, setSelectedEventId }) => {
  const allEvents = (useKitchenSelector((s: any) => s.events) as KitchenEvent[]) ?? [];
  const allClients = (useKitchenSelector((s: any) => s.clients) as Client[]) ?? [];
  const allStaff = (useKitchenSelector((s: any) => s.staff) as Employee[]) ?? [];
  const allShifts = (useKitchenSelector((s: any) => s.shifts) as Shift[]) ?? [];
  const allRecipes = (useKitchenSelector((s: any) => s.recipes) as Recipe[]) ?? [];
  const allIngredients = (useKitchenSelector((s: any) => s.ingredients) as Ingredient[]) ?? [];
  const { eventTypes } = useEventTypes();
  const { categories: recipeCategories } = useRecipeCategories();
  const eventTypeNames = eventTypes.map(t => t.name);
  const clientsById = new Map(allClients.map(c => [c.id, c]));
  const today = getToday();

  const [detailEventId, setDetailEventId] = useState<string | null>(null);

  // Deep-link from another view (e.g. the Staff schedule calendar) — jumping
  // here with a target event id opens its detail view directly, same pattern
  // as RecipesHub syncing selectedRecipeId to the Recipe Builder sub-tab.
  useEffect(() => {
    if (selectedEventId) setDetailEventId(selectedEventId);
  }, [selectedEventId]);

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

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [addEventForm, setAddEventForm] = useState<EventFormState>(BLANK_EVENT());
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editEventForm, setEditEventForm] = useState<EventFormState>(BLANK_EVENT());
  const [deleteEventConfirmId, setDeleteEventConfirmId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  const [showAddClient, setShowAddClient] = useState(false);
  const [addClientForm, setAddClientForm] = useState<ClientFormState>(BLANK_CLIENT());
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editClientForm, setEditClientForm] = useState<ClientFormState>(BLANK_CLIENT());
  const [deleteClientConfirmId, setDeleteClientConfirmId] = useState<string | null>(null);
  const [savingClient, setSavingClient] = useState(false);

  const handleAddEvent = async () => {
    if (!addEventForm.title.trim() || !addEventForm.date || savingEvent) return;
    setSavingEvent(true);
    try {
      await addDoc(collection(db, 'events'), eventToDoc(addEventForm));
      setAddEventForm(BLANK_EVENT());
      setShowAddEvent(false);
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEditEvent = async () => {
    if (!editEventForm.title.trim() || !editEventForm.date || savingEvent || !editEventId) return;
    setSavingEvent(true);
    try {
      const before = allEvents.find(e => e.id === editEventId);
      const patch: Partial<KitchenEvent> = eventToDoc(editEventForm);
      const oldAttendees = before ? readAttendees(before) : undefined;
      const newAttendees = editEventForm.attendees !== '' && !isNaN(parseInt(editEventForm.attendees, 10))
        ? parseInt(editEventForm.attendees, 10)
        : undefined;
      if (oldAttendees !== newAttendees) {
        const logText = oldAttendees == null
          ? `Attendees set to ${newAttendees}`
          : newAttendees == null
            ? `Attendees (${oldAttendees}) cleared`
            : `Attendees ${oldAttendees} → ${newAttendees}`;
        const nextLog: EventChangeLogEntry[] = [...(before?.changeLog ?? []), { date: today, text: logText }];
        patch.changeLog = nextLog;
      }
      await updateDoc(doc(db, 'events', editEventId), patch);
      setEditEventId(null);
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteDoc(doc(db, 'events', id));
    setDeleteEventConfirmId(null);
    if (editEventId === id) setEditEventId(null);
  };

  const startEditEvent = (e: KitchenEvent) => {
    setEditEventId(e.id);
    setEditEventForm(eventToForm(e));
    setDeleteEventConfirmId(null);
    setShowAddEvent(false);
  };

  const cancelEditEvent = () => setEditEventId(null);

  const handleAddClient = async () => {
    if (!addClientForm.name.trim() || savingClient) return;
    setSavingClient(true);
    try {
      await addDoc(collection(db, 'clients'), clientToDoc(addClientForm));
      setAddClientForm(BLANK_CLIENT());
      setShowAddClient(false);
    } finally {
      setSavingClient(false);
    }
  };

  const handleEditClient = async () => {
    if (!editClientForm.name.trim() || savingClient || !editClientId) return;
    setSavingClient(true);
    try {
      await updateDoc(doc(db, 'clients', editClientId), clientToDoc(editClientForm));
      setEditClientId(null);
    } finally {
      setSavingClient(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    await deleteDoc(doc(db, 'clients', id));
    setDeleteClientConfirmId(null);
  };

  const startEditClient = (c: Client) => {
    setEditClientId(c.id);
    setEditClientForm(clientToForm(c));
    setDeleteClientConfirmId(null);
    setShowAddClient(false);
  };

  const sortedClients = [...allClients].sort((a, b) => a.name.localeCompare(b.name));

  const detailEvent = detailEventId ? allEvents.find(e => e.id === detailEventId) : undefined;
  if (detailEvent) {
    return (
      <EventDetailView
        event={detailEvent}
        client={detailEvent.clientId ? clientsById.get(detailEvent.clientId) : undefined}
        allEvents={allEvents}
        staff={allStaff}
        shifts={allShifts}
        recipes={allRecipes}
        ingredients={allIngredients}
        recipeCategories={recipeCategories}
        onBack={() => { setDetailEventId(null); setSelectedEventId?.(null); }}
        onNavigateToEvent={setDetailEventId}
      />
    );
  }

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px] font-mono space-y-[55px]">

      {/* EVENTS */}
      <div>
        <div className="flex items-start justify-between mb-[34px]">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
              <CalendarDays className="w-5 h-5 text-purple-400" />
              Events
            </h1>
            <p className="text-xs text-zinc-500 mt-[5px]">Private dining, buyouts, and special events — feeds the Crib Sheet</p>
          </div>
          {!showAddEvent && (
            <button
              onClick={() => { setShowAddEvent(true); setAddEventForm(BLANK_EVENT()); setEditEventId(null); }}
              className={`${BTN_PRIMARY} flex items-center gap-[8px]`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Event
            </button>
          )}
        </div>

        {showAddEvent && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] mb-[21px]">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-400 mb-[13px]">New Event</p>
            <EventForm
              form={addEventForm}
              setForm={setAddEventForm}
              eventTypeNames={eventTypeNames}
              clients={allClients}
              onSave={handleAddEvent}
              onCancel={() => setShowAddEvent(false)}
              saving={savingEvent}
            />
          </div>
        )}

        {upcomingByDate.size === 0 && !showAddEvent && (
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
                  if (editEventId === e.id) {
                    return (
                      <div key={e.id} className="py-[13px] border-b border-zinc-900 last:border-b-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit</p>
                        <EventForm
                          form={editEventForm}
                          setForm={setEditEventForm}
                          eventTypeNames={eventTypeNames}
                          clients={allClients}
                          onSave={handleEditEvent}
                          onCancel={cancelEditEvent}
                          saving={savingEvent}
                        />
                      </div>
                    );
                  }
                  return (
                    <EventRow
                      key={e.id}
                      event={e}
                      clientName={e.clientId ? clientsById.get(e.clientId)?.name : undefined}
                      onOpenDetail={setDetailEventId}
                      onEdit={startEditEvent}
                      onDelete={handleDeleteEvent}
                      deleteConfirmId={deleteEventConfirmId}
                      setDeleteConfirmId={setDeleteEventConfirmId}
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
                  if (editEventId === e.id) {
                    return (
                      <div key={e.id} className="py-[13px] border-b border-zinc-900 last:border-b-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit</p>
                        <EventForm
                          form={editEventForm}
                          setForm={setEditEventForm}
                          eventTypeNames={eventTypeNames}
                          clients={allClients}
                          onSave={handleEditEvent}
                          onCancel={cancelEditEvent}
                          saving={savingEvent}
                        />
                      </div>
                    );
                  }
                  const attendees = readAttendees(e);
                  return (
                    <div
                      key={e.id}
                      onClick={() => setDetailEventId(e.id)}
                      className="py-[13px] border-b border-zinc-900 last:border-b-0 cursor-pointer hover:bg-zinc-900/30 transition-colors duration-[144ms] -mx-[8px] px-[8px] rounded-[8px]"
                    >
                      <div className="flex items-start justify-between gap-[21px]">
                        <div className="flex flex-wrap items-baseline gap-[8px] min-w-0">
                          <span className="text-zinc-600 text-xs tabular-nums shrink-0">
                            {e.date ? formatDate(e.date) : ''}
                          </span>
                          {e.eventType && (
                            <span className={`${BADGE} text-zinc-500 border-zinc-800 bg-zinc-900/30 shrink-0`}>
                              {e.eventType}
                            </span>
                          )}
                          <span className="text-zinc-500">{e.title}</span>
                          {attendees != null && (
                            <span className="text-zinc-600 text-xs">{attendees}&nbsp;attendees</span>
                          )}
                        </div>
                        <div className="flex items-center gap-[5px] shrink-0">
                          <button
                            onClick={e2 => { e2.stopPropagation(); startEditEvent(e); }}
                            className="p-[5px] text-zinc-700 hover:text-zinc-400 transition-colors duration-[144ms]"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {deleteEventConfirmId === e.id ? (
                            <>
                              <button
                                onClick={e2 => { e2.stopPropagation(); handleDeleteEvent(e.id); }}
                                className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e2 => { e2.stopPropagation(); setDeleteEventConfirmId(null); }}
                                className={`${BADGE} text-zinc-400 border-zinc-700 hover:text-zinc-200 transition-colors duration-[144ms]`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={e2 => { e2.stopPropagation(); setDeleteEventConfirmId(e.id); }}
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

      {/* CLIENTS */}
      <div>
        <div className="flex items-start justify-between mb-[21px]">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
              <Contact className="w-5 h-5 text-blue-400" />
              Clients
            </h1>
            <p className="text-xs text-zinc-500 mt-[5px]">Client directory — link a client to an event above</p>
          </div>
          {!showAddClient && (
            <button
              onClick={() => { setShowAddClient(true); setAddClientForm(BLANK_CLIENT()); setEditClientId(null); }}
              className={`${BTN_PRIMARY} flex items-center gap-[8px]`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </button>
          )}
        </div>

        {showAddClient && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] mb-[13px]">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400 mb-[13px]">Add Client</p>
            <ClientForm
              form={addClientForm}
              setForm={setAddClientForm}
              onSave={handleAddClient}
              onCancel={() => setShowAddClient(false)}
              saving={savingClient}
            />
          </div>
        )}

        {sortedClients.length === 0 && !showAddClient && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[34px] text-center">
            <p className="text-xs text-zinc-500 italic">No clients yet.</p>
          </div>
        )}

        {sortedClients.length > 0 && (
          <div className="space-y-[8px]">
            {sortedClients.map(c => {
              if (editClientId === c.id) {
                return (
                  <div key={c.id} className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px]">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit</p>
                    <ClientForm
                      form={editClientForm}
                      setForm={setEditClientForm}
                      onSave={handleEditClient}
                      onCancel={() => setEditClientId(null)}
                      saving={savingClient}
                    />
                  </div>
                );
              }
              return (
                <ClientCard
                  key={c.id}
                  client={c}
                  events={allEvents.filter(e => e.clientId === c.id)}
                  onOpenEvent={setDetailEventId}
                  onEdit={startEditClient}
                  onDelete={handleDeleteClient}
                  deleteConfirmId={deleteClientConfirmId}
                  setDeleteConfirmId={setDeleteClientConfirmId}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCalendar;
