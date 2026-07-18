import React, { useState } from 'react';
import { History, CheckCircle2, RotateCcw } from 'lucide-react';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useRestaurantId } from './components/AuthContext';
import { updateDoc } from 'firebase/firestore';
import { rDoc } from './lib/firestorePaths';
import type { KitchenAlert } from './types';

const BADGE = 'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border';

type SeverityFilter = 'all' | KitchenAlert['severity'];
type StatusFilter = 'all' | 'active' | 'resolved';

const severityBadge = (severity: KitchenAlert['severity']) => {
  if (severity === 'critical') return `${BADGE} text-red-400 border-red-400/40 bg-red-400/10`;
  if (severity === 'warning') return `${BADGE} text-saffron-text border-saffron/40 bg-saffron-soft`;
  return `${BADGE} text-slate border-line bg-bg-cool`;
};

const severityAccent = (severity: KitchenAlert['severity']) => {
  if (severity === 'critical') return 'border-l-2 border-l-red-400';
  if (severity === 'warning') return 'border-l-2 border-l-saffron';
  return 'border-l-2 border-l-line';
};

const formatTimestamp = (ts: string) => {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' — ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const FILTER_BTN = 'px-[13px] py-[5px] rounded-[8px] text-[10px] font-bold uppercase tracking-wider border transition-colors duration-[144ms]';
const filterBtnClass = (active: boolean) =>
  `${FILTER_BTN} ${active
    ? 'bg-navy text-cream border-navy shadow-sm'
    : 'bg-transparent text-slate border-line hover:text-navy'}`;

export const HistoricalAlerts: React.FC = () => {
  const restaurantId = useRestaurantId();
  const alerts = (useKitchenSelector((s: any) => s.alerts) as KitchenAlert[]) ?? [];
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const setResolved = (id: string, resolved: boolean) => {
    updateDoc(rDoc(restaurantId, 'alerts', id), { resolved });
  };

  const filtered = [...alerts]
    .filter(a => severityFilter === 'all' || a.severity === severityFilter)
    .filter(a =>
      statusFilter === 'all' ? true : statusFilter === 'resolved' ? a.resolved : !a.resolved
    )
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));

  const activeCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="max-w-[987px] mx-auto px-[21px] py-[34px]">
      <div className="flex items-start justify-between mb-[34px]">
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight text-navy flex items-center gap-[8px]">
            <History className="w-5 h-5 text-teal" />
            Alert History
          </h1>
          <p className="text-xs text-slate mt-[5px]">
            {alerts.length} total · {activeCount} active
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-[8px] mb-[21px]">
        {(['all', 'critical', 'warning', 'info'] as SeverityFilter[]).map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)} className={filterBtnClass(severityFilter === s)}>
            {s}
          </button>
        ))}
        <span className="w-px h-[21px] bg-line mx-[5px]" />
        {(['all', 'active', 'resolved'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={filterBtnClass(statusFilter === s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-line rounded-card p-[21px]">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate italic py-[8px]">No alerts match the current filters.</p>
        ) : (
          <div className="space-y-[8px]">
            {filtered.map(a => (
              <div
                key={a.id}
                className={`flex items-center justify-between gap-[13px] py-[8px] pl-[13px] pr-[5px] rounded-[5px] bg-bg-cool ${severityAccent(a.severity)} ${a.resolved ? 'opacity-50' : ''}`}
              >
                <div className="min-w-0">
                  <p className={`text-xs ${a.resolved ? 'text-slate line-through' : 'text-navy'}`}>
                    {a.message}
                  </p>
                  <p className="text-[10px] text-slate mt-[3px]">
                    {formatTimestamp(a.timestamp)}
                    {a.station ? ` · ${a.station}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-[8px] shrink-0">
                  <span className={severityBadge(a.severity)}>{a.severity}</span>
                  <button
                    onClick={() => setResolved(a.id, !a.resolved)}
                    title={a.resolved ? 'Reopen alert' : 'Mark resolved'}
                    className="p-[8px] rounded-[8px] text-slate hover:text-teal border border-transparent hover:border-line transition-colors duration-[144ms]"
                  >
                    {a.resolved ? <RotateCcw className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
