/**
 * src/lib/costEngine.js
 * Backend logic framework for assessing real-time food cost metrics, yield expenses,
 * and market vector alerts (Seasonal data, pricing trends, and volume forecasts).
 */

export const calculateTrueCost = (apCost, yieldPercent) => {
  if (!yieldPercent || yieldPercent <= 0) return apCost;
  return apCost / (yieldPercent / 100);
};

export const getMarketTrendInsight = (ingredientName) => {
  // Normalize checking keys
  const name = ingredientName?.toLowerCase() || '';

  // Seeded mock parameters reflecting real-world agricultural market shifts
  if (name.includes('salmon') || name.includes('fish') || name.includes('seafood')) {
    return {
      status: 'Trending',
      priceTrend: 'Skyrocketing',
      seasonality: 'Out of Season',
      notes: "Fuel surcharges and tight global logistics are driving cold-water freight costs up. Lock in distributor contracts now.",
      priceBadgeStyle: 'bg-red-950 text-red-400 border-red-900',
      seasonBadgeStyle: 'bg-amber-950 text-amber-400 border-amber-900'
    };
  }

  if (name.includes('beef') || name.includes('ribeye') || name.includes('steak')) {
    return {
      status: 'Consistent',
      priceTrend: 'Stable',
      seasonality: 'In Season',
      notes: "Domestic production indices are holding steady. Feed costs are flat, stabilizing current primal cut pricing.",
      priceBadgeStyle: 'bg-zinc-900 text-zinc-400 border-zinc-800',
      seasonBadgeStyle: 'bg-emerald-950 text-emerald-400 border-emerald-900'
    };
  }

  if (name.includes('butter') || name.includes('dairy') || name.includes('cream')) {
    return {
      status: 'Cold',
      priceTrend: 'Dropping',
      seasonality: 'In Season',
      notes: "Spring flush milk volumes have created a domestic surplus. Anticipate spot-market prices to lower over the next 30 days.",
      priceBadgeStyle: 'bg-emerald-950 text-emerald-400 border-emerald-900',
      seasonBadgeStyle: 'bg-emerald-950 text-emerald-400 border-emerald-900'
    };
  }

  // Base Fallback for items
  return {
    status: 'Consistent',
    priceTrend: 'Stable',
    seasonality: 'In Season',
    notes: "Market pricing tracking within historical baselines across regional distribution sheets.",
    priceBadgeStyle: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    seasonBadgeStyle: 'bg-zinc-900 text-zinc-400 border-zinc-800'
  };
};
