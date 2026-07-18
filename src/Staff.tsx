import React, { useState } from 'react';
import { Users, CalendarClock, Plus, Pencil, Trash2, X, Check, DollarSign, List, CalendarRange } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { rCollection, rDoc } from './lib/firestorePaths';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useRestaurantId } from './components/AuthContext';
import { useStationPresets } from './hooks/useStationPresets';
import { ScheduleCalendar } from './components/staff/ScheduleCalendar';
import { todayDateKey, formatTime12h } from './utils';
import type { Employee, Shift, KitchenEvent, Client, PrepStation } from './types';

const todayStr = todayDateKey;

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';
const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';

// ===================================================================
// EMPLOYEES
// ===================================================================

interface EmployeeFormState {
  name: string;
  positions: string[];
  hourlyRate: string;
  active: boolean;
}

const BLANK_EMPLOYEE = (): EmployeeFormState => ({
  name: '',
  positions: [],
  hourlyRate: '',
  active: true,
});

const employeeToForm = (e: Employee): EmployeeFormState => ({
  name: e.name,
  positions: e.positions ?? [],
  hourlyRate: e.hourlyRate != null ? String(e.hourlyRate) : '',
  active: e.active,
});

const employeeToDoc = (f: EmployeeFormState) => ({
  name: f.name.trim(),
  positions: f.positions,
  ...(f.hourlyRate !== '' && !isNaN(parseFloat(f.hourlyRate)) && { hourlyRate: parseFloat(f.hourlyRate) }),
  active: f.active,
});

