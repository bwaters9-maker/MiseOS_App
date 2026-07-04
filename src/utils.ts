/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format a duration in milliseconds to HH:MM:SS string.
 * Hides hours if the total duration is less than one hour.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = seconds.toString().padStart(2, '0');

  if (hours > 0) {
    const paddedHours = hours.toString().padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  }
  
  return `${paddedMinutes}:${paddedSeconds}`;
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
