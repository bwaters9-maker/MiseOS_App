import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import { todayDateKey, formatTime12h, parseDateKey, toDateKey, addDays, startOfWeek } from '../../utils';
import type { Employee, Shift, KitchenEvent, Client, PrepStation } from '../../types';

// ===================================================================
// MONTH GRID MATH — the week-boundary primitives (parseDateKey,
// toDateKey, addDays, startOfWeek) live in utils.ts so the weekly-hours
// summary below shares one definition instead of a second copy; these
// two are month-mode-only and have no other consumer yet.
// ===================================================================

const addMonths = (key: string, n: number) => {
  const d = parseDateKey(key);
  d.setMonth(d.getMonth() + n);
  return toDateKey(d);
};

const startOfMonth = (key: string) => {
  const d = parseDateKey(key);
  d.setDate(1);
  return toDateKey(d);
};

const dayLabel = (key: string) => parseDateKey(key).toLocaleDateString('en-US', { weekday: 'short' });
const dayNumber = (key: string) => parseDateKey(key).getDate();
const isSameMonth = (a: string, b: string) => {
  const da = parseDateKey(a), db = parseDateKey(b);
  return da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear();
};
const weekRangeLabel = (weekStart: string) => {
  const weekEnd = addDays(weekStart, 6);
  const start = parseDateKey(weekStart);
  const end = parseDateKey(weekEnd);
  const startFmt = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // Always include the month on the end date — some environments mis-render
  // toLocaleDateString options that specify day+year without month.
  const endFmt = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startFmt} – ${endFmt}`;
};
const monthLabel = (monthStart: string) =>
  parseDateKey(monthStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

// ===================================================================
// SHARED DAY CONTENT — full (non-compact) rendering used by both the
// week-mode columns and the month-mode day-detail panel, so the two
// never duplicate the coverage/event logic.
// ===================================================================

const DayContent: React.FC<{
  dateKey: string;
  dayShifts: Shift[];
  dayEvents: KitchenEvent[];
  stationPresets: PrepStation[];
  staffById: Map<string, Employee>;
  clientsById: Map<string, Client>;
  onEditShift: (s: Shift) => void;
  onOpenEvent: (id: string) => void;
}> = ({ dateKey, dayShifts, dayEvents, stationPresets, staffById, clientsById, onEditShift, onOpenEvent }) => {
  const unassigned = dayShifts.filter(sh => !sh.station);

  return (
    <div className="space-y-[8px]">
      <div className="divide-y divide-line">
        {stationPresets.map(station => {
          const stationShifts = dayShifts.filter(sh => sh.station === station);
          return (
            <div key={station} className="flex items-start justify-between gap-[8px] py-[5px]">
              <span className="text-[11px] font-bold text-navy shrink-0">{station}</span>
              {stationShifts.length === 0 ? (
                <span className="px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider bg-red-400 text-white shrink-0">
                  Uncovered
                </span>
              ) : (
                <div className="flex flex-col items-end gap-[2px]">
                  {stationShifts.map(sh => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => onEditShift(sh)}
                      className="text-[11px] text-slate text-right hover:text-teal transition-colors duration-[144ms]"
                    >
                      {staffById.get(sh.staffId)?.name ?? 'Unknown'} · {formatTime12h(sh.startTime)}–{formatTime12h(sh.endTime)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="pt-[8px] border-t border-line">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate mb-[3px]">No Station</p>
          <div className="space-y-[2px]">
            {unassigned.map(sh => (
              <button
                key={sh.id}
                type="button"
                onClick={() => onEditShift(sh)}
                className="flex items-center justify-between w-full text-[11px] hover:text-teal transition-colors duration-[144ms]"
              >
                <span className="text-navy">{staffById.get(sh.staffId)?.name ?? 'Unknown'}</span>
                <span className="text-slate">{formatTime12h(sh.startTime)}–{formatTime12h(sh.endTime)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {dayEvents.length > 0 && (
        <div className="pt-[8px] border-t border-line space-y-[3px]">
          {dayEvents.map(e => (
            <button
              key={e.id}
              type="button"
              onClick={() => onOpenEvent(e.id)}
              className="flex items-center gap-[5px] w-full text-left text-[11px] hover:text-teal transition-colors duration-[144ms]"
            >
              <CalendarDays className="w-3 h-3 text-slate shrink-0" />
              {e.time && <span className="text-slate shrink-0 tabular-nums">{formatTime12h(e.time)}</span>}
              <span className="text-navy font-bold truncate">{e.title}</span>
              {e.clientId && clientsById.get(e.clientId) && (
                <span className="text-slate truncate">— {clientsById.get(e.clientId)!.name}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {dayShifts.length === 0 && dayEvents.length === 0 && (
        <p className="text-[10px] text-slate italic pt-[3px]">Nothing scheduled.</p>
      )}
    </div>
  );
};

// ===================================================================
// COMPACT MONTH CELL — coverage dots + event count only; click expands
// into the full DayContent panel below the grid.
// ===================================================================

const MonthCell: React.FC<{
  dateKey: string;
  inMonth: boolean;
  isToday: boolean;
  isExpanded: boolean;
  dayShifts: Shift[];
  dayEvents: KitchenEvent[];
  stationPresets: PrepStation[];
  onClick: () => void;
}> = ({ dateKey, inMonth, isToday, isExpanded, dayShifts, dayEvents, stationPresets, onClick }) => {
  const coveredStations = new Set(dayShifts.map(sh => sh.station).filter(Boolean));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-[8px] rounded-[8px] border transition-colors duration-[144ms] min-h-[76px] ${
        isExpanded ? 'border-teal bg-teal/10' : isToday ? 'border-teal bg-teal/5' : 'border-line bg-surface hover:border-teal/50'
      } ${!inMonth ? 'opacity-40' : ''}`}
    >
      <span className={`text-xs font-bold tabular-nums ${isToday ? 'text-teal' : 'text-navy'}`}>{dayNumber(dateKey)}</span>
      <div className="flex flex-wrap gap-[3px] mt-[5px]">
        {stationPresets.map(station => (
          <span
            key={station}
            title={station}
            className={`w-[6px] h-[6px] rounded-full ${coveredStations.has(station) ? 'bg-teal' : 'bg-red-400'}`}
          />
        ))}
      </div>
      {dayEvents.length > 0 && (
        <div className="flex items-center gap-[3px] mt-[5px] text-[10px] text-slate">
          <CalendarDays className="w-2.5 h-2.5" />
          {dayEvents.length}
        </div>
      )}
    </button>
  );
};