const PositionChips: React.FC<{
  positions: string[];
  onChange: (positions: string[]) => void;
}> = ({ positions, onChange }) => {
  const [draft, setDraft] = useState('');

  const addChip = () => {
    const v = draft.trim();
    if (!v) return;
    if (positions.some(p => p.toLowerCase() === v.toLowerCase())) { setDraft(''); return; }
    onChange([...positions, v]);
    setDraft('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-[5px] mb-[8px]">
        {positions.map(p => (
          <span key={p} className={`${BADGE} text-zinc-300 border-zinc-700 bg-zinc-900/50 flex items-center gap-[5px]`}>
            {p}
            <button
              type="button"
              onClick={() => onChange(positions.filter(x => x !== p))}
              className="text-zinc-500 hover:text-red-400 transition-colors duration-[144ms]"
              title={`Remove ${p}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {positions.length === 0 && (
          <span className="text-zinc-600 text-[11px] italic">No positions added</span>
        )}
      </div>
      <div className="flex gap-[8px]">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addChip(); }
          }}
          placeholder="e.g. Sous Chef, CDP — press Enter to add"
          className={INPUT}
        />
        <button type="button" onClick={addChip} className={BTN_GHOST}>Add</button>
      </div>
    </div>
  );
};

const EmployeeForm: React.FC<{
  form: EmployeeFormState;
  setForm: (f: EmployeeFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ form, setForm, onSave, onCancel, saving }) => {
  const set = <K extends keyof EmployeeFormState>(k: K, v: EmployeeFormState[K]) =>
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
          <label className={FIELD_LABEL}>Hourly Rate (optional)</label>
          <input
            type="number"
            value={form.hourlyRate}
            onChange={e => set('hourlyRate', e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className={INPUT}
          />
        </div>
      </div>
      <div>
        <label className={FIELD_LABEL}>Positions</label>
        <PositionChips positions={form.positions} onChange={p => set('positions', p)} />
      </div>
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          onClick={() => set('active', !form.active)}
          className={`${BADGE} transition-colors duration-[144ms] ${
            form.active
              ? 'text-emerald-300 border-emerald-800 bg-emerald-950/40'
              : 'text-zinc-500 border-zinc-700 bg-zinc-900/40'
          }`}
        >
          {form.active ? 'Active' : 'Inactive'}
        </button>
        <span className="text-[10px] text-zinc-600">Inactive employees can't be assigned to new shifts</span>
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

interface ShiftResolution {
  mode: 'reassign' | 'delete';
  staffId?: string;
}

const ReassignPanel: React.FC<{
  employee: Employee;
  affectedShifts: Shift[];
  allShifts: Shift[];
  allEmployees: Employee[];
  onCancel: () => void;
  onConfirm: (resolutions: Record<string, ShiftResolution>) => void;
  saving: boolean;
}> = ({ employee, affectedShifts, allShifts, allEmployees, onCancel, onConfirm, saving }) => {
  const [resolutions, setResolutions] = useState<Record<string, ShiftResolution>>({});

  const eligibleFor = (shift: Shift) =>
    allEmployees.filter(e =>
      e.active &&
      e.id !== employee.id &&
      !allShifts.some(other => other.id !== shift.id && other.staffId === e.id && other.date === shift.date)
    );

  const allResolved = affectedShifts.every(sh => {
    const r = resolutions[sh.id];
    return r && (r.mode === 'delete' || (r.mode === 'reassign' && r.staffId));
  });

  return (
    <div className="bg-zinc-950 border border-amber-800 rounded-[13px] p-[21px]">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400 mb-[8px]">
        Resolve shifts before removing {employee.name}
      </p>
      <p className="text-[11px] text-zinc-500 mb-[13px]">
        {employee.name} has {affectedShifts.length} upcoming {affectedShifts.length === 1 ? 'shift' : 'shifts'}.
        Reassign each to another employee free that day, or delete the shift.
      </p>
      <div className="space-y-[8px] mb-[13px]">
        {affectedShifts.map(sh => {
          const options = eligibleFor(sh);
          const r = resolutions[sh.id];
          return (
            <div key={sh.id} className="bg-zinc-900/50 border border-zinc-800 rounded-[8px] p-[13px]">
              <div className="flex items-baseline gap-[13px] mb-[8px] text-xs">
                <span className="font-bold text-zinc-200">{formatDate(sh.date)}</span>
                <span className="text-zinc-400 tabular-nums">{formatTime12h(sh.startTime)}–{formatTime12h(sh.endTime)}</span>
                {sh.station && <span className="text-zinc-500">{sh.station}</span>}
                {sh.note && <span className="text-zinc-500 italic truncate">{sh.note}</span>}
              </div>
              <div className="flex items-center gap-[8px]">
                <select
                  value={r?.mode === 'reassign' ? r.staffId ?? '' : ''}
                  onChange={e => setResolutions({ ...resolutions, [sh.id]: { mode: 'reassign', staffId: e.target.value } })}
                  className={INPUT}
                  disabled={options.length === 0}
                >
                  <option value="">
                    {options.length === 0 ? '— No one free that day —' : '— Reassign to —'}
                  </option>
                  {options.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setResolutions({ ...resolutions, [sh.id]: { mode: 'delete' } })}
                  className={`${BADGE} shrink-0 transition-colors duration-[144ms] ${
                    r?.mode === 'delete'
                      ? 'text-red-300 border-red-800 bg-red-950/50'
                      : 'text-zinc-500 border-zinc-700 hover:text-red-400'
                  }`}
                >
                  Delete shift
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-[8px] justify-end">
        <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        <button
          onClick={() => onConfirm(resolutions)}
          disabled={!allResolved || saving}
          className="px-[13px] py-[8px] bg-red-950/50 border border-red-800 rounded-[8px] text-xs font-bold text-red-300 hover:bg-red-900/50 transition-colors duration-[144ms] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Removing…' : `Confirm Remove ${employee.name}`}
        </button>
      </div>
    </div>
  );
};

// ===================================================================
// SCHEDULE
// ===================================================================

interface ShiftFormState {
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  station: PrepStation | '';
  note: string;
}

const BLANK_SHIFT = (): ShiftFormState => ({
  staffId: '',
  date: todayStr(),
  startTime: '',
  endTime: '',
  station: '',
  note: '',
});

const shiftToForm = (s: Shift): ShiftFormState => ({
  staffId: s.staffId,
  date: s.date,
  startTime: s.startTime,
  endTime: s.endTime,
  station: s.station ?? '',
  note: s.note ?? '',
});

const shiftToDoc = (f: ShiftFormState) => ({
  staffId: f.staffId,
  date: f.date,
  startTime: f.startTime,
  endTime: f.endTime,
  ...(f.station && { station: f.station }),
  ...(f.note.trim() && { note: f.note.trim() }),
});

const isShiftValid = (f: ShiftFormState) =>
  !!f.staffId && !!f.date && !!f.startTime && !!f.endTime && f.endTime > f.startTime;

const ShiftForm: React.FC<{
  form: ShiftFormState;
  setForm: (f: ShiftFormState) => void;
  employees: Employee[];
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ form, setForm, employees, onSave, onCancel, saving }) => {
  const { presets: stationPresets } = useStationPresets();
  const set = <K extends keyof ShiftFormState>(k: K, v: ShiftFormState[K]) =>
    setForm({ ...form, [k]: v });

  const showEndError = !!form.startTime && !!form.endTime && form.endTime <= form.startTime;

  return (
    <div className="space-y-[13px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Employee</label>
          <select
            value={form.staffId}
            onChange={e => set('staffId', e.target.value)}
            className={INPUT}
            autoFocus
          >
            <option value="">— Select employee —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Start</label>
          <input
            type="time"
            value={form.startTime}
            onChange={e => set('startTime', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>End</label>
          <input
            type="time"
            value={form.endTime}
            onChange={e => set('endTime', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Station (optional)</label>
          <select
            value={form.station}
            onChange={e => set('station', e.target.value as PrepStation | '')}
            className={INPUT}
          >
            <option value="">— None —</option>
            {stationPresets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Note (optional)</label>
          <input
            type="text"
            value={form.note}
            onChange={e => set('note', e.target.value)}
            placeholder="e.g. staying after to plate wedding apps"
            className={INPUT}
          />
        </div>
      </div>
      {showEndError && (
        <p className="text-[11px] text-red-400">End time must be after start time.</p>
      )}
      <div className="flex gap-[8px] justify-end pt-[5px]">
        <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        <button
          onClick={onSave}
          disabled={!isShiftValid(form) || saving}
          className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

// ===================================================================
// MAIN VIEW
// ===================================================================

interface StaffProps {
  onOpenEvent?: (eventId: string) => void;
}

const Staff: React.FC<StaffProps> = ({ onOpenEvent }) => {
  const restaurantId = useRestaurantId();
  const allStaff = (useKitchenSelector((s: any) => s.staff) as Employee[]) ?? [];
  const allShifts = (useKitchenSelector((s: any) => s.shifts) as Shift[]) ?? [];
  const allEvents = (useKitchenSelector((s: any) => s.events) as KitchenEvent[]) ?? [];
  const allClients = (useKitchenSelector((s: any) => s.clients) as Client[]) ?? [];
  const { presets: stationPresets } = useStationPresets();
  const staffById = new Map(allStaff.map(e => [e.id, e]));
  const today = todayStr();
  const [scheduleView, setScheduleView] = useState<'list' | 'calendar'>('list');

  const sortedStaff = [...allStaff].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const activeStaff = allStaff.filter(e => e.active);

  const upcomingShifts = [...allShifts]
    .filter(sh => sh.date >= today)
    .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.startTime.localeCompare(b.startTime)));

  const shiftsByDate = new Map<string, Shift[]>();
  for (const sh of upcomingShifts) {
    if (!shiftsByDate.has(sh.date)) shiftsByDate.set(sh.date, []);
    shiftsByDate.get(sh.date)!.push(sh);
  }

  // --- Employee state ---
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [addEmployeeForm, setAddEmployeeForm] = useState<EmployeeFormState>(BLANK_EMPLOYEE());
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [editEmployeeForm, setEditEmployeeForm] = useState<EmployeeFormState>(BLANK_EMPLOYEE());
  const [deleteEmployeeConfirmId, setDeleteEmployeeConfirmId] = useState<string | null>(null);
  const [reassignEmployeeId, setReassignEmployeeId] = useState<string | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);

  // --- Shift state ---
  const [showAddShift, setShowAddShift] = useState(false);
  const [addShiftForm, setAddShiftForm] = useState<ShiftFormState>(BLANK_SHIFT());
  const [editShiftId, setEditShiftId] = useState<string | null>(null);
  const [editShiftForm, setEditShiftForm] = useState<ShiftFormState>(BLANK_SHIFT());
  const [deleteShiftConfirmId, setDeleteShiftConfirmId] = useState<string | null>(null);
  const [savingShift, setSavingShift] = useState(false);

  const handleAddEmployee = async () => {
    if (!addEmployeeForm.name.trim() || savingEmployee) return;
    setSavingEmployee(true);
    try {
      await addDoc(rCollection(restaurantId, 'staff'), employeeToDoc(addEmployeeForm));
      setAddEmployeeForm(BLANK_EMPLOYEE());
      setShowAddEmployee(false);
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleEditEmployee = async () => {
    if (!editEmployeeForm.name.trim() || savingEmployee || !editEmployeeId) return;
    setSavingEmployee(true);
    try {
      await updateDoc(rDoc(restaurantId, 'staff', editEmployeeId), employeeToDoc(editEmployeeForm));
      setEditEmployeeId(null);
    } finally {
      setSavingEmployee(false);
    }
  };

  const startEditEmployee = (e: Employee) => {
    setEditEmployeeId(e.id);
    setEditEmployeeForm(employeeToForm(e));
    setDeleteEmployeeConfirmId(null);
    setReassignEmployeeId(null);
    setShowAddEmployee(false);
  };

  const requestDeleteEmployee = (e: Employee) => {
    const affected = allShifts.filter(sh => sh.staffId === e.id && sh.date >= today);
    setEditEmployeeId(null);
    if (affected.length === 0) {
      setDeleteEmployeeConfirmId(e.id);
      setReassignEmployeeId(null);
    } else {
      setReassignEmployeeId(e.id);
      setDeleteEmployeeConfirmId(null);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    await deleteDoc(rDoc(restaurantId, 'staff', id));
    setDeleteEmployeeConfirmId(null);
  };

  const handleConfirmReassign = async (employeeId: string, affected: Shift[], resolutions: Record<string, ShiftResolution>) => {
    setSavingEmployee(true);
    try {
      await Promise.all(affected.map(sh => {
        const r = resolutions[sh.id];
        return r.mode === 'delete'
          ? deleteDoc(rDoc(restaurantId, 'shifts', sh.id))
          : updateDoc(rDoc(restaurantId, 'shifts', sh.id), { staffId: r.staffId });
      }));
      await deleteDoc(rDoc(restaurantId, 'staff', employeeId));
      setReassignEmployeeId(null);
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleAddShift = async () => {
    if (!isShiftValid(addShiftForm) || savingShift) return;
    setSavingShift(true);
    try {
      await addDoc(rCollection(restaurantId, 'shifts'), shiftToDoc(addShiftForm));
      setAddShiftForm(BLANK_SHIFT());
      setShowAddShift(false);
    } finally {
      setSavingShift(false);
    }
  };

  const handleEditShift = async () => {
    if (!isShiftValid(editShiftForm) || savingShift || !editShiftId) return;
    setSavingShift(true);
    try {
      await updateDoc(rDoc(restaurantId, 'shifts', editShiftId), shiftToDoc(editShiftForm));
      setEditShiftId(null);
    } finally {
      setSavingShift(false);
    }
  };

  const startEditShift = (s: Shift) => {
    setEditShiftId(s.id);
    setEditShiftForm(shiftToForm(s));
    setDeleteShiftConfirmId(null);
    setShowAddShift(false);
  };

  const editShiftFromCalendar = (s: Shift) => {
    setScheduleView('list');
    startEditShift(s);
  };

  const handleDeleteShift = async (id: string) => {
    await deleteDoc(rDoc(restaurantId, 'shifts', id));
    setDeleteShiftConfirmId(null);
  };

  // Employee options for the shift form must include an inactive employee
  // already assigned to the shift being edited, so editing doesn't strand them.
  const shiftEmployeeOptions = (currentStaffId?: string) =>
    activeStaff.some(e => e.id === currentStaffId) || !currentStaffId
      ? activeStaff
      : [...activeStaff, ...allStaff.filter(e => e.id === currentStaffId)];

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px] font-mono space-y-[55px]">

      {/* EMPLOYEES */}
      <div>
        <div className="flex items-start justify-between mb-[21px]">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
              <Users className="w-5 h-5 text-blue-400" />
              Employees
            </h1>
            <p className="text-xs text-zinc-500 mt-[5px]">Directory — positions, rate, and active status</p>
          </div>
          {!showAddEmployee && (
            <button
              onClick={() => { setShowAddEmployee(true); setAddEmployeeForm(BLANK_EMPLOYEE()); setEditEmployeeId(null); }}
              className={`${BTN_PRIMARY} flex items-center gap-[8px]`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Employee
            </button>
          )}
        </div>

        {showAddEmployee && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] mb-[13px]">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400 mb-[13px]">Add Employee</p>
            <EmployeeForm
              form={addEmployeeForm}
              setForm={setAddEmployeeForm}
              onSave={handleAddEmployee}
              onCancel={() => setShowAddEmployee(false)}
              saving={savingEmployee}
            />
          </div>
        )}

        {sortedStaff.length === 0 && !showAddEmployee && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[34px] text-center">
            <p className="text-xs text-zinc-500 italic">No employees yet.</p>
          </div>
        )}

        {sortedStaff.length > 0 && (
          <div className="space-y-[8px]">
            {sortedStaff.map(e => {
              if (reassignEmployeeId === e.id) {
                const affected = allShifts.filter(sh => sh.staffId === e.id && sh.date >= today);
                return (
                  <ReassignPanel
                    key={e.id}
                    employee={e}
                    affectedShifts={affected}
                    allShifts={allShifts}
                    allEmployees={allStaff}
                    onCancel={() => setReassignEmployeeId(null)}
                    onConfirm={resolutions => handleConfirmReassign(e.id, affected, resolutions)}
                    saving={savingEmployee}
                  />
                );
              }

              if (editEmployeeId === e.id) {
                return (
                  <div key={e.id} className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px]">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit</p>
                    <EmployeeForm
                      form={editEmployeeForm}
                      setForm={setEditEmployeeForm}
                      onSave={handleEditEmployee}
                      onCancel={() => setEditEmployeeId(null)}
                      saving={savingEmployee}
                    />
                  </div>
                );
              }

              const isConfirmDelete = deleteEmployeeConfirmId === e.id;

              return (
                <div key={e.id} className={`bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] ${!e.active ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between gap-[21px]">
                    <div className="flex flex-wrap items-baseline gap-[13px] min-w-0">
                      <span className="font-bold text-zinc-100 shrink-0">{e.name}</span>
                      <button
                        onClick={() => updateDoc(rDoc(restaurantId, 'staff', e.id), { active: !e.active })}
                        className={`${BADGE} shrink-0 transition-colors duration-[144ms] ${
                          e.active
                            ? 'text-emerald-300 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/40'
                            : 'text-zinc-500 border-zinc-700 bg-zinc-900/40 hover:text-zinc-300'
                        }`}
                        title="Toggle active"
                      >
                        {e.active ? 'Active' : 'Inactive'}
                      </button>
                      {(e.positions ?? []).map(p => (
                        <span key={p} className={`${BADGE} text-zinc-400 border-zinc-800 bg-zinc-900/30 shrink-0`}>{p}</span>
                      ))}
                      {e.hourlyRate != null && (
                        <span className="flex items-center gap-[3px] text-zinc-500 text-xs shrink-0">
                          <DollarSign className="w-3 h-3" />
                          {e.hourlyRate.toFixed(2)}/hr
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-[5px] shrink-0">
                      {isConfirmDelete ? (
                        <div className="flex items-center gap-[5px]">
                          <button
                            onClick={() => handleDeleteEmployee(e.id)}
                            className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}
                            title="Confirm remove"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeleteEmployeeConfirmId(null)}
                            className={`${BADGE} text-zinc-400 border-zinc-700 hover:text-zinc-200 transition-colors duration-[144ms]`}
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-[5px]">
                          <button
                            onClick={() => startEditEmployee(e)}
                            className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => requestDeleteEmployee(e)}
                            className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SCHEDULE */}
      <div>
        <div className="flex items-start justify-between mb-[21px]">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
              <CalendarClock className="w-5 h-5 text-emerald-400" />
              Schedule
            </h1>
            <p className="text-xs text-zinc-500 mt-[5px]">Upcoming shifts — today's feed the Crib Sheet</p>
          </div>
          <div className="flex items-center gap-[13px]">
            <div className="flex items-center gap-[5px] bg-zinc-900 p-[3px] rounded-[8px] border border-zinc-700">
              <button
                onClick={() => setScheduleView('list')}
                className={`px-[8px] py-[5px] text-[10px] font-bold uppercase tracking-wider rounded-[5px] flex items-center gap-[5px] transition-colors duration-[144ms] ${
                  scheduleView === 'list' ? 'bg-emerald-900/50 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <List className="w-3 h-3" /> List
              </button>
              <button
                onClick={() => setScheduleView('calendar')}
                className={`px-[8px] py-[5px] text-[10px] font-bold uppercase tracking-wider rounded-[5px] flex items-center gap-[5px] transition-colors duration-[144ms] ${
                  scheduleView === 'calendar' ? 'bg-emerald-900/50 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <CalendarRange className="w-3 h-3" /> Calendar
              </button>
            </div>
            {!showAddShift && (
              <button
                onClick={() => { setShowAddShift(true); setAddShiftForm(BLANK_SHIFT()); setEditShiftId(null); }}
                className={`${BTN_PRIMARY} flex items-center gap-[8px]`}
                disabled={activeStaff.length === 0}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Shift
              </button>
            )}
          </div>
        </div>

        {activeStaff.length === 0 && !showAddShift && (
          <p className="text-[11px] text-zinc-600 italic mb-[13px]">Add an active employee before scheduling a shift.</p>
        )}

        {showAddShift && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] mb-[13px]">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400 mb-[13px]">Add Shift</p>
            <ShiftForm
              form={addShiftForm}
              setForm={setAddShiftForm}
              employees={activeStaff}
              onSave={handleAddShift}
              onCancel={() => setShowAddShift(false)}
              saving={savingShift}
            />
          </div>
        )}

        {scheduleView === 'calendar' && (
          <ScheduleCalendar
            shifts={allShifts}
            staff={allStaff}
            events={allEvents}
            clients={allClients}
            stationPresets={stationPresets}
            onEditShift={editShiftFromCalendar}
            onOpenEvent={id => onOpenEvent?.(id)}
          />
        )}

        {scheduleView === 'list' && shiftsByDate.size === 0 && !showAddShift && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[34px] text-center">
            <p className="text-xs text-zinc-500 italic">No upcoming shifts scheduled.</p>
          </div>
        )}

        {scheduleView === 'list' && shiftsByDate.size > 0 && (
          <div className="space-y-[21px]">
            {Array.from(shiftsByDate.entries()).map(([dateKey, group]) => (
              <div key={dateKey} className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px]">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400 mb-[8px]">
                  {formatDate(dateKey)}{dateKey === today ? ' — Today' : ''}
                </p>
                {group.map(sh => {
                  if (editShiftId === sh.id) {
                    return (
                      <div key={sh.id} className="py-[13px] border-b border-zinc-900 last:border-b-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit</p>
                        <ShiftForm
                          form={editShiftForm}
                          setForm={setEditShiftForm}
                          employees={shiftEmployeeOptions(sh.staffId)}
                          onSave={handleEditShift}
                          onCancel={() => setEditShiftId(null)}
                          saving={savingShift}
                        />
                      </div>
                    );
                  }

                  const employee = staffById.get(sh.staffId);
                  const isConfirm = deleteShiftConfirmId === sh.id;

                  return (
                    <div key={sh.id} className="flex items-start justify-between gap-[21px] py-[13px] border-b border-zinc-900 last:border-b-0">
                      <div className="flex flex-wrap items-baseline gap-[13px] min-w-0">
                        <span className="font-bold text-zinc-100 shrink-0">{employee?.name ?? 'Unknown employee'}</span>
                        <span className="text-zinc-400 tabular-nums text-xs shrink-0">{formatTime12h(sh.startTime)}–{formatTime12h(sh.endTime)}</span>
                        {sh.station && (
                          <span className={`${BADGE} text-zinc-400 border-zinc-800 bg-zinc-900/30 shrink-0`}>{sh.station}</span>
                        )}
                        {sh.note && (
                          <span className="text-zinc-500 text-xs truncate">{sh.note}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-[5px] shrink-0">
                        {isConfirm ? (
                          <>
                            <button
                              onClick={() => handleDeleteShift(sh.id)}
                              className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms]`}
                              title="Confirm remove"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteShiftConfirmId(null)}
                              className={`${BADGE} text-zinc-400 border-zinc-700 hover:text-zinc-200 transition-colors duration-[144ms]`}
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditShift(sh)}
                              className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteShiftConfirmId(sh.id)}
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
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Staff;
