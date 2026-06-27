import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { KitchenTimer } from '@/types';
import { formatDuration } from '../../utils';
import { Play, RotateCcw } from 'lucide-react';

interface LineTimerModuleProps {
  timers: KitchenTimer[];
}

export const LineTimerModule: React.FC<LineTimerModuleProps> = ({ timers }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTimer = async (id: string, currentStatus: KitchenTimer['status']) => {
    const timer = timers.find(t => t.id === id);
    if (!timer) return;

    const now = Date.now();
    let updateData: Partial<KitchenTimer> = {};

    if (currentStatus === 'running') {
      const sessionElapsed = now - (timer.startTime || now);
      updateData = { status: 'paused', elapsedMs: timer.elapsedMs + sessionElapsed, startTime: undefined };
    } else {
      updateData = { status: 'running', startTime: now };
    }
    await updateDoc(doc(db, 'timers', id), updateData);
  };
  
  const resetTimer = async (id: string) => {
    await updateDoc(doc(db, 'timers', id), { status: 'idle', elapsedMs: 0, startTime: undefined });
  };

  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-lg">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">
          Active Countdown Timers
        </h3>
        <div className="pt-2 space-y-3">
          {timers.map(timer => {
            const isRunning = timer.status === 'running';
            const now = Date.now();
            const timeSinceStart = isRunning ? now - (timer.startTime || now) : 0;
            const remainingMs = timer.durationMs - timer.elapsedMs - timeSinceStart;
            const isExpired = remainingMs <= 0;

            return (
              <div key={timer.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-4">
                <div className='flex-1'>
                  <p className="text-xs font-bold text-zinc-100 uppercase tracking-tight">{timer.label}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{timer.station}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${isRunning ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800' : 'text-zinc-500 bg-zinc-800/50 border-zinc-700'}`}>
                    {isRunning ? 'Active' : 'Idle'}
                  </span>
                  
                  <span className={`font-mono text-xl font-black tracking-tighter ${isExpired && isRunning ? 'text-red-500 animate-pulse' : isRunning ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {formatDuration(remainingMs)}
                  </span>

                  <div className='flex gap-1.5'>
                    <button onClick={() => toggleTimer(timer.id, timer.status)} className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 rounded-md transition-colors">
                      <Play className={`w-3.5 h-3.5 ${isRunning ? 'fill-current' : ''}`} />
                    </button>
                    <button onClick={() => resetTimer(timer.id)} className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 rounded-md transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {timers.length === 0 && (
              <p className="text-center text-xs text-zinc-600 uppercase py-8 tracking-widest">No Active Timers</p>
          )}
        </div>
    </div>
  );
};
