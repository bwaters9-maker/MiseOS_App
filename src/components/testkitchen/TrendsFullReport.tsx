/**
 * src/components/testkitchen/TrendsFullReport.tsx
 * The full Culinary Trends & Forecasts content — relocated verbatim from
 * TestKitchenHub.tsx (not rewritten) into a modal drawer, reached from the
 * reference rail's "View Full Trends Report" control. Holds the pieces
 * that genuinely can't compact into a rail: the full pricing list, the
 * full-year seasonal matrix table, and the archived-report dropdown.
 */
import React from 'react';
import { RefreshCw, AlertCircle, Sparkles, Flame, ExternalLink, TrendingUp, TrendingDown, CalendarDays, Printer, ChevronDown, X } from 'lucide-react';
import { APP_NAME, APP_TAGLINE, APP_SHORT_DESC } from '../../lib/appParams';
import type { SeasonalItemForRegion } from '../../lib/seasonalData';
import {
  monthStatus, STATUS_LABEL, MONTH_NAMES, CATEGORY_STYLE, searchUrlFor, formatReportDate,
  type TrendsPanelData,
} from './trendsDisplay';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_SEASON = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter'];

const SEASON_CHIP_STYLE: Record<string, React.CSSProperties> = {
  winter: { background: '#D6EAF3', color: '#2C6E8F' },
  spring: { background: '#DFF0D0', color: '#4A7A2A' },
  summer: { background: '#FBEFC8', color: '#A07617' },
  fall: { background: '#F9E0D4', color: '#A5522B' },
};

const SEASON_GREEN = '#8FAE7C';
const SEASON_GOLD = '#C99A3C';
const SEASON_OFF = '#ECE5D2';

const seasonCellStyle = (status: ReturnType<typeof monthStatus>): React.CSSProperties => {
  const base: React.CSSProperties = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties;
  if (status === 'prime') return { ...base, backgroundColor: SEASON_GOLD };
  if (status === 'rampUp' || status === 'tailOff') return { ...base, backgroundColor: SEASON_GREEN };
  return { ...base, backgroundColor: SEASON_OFF };
};

const formatMonthRuns = (months: number[]): string => {
  if (months.length === 0) return '';
  const set = new Set(months);
  const runs: Array<[number, number]> = [];
  for (let m = 1; m <= 12; m++) {
    if (set.has(m) && !set.has(m === 1 ? 12 : m - 1)) {
      let end = m;
      while (set.has(end === 12 ? 1 : end + 1) && end - m < 11) end = (end % 12) + 1;
      runs.push([m, end]);
    }
  }
  if (runs.length === 0) return 'Year-round';
  return runs
    .map(([s, e]) => (s === e ? MONTH_ABBR[s - 1] : `${MONTH_ABBR[s - 1]}–${MONTH_ABBR[e - 1]}`))
    .join(', ');
};

const seasonSummary = (item: SeasonalItemForRegion): string => {
  const all = [...item.rampUp, ...item.prime, ...item.tailOff];
  const full = formatMonthRuns(all);
  const prime = formatMonthRuns(item.prime);
  return prime && prime !== full ? `${full} · Prime ${prime}` : full;
};

const primePeakMonth = (item: SeasonalItemForRegion): number | null => {
  if (item.prime.length === 0) return null;
  return item.prime[Math.floor((item.prime.length - 1) / 2)];
};

const peakSeason = (item: SeasonalItemForRegion): string | null => {
  const peak = primePeakMonth(item);
  return peak == null ? null : MONTH_SEASON[peak - 1];
};

const PeakSun: React.FC = () => (
  <svg viewBox="0 0 20 20" className="absolute left-1/2 top-1/2 w-[17px] h-[17px] -translate-x-1/2 -translate-y-1/2 z-10" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}>
    <circle cx="10" cy="10" r="8.6" fill="#FFFFFF" />
    <circle cx="10" cy="10" r="4.2" fill="#E0994A" stroke="#B9821B" strokeWidth="1.2" />
    <g stroke="#B9821B" strokeWidth="1.6" strokeLinecap="round">
      <line x1="10" y1="1.5" x2="10" y2="4.5" /><line x1="10" y1="15.5" x2="10" y2="18.5" />
      <line x1="1.5" y1="10" x2="4.5" y2="10" /><line x1="15.5" y1="10" x2="18.5" y2="10" />
      <line x1="4" y1="4" x2="6.1" y2="6.1" /><line x1="13.9" y1="13.9" x2="16" y2="16" />
      <line x1="16" y1="4" x2="13.9" y2="6.1" /><line x1="6.1" y1="13.9" x2="4" y2="16" />
    </g>
  </svg>
);

