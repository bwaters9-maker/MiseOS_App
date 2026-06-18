import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { HandoverLog, PrepStation, ProductionRun, Recipe } from '@/types';
import { Check, Send } from 'lucide-react';

interface HandoverLogFormProps {
  recipes: Recipe[];
  productionRuns: ProductionRun[];
  setProductionRuns: (runs: ProductionRun[]) => void;
  currentUser: string; // Name of the logged-in user
}

export const HandoverLogForm: React.FC<HandoverLogFormProps> = ({
  recipes,
  productionRuns,
  setProductionRuns,
  currentUser,
}) => {
  const [stationPresets, setStationPresets] = useState<PrepStation[]>([]);
  const [station, setStation] = useState<PrepStation>('');
  const [status, setStatus] = useState<'pass' | 'fail' | 'incomplete'>('pass');
  const [notes, setNotes] = useState('');
  const [items86, setItems86] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'station_presets'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const presets = snapshot.docs.map(doc => doc.data().name as PrepStation);
      setStationPresets(presets);
      if (presets.length > 0) {
        setStation(currentStation => currentStation || presets[0]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleItem86Toggle = (itemName: string) => {
    setItems86(prev =>
      prev.includes(itemName)
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!station) return; // Don't submit if no station is selected

    const shift_id = new Date().toISOString().split('T')[0]; // e.g., '2024-06-17'

    const newLog: Omit<HandoverLog, 'id' | 'timestamp'> = {
      shift_id,
      station,
      status,
      notes: notes.trim(),
      items86,
      submitted_by: currentUser,
    };

    try {
      // 1. Persist the log to the immutable ledger
      await addDoc(collection(db, 'handover_logs'), {
        ...newLog,
        timestamp: serverTimestamp(),
      });

      // 2. Integration Logic: Update production runs if needed
      if (status === 'incomplete') {
        const updatedRuns = productionRuns.map(run => {
          if (run.station === station) {
            return { ...run, priority: 'high' as const };
          }
          return run;
        });
        setProductionRuns(updatedRuns);
        console.log(`[CribSheet-Intelligence] Incomplete handover for ${station}. ${updatedRuns.filter(r => r.station === station).length} items automatically bumped to high priority.`);
      }

      // Reset form
      setStatus('pass');
      setNotes('');
      setItems86([]);

    } catch (error) {
      console.error("Failed to submit handover log:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-6 font-mono">
      <h2 className="text-lg font-extrabold tracking-wider uppercase text-white">Station Handover</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Station</label>
          <select value={station} onChange={(e) => setStation(e.target.value as PrepStation)} className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-sm" disabled={stationPresets.length === 0}>
            {stationPresets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-sm">
            <option value="pass">Pass</option>
            <option value="incomplete">Incomplete</option>
            <option value="fail">Fail</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Handover Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Low on demi-glace, need to re-fire for tomorrow..." className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-sm h-24 resize-none" />
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-2">Items 86'd This Shift</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
          {recipes.map(recipe => (
            <label key={recipe.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-zinc-800 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={items86.includes(recipe.name)}
                onChange={() => handleItem86Toggle(recipe.name)}
                className="form-checkbox h-4 w-4 bg-zinc-700 border-zinc-600 text-emerald-500 rounded focus:ring-0"
              />
              <span className="text-zinc-300">{recipe.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-zinc-900/60">
        <button
          type="submit"
          className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 disabled:opacity-40 text-white text-sm uppercase font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-md"
          disabled={!station}
        >
          <Send className="w-4 h-4" /> Submit & Sign-Off
        </button>
      </div>
    </form>
  );
};