// ===================================================================
// MAIN COMPONENT
// ===================================================================

interface ScheduleCalendarProps {
  shifts: Shift[];
  staff: Employee[];
  events: KitchenEvent[];
  clients: Client[];
  stationPresets: PrepStation[];
  onEditShift: (shift: Shift) => void;
  onOpenEvent: (eventId: string) => void;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  shifts, staff, events, clients, stationPresets, onEditShift, onOpenEvent,
}) => {
  const today = todayDateKey();
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [anchorDate, setAnchorDate] = useState(today);
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);

  const staffById = new Map(staff.map(e => [e.id, e]));
  const clientsById = new Map(clients.map(c => [c.id, c]));

  const shiftsByDate = new Map<string, Shift[]>();
  for (const sh of shifts) {
    if (!shiftsByDate.has(sh.date)) shiftsByDate.set(sh.date, []);
    shiftsByDate.get(sh.date)!.push(sh);
  }
  const eventsByDate = new Map<string, KitchenEvent[]>();
  for (const e of events) {
    if (!e.date) continue;
    if (!eventsByDate.has(e.date)) eventsByDate.set(e.date, []);
    eventsByDate.get(e.date)!.push(e);
  }

  const goPrev = () => {
    setExpandedDayKey(null);
    setAnchorDate(mode === 'week' ? addDays(anchorDate, -7) : addMonths(anchorDate, -1));
  };
  const goNext = () => {
    setExpandedDayKey(null);
    setAnchorDate(mode === 'week' ? addDays(anchorDate, 7) : addMonths(anchorDate, 1));
  };
  const goToday = () => {
    setExpandedDayKey(null);
    setAnchorDate(today);
  };

  const weekStart = startOfWeek(anchorDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="bg-surface border border-line rounded-card p-[21px] space-y-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-[13px]">
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={goPrev}
            className="p-[5px] text-slate hover:text-teal transition-colors duration-[144ms]"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-navy min-w-[160px] text-center">
            {mode === 'week' ? weekRangeLabel(weekStart) : monthLabel(monthStart)}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="p-[5px] text-slate hover:text-teal transition-colors duration-[144ms]"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider text-teal border border-teal/40 hover:bg-teal/10 transition-colors duration-[144ms]"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-[5px] bg-bg-cool p-[3px] rounded-card border border-line">
          {(['week', 'month'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setExpandedDayKey(null); }}
              className={`px-[13px] py-[5px] text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors duration-[144ms] ${
                mode === m ? 'bg-navy text-cream' : 'text-slate hover:text-navy'
              }`}
            >
              {m === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-[8px]">
          {weekDays.map(dateKey => {
            const isToday = dateKey === today;
            return (
              <div
                key={dateKey}
                className={`rounded-[8px] border p-[8px] ${isToday ? 'border-teal bg-teal/5' : 'border-line'}`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-[5px] ${isToday ? 'text-teal' : 'text-slate'}`}>
                  {dayLabel(dateKey)} {dayNumber(dateKey)}{isToday ? ' · Today' : ''}
                </p>
                <DayContent
                  dateKey={dateKey}
                  dayShifts={shiftsByDate.get(dateKey) ?? []}
                  dayEvents={eventsByDate.get(dateKey) ?? []}
                  stationPresets={stationPresets}
                  staffById={staffById}
                  clientsById={clientsById}
                  onEditShift={onEditShift}
                  onOpenEvent={onOpenEvent}
                />
              </div>
            );
          })}
        </div>
      )}

      {mode === 'month' && (
        <>
          <div className="grid grid-cols-7 gap-[5px]">
            {monthDays.map(dateKey => (
              <MonthCell
                key={dateKey}
                dateKey={dateKey}
                inMonth={isSameMonth(dateKey, monthStart)}
                isToday={dateKey === today}
                isExpanded={expandedDayKey === dateKey}
                dayShifts={shiftsByDate.get(dateKey) ?? []}
                dayEvents={eventsByDate.get(dateKey) ?? []}
                stationPresets={stationPresets}
                onClick={() => setExpandedDayKey(expandedDayKey === dateKey ? null : dateKey)}
              />
            ))}
          </div>

          {expandedDayKey && (
            <div className="rounded-[8px] border border-teal bg-teal/5 p-[13px]">
              <div className="flex items-center justify-between mb-[8px]">
                <p className="text-xs font-bold text-navy">
                  {parseDateKey(expandedDayKey).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {expandedDayKey === today ? ' · Today' : ''}
                </p>
                <button
                  type="button"
                  onClick={() => setExpandedDayKey(null)}
                  className="p-[3px] text-slate hover:text-navy transition-colors duration-[144ms]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <DayContent
                dateKey={expandedDayKey}
                dayShifts={shiftsByDate.get(expandedDayKey) ?? []}
                dayEvents={eventsByDate.get(expandedDayKey) ?? []}
                stationPresets={stationPresets}
                staffById={staffById}
                clientsById={clientsById}
                onEditShift={onEditShift}
                onOpenEvent={onOpenEvent}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScheduleCalendar;
