import React from 'react';
import { DailyCribSheet } from './DailyCribSheet.jsx';
import { PrepChecklist } from '../../PrepChecklist.jsx';

/**
 * The main kitchen dashboard, acting as the "Head Chef's Pass".
 * It consolidates critical information from various stations into a single,
 * unified view for complete operational awareness.
 */
export const KitchenDashboard = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black uppercase tracking-wider text-zinc-100 border-b border-zinc-800 pb-4">
        Head Chef's Pass
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <DailyCribSheet />
        <PrepChecklist />
      </div>
    </div>
  );
};