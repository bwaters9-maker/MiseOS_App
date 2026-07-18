import React, { useState } from 'react';
import { Truck, Plus, Pencil, Trash2, X, Check, ChevronDown, Phone, Mail, Hash, Clock, Package } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { rCollection, rDoc } from './lib/firestorePaths';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useRestaurantId } from './components/AuthContext';
import type { Vendor, Weekday, Ingredient, IngredientCategory } from './types';

const WEEKDAYS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_SHORT: Record<Weekday, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const CATEGORY_STYLE: Record<IngredientCategory, string> = {
  Produce:      'text-emerald-300 border-emerald-900 bg-emerald-950/30',
  Protein:      'text-red-300     border-red-900     bg-red-950/30',
  Dairy:        'text-blue-300    border-blue-900    bg-blue-950/30',
  'Dry Goods':  'text-amber-300   border-amber-900   bg-amber-950/30',
  Frozen:       'text-cyan-300    border-cyan-900    bg-cyan-950/30',
  Beverage:     'text-purple-300  border-purple-900  bg-purple-950/30',
  Other:        'text-zinc-400    border-zinc-700    bg-zinc-900/30',
  Spices:       'text-orange-300  border-orange-900  bg-orange-950/30',
  'Oils & Fats':'text-yellow-300  border-yellow-900  bg-yellow-950/30',
  Sauces:       'text-pink-300    border-pink-900    bg-pink-950/30',
  Beverages:    'text-indigo-300  border-indigo-900  bg-indigo-950/30',
  Bakery:       'text-lime-300    border-lime-900    bg-lime-950/30',
};

const PRICE_SOURCE_LABEL: Record<Ingredient['priceSource'], string> = {
  'regional-estimate': 'Estimate',
  invoice: 'Invoice',
  manual: 'Manual',
};

const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const FIELD_LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-[5px]';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';
const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';

interface VendorFormState {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  accountNumber: string;
  leadTimeDays: string;
  orderDays: Weekday[];
  notes: string;
}

const BLANK_VENDOR = (): VendorFormState => ({
  name: '', contactName: '', phone: '', email: '', accountNumber: '', leadTimeDays: '', orderDays: [], notes: '',
});

const vendorToForm = (v: Vendor): VendorFormState => ({
  name: v.name,
  contactName: v.contactName ?? '',
  phone: v.phone ?? '',
  email: v.email ?? '',
  accountNumber: v.accountNumber ?? '',
  leadTimeDays: v.leadTimeDays != null ? String(v.leadTimeDays) : '',
  orderDays: v.orderDays ?? [],
  notes: v.notes ?? '',
});

const vendorToDoc = (f: VendorFormState) => ({
  name: f.name.trim(),
  ...(f.contactName.trim() && { contactName: f.contactName.trim() }),
  ...(f.phone.trim() && { phone: f.phone.trim() }),
  ...(f.email.trim() && { email: f.email.trim() }),
  ...(f.accountNumber.trim() && { accountNumber: f.accountNumber.trim() }),
  ...(f.leadTimeDays !== '' && !isNaN(parseInt(f.leadTimeDays, 10)) && { leadTimeDays: parseInt(f.leadTimeDays, 10) }),
  ...(f.orderDays.length > 0 && { orderDays: f.orderDays }),
  ...(f.notes.trim() && { notes: f.notes.trim() }),
});

const OrderDaysPicker: React.FC<{ days: Weekday[]; onChange: (days: Weekday[]) => void }> = ({ days, onChange }) => {
  const toggle = (d: Weekday) => onChange(days.includes(d) ? days.filter(x => x !== d) : [...days, d]);
  return (
    <div className="flex flex-wrap gap-[5px]">
      {WEEKDAYS.map(d => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          className={`${BADGE} transition-colors duration-[144ms] ${
            days.includes(d)
              ? 'text-teal-300 border-teal-700 bg-teal-950/50'
              : 'text-zinc-600 border-zinc-800 hover:text-zinc-400'
          }`}
        >
          {WEEKDAY_SHORT[d]}
        </button>
      ))}
    </div>
  );
};

