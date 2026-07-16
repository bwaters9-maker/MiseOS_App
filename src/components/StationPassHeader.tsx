/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PrepStation } from '@/types';
import { ChefHat, AlertTriangle, CheckSquare } from 'lucide-react';

interface StationPassHeaderProps {
  currentStation: PrepStation | 'All';
  setCurrentStation: (station: PrepStation | 'All') => void;
  totalPrepCount: number;
  completedPrepCount: number;
  activeAlarmsCount: number;
  item86Count: number;
}

export default function StationPassHeader({
  currentStation,
  setCurrentStation,
  totalPrepCount,
  completedPrepCount,
  activeAlarmsCount: _activeAlarmsCount,
  item86Count
}: StationPassHeaderProps) {
  const stations: (PrepStation | 'All')[] = ['All', 'Sauté', 'Grill', 'Garde Manger', 'Pastry'];

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand/Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center shadow-lg border border-red-500">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-mono font-black tracking-tighter text-white flex items-center gap-1.5 uppercase">
              IncendiumPhi <span className="text-red-500 font-bold text-xs bg-red-950 px-1.5 py-0.5 border border-red-900 rounded">THE PASS</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono">
              Back-of-House Kitchen Coordination System
            </p>
          </div>
        </div>

        {/* Station Filter Switches */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-zinc-950/80 p-1 border border-zinc-800 rounded-lg">
          {stations.map((station) => (
            <button
              id={`station-filter-${station.toLowerCase().replace(/\s+/g, '-')}`}
              key={station}
              onClick={() => setCurrentStation(station)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                currentStation === station
                  ? 'bg-red-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              {station}
            </button>
          ))}
        </div>

        {/* Header Stats Panel */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Prep Progress Indicator */}
          <div className="bg-zinc-950/50 border border-zinc-850 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-zinc-500 uppercase leading-none">PREP YIELD</span>
              <span className="text-xs font-mono font-bold text-emerald-400 leading-tight">
                {completedPrepCount}/{totalPrepCount}
              </span>
            </div>
          </div>

          {/* 86 Count Indicator */}
          <div className={`border px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
            item86Count > 0 
              ? 'bg-red-950/30 border-red-900 text-red-400' 
              : 'bg-zinc-950/50 border-zinc-850 text-zinc-400'
          }`}>
            <AlertTriangle className={`w-4 h-4 ${item86Count > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`} />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-zinc-500 uppercase leading-none">86'D INDEX</span>
              <span className="text-xs font-mono font-bold leading-tight">
                {item86Count} ITEMS
              </span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
