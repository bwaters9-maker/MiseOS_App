import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, CheckCircle2, Ban, ClipboardList } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { rCollection, rDoc } from './lib/firestorePaths';
import { useRestaurantId } from './components/AuthContext';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useStationPresets } from './hooks/useStationPresets';
import { sortPrepItems, makeQty, onHandValue } from './lib/prepEngine';
import { PrepItemForm, BLANK, toForm, toDoc, type FormState } from './components/prep/PrepItemForm';
import { BTN_ACTION, BADGE } from './lib/formStyles';
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
  const [activeStation, setActiveStation] = useState<string>(stationPresets[0] ?? '');

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(BLANK);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const activeItems = activeStation === UNMATCHED_KEY
    ? unmatchedItems
    : prepItems.filter(i => i.assignedStation === activeStation);
  const sortedItems = sortPrepItems(activeItems);

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px]">
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
                onClick={() => setActiveStation(s)}
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
              onClick={() => setActiveStation(UNMATCHED_KEY)}
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
