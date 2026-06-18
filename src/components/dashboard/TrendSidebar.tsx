import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming a utility for classnames

// Define a simplified interface for the report prop
interface TrendReport {
  menu_pricing_analysis: {
    name: string;
    cost_variance_pct: number;
  }[];
}

interface TrendSidebarProps {
  latestReport: TrendReport | null;
}

const TrendSidebar: React.FC<TrendSidebarProps> = ({ latestReport }) => {
  if (!latestReport || !latestReport.menu_pricing_analysis) {
    return (
      <div className="p-4 text-xs text-zinc-500 italic">
        No trend analysis data available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
        Cost Variance Analysis
      </h4>
      <ul className="space-y-2">
        {latestReport.menu_pricing_analysis.map((item, index) => (
          <li key={index} className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-md">
            <span className="text-sm font-medium text-zinc-300">{item.name}</span>
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-bold',
                item.cost_variance_pct > 0 && 'text-red-400',
                item.cost_variance_pct < 0 && 'text-green-400',
                item.cost_variance_pct === 0 && 'text-zinc-500'
              )}
            >
              {item.cost_variance_pct > 0 && <TrendingUp className="w-3.5 h-3.5" />}
              {item.cost_variance_pct < 0 && <TrendingDown className="w-3.5 h-3.5" />}
              {item.cost_variance_pct === 0 && <Minus className="w-3.5 h-3.5" />}
              <span>{item.cost_variance_pct.toFixed(1)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrendSidebar;