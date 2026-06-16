/**
 * src/lib/costEngine.ts
 * Backend logic framework for assessing real-time food cost metrics, yield expenses,
 * and market vector alerts (Seasonal data, pricing trends, and volume forecasts).
 */

export type MarketTrendStatus = 'Trending' | 'Consistent' | 'Cold';
export type PriceTrend = 'Skyrocketing' | 'Stable' | 'Dropping';
export type Seasonality = 'Out of Season' | 'In Season';

export interface MarketTrendInsight {
  status: MarketTrendStatus;
  priceTrend: PriceTrend;
  seasonality: Seasonality;
  notes: string;
  priceBadgeStyle: string;
  seasonBadgeStyle: string;
}

export interface RecipeIngredientLine {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
  purchaseUnit?: string;
  yieldPercent?: number;
}

export interface CostCalculationRecipe {
  ingredients?: RecipeIngredientLine[];
  yield_quantity?: number | string;
  menu_price?: string | number;
  target_food_cost_percent?: string | number;
  total_cost?: number;
  cost_per_portion?: number;
  food_cost_percent?: number;
}

export const calculateRecipeCosts = (
  recipe: CostCalculationRecipe,
  ingMap: Record<string, { cost_per_usable_unit?: number }> = {}
): CostCalculationRecipe => {
  let totalCost = 0;

  const ingredients = recipe.ingredients || [];
  ingredients.forEach((ing) => {
    const mapped = ing.id ? (ingMap[ing.id] || ingMap[`recipe:${ing.id}`]) : null;
    const costPerUnit = mapped?.cost_per_usable_unit ?? ing.costPerUnit ?? 0;
    const yieldPercent = ing.yieldPercent ?? 100;

    const yieldFactor = yieldPercent / 100;
    const rawQty = yieldFactor > 0 ? ing.quantity / yieldFactor : ing.quantity;
    const lineCost = rawQty * costPerUnit;
    
    totalCost += lineCost;
  });

  const yieldQty = Number(recipe.yield_quantity) || 1;
  const costPerPortion = yieldQty > 0 ? totalCost / yieldQty : totalCost;

  const menuPrice = Number(recipe.menu_price) || 0;
  const foodCostPercent = menuPrice > 0 ? (costPerPortion / menuPrice) * 100 : 0;

  return {
    ...recipe,
    total_cost: totalCost,
    cost_per_portion: costPerPortion,
    food_cost_percent: foodCostPercent
  };
};

export const calculateTrueCost = (apCost: number, yieldPercent: number): number => {
  if (!yieldPercent || yieldPercent <= 0) return apCost;
  return apCost / (yieldPercent / 100);
};

export const getMarketTrendInsight = (ingredientName: string): MarketTrendInsight => {
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
