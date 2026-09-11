import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, CheckCircle2, Ban, ClipboardList, Printer, RotateCcw } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, writeBatch, doc, deleteField } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { rCollection, rDoc } from './lib/firestorePaths';
import { useRestaurantId } from './components/AuthContext';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useStationPresets } from './hooks/useStationPresets';
import { sortPrepItems, makeQty, onHandValue, printableItems, buildPrintSheet } from './lib/prepEngine';
import { PrepItemForm, BLANK, toForm, toDoc, type FormState } from './components/prep/PrepItemForm';
import { BTN_ACTION, BTN_GHOST, BADGE } from './lib/formStyles';
import { todayDateKey } from './utils';
import type { PrepItem } from './types';

/** Not a real station — a chef-visible bucket for items whose stored
 * assignedStation matches no current preset (the preset was renamed or
 * removed in Settings since the item was saved). Never a selectable value
 * on the add/edit form itself; only ever assigned by history. */
const UNMATCHED_KEY = '__unmatched_station__';

/** Compact segmented control, same idiom as RecipesHub.tsx's sub-tab
 * switcher: one connected bar, active segment filled teal. Deliberately
 * NOT copying that file's text-cream active-segment class — text-cream on
 * bg-teal collides to 2.46:1 in Service (CLAUDE.md, P-031 item 1); it was
 * only caught for BTN_ACTION's 8 sites, and this is a different, unfixed
 * site of the same defect. text-on-teal is the correct token here. */
const segClass = (active: boolean) =>
  `px-[11px] py-[5px] text-[11px] font-display font-semibold flex items-center gap-[5px] border-r border-line last:border-r-0 transition-colors duration-[144ms] ${
    active ? 'bg-teal text-on-teal' : 'bg-surface text-slate hover:text-navy'
  }`;

