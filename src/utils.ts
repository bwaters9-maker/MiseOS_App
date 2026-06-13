/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Recipe, Ingredient } from './types';

/**
 * Format a duration in milliseconds to MM:SS string.
 */
export function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate As Purchased (AP) quantity from Edible Portion (EP) quantity and yield percent.
 * Formula: AP = EP / (Yield% / 100)
 */
export function calculateRawQuantity(epQuantity: number, yieldPercent: number): number {
  const yieldFactor = yieldPercent / 100;
  if (yieldFactor <= 0) return epQuantity;
  return epQuantity / yieldFactor;
}

/**
 * Calculate standard wholesale purchasing unit cost of an ingredient.
 */
export function calculateIngredientCost(epQuantity: number, costPerUnit: number, yieldPercent: number): number {
  const apQuantity = calculateRawQuantity(epQuantity, yieldPercent);
  return apQuantity * costPerUnit;
}

interface RecipeCostDetails {
  totalCost: number;
  costPerPortion: number;
  foodCostPercentage: number;
  detailedIngredients: {
    name: string;
    scaledQuantity: number;
    unit: string;
    yieldPercent: number;
    rawQtyNeeded: number;
    costPerUnit: number;
    purchaseUnit: string;
    cost: number;
  }[];
}

/**
 * Evaluate yield-adjusted AP & EP material costs dynamically based on covers scaling.
 */
export function calculateRecipeCostDetails(recipe: Recipe, targetCovers: number): RecipeCostDetails {
  const scale = targetCovers / (recipe.originalCovers || 1);
  
  let totalCost = 0;
  const detailedIngredients = recipe.ingredients.map((ing) => {
    const scaledEpQuantity = ing.quantity * scale;
    const scaledApQuantity = calculateRawQuantity(scaledEpQuantity, ing.yieldPercent);
    const cost = scaledApQuantity * ing.costPerUnit;
    totalCost += cost;

    return {
      name: ing.name,
      scaledQuantity: scaledEpQuantity,
      unit: ing.unit,
      yieldPercent: ing.yieldPercent,
      rawQtyNeeded: scaledApQuantity,
      costPerUnit: ing.costPerUnit,
      purchaseUnit: ing.purchaseUnit,
      cost
    };
  });

  const costPerPortion = targetCovers > 0 ? totalCost / targetCovers : 0;
  const salePrice = recipe.salePrice || 12; // default fallback sale price
  const foodCostPercentage = salePrice > 0 ? (costPerPortion / salePrice) * 100 : 0;

  return {
    totalCost,
    costPerPortion,
    foodCostPercentage,
    detailedIngredients
  };
}
