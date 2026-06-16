import React from 'react';
import { Recipe } from '@/types';
import { getMarketTrendInsight, MarketTrendInsight } from '@/lib/costEngine';
import { TrendingUp, Flame, Droplets } from 'lucide-react';

interface RecipeTrendCardProps {
  recipe: Recipe;
}

const RecipeTrendCard: React.FC<RecipeTrendCardProps> = ({ recipe }) => {
  if (!recipe || !recipe.name) {
    return null; // Or a skeleton loader
  }

  const insight: MarketTrendInsight = getMarketTrendInsight(recipe.name);

  const getIcon = (status: MarketTrendInsight['status']) => {
    switch (status) {
      case 'Trending':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'Cold':
        return <Droplets className="w-4 h-4 text-blue-400" />;
      default:
        return <TrendingUp className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-md">
      <div className="flex items-center gap-3">
        {getIcon(insight.status)}
        <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
          Market Trend Analysis
        </h4>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${insight.priceBadgeStyle}`}>
          {insight.priceTrend}
        </span>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${insight.seasonBadgeStyle}`}>
          {insight.seasonality}
        </span>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        {insight.notes}
      </p>
    </div>
  );
};

export default RecipeTrendCard;
