/**
 * src/components/testkitchen/TrendsReferenceRail.tsx
 * Compact glance-while-you-work rail for the unified Test Kitchen room —
 * trend headlines, pricing direction, and seasonal chips, each row
 * expandable in place for a bit more detail. The full spacious report
 * (full pricing notes, full-year seasonal table, archive) lives one click
 * away in TrendsFullReport, which this component owns and opens.
 */
import React, { useState } from 'react';
import { RefreshCw, AlertCircle, Flame, ExternalLink, TrendingUp, TrendingDown, Maximize2 } from 'lucide-react';
import { CATEGORY_STYLE, searchUrlFor, STATUS_LABEL, MONTH_NAMES, monthStatus, type TrendsPanelData } from './trendsDisplay';
import TrendsFullReport from './TrendsFullReport';
import type { TrendCard } from '../../types';

export default function TrendsReferenceRail(props: TrendsPanelData) {
  const {
    displayedReport, trendReportLoaded, trendsLoading, trendsError, onDismissError,
    region, currentMonth, inSeasonNow, comingSoon, bridgeCard, regularCards,
  } = props;

  const [fullReportOpen, setFullReportOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const toggleExpanded = (key: string) => setExpandedKey(k => (k === key ? null : key));

  const allCards: TrendCard[] = [...(bridgeCard ? [bridgeCard] : []), ...regularCards];
  const pricing = displayedReport?.pricingTrends ?? [];

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="bg-surface border border-line rounded-card p-[21px] flex-1 min-h-0 overflow-y-auto space-y-[21px]">
        <div className="flex items-center justify-between border-b border-line pb-[13px]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-navy">Reference</h3>
          <button
            onClick={() => setFullReportOpen(true)}
            className="flex items-center gap-[5px] text-[10px] font-bold uppercase tracking-wider text-teal hover:text-navy transition-colors duration-[144ms]"
          >
            <Maximize2 className="w-3 h-3" /> Full Report
          </button>
        </div>

        {trendsLoading && (
          <div className="flex items-center gap-[5px] text-[9px] font-bold uppercase tracking-wider text-teal">
            <RefreshCw className="w-3 h-3 animate-spin" /> Updating this week's trends…
          </div>
        )}
        {trendsError && (
          <div className="flex items-start justify-between gap-[8px] text-[10px] text-red-400">
            <span className="flex items-start gap-[5px]"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />{trendsError}</span>
            <button onClick={onDismissError} className="text-slate hover:text-navy shrink-0 uppercase font-bold text-[9px]">Dismiss</button>
          </div>
        )}

        {/* SEASONAL — both clusters visible by default (menu development leads the season); most compact and most immediately actionable, so it leads the rail */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[8px]">In Season Now — {MONTH_NAMES[currentMonth - 1]}</p>
          {inSeasonNow.length === 0 ? (
            <p className="text-xs text-slate italic">Nothing peaks this month for {region}.</p>
          ) : (
            <div className="flex flex-wrap gap-[5px]">
              {inSeasonNow.map(item => {
                const status = monthStatus(item, currentMonth)!;
                const isPrime = status === 'prime';
                return (
                  <span
                    key={item.name}
                    title={STATUS_LABEL[status]}
                    className={`px-[8px] py-[2px] rounded-[13px] border text-[10px] ${isPrime ? 'border-saffron/40 bg-saffron-soft text-saffron-text' : 'border-line bg-bg-cool text-navy'}`}
                  >
                    {item.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[8px]">Coming Up — Next 8 Weeks</p>
          {comingSoon.length === 0 ? (
            <p className="text-xs text-slate italic">Nothing new on deck for {region}.</p>
          ) : (
            <div className="flex flex-wrap gap-[5px]">
              {comingSoon.map(item => (
                <span key={item.name} className="px-[8px] py-[2px] rounded-[13px] border border-line bg-bg-cool text-[10px] text-navy">
                  {item.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* TRENDS */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[8px]">This Week's Trends</p>
          {!trendReportLoaded ? null : allCards.length === 0 ? (
            <p className="text-xs text-slate italic">
              {trendsLoading ? "Generating this week's trend briefing…" : 'No trend briefing yet — one generates automatically each week.'}
            </p>
          ) : (
            <div className="space-y-[5px]">
              {allCards.map((card, i) => {
                const key = `card:${i}`;
                const isBridge = card === bridgeCard;
                const expanded = expandedKey === key;
                return (
                  <div key={key} className={`rounded-[8px] border ${isBridge ? 'border-saffron' : 'border-line'}`}>
                    <button onClick={() => toggleExpanded(key)} className="w-full flex items-center gap-[8px] px-[8px] py-[5px] text-left">
                      {isBridge && <Flame className="w-3 h-3 text-saffron shrink-0" />}
                      <span className={`shrink-0 px-[5px] py-[1px] rounded-[5px] text-[8px] font-bold uppercase tracking-wider border ${CATEGORY_STYLE[card.category] ?? CATEGORY_STYLE.Technique}`}>{card.category}</span>
                      <span className="text-xs text-navy leading-snug flex-1">{card.headline}</span>
                    </button>
                    {expanded && (
                      <div className="px-[8px] pb-[8px] space-y-[5px]">
                        <p className="text-[11px] text-slate leading-relaxed">{card.description}</p>
                        <a
                          href={card.sourceUrl ?? searchUrlFor(card.headline)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-[3px] text-[9px] font-bold uppercase tracking-wider text-teal hover:text-navy transition-colors duration-[144ms]"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> {card.sourceUrl ? (card.sourceName ?? 'View source') : 'Search for coverage'}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PRICING */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[8px]">Pricing Trends</p>
          {!trendReportLoaded || pricing.length === 0 ? (
            <p className="text-xs text-slate italic">No pricing commentary yet.</p>
          ) : (
            <div className="space-y-[3px]">
              {pricing.map((p, i) => {
                const key = `price:${i}`;
                const expanded = expandedKey === key;
                return (
                  <div key={key} className="rounded-[8px] border border-line">
                    <button onClick={() => toggleExpanded(key)} className="w-full flex items-center gap-[8px] px-[8px] py-[5px] text-left">
                      {p.direction === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-red-400 shrink-0" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-teal shrink-0" />
                      )}
                      <span className="text-xs text-navy flex-1">{p.item}</span>
                    </button>
                    {expanded && (
                      <div className="px-[8px] pb-[8px]">
                        <span className="px-[5px] py-[1px] rounded-[5px] text-[8px] font-bold uppercase tracking-wider border border-line text-slate">{p.movement}</span>
                        <p className="text-[11px] text-slate mt-[3px]">{p.note}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TrendsFullReport {...props} isOpen={fullReportOpen} onClose={() => setFullReportOpen(false)} />
    </div>
  );
}
