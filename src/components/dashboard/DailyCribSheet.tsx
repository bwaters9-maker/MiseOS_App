import React from 'react';
import { AlertTriangle, ListTodo, Ban } from 'lucide-react';
import { PrepItem, HandoverLog, Item86 } from '@/types';

interface DailyCribSheetProps {
  prepItems: PrepItem[];
  handovers: HandoverLog[];
  items86: Item86[];
}

const DailyCribSheet: React.FC<DailyCribSheetProps> = ({ prepItems, handovers, items86 }) => {
  const highPriorityPrep = prepItems.filter(item => item.priority === 'high' && !item.checked);
  const criticalHandovers = handovers.filter(log => log.severity === 'critical');
  const outOfStockItems = items86.filter(item => item.status === 'out');

  return (
    <div className="space-y-6">
      {/* 86'd Items */}
      <div>
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400 mb-2">
          <Ban className="w-4 h-4" />
          <span>86'd Items</span>
        </h4>
        <ul className="space-y-1.5 text-xs text-zinc-400 list-none">
          {outOfStockItems.length > 0 ? (
            outOfStockItems.map(item => (
              <li key={item.id} className="flex items-center">
                <span className="font-semibold text-zinc-300">{item.name}</span>
                <span className="text-zinc-500 mx-1.5">›</span>
                <span className="italic">Sub: {item.substitute}</span>
              </li>
            ))
          ) : (
            <p className="text-xs text-zinc-500 italic">No items 86'd.</p>
          )}
        </ul>
      </div>

      {/* Critical Handovers */}
      <div>
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Critical Handovers</span>
        </h4>
        <ul className="space-y-2 text-xs text-zinc-400 list-none">
          {criticalHandovers.length > 0 ? (
            criticalHandovers.map(log => (
              <li key={log.id}>
                <p className="font-semibold text-zinc-300">{log.message}</p>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">From: {log.sender} @ {log.timestamp}</p>
              </li>
            ))
          ) : (
             <p className="text-xs text-zinc-500 italic">No critical handovers.</p>
          )}
        </ul>
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
