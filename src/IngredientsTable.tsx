import React, { useState } from 'react';
import { Package, Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, Search, ChevronsUpDown, AlertTriangle, Receipt } from 'lucide-react';
import { db } from './firebaseConfig';
import { updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useKitchenSelector } from './components/KitchenStateContext';
import { computeCostPerBaseUnit } from './lib/costEngine';
import { costPerDisplayUnit } from './lib/units';
import { InvoicePriceUpdate } from './components/ingredients/InvoicePriceUpdate';
import { AiIngredientLookup } from './components/ingredients/AiIngredientLookup';
import {
  IngredientForm, BLANK, toForm, toDoc,
  BTN_PRIMARY, BTN_GHOST, BADGE,
} from './components/ingredients/IngredientForm';
import type { FormState } from './components/ingredients/IngredientForm';
import type { Ingredient, IngredientCategory } from './types';
import type { UnitSystem } from './lib/units';

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

type SortField = 'name' | 'category' | 'cost';
type SortDir = 'asc' | 'desc';

interface IngredientsProps {
  unitSystem?: UnitSystem;
}

const Ingredients: React.FC<IngredientsProps> = ({ unitSystem = 'imperial' }) => {
  const allIngredients = (useKitchenSelector((s: any) => s.ingredients) as Ingredient[]) ?? [];
  const hasRegionalEstimate = allIngredients.some(ing => ing.priceSource === 'regional-estimate');

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(BLANK(unitSystem));
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showInvoiceUpdate, setShowInvoiceUpdate] = useState(false);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = allIngredients.filter(ing =>
    ing.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
    else if (sortField === 'cost') {
      const ca = computeCostPerBaseUnit(a.purchaseCost, a.purchaseQty, a.yieldPercent, a.pieceWeightG);
      const cb = computeCostPerBaseUnit(b.purchaseCost, b.purchaseQty, b.yieldPercent, b.pieceWeightG);
      cmp = ca - cb;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleEdit = async () => {
    if (saving || !editId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'ingredients', editId), toDoc(editForm));
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'ingredients', id));
    setDeleteConfirmId(null);
    if (editId === id) setEditId(null);
  };

  const startEdit = (ing: Ingredient) => {
    setEditId(ing.id);
    setEditForm(toForm(ing, unitSystem));
    setDeleteConfirmId(null);
    setShowAdd(false);
  };

  const SortHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-[5px] text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors duration-[144ms]"
    >
      {children}
      {sortField === field
        ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
        : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
    </button>
  );

  return (
    <div className="max-w-[1597px] mx-auto px-[21px] py-[34px] font-mono">

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-[13px] mb-[34px]">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
            <Package className="w-5 h-5 text-amber-400" />
            Master Pantry
          </h1>
          <p className="text-xs text-zinc-500 mt-[5px]">
            Human-verified. {allIngredients.length} ingredient{allIngredients.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <div className="flex items-center gap-[8px]">
          <div className="relative">
            <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="bg-zinc-900 border border-zinc-700 rounded-[8px] pl-[26px] pr-[8px] py-[8px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600 w-[200px]"
            />
          </div>
          <button
            onClick={() => setShowInvoiceUpdate(true)}
            className={`${BTN_GHOST} flex items-center gap-[8px] whitespace-nowrap`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Update Prices from Invoice
          </button>
          {!showAdd && (
            <button
              onClick={() => { setShowAdd(true); setEditId(null); }}
              className={`${BTN_PRIMARY} flex items-center gap-[8px] whitespace-nowrap`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Ingredient
            </button>
          )}
        </div>
      </div>

      <InvoicePriceUpdate
        isOpen={showInvoiceUpdate}
        onClose={() => setShowInvoiceUpdate(false)}
        ingredients={allIngredients}
        unitSystem={unitSystem}
      />

      {hasRegionalEstimate && (
        <div className="flex items-start gap-[8px] bg-amber-950/20 border border-amber-900 rounded-[8px] px-[13px] py-[8px] mb-[21px]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-[2px] shrink-0" />
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            Prices are regional estimates based on your location and typical volume. They tighten as you update from invoices or edit directly.
          </p>
        </div>
      )}

      {showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px] mb-[21px]">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400 mb-[13px]">New Ingredient</p>
          <AiIngredientLookup
            unitSystem={unitSystem}
            onCancel={() => setShowAdd(false)}
            onSaved={() => setShowAdd(false)}
          />
        </div>
      )}

      {sorted.length === 0 && !showAdd && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] p-[55px] text-center">
          <Package className="w-8 h-8 text-zinc-700 mx-auto mb-[13px]" />
          <p className="text-xs text-zinc-500">
            {search ? 'No ingredients match your search.' : 'Master Pantry is empty. Every ingredient added here is human-verified.'}
          </p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[800px]">
              <thead className="border-b border-zinc-800">
                <tr>
                  <th className="px-[21px] py-[13px]"><SortHeader field="name">Name</SortHeader></th>
                  <th className="px-[13px] py-[13px]"><SortHeader field="category">Category</SortHeader></th>
                  <th className="px-[13px] py-[13px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Purchase Unit</th>
                  <th className="px-[13px] py-[13px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Cost</th>
                  <th className="px-[13px] py-[13px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Yield</th>
                  <th className="px-[13px] py-[13px]"><SortHeader field="cost">Cost / Unit</SortHeader></th>
                  <th className="px-[13px] py-[13px]" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(ing => {
                  if (editId === ing.id) {
                    return (
                      <tr key={ing.id} className="border-t border-zinc-800 bg-zinc-900/30">
                        <td colSpan={7} className="px-[21px] py-[21px]">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-[13px]">Edit — {ing.name}</p>
                          <IngredientForm
                            form={editForm}
                            setForm={setEditForm}
                            onSave={handleEdit}
                            onCancel={() => setEditId(null)}
                            saving={saving}
                            unitSystem={unitSystem}
                            showManualCaution
                          />
                        </td>
                      </tr>
                    );
                  }

                  const costPerBase = computeCostPerBaseUnit(ing.purchaseCost, ing.purchaseQty, ing.yieldPercent, ing.pieceWeightG);
                  const { cost: displayCost, unit: displayUnit } = costPerDisplayUnit(costPerBase, ing.measureType, unitSystem);
                  const isConfirm = deleteConfirmId === ing.id;

                  return (
                    <tr key={ing.id} className="border-t border-zinc-900 hover:bg-zinc-900/20 transition-colors duration-[144ms]">
                      <td className="px-[21px] py-[13px] font-bold text-zinc-100">
                        <span className="flex items-center gap-[5px]">
                          {ing.name}
                          {!ing.lastVerified && (
                            <span
                              title="Unverified — no confirmed price date"
                              className="w-[6px] h-[6px] rounded-full bg-amber-500 shrink-0"
                            />
                          )}
                        </span>
                      </td>
                      <td className="px-[13px] py-[13px]">
                        <span className={`${BADGE} ${CATEGORY_STYLE[ing.category]}`}>{ing.category}</span>
                      </td>
                      <td className="px-[13px] py-[13px] text-zinc-400">{ing.purchaseUnit || '—'}</td>
                      <td className="px-[13px] py-[13px] text-zinc-300 tabular-nums">${ing.purchaseCost.toFixed(2)}</td>
                      <td className="px-[13px] py-[13px] text-zinc-400 tabular-nums">{ing.yieldPercent}%</td>
                      <td className="px-[13px] py-[13px] text-emerald-400 font-bold tabular-nums">
                        {displayCost > 0 ? `$${displayCost.toFixed(4)}/${displayUnit}` : '—'}
                      </td>
                      <td className="px-[13px] py-[13px]">
                        <div className="flex items-center gap-[5px] justify-end">
                          {isConfirm ? (
                            <>
                              <button
                                onClick={() => handleDelete(ing.id)}
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
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(ing)}
                                className="p-[5px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[144ms]"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setDeleteConfirmId(ing.id); setEditId(null); }}
                                className="p-[5px] text-zinc-600 hover:text-red-400 transition-colors duration-[144ms]"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ingredients;
