/**
 * src/components/testkitchen/trendsDisplay.ts
 * Pure display helpers and the shared data contract for the Trends
 * reference rail and full-report drawer — both render the same live
 * trend/pricing/seasonal state, just at different levels of detail, so
 * they share one prop shape and one copy of these helpers rather than
 * each carrying its own.
 */
import type { TrendReport, TrendCard } from '../../types';
import type { SeasonalItemForRegion } from '../../lib/seasonalData';

export type SeasonStatus = 'rampUp' | 'prime' | 'tailOff' | null;

export const monthStatus = (item: SeasonalItemForRegion, month: number): SeasonStatus => {
  if (item.prime.includes(month)) return 'prime';
  if (item.rampUp.includes(month)) return 'rampUp';
  if (item.tailOff.includes(month)) return 'tailOff';
  return null;
};

export const STATUS_LABEL: Record<Exclude<SeasonStatus, null>, string> = {
  rampUp: 'Ramping Up', prime: 'Prime', tailOff: 'Tail End',
};

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const CATEGORY_STYLE: Record<string, string> = {
  Technique: 'text-teal border-teal/30 bg-teal/10',
  Ingredient: 'text-saffron-text border-saffron/40 bg-saffron-soft',
  Sourcing: 'text-navy border-navy/20 bg-navy/5',
  Format: 'text-slate border-slate/30 bg-slate/10',
  Hospitality: 'text-teal border-teal/30 bg-teal/10',
  Flavor: 'text-saffron-text border-saffron/40 bg-saffron-soft',
};

export const searchUrlFor = (headline: string) => `https://www.google.com/search?q=${encodeURIComponent(headline)}`;

export const formatReportDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

/** Everything the rail and the full-report drawer both need — owned by
 * TestKitchenHub.tsx's live listeners/derivations, passed down as-is. */
export interface TrendsPanelData {
  displayedReport: TrendReport | null;
  trendReportLoaded: boolean;
  trendsLoading: boolean;
  trendsError: string | null;
  onDismissError: () => void;
  historyReports: { id: string; report: TrendReport }[];
  viewingHistoryId: string | null;
  onSelectHistory: (id: string | null) => void;
  seasonalExpanded: boolean;
  onToggleSeasonalExpanded: () => void;
  region: string;
  seasonalItems: SeasonalItemForRegion[];
  currentMonth: number;
  inSeasonNow: SeasonalItemForRegion[];
  comingSoon: SeasonalItemForRegion[];
  hasProfileState: boolean;
  bridgeCard: TrendCard | undefined;
  regularCards: TrendCard[];
}
