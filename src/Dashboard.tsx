import React from 'react';
import { useKitchenState } from './hooks/useKitchenState';
import DailyCribSheet from './components/dashboard/DailyCribSheet';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-lg">
    <div className="flex items-center gap-3">
      <div className="text-emerald-500">{icon}</div>
      <div>
        <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">{title}</p>
        <h3 className="text-2xl font-black text-zinc-100">{value}</h3>
      </div>
    </div>
  </div>
);

export default function DashboardView() {
  const { prepItems, handovers, items86, latestReport, setPrepItems, setItems86 } = useKitchenState();

  const incompletePrep = prepItems.filter(item => !item.checked).length;
  const highPriorityHandovers = handovers.filter(log => log.status === 'fail' || log.status === 'incomplete').length;

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      {/* KPI Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Incomplete Prep Items" value={incompletePrep} icon={<Clock className="w-6 h-6" />} />
        <StatCard title="Critical Handovers" value={highPriorityHandovers} icon={<AlertCircle className="w-6 h-6" />} />
        <StatCard title="Items 86'd" value={items86.length} icon={<CheckCircle2 className="w-6 h-6" />} />
      </div>

      {/* Main Content */}
      <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
        <DailyCribSheet
          prepRuns={prepItems}
          handovers={handovers}
          items86={items86}
          latestReport={latestReport}
          onUpdateItems86={setItems86}
        />
      </div>
    </div>
  );
}