import React, { useState, useEffect } from 'react';
import { useKitchenState } from './hooks/useKitchenState';
import { KitchenTimer, PrepStation } from './types';
import { formatDuration } from './utils';
import { Play, Pause, RotateCcw, Plus, Trash2, Clock, Bell } from 'lucide-react';

const STATIONS: PrepStation[] = ['Sauté', 'Grill', 'Garde Manger', 'Pastry'];

export const KitchenTimers: React.FC = () => {
  const { timers, setTimers } = useKitchenState();
  const [tick, setTick] = useState(0);

  // Form states for creating a new timer
  const [newLabel, setNewLabel] = useState('');
  const [newMinutes, setNewMinutes] = useState(10);
  const [newStation, setNewStation] = useState<PrepStation>('Sauté');

  // Trigger a re-render every second to update running timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const newTimer: KitchenTimer = {
      id: `timer-${Date.now()}`,
      label: newLabel.trim(),
      durationMs: newMinutes * 60 * 1000,
      elapsedMs: 0,
      status: 'idle',
      station: newStation,
    };

    setTimers([...timers, newTimer]);
    setNewLabel('');
  };

  const deleteTimer = (id: string) => {
    setTimers(timers.filter(t => t.id !== id));
  };

  const toggleTimer = (id: string) => {
    const updated = timers.map(t => {
      if (t.id === id) {
        const now = Date.now();
        if (t.status === 'running') {
          // Pause
          const sessionElapsed = now - (t.startTime || now);
          return {
            ...t,
            status: 'paused' as const,
            elapsedMs: t.elapsedMs + sessionElapsed,
            startTime: undefined,
          };
        } else {
          // Start / Resume
          return {
            ...t,
            status: 'running' as const,
            startTime: now,
          };
        }
      }
      return t;
    });
    setTimers(updated);
  };

  const resetTimer = (id: string) => {
    const updated = timers.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: 'idle' as const,
          elapsedMs: 0,
          startTime: undefined,
        };
      }
      return t;
    });
    setTimers(updated);
  };

  const adjustTimerDuration = (id: string, minutes: number) => {
    const updated = timers.map(t => {
      if (t.id === id) {
        const msAdjustment = minutes * 60 * 1000;
        const newDuration = Math.max(0, t.durationMs + msAdjustment);
        return { ...t, durationMs: newDuration };
      }
      return t;
    });
    setTimers(updated);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-zinc-950 text-zinc-100 font-mono tracking-tight selection:bg-emerald-800">
      {/* Header Panel */}
      <div className="border-b border-zinc-900 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-400" /> Kitchen Countdown Core
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Simultaneous multi-station countdown arrays</p>
        </div>
      </div>

      {/* New Timer Quick Spin-up form */}
      <form onSubmit={addTimer} className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-5 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Timer Label / Action</label>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g., Sear Ribeye, Boil Potatoes"
            className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:outline-none focus:border-zinc-700 text-zinc-200"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Duration (Mins)</label>
          <input
            type="number"
            value={newMinutes}
            onChange={(e) => setNewMinutes(parseInt(e.target.value) || 0)}
            min={1}
            className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:outline-none focus:border-zinc-700 text-zinc-200"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">Station</label>
          <select
            value={newStation}
            onChange={(e) => setNewStation(e.target.value as PrepStation)}
            className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:outline-none focus:border-zinc-700 text-emerald-400 font-bold font-mono"
          >
            {STATIONS.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4 flex justify-end">
          <button
            type="submit"
            className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-zinc-100 text-xs uppercase px-4 py-2 rounded-lg font-bold tracking-wider flex items-center gap-2 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" /> Spin Up Timer
          </button>
        </div>
      </form>

      {/* Grid of Active Timers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {timers.map(timer => {
          const isRunning = timer.status === 'running';
          const now = Date.now();
          const timeSinceStart = isRunning ? now - (timer.startTime || now) : 0;
          const remainingMs = timer.durationMs - timer.elapsedMs - timeSinceStart;
          const isExpired = remainingMs <= 0;

          return (
            <div
              key={timer.id}
              className={`border rounded-xl p-5 flex flex-col justify-between transition-all relative ${
                isExpired && isRunning
                  ? 'border-red-600 bg-red-950/20 animate-pulse'
                  : 'border-zinc-800 bg-zinc-950 shadow-lg'
              }`}
            >
              {isExpired && isRunning && (
                <div className="absolute -top-2.5 right-4 bg-red-600 border border-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 animate-bounce" /> Expired
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
                  Station: <span className="text-zinc-300">{timer.station}</span>
                </span>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-tight">{timer.label}</h3>
              </div>

              {/* Main monospaced countdown clock */}
              <div className="my-6 text-center">
                <span
                  className={`text-5xl font-black tracking-tighter ${
                    isExpired && isRunning
                      ? 'text-red-500'
                      : isRunning
                      ? 'text-emerald-400'
                      : 'text-zinc-500'
                  }`}
                >
                  {formatDuration(remainingMs)}
                </span>
              </div>

              {/* Controls footer */}
              <div className="space-y-4 border-t border-zinc-900/60 pt-4">
                {/* Micro interval adjustment buttons */}
                <div className="flex justify-between gap-1">
                  <button
                    onClick={() => adjustTimerDuration(timer.id, -5)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 py-1 rounded transition-colors"
                  >
                    -5m
                  </button>
                  <button
                    onClick={() => adjustTimerDuration(timer.id, -1)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 py-1 rounded transition-colors"
                  >
                    -1m
                  </button>
                  <button
                    onClick={() => adjustTimerDuration(timer.id, 1)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 py-1 rounded transition-colors"
                  >
                    +1m
                  </button>
                  <button
                    onClick={() => adjustTimerDuration(timer.id, 5)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 py-1 rounded transition-colors"
                  >
                    +5m
                  </button>
                </div>

                {/* Primary Action controls */}
                <div className="flex justify-between items-center gap-3">
                  <button
                    onClick={() => toggleTimer(timer.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs uppercase font-extrabold rounded-lg transition-all border ${
                      isRunning
                        ? 'bg-zinc-900 text-amber-500 border-zinc-800 hover:bg-zinc-800'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Start
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => resetTimer(timer.id)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 p-2 rounded-lg transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteTimer(timer.id)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 p-2 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {timers.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 border border-dashed border-zinc-800 rounded-xl p-12 text-center text-xs text-zinc-600 uppercase tracking-widest flex flex-col items-center justify-center gap-2">
            <Clock className="w-8 h-8 text-zinc-700 animate-pulse" />
            <span>No active workstation timers compiled.</span>
          </div>
        )}
      </div>
    </div>
  );
};
