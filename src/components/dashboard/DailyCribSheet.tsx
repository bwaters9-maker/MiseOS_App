import React, { useState, useMemo } from 'react';
import { ListTodo, Ban, PlusCircle, XCircle, TrendingUp, ClipboardCheck } from 'lucide-react';
import { ProductionRun, Item86Entry, PrepStation, TrendReport } from '@/types';
import { Section } from '../CribComponents';
import { useStationPresets } from '../../hooks/useStationPresets';

interface DailyCribSheetProps {
  prepRuns?: ProductionRun[];
  items86?: Item86Entry[];
  latestReport: TrendReport | null;
  onUpdateItems86: (items86: Item86Entry[]) => void;
}

const DailyCribSheet: React.FC<DailyCribSheetProps> = ({
  prepRuns = [],
  items86 = [],
  latestReport,
  onUpdateItems86 
}) => {
  const { presets: rawPresets } = useStationPresets();
  const stationPresets = useMemo(() => ['All', ...rawPresets], [rawPresets]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemStation, setNewItemStation] = useState<PrepStation | 'All'>('All');

  const handleAddItem86 = () => {
    if (!newItemName.trim()) return;
    const entry: Item86Entry = {
      id: `86-${Date.now()}`,
      name: newItemName.trim(),
      station: newItemStation,
      blockedAt: new Date().toISOString()
    };
    onUpdateItems86([...items86, entry]);
    setNewItemName('');
    setNewItemStation('All');
  };

  const groupedPrep = useMemo(() => {
    // The `prepRuns` prop is guaranteed to be an array via default props,
    // so we can safely reduce it without a null check.
    return prepRuns.reduce((acc, run) => {
      // In production, an item in the array could be null.
      if (!run) {
        return acc;
      }
      const station = run.station || 'General';
      if (!acc[station]) acc[station] = [];
      acc[station].push(run);
      return acc;
    }, {} as Record<string, ProductionRun[]>);
  }, [prepRuns]);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400 mb-2">
          <Ban className="w-4 h-4" />
          <span>86'd Items</span>
        </h4>
        <ul className="space-y-1.5 text-xs text-zinc-400 list-none mb-3">
          {items86.length > 0 ? (
            items86.map(item => (
              <li key={item.id} className="flex justify-between items-center bg-zinc-950/30 p-2 rounded">
                <span className="font-semibold text-zinc-300">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold">{item.station}</span>
                  <button onClick={() => onUpdateItems86(items86.filter(i => i.id !== item.id))} className="text-zinc-600 hover:text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))
          ) : (
            <p className="text-xs text-zinc-500 italic">No items 86'd.</p>
          )}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Item Name"
            className="flex-grow bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 h-8"
          />
          <select value={newItemStation} onChange={(e) => setNewItemStation(e.target.value as PrepStation | 'All')} className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 h-8 max-w-[120px]">
            {stationPresets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={handleAddItem86} className="bg-red-900/50 text-red-300 h-8 px-2.5 rounded border border-red-800 hover:bg-red-900">
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        {Object.entries(groupedPrep).map(([station, runs]) => (
          <Section key={station} title={station} icon={<ListTodo className="w-4 h-4" />}>
            {(runs || []).map(run => {
              // Production-grade guard: Don't render if the run item is invalid.
              if (!run || !run.id) {
                return null;
              }

              const score = latestReport?.recipe_scores?.[run.recipe_id];
              const isHot = score?.status === 'hot';
              const needsCheck = run.requires_temp_check;
              // Ensure arithmetic operations are safe by providing default numeric values.
              const deficit = Math.max(0, (run.par ?? 0) - (run.quantity ?? 0));

              return (
                <div key={run.id} className="bg-zinc-950/30 p-2 rounded flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    {isHot && <TrendingUp className="w-3.5 h-3.5 text-orange-500" />}
                    {needsCheck && <ClipboardCheck className="w-3.5 h-3.5 text-blue-400" />}
                    <span className="font-semibold text-zinc-300">{run.name || 'Unnamed Item'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 font-mono">
                      {run.quantity ?? 0} / {run.par ?? 'N/A'} {run.unit || ''}
                    </span>
                    {deficit > 0 && (
                      <span className="font-bold text-red-400 font-mono bg-red-950/40 border border-red-800 px-1.5 py-0.5 rounded text-[10px]">
                        -{deficit}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </Section>
        ))}
      </div>
    </div>
  );
};

export default DailyCribSheet;