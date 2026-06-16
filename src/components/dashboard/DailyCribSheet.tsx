import React, { useState } from 'react';
import { AlertTriangle, ListTodo, Ban, PlusCircle, XCircle } from 'lucide-react';
import { PrepItem, HandoverEntry, Item86Entry, PrepStation } from '@/types';

interface DailyCribSheetProps {
  prepItems: PrepItem[];
  handovers: HandoverEntry[];
  items86: Item86Entry[];
  onUpdateHandovers: (handovers: HandoverEntry[]) => void;
  onUpdateItems86: (items86: Item86Entry[]) => void;
}

const STATIONS: (PrepStation | 'All')[] = ['Sauté', 'Grill', 'Garde Manger', 'Pastry', 'All'];

const DailyCribSheet: React.FC<DailyCribSheetProps> = ({ 
  prepItems, 
  handovers, 
  items86,
  onUpdateHandovers,
  onUpdateItems86 
}) => {
  const [newHandover, setNewHandover] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemStation, setNewItemStation] = useState<PrepStation | 'All'>('All');

  const handleAddHandover = () => {
    if (!newHandover.trim()) return;
    const entry: HandoverEntry = {
      id: `handover-${Date.now()}`,
      comment: newHandover.trim(),
      timestamp: new Date().toISOString(),
      sender: 'system' // Placeholder for user auth
    };
    onUpdateHandovers([...handovers, entry]);
    setNewHandover('');
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

  const highPriorityPrep = prepItems.filter(item => item.priority === 'high' && !item.checked);

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
          <select value={newItemStation} onChange={(e) => setNewItemStation(e.target.value as PrepStation | 'All')} className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 h-8">
            {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
          {handovers.length > 0 ? (
            handovers.map(log => (
              <li key={log.id} className="bg-zinc-950/30 p-2 rounded">
                 <p className="font-semibold text-zinc-300">{log.comment}</p>
                 <div className="flex justify-between items-center">
                   <p className="text-zinc-500 text-[10px] uppercase tracking-wider">From: {log.sender} @ <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span></p>
                   <button onClick={() => onUpdateHandovers(handovers.filter(h => h.id !== log.id))} className="text-zinc-600 hover:text-red-400">
                     <XCircle className="w-3.5 h-3.5" />
                   </button>
                 </div>
              </li>
            ))
          ) : (
             <p className="text-xs text-zinc-500 italic">No handovers.</p>
          )}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            value={newHandover}
            onChange={(e) => setNewHandover(e.target.value)}
            placeholder="Add handover note..."
            className="flex-grow bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 h-8"
          />
          <button onClick={handleAddHandover} className="bg-amber-900/50 text-amber-300 h-8 px-2.5 rounded border border-amber-800 hover:bg-amber-900">
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* High-Priority Prep */}
      <div>
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
          <ListTodo className="w-4 h-4" />
          <span>High-Priority Prep</span>
        </h4>
        <ul className="space-y-1.5 text-xs text-zinc-400 list-none">
          {highPriorityPrep.length > 0 ? (
            highPriorityPrep.map(item => (
              <li key={item.id} className="flex justify-between">
                <span className="font-semibold text-zinc-300">{item.name}</span>
                <span className="text-zinc-500 font-mono">{item.quantity}{item.unit}</span>
              </li>
            ))
          ) : (
            <p className="text-xs text-zinc-500 italic">No outstanding high-priority prep items.</p>
          )}
        </ul>
      </div>

    </div>
  );
};

export default DailyCribSheet;
