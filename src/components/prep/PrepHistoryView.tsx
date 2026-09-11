/**
 * src/components/prep/PrepHistoryView.tsx
 * Read-only browse of prep_history with CSV export. In-view toggle from
 * PrepChecklist.tsx's header (no viewMap key, no nav tab) -- same
 * precedent as Menu.tsx's Guest Preview: a local boolean swaps the whole
 * view, onBack returns to it.
 *
 * QUERY, DELIBERATELY NOT OPTIMIZED: date range is filtered server-side
 * (a single-field range on `date` + orderBy('date','desc') -- Firestore
 * allows this with no composite index). Station is filtered client-side
 * on the already-fetched page. Station + date-range together would need
 * a composite index (firestore.indexes.json, a second deploy) -- and
 * it's unearned: volume here is at most one doc per printed station per
 * day, so a 14-day range is a handful of docs at most, and filtering
 * that in memory is free. Do not "optimize" this into an index without
 * a real volume reason; it would just be a slower deploy for no
 * measurable gain.
 *
 * Scoped getDocs on demand via rCollection -- never onSnapshot, never
 * added to useKitchenState.ts. prep_history is a write-once, ever-
 * growing log (see firestore.rules' comment on the collection); putting
 * it on an always-on listener would mean every session loads the whole
 * history forever. Exactly the plan from Step 0 §4.
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, ChevronDown, ChevronRight, History } from 'lucide-react';
import { query, where, orderBy, getDocs } from 'firebase/firestore';
import { rCollection } from '../../lib/firestorePaths';
import { useRestaurantId } from '../AuthContext';
import { todayDateKey, addDays, formatTime12h } from '../../utils';
import { BTN_ACTION, BTN_GHOST, INPUT } from '../../lib/formStyles';
import type { PrintSheetLine } from '../../lib/prepEngine';

interface PrepHistoryDoc {
  id: string;
  date: string;
  station: string;
  items: PrintSheetLine[];
  printedAt: string;
}

/** printedAt is stored as a full ISO instant (new Date().toISOString()),
 * not the "HH:MM" shape formatTime12h expects (that's what shift/event
 * times are stored as) -- convert to local HH:MM first, same local-time
 * rule as every other "what time is it" display in this app. */
const printedTimeLabel = (printedAt: string): string => {
  const d = new Date(printedAt);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return formatTime12h(`${hh}:${mm}`);
};

const csvEscape = (value: string | number): string => {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const ALL_STATIONS = '';

export const PrepHistoryView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const restaurantId = useRestaurantId();
  const [fromDate, setFromDate] = useState(addDays(todayDateKey(), -13));
  const [toDate, setToDate] = useState(todayDateKey());
  const [stationFilter, setStationFilter] = useState(ALL_STATIONS);
  const [docs, setDocs] = useState<PrepHistoryDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStationFilter(ALL_STATIONS);
    (async () => {
      try {
        const q = query(
          rCollection(restaurantId, 'prep_history'),
          where('date', '>=', fromDate),
          where('date', '<=', toDate),
          orderBy('date', 'desc'),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as PrepHistoryDoc)));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load prep history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [restaurantId, fromDate, toDate]);

  const stationsInResults = Array.from(new Set(docs.map(d => d.station))).sort((a, b) => a.localeCompare(b));
  const filtered = stationFilter ? docs.filter(d => d.station === stationFilter) : docs;

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportCsv = () => {
    const headers = ['date', 'station', 'printedAt', 'name', 'spec', 'makeQty', 'unit', 'prepMinutes'];
    const rows = filtered.flatMap(doc =>
      doc.items.map(item => [doc.date, doc.station, doc.printedAt, item.name, item.spec ?? '', item.makeQty, item.unit, item.prepMinutes])
    );
    const csv = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prep-history-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px]">
      <div className="flex items-start justify-between mb-[21px]">
        <div>
          <h1 className="text-xl font-black font-display uppercase tracking-wider text-navy flex items-center gap-[8px]">
            <History className="w-5 h-5 text-navy" />
            Prep History
          </h1>
          <p className="text-xs text-slate mt-[5px]">Every printed sheet, read-only</p>
        </div>
        <button onClick={onBack} className={`${BTN_GHOST} flex items-center gap-[8px]`}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Checklist
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-[13px] mb-[21px]">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Station</label>
          <select value={stationFilter} onChange={e => setStationFilter(e.target.value)} className={INPUT}>
            <option value={ALL_STATIONS}>All</option>
            {stationsInResults.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          title={filtered.length === 0 ? 'Nothing to export in this range.' : undefined}
          className={`${BTN_ACTION} flex items-center gap-[8px] disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {error && <p className="text-[11px] text-danger mb-[13px]">{error}</p>}

      {loading && <p className="text-xs text-slate">Loading…</p>}

      {!loading && filtered.length === 0 && !error && (
        <div className="bg-surface border border-line rounded-card p-[55px] text-center">
          <History className="w-8 h-8 text-line mx-auto mb-[13px]" />
          <p className="text-xs text-slate">No printed sheets in this range.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-surface border border-line rounded-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line">
              <tr>
                <th className="p-[13px] font-bold uppercase tracking-wider text-slate">Date</th>
                <th className="p-[13px] font-bold uppercase tracking-wider text-slate">Station</th>
                <th className="p-[13px] font-bold uppercase tracking-wider text-slate text-right">Items</th>
                <th className="p-[13px] font-bold uppercase tracking-wider text-slate">Printed</th>
                <th className="p-[13px]" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => {
                const isOpen = expanded.has(doc.id);
                return (
                  <React.Fragment key={doc.id}>
                    <tr
                      onClick={() => toggleExpanded(doc.id)}
                      className="border-b border-line last:border-b-0 cursor-pointer hover:bg-bg-cool transition-colors duration-[144ms]"
                    >
                      <td className="p-[13px] font-mono text-navy">{doc.date}</td>
                      <td className="p-[13px] text-navy">{doc.station}</td>
                      <td className="p-[13px] font-mono text-navy text-right">{doc.items.length}</td>
                      <td className="p-[13px] font-mono text-slate">{printedTimeLabel(doc.printedAt)}</td>
                      <td className="p-[13px] text-slate">
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-line last:border-b-0">
                        <td colSpan={5} className="p-0">
                          <table className="w-full text-left text-[11px] bg-bg-cool">
                            <thead>
                              <tr className="border-b border-line">
                                <th className="p-[8px] pl-[34px] font-bold uppercase tracking-wider text-slate">Item</th>
                                <th className="p-[8px] font-bold uppercase tracking-wider text-slate">Spec</th>
                                <th className="p-[8px] font-bold uppercase tracking-wider text-slate text-right">Make</th>
                                <th className="p-[8px] font-bold uppercase tracking-wider text-slate">Unit</th>
                                <th className="p-[8px] font-bold uppercase tracking-wider text-slate text-right">Prep Min</th>
                              </tr>
                            </thead>
                            <tbody>
                              {doc.items.map((item, i) => (
                                <tr key={i} className="border-b border-line last:border-b-0">
                                  <td className="p-[8px] pl-[34px] text-navy">{item.name}</td>
                                  <td className="p-[8px] text-slate">{item.spec ?? ''}</td>
                                  <td className="p-[8px] font-mono text-navy text-right">{item.makeQty}</td>
                                  <td className="p-[8px] text-slate">{item.unit}</td>
                                  <td className="p-[8px] font-mono text-slate text-right">{item.prepMinutes}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