const SEASONAL_PRINT_CSS = `
#seasonal-matrix-print, #seasonal-matrix-print * {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
@media print {
  html, body { height: auto !important; margin: 0 !important; padding: 0 !important; }
  body *:not(:has(#seasonal-matrix-print)):not(#seasonal-matrix-print):not(#seasonal-matrix-print *) { display: none !important; }
  :has(> #seasonal-matrix-print), main { margin: 0 !important; padding: 0 !important; height: auto !important; }
  #seasonal-matrix-print { width: 100%; border: none; }
  #seasonal-matrix-print .no-print { display: none; }
  #seasonal-matrix-print .overflow-x-auto { overflow: visible; }
  #seasonal-matrix-print span[data-season='prime'] { background: #C99A3C !important; }
  #seasonal-matrix-print span[data-season='rampUp'] { background: #8FAE7C !important; }
  #seasonal-matrix-print span[data-season='tailOff'] { background: #8FAE7C !important; }
  #seasonal-matrix-print span[data-legend='green'] { background: #8FAE7C !important; }
  #seasonal-matrix-print span[data-legend='gold'] { background: #C99A3C !important; }
  #seasonal-matrix-print span[data-legend='darkRed'] { background: #ECE5D2 !important; }
  #seasonal-matrix-print .sm-print-only { display: flex !important; }
  #seasonal-matrix-print .sm-screen-header { display: none !important; }
  #seasonal-matrix-print .sm-word-saffron { color: #B9821B !important; }
  #seasonal-matrix-print .sm-word-navy { color: #1E3A5F !important; }
  #seasonal-matrix-print .sm-sub { color: #5E6B7A !important; }
  #seasonal-matrix-print { padding: 0.45in !important; }
  #seasonal-matrix-print th, #seasonal-matrix-print td { border: none !important; padding: 2px 0 !important; }
  #seasonal-matrix-print table { margin: 0 !important; }
  #seasonal-matrix-print tbody td:first-child { padding-right: 8px !important; white-space: nowrap; }
  #seasonal-matrix-print .sm-print-only img { height: 34px !important; width: 34px !important; }

  #seasonal-matrix-print .sm-season-row { display: table-row !important; }
  #seasonal-matrix-print .sm-season-row th {
    text-align: center; font-size: 12px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.1em;
    padding: 5px 0; border-radius: 5px 5px 0 0;
  }
  #seasonal-matrix-print .sm-season-row th[data-szn='winter'] { background: #D6EAF3 !important; color: #2C6E8F !important; }
  #seasonal-matrix-print .sm-season-row th[data-szn='spring'] { background: #DFF0D0 !important; color: #4A7A2A !important; }
  #seasonal-matrix-print .sm-season-row th[data-szn='summer'] { background: #FBEFC8 !important; color: #A07617 !important; }
  #seasonal-matrix-print .sm-season-row th[data-szn='fall'] { background: #F9E0D4 !important; color: #A5522B !important; }

  #seasonal-matrix-print th[data-szn='winter'], #seasonal-matrix-print td[data-szn='winter'] { background: #EAF4F9 !important; }
  #seasonal-matrix-print th[data-szn='spring'], #seasonal-matrix-print td[data-szn='spring'] { background: #F0F7E8 !important; }
  #seasonal-matrix-print th[data-szn='summer'], #seasonal-matrix-print td[data-szn='summer'] { background: #FDF7E3 !important; }
  #seasonal-matrix-print th[data-szn='fall'], #seasonal-matrix-print td[data-szn='fall'] { background: #FCF0E9 !important; }

  #seasonal-matrix-print span[data-season] { height: 9px !important; border-radius: 0 !important; box-shadow: none !important; }
  #seasonal-matrix-print span[data-season='off'] { background: #ECE5D2 !important; }
  #seasonal-matrix-print tbody td:nth-child(2) span[data-season] { border-top-left-radius: 5px !important; border-bottom-left-radius: 5px !important; }
  #seasonal-matrix-print tbody td:last-child span[data-season] { border-top-right-radius: 5px !important; border-bottom-right-radius: 5px !important; }
  #seasonal-matrix-print td[data-szn] { padding-top: 4px !important; padding-bottom: 4px !important; }
  #seasonal-matrix-print tbody td:first-child { font-size: 11px !important; padding-top: 2px !important; padding-bottom: 2px !important; }
  #seasonal-matrix-print tbody td:first-child span:last-child { font-size: 8px !important; display: inline !important; margin-left: 5px; color: #5E6B7A !important; }
  #seasonal-matrix-print tbody td:not(:first-child):not(:nth-child(2)) span[data-season] { margin-left: -1.5px; width: calc(100% + 1.5px) !important; }
  #seasonal-matrix-print tbody tr { page-break-inside: avoid; }
}
@page { size: landscape; margin: 0; }
`;

