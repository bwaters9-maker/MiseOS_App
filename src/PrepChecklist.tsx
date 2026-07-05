import React, { useState } from 'react';
import { PrepItem } from './types';
import { PrepRegistrationForm } from './components/dashboard/PrepRegistrationForm';
import { useKitchenSelector } from './components/KitchenStateContext';

export const PrepChecklist: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const prepItems = (useKitchenSelector((s: any) => s.prepItems) as PrepItem[]) ?? [];

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-zinc-950 text-zinc-100 font-mono tracking-tight">
      <div className="border-b border-zinc-900 pb-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Line Prep Checklist</h1>
          <p className="text-xs text-zinc-500 mt-1">Automated par-to-hand deficiency tracking</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-zinc-100 text-xs uppercase px-4 py-2 rounded-lg font-bold tracking-wider transition-colors shadow-md"
        >
          + Add Prep Item
        </button>
      </div>
      {showAddForm && (
        <div className="mb-6">
          <PrepRegistrationForm
            onSuccess={() => setShowAddForm(false)}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}
      <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-900/10">
        {prepItems.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            No prep items registered. Add the first item to begin par tracking.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-500 uppercase font-bold border-b border-zinc-900">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4 text-center">Station</th>
                <th className="p-4 text-right">On-Hand</th>
                <th className="p-4 text-right">Par</th>
                <th className="p-4 text-right">Deficit Order</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {prepItems.map((item) => {
                const onHand = item.quantity || 0;
                const par = item.par || 0;
                const deficit = Math.max(0, par - onHand);
                const status = deficit > 0 ? 'SHORTAGE' : 'STABLE';
                return (
                  <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="p-4 font-bold text-zinc-200">{item.name}</td>
                    <td className="p-4 text-center text-zinc-400">{item.station}</td>
                    <td className="p-4 text-right text-zinc-400">{onHand} {item.unit}</td>
                    <td className="p-4 text-right text-zinc-400">{par} {item.unit}</td>
                    <td className={`p-4 text-right font-bold ${deficit > 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                      {deficit > 0 ? `${deficit} ${item.unit}` : '0'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block border px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                        status === 'SHORTAGE'
                          ? 'border-red-950 bg-red-950/20 text-red-400'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                      }`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};