export const PrepChecklist: React.FC = () => {
  const restaurantId = useRestaurantId();
  const prepItems = (useKitchenSelector((s: any) => s.prepItems) as PrepItem[]) ?? [];
  const { presets: stationPresetsRaw } = useStationPresets();
  const stationPresets: string[] = stationPresetsRaw;

  const unmatchedItems = prepItems.filter(i => !stationPresets.includes(i.assignedStation));
  const [activeStation, setActiveStation] = useState<string>('');

  // useStationPresets() starts on its own hardcoded fallback before the
  // live station_presets listener resolves, so seeding activeStation from
  // stationPresets[0] at mount (a useState lazy initializer only ever
  // runs once) would freeze it on that fallback's first entry forever --
  // a phantom tab that isn't one of the real, rendered tab buttons and
  // matches nothing the chef clicked. Correct it here instead: once real
  // presets exist and the current value isn't one of them (and isn't the
  // Unmatched pseudo-tab, which is never a preset), fall back to the
  // first real preset. Same self-heal covers a station being renamed or
  // removed in Settings while this view is already open.
  useEffect(() => {
    if (stationPresets.length === 0) return;
    if (activeStation === UNMATCHED_KEY) return;
    if (!stationPresets.includes(activeStation)) {
      setActiveStation(stationPresets[0]);
    }
  }, [stationPresets, activeStation]);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(BLANK);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const openAdd = () => {
    setAddForm({ ...BLANK, assignedStation: stationPresets.includes(activeStation) ? activeStation : '' });
    setShowAdd(true);
    setEditId(null);
    setDeleteConfirmId(null);
  };

  const startEdit = (item: PrepItem) => {
    setEditForm(toForm(item));
    setEditId(item.id);
    setShowAdd(false);
    setDeleteConfirmId(null);
  };

  const handleAdd = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await addDoc(rCollection(restaurantId, 'prepItems'), { ...toDoc(addForm), checked: false });
      setShowAdd(false);
      setAddForm(BLANK);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editId || saving) return;
    setSaving(true);
    try {
      // toDoc returns only the seven catalog fields it owns -- never
      // checked/notNeeded/printedDate. updateDoc's partial merge leaves
      // today's shift state exactly as it was; a catalog fix can never
      // silently un-check a cook's finished prep. See PrepItemForm.tsx.
      await updateDoc(rDoc(restaurantId, 'prepItems', editId), toDoc(editForm));
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: PrepItem) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteDoc(rDoc(restaurantId, 'prepItems', item.id));
      setDeleteConfirmId(null);
    } finally {
      setDeleting(false);
    }
  };

  // The first write this app has ever made to PrepItem.checked. Direct
  // single-field updateDoc, same shape as Features.tsx's toggle86 -- never
  // a whole-document write, which would collide with the toDoc contract.
  const toggleChecked = (item: PrepItem) =>
    updateDoc(rDoc(restaurantId, 'prepItems', item.id), { checked: !item.checked });

  const toggleNotNeeded = (item: PrepItem) =>
    updateDoc(rDoc(restaurantId, 'prepItems', item.id), { notNeeded: !item.notNeeded });

  const switchStation = (s: string) => {
    setActiveStation(s);
    setShowAdd(false);
    setEditId(null);
    setDeleteConfirmId(null);
    setResetConfirm(false);
    setPrintError(null);
  };

  const activeItems = activeStation === UNMATCHED_KEY
    ? unmatchedItems
    : prepItems.filter(i => i.assignedStation === activeStation);
  const sortedItems = sortPrepItems(activeItems);
  const printSheet = buildPrintSheet(activeItems);
  const canPrint = activeStation !== UNMATCHED_KEY && printSheet.length > 0;
  const canReset = activeItems.some(i => i.checked || i.notNeeded || i.printedDate);

  /**
   * Writes the prep_history doc and stamps printedDate on every included
   * item in ONE writeBatch (the doc's id is pre-generated via doc() so it
   * can join the batch) -- a log entry with no printed marker, or a
   * printed marker with no log, are both states the chef can't reason
   * about later, so neither write happens without the other.
   *
   * Deliberate tradeoff, do not "fix": the batch commits, THEN (and only
   * on that commit's success) window.print() is invoked. If the chef
   * cancels the print dialog, the history entry and the printed stamp
   * both stand anyway -- the browser cannot reliably report a cancelled
   * print (afterprint/onafterprint is inconsistent across browsers and
   * would trade a recoverable failure for an unreliable one). This is
   * acceptable specifically BECAUSE Reset Shift clears printedDate and
   * un-marks the station in one action, so a cancelled print is a
   * one-click recovery, not a stuck state.
   *
   * The commit-then-print ordering is explicit, not incidental: success
   * and failure are two separate branches below, not one statement that
   * happens to throw before reaching the next. A failed commit prints
   * nothing and surfaces inline; window.print() sits ONLY in the success
   * branch. A future refactor that reorders these two calls must not end
   * up printing a sheet whose write failed.
   */
  const handlePrint = async () => {
    if (printing || !canPrint) return;
    setPrinting(true);
    setPrintError(null);
    try {
      const today = todayDateKey();
      const printable = printableItems(activeItems);
      const batch = writeBatch(db);
      const historyRef = doc(rCollection(restaurantId, 'prep_history'));
      batch.set(historyRef, {
        date: today,
        station: activeStation,
        items: printSheet,
        printedAt: new Date().toISOString(),
      });
      printable.forEach(item => {
        batch.update(rDoc(restaurantId, 'prepItems', item.id), { printedDate: today });
      });
      await batch.commit();
    } catch (e: any) {
      setPrinting(false);
      setPrintError(e?.message || 'Could not save the print record. Nothing was printed.');
      return;
    }
    setPrinting(false);
    window.print();
  };

  // One writeBatch, catalog fields (name/spec/unit/par/onHand/prepMinutes/
  // assignedStation) untouched -- same toDoc partial-fields contract as
  // the add/edit form. prep_history is never touched here: it's a
  // write-once log, not shift state.
  const handleResetShift = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      const batch = writeBatch(db);
      activeItems.forEach(item => {
        batch.update(rDoc(restaurantId, 'prepItems', item.id), {
          checked: false,
          notNeeded: false,
          printedDate: deleteField(),
        });
      });
      await batch.commit();
      setResetConfirm(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0.5in; }
          header, .no-print { display: none !important; }
          .print-show { display: block !important; }
          body, html, main { background: white !important; padding: 0 !important; margin: 0 !important; }
          .print-page * { color: #111 !important; }
          .print-page table { border-collapse: collapse; width: 100%; }
          .print-page th, .print-page td { border-bottom: 1px solid #d1d5db; padding: 8px; text-align: left; }
          .print-page th { text-transform: uppercase; font-size: 10px; letter-spacing: 0.08em; }
        }
      `}</style>

      <div className="print-show hidden print-page">
        <h1 className="text-xl font-bold">Prep Sheet — {activeStation}</h1>
        <p className="text-xs mb-[21px]">{todayDateKey()}</p>
        <table>
          <thead>
            <tr><th>Item</th><th>Spec</th><th>Make</th><th>Unit</th></tr>
          </thead>
          <tbody>
            {printSheet.map(line => (
              <tr key={line.name}>
                <td>{line.name}</td>
                <td>{line.spec ?? ''}</td>
                <td>{line.makeQty}</td>
                <td>{line.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    <div className="no-print max-w-[987px] mx-auto px-[21px] py-[34px]">
      <div className="flex items-start justify-between mb-[21px]">
        <div>
          <h1 className="text-xl font-black font-display uppercase tracking-wider text-navy flex items-center gap-[8px]">
            <ClipboardList className="w-5 h-5 text-navy" />
            Prep Checklist
          </h1>
          <p className="text-xs text-slate mt-[5px]">Build the day's list, sorted by production time per station</p>
        </div>
        {!showAdd && (
          <button onClick={openAdd} className={`${BTN_ACTION} flex items-center gap-[8px]`}>
            <Plus className="w-3.5 h-3.5" />
            Add Prep Item
          </button>
        )}
      </div>

      {stationPresets.length > 0 && (
        <div className="inline-flex items-stretch rounded-[8px] border border-line overflow-hidden mb-[21px] flex-wrap">
          {stationPresets.map(s => {
            const count = prepItems.filter(i => i.assignedStation === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => switchStation(s)}
                aria-pressed={activeStation === s}
                className={segClass(activeStation === s)}
              >
                {s}{count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
          {unmatchedItems.length > 0 && (
            <button
              type="button"
              onClick={() => switchStation(UNMATCHED_KEY)}
              aria-pressed={activeStation === UNMATCHED_KEY}
              className={segClass(activeStation === UNMATCHED_KEY)}
            >
              <span className="w-[5px] h-[5px] rounded-full bg-saffron shrink-0" />
              Unmatched Station ({unmatchedItems.length})
            </button>
          )}
        </div>
      )}

      {activeStation === UNMATCHED_KEY && (
        <p className="text-[11px] text-slate mb-[13px]">
          These items' stored station no longer matches a station preset — a preset was renamed or removed in Settings. Edit each to reassign it.
        </p>
      )}

      {stationPresets.length > 0 && (
        <div className="flex items-center gap-[8px] mb-[21px]">
          {activeStation !== UNMATCHED_KEY && (
            <button
              onClick={handlePrint}
              disabled={!canPrint || printing}
              title={canPrint ? undefined : `Nothing to print — no active items on ${activeStation}.`}
              className={`${BTN_ACTION} flex items-center gap-[8px] disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Printer className="w-3.5 h-3.5" />
              {printing ? 'Printing…' : 'Print'}
            </button>
          )}
          {resetConfirm ? (
            <div className="flex items-center gap-[8px]">
              <span className="text-[10px] text-danger whitespace-nowrap">
                Clear checked, Not Needed, and printed status for every item on {activeStation === UNMATCHED_KEY ? 'this list' : activeStation}?
              </span>
              <button
                onClick={handleResetShift}
                disabled={resetting}
                className={`${BADGE} text-danger border-danger bg-danger-wash hover:bg-danger/10 transition-colors duration-[144ms] disabled:opacity-40`}
                title="Confirm reset"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setResetConfirm(false)}
                className={`${BADGE} text-slate border-line hover:text-navy transition-colors duration-[144ms]`}
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirm(true)}
              disabled={!canReset}
              title={canReset ? undefined : 'Nothing to reset — no item here has been checked, skipped, or printed.'}
              className={`${BTN_GHOST} flex items-center gap-[8px] disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Shift
            </button>
          )}
        </div>
      )}

      {printError && (
        <p className="text-[11px] text-danger mb-[21px]">{printError}</p>
      )}

      {showAdd && (
        <div className="mb-[21px]">
          <PrepItemForm
            form={addForm}
            setForm={setAddForm}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={saving}
            stationPresets={stationPresets}
            isEditing={false}
          />
        </div>
      )}

      {sortedItems.length === 0 && !showAdd && (
        <div className="bg-surface border border-line rounded-card p-[55px] text-center">
          <ClipboardList className="w-8 h-8 text-line mx-auto mb-[13px]" />
          <p className="text-xs text-slate">
            {stationPresets.length === 0 ? 'No stations configured — add one in Settings.' : `No prep items on ${activeStation}.`}
          </p>
        </div>
      )}

      {sortedItems.length > 0 && (
        <div className="space-y-[8px]">
          {sortedItems.map(item =>
            editId === item.id ? (
              <PrepItemForm
                key={item.id}
                form={editForm}
                setForm={setEditForm}
                onSave={handleEdit}
                onCancel={() => setEditId(null)}
                saving={saving}
                stationPresets={stationPresets}
                isEditing
              />
            ) : (
              <PrepItemCard
                key={item.id}
                item={item}
                isConfirmDelete={deleteConfirmId === item.id}
                deleting={deleting}
                onEdit={() => startEdit(item)}
                onRequestDelete={() => setDeleteConfirmId(item.id)}
                onConfirmDelete={() => handleDelete(item)}
                onCancelDelete={() => setDeleteConfirmId(null)}
                onToggleChecked={() => toggleChecked(item)}
                onToggleNotNeeded={() => toggleNotNeeded(item)}
              />
            )
          )}
        </div>
      )}
    </div>
    </>
  );
};

const PrepItemCard: React.FC<{
  item: PrepItem;
  isConfirmDelete: boolean;
  deleting: boolean;
  onEdit: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onToggleChecked: () => void;
  onToggleNotNeeded: () => void;
}> = ({ item, isConfirmDelete, deleting, onEdit, onRequestDelete, onConfirmDelete, onCancelDelete, onToggleChecked, onToggleNotNeeded }) => {
  const settled = item.checked || item.notNeeded;

  return (
    <div className={`bg-surface border border-line rounded-card p-[13px] ${settled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-[13px]">
        <div className="min-w-0">
          <span className={`font-bold text-navy ${settled ? 'line-through' : ''}`}>{item.name}</span>
          {item.spec && <p className="text-xs text-slate mt-[2px]">{item.spec}</p>}
          <p className="text-[11px] text-slate font-mono mt-[5px]">
            Par {item.par} {item.unit} · On Hand {onHandValue(item)} {item.unit}
            {item.prepMinutes != null ? ` · ${item.prepMinutes} min` : ' · No estimate'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate">Make</p>
          <p className="text-sm font-bold font-mono text-navy">{makeQty(item)} {item.unit}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-[5px] mt-[13px] pt-[8px] border-t border-line">
        {isConfirmDelete ? (
          <div className="flex items-center gap-[8px]">
            <span className="text-[10px] text-danger whitespace-nowrap">Delete "{item.name}"?</span>
            <button
              onClick={onConfirmDelete}
              disabled={deleting}
              className={`${BADGE} text-danger border-danger bg-danger-wash hover:bg-danger/10 transition-colors duration-[144ms] disabled:opacity-40`}
              title="Confirm delete"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={onCancelDelete}
              className={`${BADGE} text-slate border-line hover:text-navy transition-colors duration-[144ms]`}
              title="Cancel"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onToggleChecked}
              className={`${BADGE} flex items-center gap-[3px] transition-colors duration-[144ms] ${
                item.checked ? 'text-teal border-teal bg-bg-cool' : 'text-slate border-line hover:text-navy'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {item.checked ? 'Done' : 'Mark Done'}
            </button>
            <button
              onClick={onToggleNotNeeded}
              className={`${BADGE} flex items-center gap-[3px] transition-colors duration-[144ms] ${
                item.notNeeded ? 'text-danger border-danger bg-danger-wash' : 'text-slate border-line hover:text-navy'
              }`}
            >
              <Ban className="w-3 h-3" />
              {item.notNeeded ? 'Not Needed' : 'Skip This Shift'}
            </button>
            <button onClick={onEdit} className="p-[5px] text-slate hover:text-navy transition-colors duration-[144ms]" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRequestDelete} className="p-[5px] text-slate hover:text-danger transition-colors duration-[144ms]" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
