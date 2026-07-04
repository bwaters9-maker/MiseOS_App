import React from 'react';
import { ClipboardList, Clock, Ban, ChefHat } from 'lucide-react';
import { Recipe, KitchenTimer, PrepItem, Item86Entry } from '@/types';

interface MetricsHUDProps {
  recipes: Recipe[];
  timers: KitchenTimer[];
  prepItems: PrepItem[];
  items86: Item86Entry[];
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, color }) => (
  <div className={`bg-zinc-900/50 border ${color} p-4 rounded-xl flex items-center gap-4 shadow-lg`}>
    <div className="flex-shrink-0">{icon}</div>
    <div className="flex-grow">
      <div className="text-2xl font-black text-white tracking-tighter">{value}</div>
      <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{label}</div>
    </div>
  </div>
);

export const MetricsHUD: React.FC<MetricsHUDProps> = ({
  recipes,
  timers,
  prepItems,
  items86,
}) => {
  const prepShortageCount = prepItems.filter(item => item.status === 'SHORTAGE').length;
  const activeTimersCount = timers.filter(timer => timer.status === 'running').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <MetricCard
        icon={<ChefHat className="w-8 h-8 text-blue-400" />}
        label="Total Recipes"
        value={recipes.length}
        color="border-zinc-800"
      />
      <MetricCard
        icon={<ClipboardList className="w-8 h-8 text-amber-400" />}
        label="Prep Items Short"
        value={prepShortageCount}
        color={prepShortageCount > 0 ? 'border-amber-700' : 'border-zinc-800'}
      />
      <MetricCard
        icon={<Clock className="w-8 h-8 text-emerald-400" />}
        label="Active Timers"
        value={activeTimersCount}
        color={activeTimersCount > 0 ? 'border-emerald-700' : 'border-zinc-800'}
      />
      <MetricCard
        icon={<Ban className="w-8 h-8 text-red-500" />}
        label="Items 86'd"
        value={items86.length}
        color={items86.length > 0 ? 'border-red-700' : 'border-zinc-800'}
      />
    </div>
  );
};