const VendorForm: React.FC<{
  form: VendorFormState;
  setForm: (f: VendorFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ form, setForm, onSave, onCancel, saving }) => {
  const set = <K extends keyof VendorFormState>(k: K, v: VendorFormState[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <div className="space-y-[13px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Vendor Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Supplier or company name"
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
            placeholder="Sales rep or account contact"
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
            placeholder="orders@vendor.com"
            className={INPUT}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Account Number</label>
          <input
            type="text"
            value={form.accountNumber}
            onChange={e => set('accountNumber', e.target.value)}
            placeholder="Your account # with this vendor"
            className={INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Lead Time (days)</label>
          <input
            type="number"
            value={form.leadTimeDays}
            onChange={e => set('leadTimeDays', e.target.value)}
            placeholder="e.g. 2"
            min="0"
            className={INPUT}
          />
        </div>
      </div>
      <div>
        <label className={FIELD_LABEL}>Order Days</label>
        <OrderDaysPicker days={form.orderDays} onChange={d => set('orderDays', d)} />
      </div>
      <div>
        <label className={FIELD_LABEL}>Notes</label>
        <input
          type="text"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any special notes about this vendor"
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

const VendorCard: React.FC<{
  vendor: Vendor;
  linkedIngredients: Ingredient[];
  onEdit: (v: Vendor) => void;
  onDelete: (v: Vendor) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  onConfirmDelete: (v: Vendor) => void;
  deleting: boolean;
}> = ({ vendor: v, linkedIngredients, onEdit, onDelete, deleteConfirmId, setDeleteConfirmId, onConfirmDelete, deleting }) => {
  const [expanded, setExpanded] = useState(false);
  const isConfirm = deleteConfirmId === v.id;
  const sortedOrderDays = (v.orderDays ?? []).slice().sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px]">
      <div className="flex items-start justify-between gap-[21px]">
        <div className="flex flex-wrap items-baseline gap-[13px] min-w-0">
          <span className="font-bold text-zinc-100 shrink-0">{v.name}</span>
          {v.contactName && <span className="text-zinc-400 text-xs shrink-0">{v.contactName}</span>}
          {v.phone && (
            <span className="flex items-center gap-[3px] text-zinc-500 text-xs shrink-0">
              <Phone className="w-3 h-3" />{v.phone}
            </span>
          )}
          {v.email && (
            <span className="flex items-center gap-[3px] text-zinc-500 text-xs truncate">
              <Mail className="w-3 h-3 shrink-0" />{v.email}
            </span>
          )}
        </div>
        <div className="flex items-center gap-[5px] shrink-0">
          {isConfirm ? (
            <div className="flex items-center gap-[8px]">
              <span className="text-[10px] text-amber-400 whitespace-nowrap">
                {linkedIngredients.length > 0
                  ? `Will unlink ${linkedIngredients.length} ingredient${linkedIngredients.length !== 1 ? 's' : ''}`
                  : 'Remove vendor?'}
              </span>
              <button
                onClick={() => onConfirmDelete(v)}
                disabled={deleting}
                className={`${BADGE} text-red-300 border-red-900 bg-red-950/50 hover:bg-red-900/50 transition-colors duration-[144ms] disabled:opacity-40`}
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
            <>
              <button onClick={() => onEdit(v)} className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]" title="Edit">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(v)} className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]" title="Remove">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-[13px] mt-[13px] text-xs">
        {v.accountNumber && (
          <span className="flex items-center gap-[3px] text-zinc-500">
            <Hash className="w-3 h-3" />Account {v.accountNumber}
          </span>
        )}
        {v.leadTimeDays != null && (
          <span className="flex items-center gap-[3px] text-zinc-500">
            <Clock className="w-3 h-3" />{v.leadTimeDays} day{v.leadTimeDays !== 1 ? 's' : ''} lead time
          </span>
        )}
        {sortedOrderDays.length > 0 && (
          <div className="flex items-center gap-[5px]">
            {sortedOrderDays.map(d => (
              <span key={d} className={`${BADGE} text-teal-300 border-teal-800 bg-teal-950/30`}>{WEEKDAY_SHORT[d]}</span>
            ))}
          </div>
        )}
      </div>

      {v.notes && <p className="text-zinc-400 text-xs mt-[8px]">{v.notes}</p>}

      <button
        onClick={() => setExpanded(x => !x)}
        disabled={linkedIngredients.length === 0}
        className="flex items-center gap-[5px] mt-[13px] pt-[13px] border-t border-zinc-900 text-zinc-500 text-xs w-full hover:text-zinc-300 transition-colors duration-[144ms] disabled:hover:text-zinc-500 disabled:cursor-default"
      >
        <Package className="w-3.5 h-3.5" />
        {linkedIngredients.length} linked ingredient{linkedIngredients.length !== 1 ? 's' : ''}
        {linkedIngredients.length > 0 && (
          <ChevronDown className={`w-3 h-3 ml-auto transition-transform duration-[144ms] ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>
      {expanded && linkedIngredients.length > 0 && (
        <div className="mt-[8px] space-y-[3px]">
          {linkedIngredients.map(ing => (
            <div key={ing.id} className="flex items-center justify-between gap-[13px] px-[8px] py-[5px] rounded-[5px] hover:bg-zinc-900/50 transition-colors duration-[144ms]">
              <span className="flex items-center gap-[8px] min-w-0">
                <span className="text-zinc-200 text-xs truncate">{ing.name}</span>
                <span className={`${BADGE} ${CATEGORY_STYLE[ing.category]} shrink-0`}>{ing.category}</span>
              </span>
              <span className="flex items-center gap-[8px] text-[10px] text-zinc-500 shrink-0">
                <span>{ing.lastVerified || 'Unverified'}</span>
                <span className={`${BADGE} text-zinc-400 border-zinc-700 bg-zinc-900/30`}>{PRICE_SOURCE_LABEL[ing.priceSource]}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Vendors: React.FC = () => {
  const restaurantId = useRestaurantId();
  const allVendors = (useKitchenSelector((s: any) => s.vendors) as Vendor[]) ?? [];
  const allIngredients = (useKitchenSelector((s: any) => s.ingredients) as Ingredient[]) ?? [];
  const sortedVendors = [...allVendors].sort((a, b) => a.name.localeCompare(b.name));

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<VendorFormState>(BLANK_VENDOR());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VendorFormState>(BLANK_VENDOR());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleAdd = async () => {
    if (!addForm.name.trim() || saving) return;
    setSaving(true);
    try {
      await addDoc(rCollection(restaurantId, 'vendors'), vendorToDoc(addForm));
      setAddForm(BLANK_VENDOR());
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm.name.trim() || saving || !editId) return;
    setSaving(true);
    try {
      await updateDoc(rDoc(restaurantId, 'vendors', editId), vendorToDoc(editForm));
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (v: Vendor) => {
    setEditId(v.id);
    setEditForm(vendorToForm(v));
    setDeleteConfirmId(null);
    setShowAdd(false);
  };

  const handleDelete = async (v: Vendor) => {
    if (deleting) return;
    setDeleting(true);
    try {
      const linked = allIngredients.filter(ing => ing.vendorId === v.id);
      await Promise.all(linked.map(ing => updateDoc(rDoc(restaurantId, 'ingredients', ing.id), { vendorId: deleteField() })));
      await deleteDoc(rDoc(restaurantId, 'vendors', v.id));
      setDeleteConfirmId(null);
      if (editId === v.id) setEditId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px] font-mono">
      <div className="flex items-start justify-between mb-[34px]">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
            <Truck className="w-5 h-5 text-teal-400" />
            Vendors
          </h1>
          <p className="text-xs text-zinc-500 mt-[5px]">Suppliers, contacts, and lead times — linked to Master Pantry</p>
        </div>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setAddForm(BLANK_VENDOR()); setEditId(null); }}
            className={`${BTN_PRIMARY} flex items-center gap-[8px]`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Vendor
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] mb-[21px]">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-teal-400 mb-[13px]">New Vendor</p>
          <VendorForm
            form={addForm}
            setForm={setAddForm}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={saving}
          />
        </div>
      )}

      {sortedVendors.length === 0 && !showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[55px] text-center">
          <Truck className="w-8 h-8 text-zinc-700 mx-auto mb-[13px]" />
          <p className="text-xs text-zinc-500">No vendors yet.</p>
        </div>
      )}

      {sortedVendors.length > 0 && (
        <div className="space-y-[8px]">
          {sortedVendors.map(v => {
            if (editId === v.id) {
              return (
                <div key={v.id} className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit</p>
                  <VendorForm
                    form={editForm}
                    setForm={setEditForm}
                    onSave={handleEdit}
                    onCancel={() => setEditId(null)}
                    saving={saving}
                  />
                </div>
              );
            }
            return (
              <VendorCard
                key={v.id}
                vendor={v}
                linkedIngredients={allIngredients.filter(ing => ing.vendorId === v.id)}
                onEdit={startEdit}
                onDelete={vend => { setDeleteConfirmId(vend.id); setEditId(null); }}
                deleteConfirmId={deleteConfirmId}
                setDeleteConfirmId={setDeleteConfirmId}
                onConfirmDelete={handleDelete}
                deleting={deleting}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Vendors;
