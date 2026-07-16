/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Today's date as YYYY-MM-DD in local time. Never use
 * `new Date().toISOString().slice(0, 10)` for a "today" date-key comparison
 * — it's UTC-based and rolls to tomorrow's date hours before local midnight
 * in any US timezone.
 */
export function todayDateKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Formats a 24-hour "HH:MM" time string (the native `<input type="time">`
 * value shifts/events/milestones are stored as) into 12-hour "H:MM AM/PM"
 * for display. Storage and sorting stay on the raw 24-hour string — only
 * the rendered label goes through this.
 */
export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

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
