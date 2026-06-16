import React, { useState, useEffect } from 'react';
import { Ingredient } from '../../types';

interface IngredientFormProps {
  ingredient?: Ingredient | null;
  onSave: (ingredient: Ingredient) => void;
  onCancel: () => void;
}

const initialIngredientState: Ingredient = {
  name: '',
  quantity: 0,
  unit: 'kg',
  costPerUnit: 0,
  purchaseUnit: 'kg',
  yieldPercent: 100,
};

export const IngredientForm: React.FC<IngredientFormProps> = ({ ingredient, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Ingredient>(initialIngredientState);

  useEffect(() => {
    if (ingredient) {
      setFormData(ingredient);
    } else {
      setFormData(initialIngredientState);
    }
  }, [ingredient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericValue = ['quantity', 'costPerUnit', 'yieldPercent'].includes(name)
      ? parseFloat(value)
      : value;
    
    setFormData(prev => ({ ...prev, [name]: numericValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4 font-mono">
      <h2 className="text-lg font-bold uppercase tracking-wider text-white">
        {ingredient ? 'Edit Ingredient' : 'Add New Ingredient'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-zinc-500">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-zinc-700 p-2.5 rounded-lg text-xs"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-zinc-500">On-Hand Quantity (EP)</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-zinc-700 p-2.5 rounded-lg text-xs"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-zinc-500">Unit (EP)</label>
          <input
            type="text"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-zinc-700 p-2.5 rounded-lg text-xs"
            placeholder="e.g., kg, L, portions"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-zinc-500">Cost per Unit (AP)</label>
          <input
            type="number"
            name="costPerUnit"
            step="0.01"
            value={formData.costPerUnit}
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-zinc-700 p-2.5 rounded-lg text-xs"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-zinc-500">Purchase Unit (AP)</label>
          <input
            type="text"
            name="purchaseUnit"
            value={formData.purchaseUnit}
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-zinc-700 p-2.5 rounded-lg text-xs"
            placeholder="e.g., kg, case, flat"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-zinc-500">Yield %</label>
          <input
            type="number"
            name="yieldPercent"
            min="0"
            max="100"
            value={formData.yieldPercent}
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-zinc-700 p-2.5 rounded-lg text-xs"
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="text-xs uppercase font-bold text-zinc-400 hover:text-white px-4 py-2">
          Cancel
        </button>
        <button type="submit" className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs uppercase font-bold px-6 py-2.5 rounded-lg">
          Save Ingredient
        </button>
      </div>
    </form>
  );
};
