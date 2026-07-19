import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bell, Check } from 'lucide-react';
import type { KitchenTimer } from '../types';
import { formatDuration } from '../utils';

interface TimerStripProps {
  timers: KitchenTimer[];
}

const BEEP_INTERVAL_MS = 1200;

const getRemainingMs = (timer: KitchenTimer, now: number): number => {
  const timeSinceStart = timer.status === 'running' ? now - (timer.startTime || now) : 0;
  return timer.durationMs - timer.elapsedMs - timeSinceStart;
};

const playBeep = (ctx: AudioContext) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
};

export const TimerStrip: React.FC<TimerStripProps> = ({ timers }) => {
  const [now, setNow] = useState(() => Date.now());
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [armed, setArmed] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const expired = useMemo(
    () => timers.filter(t => getRemainingMs(t, now) <= 0),
    [timers, now]
  );
  const expiredUnacked = useMemo(
    () => expired.filter(t => !acknowledged.has(t.id)),
    [expired, acknowledged]
  );

  // Drop an id from the acknowledged set once its timer is reset/restarted
  // (no longer expired) or deleted, so re-arming a timer doesn't require a
  // separate un-acknowledge step.
  useEffect(() => {
    setAcknowledged(prev => {
      const next = new Set(Array.from(prev).filter(id => expired.some(t => t.id === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [expired]);

  // Audio playback requires a prior user gesture on the page. Arm a single
  // AudioContext on the first click/keypress anywhere in the app, then never
  // again — one arm-per-page-load is all browsers require.
  useEffect(() => {
    const arm = () => {
      if (audioCtxRef.current) return;
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctor();
      if (ctx.state === 'suspended') ctx.resume();
      audioCtxRef.current = ctx;
      setArmed(true);
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
    };
    window.addEventListener('pointerdown', arm);
    window.addEventListener('keydown', arm);
    return () => {
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
    };
  }, []);

  // Repeats while anything is expired and unacknowledged. Re-evaluates on
  // arm so a timer that expired before the first gesture starts alarming
  // immediately once audio unlocks, rather than waiting for the next
  // Firestore change.
  useEffect(() => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
    if (!armed || expiredUnacked.length === 0 || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    playBeep(ctx);
    beepIntervalRef.current = setInterval(() => playBeep(ctx), BEEP_INTERVAL_MS);
    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    };
  }, [armed, expiredUnacked.length]);

  const acknowledge = (id: string) => {
    setAcknowledged(prev => new Set(prev).add(id));
  };

  const visibleTimers = useMemo(
    () => timers.filter(t => t.status === 'running' || expiredUnacked.some(e => e.id === t.id)),
    [timers, expiredUnacked]
  );

  if (visibleTimers.length === 0) return null;

  return (
    <div className="no-print w-full bg-surface border-b border-line h-[55px] shrink-0 flex items-center overflow-x-auto px-[21px] gap-[13px]">
      {visibleTimers.map(timer => {
        const isExpiredUnacked = expiredUnacked.some(e => e.id === timer.id);
        const remaining = getRemainingMs(timer, now);

        return (
          <div
            key={timer.id}
            className={`flex items-center gap-[8px] shrink-0 rounded-lg border px-[13px] py-[5px] ${
              isExpiredUnacked ? 'border-saffron bg-saffron-soft' : 'border-line bg-bg-cool'
            }`}
          >
            <div className="flex flex-col leading-tight">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isExpiredUnacked ? 'text-saffron-text' : 'text-slate'}`}>
                {timer.station} · {timer.label}
              </span>
              <span className={`font-mono text-sm font-bold ${isExpiredUnacked ? 'text-saffron-text' : 'text-navy'}`}>
                {remaining <= 0 ? 'EXPIRED' : formatDuration(remaining)}
              </span>
            </div>
            {isExpiredUnacked && (
              <button
                type="button"
                onClick={() => acknowledge(timer.id)}
                className="flex items-center justify-center w-[21px] h-[21px] rounded-full bg-saffron text-navy hover:opacity-80 transition-opacity shrink-0"
                aria-label={`Acknowledge ${timer.label}`}
              >
                <Check className="w-3 h-3" />
              </button>
            )}
            {isExpiredUnacked && <Bell className="w-3.5 h-3.5 text-saffron-text shrink-0 animate-bounce" />}
          </div>
        );
      })}
    </div>
  );
};
