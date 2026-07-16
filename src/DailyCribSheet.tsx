import React, { useState } from 'react';
import { Printer, Star, Users, CalendarDays, AlertTriangle, ClipboardList } from 'lucide-react';
import { useKitchenSelector } from './components/KitchenStateContext';
import { todayDateKey, formatTime12h } from './utils';
import type { Feature, Employee, Shift, KitchenEvent, KitchenAlert, CribNote } from './types';

const CARD = 'crib-card bg-zinc-950 border border-zinc-800 rounded-[13px] p-[21px]';
const LABEL = 'crib-section-header text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-[8px] mb-[13px]';
const ROW = 'crib-row flex items-baseline justify-between gap-[13px] py-[8px] border-b border-zinc-900 last:border-b-0 text-xs';
const BADGE = 'crib-badge px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';
const EMPTY = 'text-xs text-zinc-500 italic py-[8px]';

const fcColor = (fc: number) =>
  fc < 28 ? 'text-emerald-400' : fc < 34 ? 'text-amber-400' : 'text-red-400';

// Pre-rename docs may still carry the old `covers` field — read it as a
// fallback for display only; every write now uses `attendees`.
const readAttendees = (e: KitchenEvent): number | undefined =>
  e.attendees ?? (e as unknown as { covers?: number }).covers;

const alertVariant = (severity: KitchenAlert['severity']) => {
  if (severity === 'critical') return { badge: `${BADGE} text-red-300 border-red-900 bg-red-950/30`, accent: 'border-l-2 border-l-red-700 pl-[8px]' };
  if (severity === 'warning')  return { badge: `${BADGE} text-amber-300 border-amber-900 bg-amber-950/30`, accent: 'border-l-2 border-l-amber-700 pl-[8px]' };
  return { badge: `${BADGE} text-zinc-400 border-zinc-700 bg-zinc-900/30`, accent: '' };
};

