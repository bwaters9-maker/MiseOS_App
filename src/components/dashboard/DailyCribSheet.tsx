import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, ListTodo, Ban, PlusCircle, XCircle, TrendingUp, ClipboardCheck, CheckCircle } from 'lucide-react';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ProductionRun, HandoverLog, Item86Entry, PrepStation, TrendReport } from '@/types';
import { Section } from '../CribComponents';

interface DailyCribSheetProps {
  prepRuns: ProductionRun[];
  handovers: HandoverLog[];
  items86: Item86Entry[];
  latestReport: TrendReport | null;
  onUpdateItems86: (items86: Item86Entry[]) => void;
}

const DailyCribSheet: React.FC<DailyCribSheetProps> = ({ 
  prepRuns, 
  handovers, 
  items86,
  latestReport,
  onUpdateItems86 
}) => {
  const [stationPresets, setStationPresets] = useState<(PrepStation | 'All')[]>(['All']);
  const [newItemName, setNewItemName] = useState('');
  const [newItemStation, setNewItemStation] = useState<PrepStation | 'All'>('All');

  useEffect(() => {
    const q = query(collection(db, 'station_presets'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const presets = snapshot.docs.map(doc => doc.data().name as PrepStation);
      setStationPresets(['All', ...presets]);
    });
    return () => unsubscribe();
  }, []);

  const STATUS_STYLES = {
    pass: 'text-green-400 border-green-800',
    fail: 'text-red-400 border-red-800',
    incomplete: 'text-amber-400 border-amber-800',
  };

  const STATUS_ICONS = {
    pass: <CheckCircle className="w-3 h-3" />,
    fail: <XCircle className="w-3 h-3" />,
    incomplete: <AlertTriangle className="w-3 h-3" />,
  };

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
    const groups = prepRuns.reduce((acc, run) => {
      const station = run.station || 'General';
      if (!acc[station]) {
        acc[station] = [];
      }
      acc[station].push(run);
      return acc;
    }, {} as Record<string, ProductionRun[]>);
    console.log(`[CribSheet-Intelligence] Loaded ${prepRuns.length} tasks across ${Object.keys(groups).length} stations.`);
    return groups;
  }, [prepRuns]);

  return (
    <div className="space-y-6">
      {/* 86'd Items */}
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
            placeholder="Item Name (e.g., Salmon)"
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

      {/* Handovers */}
      <div>
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Handovers</span>
        </h4>
        <ul className="space-y-2 text-xs text-zinc-400 list-none mb-3">
          {handovers.length > 0 ? handovers.map(log => (
            <li key={log.id} className="bg-zinc-950/30 p-2.5 rounded border border-zinc-800/50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-zinc-300">{log.notes || <span className="italic text-zinc-500">No notes.</span>}</p>
                  {log.items86.length > 0 && (
                    <div className="mt-1.5 text-[10px]">
                      <span className="font-bold text-red-400/80">86'd: </span>
                      <span className="text-red-400/70">{log.items86.join(', ')}</span>
                    </div>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase border px-1.5 py-0.5 rounded-full ${STATUS_STYLES[log.status]}`}>
                  {STATUS_ICONS[log.status]}
                  <span>{log.status}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-zinc-800/50">
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">From: {log.submitted_by} @ <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span></p>
                <p className="text-zinc-500 text-[10px] uppercase font-bold">{log.station}</p>
              </div>
            </li>
          )) : (
             <p className="text-xs text-zinc-500 italic">No handovers.</p>
          )}
        </ul>
      </div>

      {/* Prep Par Matrix */}
      <div>
        {Object.entries(groupedPrep).map(([station, runs]) => (
          <Section key={station} title={station} icon={<ListTodo className="w-4 h-4" />}>
            {runs.map(run => {
              const isHot = latestReport?.recipe_scores?.[run.recipe_id]?.status === 'hot';
              const needsCheck = run.requires_temp_check;
              const deficit = Math.max(0, (run.par || 0) - run.quantity);
              return (
                <div key={run.id} className="bg-zinc-950/30 p-2 rounded flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    {isHot && <TrendingUp className="w-3.5 h-3.5 text-orange-500" title="Trend-Bump: Hot Item" />}
                    {needsCheck && <ClipboardCheck className="w-3.5 h-3.5 text-blue-400" title="Requires Temp Check" />}
                    <span className="font-semibold text-zinc-300">{run.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 font-mono">
                      {run.quantity} / {run.par || 'N/A'} {run.unit}
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