const formatHistoryLabel = (dateKey: string): string => {
  const d = new Date(`${dateKey}T00:00:00`);
  if (isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

interface TrendsFullReportProps extends TrendsPanelData {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrendsFullReport(props: TrendsFullReportProps) {
  const {
    isOpen, onClose,
    displayedReport, trendReportLoaded, trendsLoading, trendsError, onDismissError,
    historyReports, viewingHistoryId, onSelectHistory,
    seasonalExpanded, onToggleSeasonalExpanded,
    region, seasonalItems, currentMonth, inSeasonNow, comingSoon, hasProfileState,
    bridgeCard, regularCards,
  } = props;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-[21px]">
      <div className="bg-surface border border-line rounded-card shadow-2xl w-full max-w-[1100px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-[21px] py-[13px] border-b border-line shrink-0">
          <h2 className="text-sm font-display font-bold text-navy flex items-center gap-[8px]">
            <Sparkles className="w-4 h-4 text-teal" /> Full Trends Report
          </h2>
          <button onClick={onClose} className="p-[5px] text-slate hover:text-navy transition-colors duration-[144ms]" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-[21px] py-[21px] overflow-y-auto flex-1 space-y-[34px]">

          {/* REFRESH HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[13px]">
            <div>
              <h2 className="text-sm font-display font-bold text-navy">
                {displayedReport ? `This Week's Culinary Trends for ${formatReportDate(displayedReport.generatedAt)}` : "This Week's Culinary Trends"}
              </h2>
              <p className="text-[10px] text-slate/80 italic mt-[3px]">
                AI-generated editorial commentary — read-only, never writes to your pantry, recipes, or costing. Refreshes automatically once a week.
              </p>
            </div>
            <div className="flex items-center gap-[13px] shrink-0">
              {trendsLoading && (
                <div className="flex items-center gap-[8px] text-[10px] font-bold uppercase tracking-wider text-teal">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Updating this week's trends…
                </div>
              )}
              {historyReports.length > 0 && (
                <select
                  value={viewingHistoryId ?? ''}
                  onChange={e => onSelectHistory(e.target.value || null)}
                  className="bg-bg-cool border border-line rounded-[8px] px-[8px] py-[5px] text-[10px] font-bold uppercase tracking-wider text-navy focus:outline-none focus:border-teal"
                >
                  <option value="">Current</option>
                  {historyReports.map(h => (
                    <option key={h.id} value={h.id}>Week of {formatHistoryLabel(h.id)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {viewingHistoryId && (
            <div className="bg-saffron-soft border border-saffron/40 rounded-card p-[13px] flex flex-wrap items-center justify-between gap-[13px]">
              <p className="text-[11px] text-saffron-text font-bold">
                Viewing archived report — Week of {formatHistoryLabel(viewingHistoryId)}. Read-only, not the live briefing.
              </p>
              <button
                onClick={() => onSelectHistory(null)}
                className="text-[10px] font-bold uppercase text-saffron-text hover:text-navy px-[8px] py-[3px] rounded-[5px] border border-saffron/40 shrink-0"
              >
                Back to Current
              </button>
            </div>
          )}

          {trendsError && (
            <div className="bg-surface border border-red-400 rounded-card p-[13px] flex justify-between items-center">
              <div className="flex items-center gap-[8px] text-red-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{trendsError}</span>
              </div>
              <button onClick={onDismissError} className="text-[10px] font-bold uppercase text-slate hover:text-navy px-[8px] py-[3px] rounded-[5px] border border-line">Dismiss</button>
            </div>
          )}

          {/* EDITORIAL CARDS */}
          {!trendReportLoaded ? null : displayedReport === null ? (
            <div className="bg-surface border border-dashed border-line rounded-card p-[55px] text-center">
              <Sparkles className="w-8 h-8 text-slate/40 mx-auto mb-[13px]" />
              <p className="text-xs text-slate">
                {viewingHistoryId
                  ? 'That archived report could not be found.'
                  : trendsLoading
                    ? "Generating this week's trend briefing…"
                    : 'No trend briefing yet — one generates automatically each week.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[21px]">
              {bridgeCard && (
                <div className="bg-surface border-2 border-saffron rounded-card p-[21px] flex flex-col gap-[13px] lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-[5px] px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider bg-saffron text-white">
                      <Flame className="w-3 h-3" /> Viral Bridge
                    </span>
                    <span className={`px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border ${CATEGORY_STYLE[bridgeCard.category] ?? CATEGORY_STYLE.Technique}`}>{bridgeCard.category}</span>
                  </div>
                  <h3 className="text-sm font-display font-bold text-navy leading-snug">{bridgeCard.headline}</h3>
                  <p className="text-xs text-slate leading-relaxed flex-1">{bridgeCard.description}</p>
                  <a href={bridgeCard.sourceUrl ?? searchUrlFor(bridgeCard.headline)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-[5px] text-[10px] font-bold uppercase tracking-wider text-teal hover:text-navy transition-colors duration-[144ms]">
                    <ExternalLink className="w-3 h-3" /> {bridgeCard.sourceUrl ? (bridgeCard.sourceName ?? 'View source') : 'Search for coverage'}
                  </a>
                </div>
              )}
              {regularCards.map((card, i) => (
                <div key={i} className="bg-surface border border-line rounded-card p-[21px] flex flex-col gap-[13px]">
                  <span className={`self-start px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border ${CATEGORY_STYLE[card.category] ?? CATEGORY_STYLE.Technique}`}>{card.category}</span>
                  <h3 className="text-sm font-display font-bold text-navy leading-snug">{card.headline}</h3>
                  <p className="text-xs text-slate leading-relaxed flex-1">{card.description}</p>
                  <a href={card.sourceUrl ?? searchUrlFor(card.headline)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-[5px] text-[10px] font-bold uppercase tracking-wider text-teal hover:text-navy transition-colors duration-[144ms]">
                    <ExternalLink className="w-3 h-3" /> {card.sourceUrl ? (card.sourceName ?? 'View source') : 'Search for coverage'}
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* PRICING TRENDS */}
          <div className="bg-surface border border-line rounded-card p-[21px] space-y-[13px]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-navy">Pricing Trends</h3>
              <p className="text-[10px] text-slate/80 italic mt-[3px]">
                AI commentary only — informational, never linked to your actual ingredient costs. Update real prices from Ingredients, never here.
              </p>
            </div>
            {!trendReportLoaded || displayedReport === null ? (
              <p className="text-xs text-slate italic py-[8px]">No pricing commentary yet — it refreshes automatically each week.</p>
            ) : displayedReport.pricingTrends.length === 0 ? (
              <p className="text-xs text-slate italic py-[8px]">That refresh returned no pricing commentary.</p>
            ) : (
              <div className="divide-y divide-line">
                {displayedReport.pricingTrends.map((p, i) => (
                  <div key={i} className="flex items-start gap-[13px] py-[8px]">
                    {p.direction === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-red-400 shrink-0 mt-[1px]" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-teal shrink-0 mt-[1px]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-[8px] flex-wrap">
                        <span className="text-xs font-bold text-navy">{p.item}</span>
                        <span className="px-[8px] py-[1px] rounded-[5px] text-[9px] font-bold uppercase tracking-wider border border-line text-slate">{p.movement}</span>
                      </div>
                      <p className="text-[11px] text-slate mt-[2px]">{p.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEASONAL MATRIX */}
          <div id="seasonal-matrix-print" className="bg-surface border border-line rounded-card p-[21px] space-y-[21px]">
            {seasonalExpanded && <style>{SEASONAL_PRINT_CSS}</style>}
            <div className="sm-print-only items-end justify-between border-b-[3px] pb-[13px]" style={{ display: 'none', borderColor: '#1E3A5F' }}>
              <div className="flex items-center gap-[13px]">
                <img src="/brand/phi-tile.svg" alt="" className="h-[55px] w-[55px]" />
                <div>
                  <span className="font-display font-extrabold tracking-[-0.02em] text-[28px]">
                    <span className="sm-word-saffron">Incendium</span><span className="sm-word-navy">Phi</span>
                  </span>
                  <p className="sm-sub text-[11px] font-bold uppercase tracking-widest">Seasonal Sourcing Calendar</p>
                </div>
              </div>
              <div className="text-right">
                <p className="sm-word-navy text-[13px] font-bold">{region} Region · {new Date().getFullYear()}</p>
                <p className="sm-sub text-[10px]">Static reference — chef-verified planning data</p>
              </div>
            </div>
            <div className="sm-screen-header flex flex-col sm:flex-row sm:items-center justify-between gap-[8px]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-navy flex items-center gap-[8px]">
                  <CalendarDays className="w-4 h-4 text-saffron" /> Seasonal Matrix
                </h3>
                <p className="text-[10px] text-slate mt-[3px]">
                  {region} region{!hasProfileState && ' — no state set in Restaurant Profile, defaulting to Northeast'}. Static reference, not a live feed.
                </p>
              </div>
              <div className="flex items-center gap-[13px] shrink-0 no-print">
                {seasonalExpanded && (
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-[5px] text-[10px] font-bold uppercase tracking-wider text-teal hover:text-navy transition-colors duration-[144ms]"
                  >
                    <Printer className="w-3 h-3" /> Print
                  </button>
                )}
                <button
                  onClick={onToggleSeasonalExpanded}
                  className="flex items-center gap-[5px] text-[10px] font-bold uppercase tracking-wider text-teal hover:text-navy transition-colors duration-[144ms]"
                >
                  {seasonalExpanded ? 'Hide' : 'View'} Full-Year Calendar
                  <ChevronDown className={`w-3 h-3 transition-transform duration-[144ms] ${seasonalExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {!seasonalExpanded ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[21px]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[8px]">In Season Now — {MONTH_NAMES[currentMonth - 1]}</p>
                  {inSeasonNow.length === 0 ? (
                    <p className="text-xs text-slate italic">Nothing in this dataset peaks in {MONTH_NAMES[currentMonth - 1]} for {region}.</p>
                  ) : (
                    <div className="space-y-[5px]">
                      {inSeasonNow.map(item => {
                        const status = monthStatus(item, currentMonth)!;
                        return (
                          <div key={item.name} className="flex items-center justify-between gap-[8px] text-xs">
                            <span className="text-navy">{item.name}</span>
                            <span className={`px-[8px] py-[1px] rounded-[5px] text-[9px] font-bold uppercase tracking-wider border ${status === 'prime' ? 'text-saffron-text border-saffron/40 bg-saffron-soft' : 'text-slate border-line'}`}>{STATUS_LABEL[status]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[8px]">Coming Up — Next 8 Weeks</p>
                  {comingSoon.length === 0 ? (
                    <p className="text-xs text-slate italic">Nothing new on deck in the next 8 weeks for {region}.</p>
                  ) : (
                    <div className="space-y-[5px]">
                      {comingSoon.map(item => (
                        <div key={item.name} className="text-xs text-navy">{item.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[11px] min-w-[800px]">
                  <thead>
                    <tr className="hidden sm-season-row">
                      <th />
                      <th colSpan={2} data-szn="winter">Winter</th>
                      <th colSpan={3} data-szn="spring">Spring</th>
                      <th colSpan={3} data-szn="summer">Summer</th>
                      <th colSpan={3} data-szn="fall">Fall</th>
                      <th colSpan={1} data-szn="winter">Winter</th>
                    </tr>
                    <tr>
                      <th className="px-[8px] py-[5px] text-[10px] font-bold uppercase tracking-wider text-slate text-left">Item</th>
                      {MONTH_ABBR.map((m, i) => (
                        <th key={m} data-szn={MONTH_SEASON[i]} className={`px-[3px] py-[5px] text-[9px] font-bold uppercase tracking-wider text-center ${i + 1 === currentMonth ? 'text-saffron-text' : 'text-slate'}`}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seasonalItems.map(item => (
                      <tr key={item.name} className="border-t border-line">
                        <td className="px-[8px] py-[5px] whitespace-nowrap">
                          <span className="text-navy">{item.name}</span>
                          {peakSeason(item) && (
                            <span
                              className="ml-[5px] px-[5px] py-[1px] rounded-[5px] text-[8px] font-bold uppercase tracking-wider align-[1px]"
                              style={{ ...SEASON_CHIP_STYLE[peakSeason(item)!], printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
                            >
                              {peakSeason(item)}
                            </span>
                          )}
                          <span className="block text-[9px] text-slate">{seasonSummary(item)}</span>
                        </td>
                        {MONTH_ABBR.map((_, i) => {
                          const status = monthStatus(item, i + 1);
                          const prev = i > 0 ? monthStatus(item, i) : null;
                          const next = i < 11 ? monthStatus(item, i + 2) : null;
                          const isPeak = primePeakMonth(item) === i + 1;
                          return (
                            <td key={i} data-szn={MONTH_SEASON[i]} className="p-0 py-[5px] text-center">
                              <span className="relative block">
                                <span
                                  data-season={status ?? 'off'}
                                  data-run-start={status !== null && prev === null ? '' : undefined}
                                  data-run-end={status !== null && next === null ? '' : undefined}
                                  className={`block w-full h-[13px] ${i === 0 ? 'rounded-l-[3px]' : ''} ${i === 11 ? 'rounded-r-[3px]' : ''}`}
                                  style={{
                                    ...seasonCellStyle(status),
                                    ...(i > 0 ? { boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.6)' } : {}),
                                  }}
                                  title={`${status ? STATUS_LABEL[status] : 'Out of Season'} in ${MONTH_NAMES[i]}${isPeak ? ' — peak of season' : ''}`}
                                />
                                {isPeak && <PeakSun />}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center gap-[13px] mt-[13px] text-[10px] text-slate">
                  <span className="flex items-center gap-[5px]"><span data-legend="green" className="w-[13px] h-[13px] rounded-[3px] inline-block" style={{ backgroundColor: SEASON_GREEN }} /> In season</span>
                  <span className="flex items-center gap-[5px]"><span data-legend="gold" className="w-[13px] h-[13px] rounded-[3px] inline-block" style={{ backgroundColor: SEASON_GOLD }} /> Prime</span>
                  <span className="sm-legend-off flex items-center gap-[5px]"><span data-legend="darkRed" className="w-[13px] h-[13px] rounded-[3px] inline-block" style={{ backgroundColor: SEASON_OFF }} /> Out of season</span>
                  <span className="flex items-center gap-[5px]">
                    <svg viewBox="0 0 20 20" className="w-[13px] h-[13px]" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}>
                      <circle cx="10" cy="10" r="4.2" fill="#E0994A" stroke="#B9821B" strokeWidth="1.2" />
                      <g stroke="#B9821B" strokeWidth="1.6" strokeLinecap="round">
                        <line x1="10" y1="1.5" x2="10" y2="4.5" /><line x1="10" y1="15.5" x2="10" y2="18.5" />
                        <line x1="1.5" y1="10" x2="4.5" y2="10" /><line x1="15.5" y1="10" x2="18.5" y2="10" />
                        <line x1="4" y1="4" x2="6.1" y2="6.1" /><line x1="13.9" y1="13.9" x2="16" y2="16" />
                        <line x1="16" y1="4" x2="13.9" y2="6.1" /><line x1="6.1" y1="13.9" x2="4" y2="16" />
                      </g>
                    </svg>
                    Peak of season
                  </span>
                </div>
                <div className="sm-print-only items-center justify-between mt-[21px] pt-[8px] border-t" style={{ display: 'none', borderColor: '#DCE4EC' }}>
                  <p className="sm-word-saffron text-[11px] font-display font-bold tracking-wide">{APP_TAGLINE}</p>
                  <p className="sm-sub text-[9px]">{APP_NAME} · {APP_SHORT_DESC}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
