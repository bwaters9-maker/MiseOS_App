import React, { useMemo, useState } from 'react';
import { Layers, Plus, Trash2, CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { db } from './firebaseConfig';
import { collection, addDoc, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useRecipeCollections } from './hooks/useRecipeCollections';
import type { Recipe, RecipeCollection } from './types';

const CARD = 'bg-surface border border-line rounded-card p-[21px]';

const RecipeCollections: React.FC = () => {
  const allRecipes = (useKitchenSelector((s: any) => s.recipes) as Recipe[]) ?? [];
  const { collections, activeCollection, loading } = useRecipeCollections();

  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const menuRecipes = useMemo(
    () => allRecipes
      .filter(r => r.recipeType === 'menu')
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allRecipes],
  );

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'recipe_collections'), { name, recipeIds: [], active: false });
      setNewName('');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (target: RecipeCollection) => {
    if (saving) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      collections.forEach(c => {
        batch.update(doc(db, 'recipe_collections', c.id), { active: c.id === target.id });
      });
      await batch.commit();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (target: RecipeCollection) => {
    if (saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'recipe_collections', target.id), { active: false });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (target: RecipeCollection) => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'recipe_collections', target.id));
      setConfirmDeleteId(null);
      if (expandedId === target.id) setExpandedId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRecipe = async (c: RecipeCollection, recipeId: string) => {
    const next = c.recipeIds.includes(recipeId)
      ? c.recipeIds.filter(id => id !== recipeId)
      : [...c.recipeIds, recipeId];
    await updateDoc(doc(db, 'recipe_collections', c.id), { recipeIds: next });
  };

  const memberCount = (c: RecipeCollection) =>
    c.recipeIds.filter(id => menuRecipes.some(r => r.id === id)).length;

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px] font-body text-navy">
      <div className="mb-[21px]">
        <h1 className="font-display text-xl font-bold flex items-center gap-[8px]">
          <Layers className="w-5 h-5 text-teal" />
          Recipe Collections
        </h1>
        <p className="text-xs text-slate mt-[5px]">
          Seasonal groupings of menu recipes. Activating a collection limits the Menu to its
          recipes; each recipe's own On Menu toggle still applies within it. One active at a time.
        </p>
      </div>

      <div className={`${CARD} mb-[21px] flex items-center gap-[13px]`}>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="New collection name (e.g. Summer 2026)"
          className="flex-1 bg-white border border-line rounded-[8px] px-[13px] py-[8px] text-sm text-navy placeholder:text-slate/60 focus:outline-none focus:border-teal"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newName.trim() || saving}
          className="shrink-0 flex items-center gap-[5px] px-[13px] py-[8px] bg-teal text-white rounded-[8px] text-xs font-bold disabled:opacity-40 transition-opacity duration-[144ms]"
        >
          <Plus className="w-3.5 h-3.5" /> Add Collection
        </button>
      </div>

      {loading && <p className="text-xs text-slate">Loading collections…</p>}
      {!loading && collections.length === 0 && (
        <div className={`${CARD} text-sm text-slate`}>
          No collections yet. Create one above, pick its recipes, and activate it when the season starts.
        </div>
      )}

      <div className="flex flex-col gap-[13px]">
        {collections.map(c => {
          const expanded = expandedId === c.id;
          const isConfirm = confirmDeleteId === c.id;
          return (
            <div key={c.id} className={`${CARD} ${c.active ? 'border-teal' : ''}`}>
              <div className="flex items-center justify-between gap-[13px]">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : c.id)}
                  className="flex items-center gap-[8px] text-left min-w-0"
                >
                  {expanded
                    ? <ChevronDown className="w-4 h-4 text-slate shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-slate shrink-0" />}
                  <span className="font-display font-bold truncate">{c.name}</span>
                  <span className="text-xs text-slate shrink-0">
                    {memberCount(c)} {memberCount(c) === 1 ? 'recipe' : 'recipes'}
                  </span>
                  {c.active && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-teal text-white rounded-full px-[8px] py-[2px]">
                      Active
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-[8px] shrink-0">
                  {c.active ? (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(c)}
                      disabled={saving}
                      className="text-xs font-bold text-slate border border-line rounded-[8px] px-[13px] py-[5px] hover:text-navy transition-colors duration-[144ms]"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleActivate(c)}
                      disabled={saving}
                      className="text-xs font-bold text-teal border border-teal rounded-[8px] px-[13px] py-[5px] hover:bg-teal hover:text-white transition-colors duration-[144ms]"
                    >
                      Activate
                    </button>
                  )}
                  {isConfirm ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        disabled={saving}
                        className="text-xs font-bold text-white bg-red-400 rounded-[8px] px-[13px] py-[5px]"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs font-bold text-slate px-[8px] py-[5px]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(c.id)}
                      className="text-slate hover:text-red-400 transition-colors duration-[144ms]"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {expanded && (
                <div className="mt-[13px] border-t border-line pt-[13px]">
                  {menuRecipes.length === 0 ? (
                    <p className="text-xs text-slate">No menu recipes exist yet — build them in the Recipe Builder.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[5px]">
                      {menuRecipes.map(r => {
                        const member = c.recipeIds.includes(r.id);
                        const offToggle = !(r.onMenu ?? true);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleToggleRecipe(c, r.id)}
                            className={`flex items-center gap-[8px] text-left text-sm rounded-[8px] px-[8px] py-[5px] transition-colors duration-[144ms] ${
                              member ? 'text-navy bg-teal/10' : 'text-slate hover:text-navy'
                            }`}
                          >
                            {member
                              ? <CheckCircle2 className="w-4 h-4 text-teal shrink-0" />
                              : <Circle className="w-4 h-4 text-line shrink-0" />}
                            <span className="truncate">{r.name}</span>
                            {member && offToggle && (
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-saffron">
                                Off Menu toggle
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecipeCollections;
