import React, { useState } from 'react';
import { useKitchenState } from '../../hooks/useKitchenState';
import { PrepItem, PrepStation } from '../../types';
import { PlusCircle, Clipboard } from 'lucide-react';

interface PrepRegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PrepRegistrationForm: React.FC<PrepRegistrationFormProps> = ({ onSuccess, onCancel }) => {
  const { prepItems, setPrepItems } = useKitchenState();

  // Form states
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('kg');
  const [station, setStation] = useState<PrepStation>('Sauté');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [instructions, setInstructions] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newPrepItem: PrepItem = {
      id: `prep-${Date.now()}`,
      name: description.trim(),
      quantity: quantity,
      unit: unit.trim(),
      checked: false,
      station: station,
      priority: priority,
      notes: instructions.trim() || undefined,
      lastModified: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setPrepItems([...prepItems, newPrepItem]);
    
    // Reset form
    setDescription('');
    setQuantity(1);
    setUnit('kg');
    setStation('Sauté');
    setPriority('medium');
    setInstructions('');

    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4 font-mono shadow-xl selection:bg-emerald-800">
      <div className="border-b border-zinc-900 pb-2 flex items-center gap-2">
        <Clipboard className="w-5 h-5 text-emerald-400 animate-pulse" />
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
          Prep Registration Form
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Description */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Prep Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Brunoise Shallots, Portion Salmon"
            className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:outline-none focus:border-zinc-700 text-zinc-200"
            required
          />
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Quantity Amount</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            min={0.1}
            step="any"
            className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:outline-none focus:border-zinc-700 text-zinc-200"
            required
          />
        </div>

        {/* Unit */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Unit Type</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g., kg, L, portions, g"
            className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:outline-none focus:border-zinc-700 text-zinc-200"
            required
          />
        </div>

        {/* Station */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Station Assigned</label>
          <select
            value={station}
            onChange={(e) => setStation(e.target.value as PrepStation)}
            className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:outline-none focus:border-zinc-700 text-emerald-400 font-bold"
          >
            <option value="Sauté">Sauté</option>
            <option value="Grill">Grill</option>
            <option value="Garde Manger">Garde Manger</option>
            <option value="Pastry">Pastry</option>
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Execution Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
            className={`w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:outline-none focus:border-zinc-700 font-bold appearance-none ${
              priority === 'high' ? 'text-red-400 animate-pulse' : priority === 'medium' ? 'text-amber-400' : 'text-zinc-400'
            }`}
          >
            <option value="low">⚪ Low Priority</option>
            <option value="medium">🟡 Medium Priority</option>
            <option value="high">🔴 High Priority</option>
          </select>
        </div>

        {/* Instructions */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Additional Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g., Keep wrapped in damp paper towels, slice exactly 1/8 inch..."
            className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs h-20 resize-none focus:outline-none focus:border-zinc-700 text-zinc-200"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900/60">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs uppercase font-bold text-zinc-400 hover:text-white px-4 py-2 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-zinc-100 text-xs uppercase px-5 py-2.5 rounded-lg font-bold tracking-wider flex items-center gap-2 transition-colors shadow-md"
        >
          <PlusCircle className="w-4 h-4" /> Register Prep Item
        </button>
      </div>
    </form>
  );
};
