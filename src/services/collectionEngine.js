/**
 * MiseOS Collection Engine
 * Aggregates Recipe financials into Collection-level health metrics.
 */

export function calculateCollectionMetrics(collection, allRecipes) {
  // Find only the recipes that belong to this collection
  const recipesInCollection = allRecipes.filter(r => 
    collection.recipe_ids.includes(r.id)
  );

  const stats = recipesInCollection.reduce((acc, recipe) => {
    acc.totalCost += (recipe.total_cost || 0);
    acc.totalMenuPrice += (recipe.menu_price || 0);
    acc.count += 1;
    return acc;
  }, { totalCost: 0, totalMenuPrice: 0, count: 0 });

  const averageFoodCostPercent = stats.totalMenuPrice > 0 
    ? (stats.totalCost / stats.totalMenuPrice) * 100 
    : 0;

  return {
    ...stats,
    averageFoodCostPercent,
    status: averageFoodCostPercent <= 30 ? 'HEALTHY' : 'AT_RISK',
    lastUpdated: new Date().toISOString()
  };
}