const DailyCribSheet: React.FC = () => {
  const features  = (useKitchenSelector((s: any) => s.features)  as Feature[])     ?? [];
  const staff     = (useKitchenSelector((s: any) => s.staff)     as Employee[])    ?? [];
  const shifts    = (useKitchenSelector((s: any) => s.shifts)    as Shift[])       ?? [];
  const events    = (useKitchenSelector((s: any) => s.events)    as KitchenEvent[]) ?? [];
  const alerts    = (useKitchenSelector((s: any) => s.alerts)    as KitchenAlert[]) ?? [];
  const cribNotes = (useKitchenSelector((s: any) => s.cribNotes) as CribNote[])    ?? [];

  const [printTime, setPrintTime] = useState('');

  const todayStr = todayDateKey();
  const tonightFeatures = features.filter(f => {
    if (f.is86d) return false;
    if (f.activeFrom && todayStr < f.activeFrom) return false;
    if (f.activeTo && todayStr > f.activeTo) return false;
    return true;
  });

  const staffById = new Map(staff.map(e => [e.id, e]));
  const todayShifts = [...shifts]
    .filter(sh => sh.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayEvents = [...events]
    .filter(e => e.date === todayStr)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const activeAlerts = alerts.filter(a => !a.resolved);
  const hasCritical  = activeAlerts.some(a => a.severity === 'critical');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const handlePrint = () => {
    setPrintTime(
      new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) +
      ' — ' +
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0.5in; }
          header, .no-print { display: none !important; }
          .print-show { display: block !important; }
          body, html, main { background: white !important; padding: 0 !important; margin: 0 !important; }
          .print-page { color: #111 !important; background: white !important; }
          .print-page .crib-card { background: white !important; border: 1px solid #d1d5db !important; border-radius: 4px !important; }
          .print-page .crib-section-header { color: #111 !important; }
          .print-page .crib-row { border-bottom-color: #e5e7eb !important; }
          .print-page .crib-badge { background: transparent !important; color: #111 !important; border-color: #9ca3af !important; }
          .print-page * { color: #111 !important; }
        }
      `}</style>

      <div className="print-page max-w-[987px] mx-auto px-[21px] py-[34px] font-mono">

        <div className="flex items-start justify-between mb-[34px]">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white">Daily Crib Sheet</h1>
            <p className="text-xs text-zinc-500 mt-[5px]">{today}</p>
          </div>
          <button
            onClick={handlePrint}
            className="no-print flex items-center gap-[8px] px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-300 hover:text-emerald-400 hover:border-emerald-700 transition-colors duration-[144ms]"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>

        <div className="space-y-[34px]">

          {/* FEATURES TONIGHT */}
          <div className={CARD}>
            <h2 className={`${LABEL} text-emerald-400`}>
              <Star className="w-3.5 h-3.5" />
              Features Tonight
            </h2>
            {tonightFeatures.length === 0 ? (
              <p className={EMPTY}>No features tonight.</p>
            ) : (
              <div>
                {tonightFeatures.map(f => {
                  const fc = f.cost != null && f.price != null && f.price > 0
                    ? Math.round((f.cost / f.price) * 100)
                    : null;
                  return (
                    <div key={f.id} className={ROW}>
                      <div className="flex items-baseline gap-[13px] min-w-0">
                        <span className={`${BADGE} text-zinc-400 border-zinc-700 bg-zinc-900/30 shrink-0`}>{f.course}</span>
                        <span className="font-bold text-zinc-100 truncate">{f.name}</span>
                        {f.description && (
                          <span className="text-zinc-500 truncate hidden md:inline">{f.description}</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-[13px] shrink-0">
                        {f.price != null && (
                          <span className="text-zinc-300 tabular-nums">${f.price.toFixed(2)}</span>
                        )}
                        {fc != null && (
                          <span className={`font-bold tabular-nums ${fcColor(fc)}`}>FC {fc}%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STAFF ON TODAY */}
          <div className={CARD}>
            <h2 className={`${LABEL} text-blue-400`}>
              <Users className="w-3.5 h-3.5" />
              Staff On Today
            </h2>
            {todayShifts.length === 0 ? (
              <p className={EMPTY}>No staff scheduled.</p>
            ) : (
              <div>
                {todayShifts.map(sh => {
                  const employee = staffById.get(sh.staffId);
                  const positionLabel = sh.station ?? employee?.positions?.[0];
                  return (
                    <div key={sh.id} className={`${ROW} !items-start ${sh.note ? 'flex-col gap-[3px]' : ''}`}>
                      <div className="flex items-baseline justify-between gap-[13px] w-full">
                        <div className="flex items-baseline gap-[13px] min-w-0">
                          <span className="font-bold text-zinc-100 shrink-0">{employee?.name ?? 'Unknown'}</span>
                          {positionLabel && (
                            <span className={`${BADGE} text-zinc-400 border-zinc-800 bg-zinc-900/30 shrink-0`}>{positionLabel}</span>
                          )}
                        </div>
                        <span className="text-zinc-500 shrink-0 tabular-nums">{formatTime12h(sh.startTime)}–{formatTime12h(sh.endTime)}</span>
                      </div>
                      {sh.note && (
                        <p className="text-zinc-200 text-xs">{sh.note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* EVENTS TODAY */}
          <div className={CARD}>
            <h2 className={`${LABEL} text-purple-400`}>
              <CalendarDays className="w-3.5 h-3.5" />
              Events Today
            </h2>
            {todayEvents.length === 0 ? (
              <p className={EMPTY}>No events today.</p>
            ) : (
              <div>
                {todayEvents.map(e => {
                  const sortedMilestones = [...(e.milestones ?? [])].sort((a, b) => a.time.localeCompare(b.time));
                  return (
                    <div key={e.id} className={`${ROW} ${sortedMilestones.length > 0 ? '!items-start flex-col gap-[5px]' : ''}`}>
                      <div className="flex items-baseline justify-between gap-[13px] w-full">
                        <div className="flex items-baseline gap-[13px] min-w-0">
                          {e.time && (
                            <span className="text-zinc-400 shrink-0 tabular-nums">{formatTime12h(e.time)}</span>
                          )}
                          {e.eventType && (
                            <span className={`${BADGE} text-purple-300 border-purple-900 bg-purple-950/30 shrink-0`}>{e.eventType}</span>
                          )}
                          <span className="font-bold text-zinc-100 truncate">{e.title}</span>
                          {e.notes && (
                            <span className="text-zinc-500 truncate hidden md:inline">{e.notes}</span>
                          )}
                        </div>
                        {readAttendees(e) != null && (
                          <span className="text-zinc-400 shrink-0 tabular-nums">{readAttendees(e)}&nbsp;attendees</span>
                        )}
                      </div>
                      {sortedMilestones.length > 0 && (
                        <div className="pl-[13px] border-l border-zinc-800 space-y-[2px] w-full">
                          {sortedMilestones.map((m, i) => (
                            <p key={i} className="text-[10px] text-zinc-500">
                              <span className="tabular-nums text-zinc-400">{formatTime12h(m.time)}</span>&nbsp;—&nbsp;{m.label}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ACTIVE ALERTS */}
          <div className={CARD}>
            <h2 className={`${LABEL} ${hasCritical ? 'text-red-400' : 'text-amber-400'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Active Alerts
            </h2>
            {activeAlerts.length === 0 ? (
              <p className={EMPTY}>No active alerts.</p>
            ) : (
              <div>
                {activeAlerts.map(a => {
                  const v = alertVariant(a.severity);
                  return (
                    <div key={a.id} className={`${ROW} ${v.accent}`}>
                      <div className="flex items-baseline gap-[13px] min-w-0">
                        <span className={`${v.badge} shrink-0`}>{a.severity}</span>
                        <span className="text-zinc-200 truncate">{a.message}</span>
                      </div>
                      <div className="flex items-baseline gap-[8px] shrink-0">
                        {a.station && <span className="text-zinc-500">{a.station}</span>}
                        <span className="text-zinc-600 tabular-nums">{a.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PREP NOTES */}
          <div className={CARD}>
            <h2 className={`${LABEL} text-zinc-400`}>
              <ClipboardList className="w-3.5 h-3.5" />
              Prep Notes
            </h2>
            {cribNotes.length === 0 ? (
              <p className={EMPTY}>No prep notes for today.</p>
            ) : (
              <div>
                {cribNotes.map(n => (
                  <div key={n.id} className={ROW}>
                    <span className="text-zinc-200 flex-1 min-w-0 truncate">{n.content}</span>
                    <div className="flex items-baseline gap-[13px] shrink-0">
                      {n.author && <span className="text-zinc-500">{n.author}</span>}
                      <span className="text-zinc-600 tabular-nums">{n.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="print-show hidden border-t border-zinc-800 pt-[8px] mt-[34px]">
          <span className="text-[10px] text-zinc-500">Printed: {printTime}</span>
        </div>

      </div>
    </>
  );
};

export default DailyCribSheet;
