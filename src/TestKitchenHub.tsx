import React, { useState, useEffect, useRef, useMemo } from 'react';
import { withRegionContext } from './lib/regionContext';
import { callAi, parseAiJson, getAiAuthHeader } from './lib/ai';
import { todayDateKey } from './utils';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useRestaurantId } from './components/AuthContext';
import { setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { rCollection, rDoc } from './lib/firestorePaths';
import { regionForState, itemsForRegion, type SeasonalItemForRegion } from './lib/seasonalData';
import type { UnitSystem } from './lib/units';
import { monthStatus } from './components/testkitchen/trendsDisplay';
import TrendsReferenceRail from './components/testkitchen/TrendsReferenceRail';
import DishBuildPanel from './components/testkitchen/DishBuildPanel';
import type { RestaurantProfile, TrendReport, TrendCard, PricingTrendItem } from './types';

// ===================================================================
// TRENDS — AI PROMPT + RESPONSE NORMALIZATION
// ===================================================================

const TREND_CATEGORIES = ['Technique', 'Ingredient', 'Sourcing', 'Format', 'Hospitality', 'Flavor'];

const TRENDS_SYSTEM_PROMPT = `You are a culinary trend analyst briefing a fine-dining executive chef on what is genuinely happening at the leading edge of the industry right now — trail-blazing chefs, serious kitchens, real culinary movement. You are explicitly not reporting on social-media volume or TikTok trend counts for their own sake.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"cards":[{"headline":"...","description":"...","category":"...","isViralBridge":false}],"pricingTrends":[{"item":"...","direction":"up","movement":"structural","note":"..."}]}

Rules for "cards":
- Return exactly 6 cards.
- 5 of the 6 report genuine high-end/fine-dining trends: techniques, formats, sourcing philosophies, or flavor directions serious kitchens are pursuing right now. Ground these in real culinary movement, not speculation or generic food-blog language.
- Exactly 1 of the 6 is the "Viral Bridge" card — the single most significant trend that has broken into mainstream/viral popularity. Frame it as an opportunity: how could an ambitious kitchen build a credible, elevated version of it to draw in new guests, without chasing the trend wholesale? Set "isViralBridge": true on this card only; false on every other card.
- "headline" is under 10 words, no ending punctuation.
- "description" is 2-3 sentences, specific and concrete.
- "category" is exactly one of: "Technique", "Ingredient", "Sourcing", "Format", "Hospitality", "Flavor".

Rules for "pricingTrends":
- Return 5 to 8 items.
- "item" is a plain ingredient or category name (e.g. "Olive oil", "Wild-caught salmon").
- "direction" is "up" or "down".
- "movement" is "short-term" (a weather event, a temporary supply hiccup) or "structural" (a lasting shift — tariffs, climate, demand shift).
- "note" is one short sentence explaining why, in plain language.

This is editorial commentary for a chef's own awareness only — not sourced from live market data, and never tied to this restaurant's actual pantry, ingredient costs, or invoices.`;

/** Defensive normalization — the AI is asked for exactly one Viral Bridge
 * card, but the UI invariant is enforced here rather than trusted blindly. */
const normalizeTrendResponse = (parsed: any): { cards: TrendCard[]; pricingTrends: PricingTrendItem[] } => {
  const rawCards = Array.isArray(parsed?.cards) ? parsed.cards : [];
  let cards: TrendCard[] = rawCards
    .filter((c: any) => c && typeof c.headline === 'string' && c.headline.trim() && typeof c.description === 'string' && c.description.trim())
    .map((c: any) => ({
      headline: c.headline.trim(),
      description: c.description.trim(),
      category: TREND_CATEGORIES.includes(c.category) ? c.category : 'Technique',
      isViralBridge: c.isViralBridge === true,
    }));

  const bridgeCount = cards.filter(c => c.isViralBridge).length;
  if (bridgeCount === 0 && cards.length > 0) {
    cards = cards.map((c, i) => i === cards.length - 1 ? { ...c, isViralBridge: true } : c);
  } else if (bridgeCount > 1) {
    let seen = false;
    cards = cards.map(c => {
      if (c.isViralBridge && !seen) { seen = true; return c; }
      return { ...c, isViralBridge: false };
    });
  }

  const rawPricing = Array.isArray(parsed?.pricingTrends) ? parsed.pricingTrends : [];
  const pricingTrends: PricingTrendItem[] = rawPricing
    .filter((p: any) =>
      p && typeof p.item === 'string' && p.item.trim() &&
      (p.direction === 'up' || p.direction === 'down') &&
      (p.movement === 'short-term' || p.movement === 'structural') &&
      typeof p.note === 'string' && p.note.trim())
    .map((p: any) => ({ item: p.item.trim(), direction: p.direction, movement: p.movement, note: p.note.trim() }));

  return { cards, pricingTrends };
};

interface TrendCitation { url: string; title: string }

/** Only ever reads citations the API attached from real search results —
 * never trusts model-written URLs, same principle as the Google-search
 * fallback in components/testkitchen/trendsDisplay.ts. */
const extractCitations = (content: any[]): TrendCitation[] => {
  const seen = new Map<string, string>();
  for (const block of content ?? []) {
    if (block?.type === 'text') {
      for (const c of block.citations ?? []) {
        if (c?.url && !seen.has(c.url)) seen.set(c.url, c.title || c.url);
      }
    }
  }
  return [...seen.entries()].map(([url, title]) => ({ url, title }));
};

const TREND_VERIFY_SYSTEM_PROMPT = `You are fact-checking one culinary trend claim before it ships in a fine-dining trend briefing. Use web search to look for real, current, specific coverage — trade press, chef interviews, restaurant reviews, industry publications — that genuinely supports this exact claim.

If you find genuine supporting coverage, confirm it in one short sentence. If you find nothing that specifically supports this claim, say plainly that no supporting coverage was found. Never stretch a tangential or unrelated result into support, and never fabricate a source.`;

/** Verify pass: drops any card with no supporting search citation. Never
 * pads an unverified trend back in to hit a target count. */
const verifyTrendCard = async (card: TrendCard): Promise<TrendCard | null> => {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAiAuthHeader()) },
      body: JSON.stringify({
        max_tokens: 1024,
        system: TREND_VERIFY_SYSTEM_PROMPT,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: `Trend claim: "${card.headline}" — ${card.description}` }],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const citations = extractCitations(data.content);
    if (citations.length === 0) return null;
    return { ...card, sourceUrl: citations[0].url, sourceName: citations[0].title };
  } catch {
    return null;
  }
};

// ===================================================================
// SEASONAL MATRIX — display helpers/constants live in
// components/testkitchen/trendsDisplay.ts and TrendsFullReport.tsx now;
// this file only needs the pure date-window check below for deriving
// comingSoon.
// ===================================================================

const isStartingWithinWeeks = (item: SeasonalItemForRegion, currentMonth: number, weeks: number): boolean => {
  const monthsAhead = Math.ceil(weeks / 4.345);
  for (let i = 1; i <= monthsAhead; i++) {
    const m = ((currentMonth - 1 + i) % 12) + 1;
    if (item.rampUp.includes(m) || item.prime.includes(m)) return true;
  }
  return false;
};

// ===================================================================
// TRENDS — HISTORY + WEEKLY CADENCE
// ===================================================================

const TREND_HISTORY_CAP = 12;
const TREND_STALE_MS = 7 * 24 * 60 * 60 * 1000;

/** Keeps only the 12 most recent dated reports — runs after every
 * successful refresh so history never grows unbounded. */
const pruneTrendHistory = async (restaurantId: string) => {
  const snap = await getDocs(rCollection(restaurantId, 'trend_reports'));
  const dated = snap.docs.filter(d => d.id !== 'latest').sort((a, b) => b.id.localeCompare(a.id));
  const stale = dated.slice(TREND_HISTORY_CAP);
  await Promise.all(stale.map(d => deleteDoc(d.ref)));
};

// ===================================================================
// MAIN VIEW
// ===================================================================

interface TestKitchenHubProps {
  unitSystem: UnitSystem;
  onOpenRecipe: (recipeId: string) => void;
}

export default function TestKitchenHub({ unitSystem, onOpenRecipe }: TestKitchenHubProps) {
  const restaurantId = useRestaurantId();
  const restaurantProfile = useKitchenSelector((s: any) => s.restaurantProfile) as RestaurantProfile | null;
  const trendReport = useKitchenSelector((s: any) => s.trendReport) as TrendReport | null;
  const trendReportLoaded = useKitchenSelector((s: any) => s.trendReportLoaded) as boolean;

  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [seasonalExpanded, setSeasonalExpanded] = useState(false);
  const [historyReports, setHistoryReports] = useState<{ id: string; report: TrendReport }[]>([]);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const autoRefreshTriggeredRef = useRef(false);

  const region = regionForState(restaurantProfile?.state);
  const seasonalItems = useMemo(() => itemsForRegion(region), [region]);
  const currentMonth = new Date().getMonth() + 1;
  const inSeasonNow = useMemo(() => seasonalItems.filter(i => monthStatus(i, currentMonth) !== null), [seasonalItems, currentMonth]);
  const comingSoon = useMemo(
    () => seasonalItems.filter(i => monthStatus(i, currentMonth) === null && isStartingWithinWeeks(i, currentMonth, 8)),
    [seasonalItems, currentMonth],
  );

  const handleRefreshTrends = async () => {
    if (trendsLoading) return;
    setTrendsLoading(true);
    setTrendsError(null);
    try {
      const raw = await callAi(
        withRegionContext(TRENDS_SYSTEM_PROMPT, restaurantProfile),
        'Give me the current culinary trend briefing.',
        2500,
      );
      const parsed = parseAiJson(raw);
      const { cards: draftCards, pricingTrends } = normalizeTrendResponse(parsed);
      if (draftCards.length === 0) throw new Error('The AI did not return any trend cards. Try again.');

      // VERIFY PASS: each drafted trend must clear a web-search-grounded
      // check before it ships. Unverified trends are dropped — the report
      // may end up with fewer than 6 cards, or none; never padded back in.
      const verified = (await Promise.all(draftCards.map(verifyTrendCard)))
        .filter((c): c is TrendCard => c !== null);

      const report: TrendReport = { generatedAt: new Date().toISOString(), cards: verified, pricingTrends };
      // Dated doc preserves history; 'latest' keeps existing readers working.
      await setDoc(rDoc(restaurantId, 'trend_reports', todayDateKey()), report);
      await setDoc(rDoc(restaurantId, 'trend_reports', 'latest'), report);
      await pruneTrendHistory(restaurantId);
    } catch (e: any) {
      setTrendsError(e?.message || 'Could not refresh trends. Try again.');
    } finally {
      setTrendsLoading(false);
    }
  };

  // Weekly cadence: check once per mount whether the latest report is
  // missing or stale, and trigger a background refresh if so. The ref
  // guard ensures this can only fire once per mount — never double-
  // triggers even if trendReport updates again afterwards (e.g. from the
  // refresh this same effect just kicked off).
  useEffect(() => {
    if (!trendReportLoaded || autoRefreshTriggeredRef.current) return;
    autoRefreshTriggeredRef.current = true;
    const isStale = !trendReport || (Date.now() - new Date(trendReport.generatedAt).getTime()) > TREND_STALE_MS;
    if (isStale) handleRefreshTrends();
  }, [trendReportLoaded]);

  // Keeps the "Previous weeks" list current — refetches after every
  // successful refresh writes a new dated doc. Read-only: never writes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(rCollection(restaurantId, 'trend_reports'));
        const dated = snap.docs
          .filter(d => d.id !== 'latest')
          .map(d => ({ id: d.id, report: d.data() as TrendReport }))
          .sort((a, b) => b.id.localeCompare(a.id));
        if (!cancelled) setHistoryReports(dated);
      } catch {
        // History is a nice-to-have; a failed fetch just leaves the list empty.
      }
    })();
    return () => { cancelled = true; };
  }, [trendReport, restaurantId]);

  const displayedReport = viewingHistoryId
    ? historyReports.find(h => h.id === viewingHistoryId)?.report ?? null
    : trendReport;

  const bridgeCard = displayedReport?.cards.find(c => c.isViralBridge);
  const regularCards = displayedReport?.cards.filter(c => !c.isViralBridge) ?? [];

  return (
    <div className="max-w-[1597px] mx-auto px-[21px] py-[34px] font-body">
      <div className="border-b border-line pb-[21px]">
        <h1 className="text-xl font-display font-bold tracking-tight text-navy">Development</h1>
        <p className="text-xs text-slate mt-[5px]">Trend intelligence, seasonality, and a dish description that becomes a working recipe draft</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-[21px] mt-[21px] h-[610px]">
        {/* LEFT: Reference rail — compact trends/pricing/seasonal, expand-in-place, full report one click away */}
        <div className="lg:col-span-1 h-full min-h-0">
          <TrendsReferenceRail
            displayedReport={displayedReport}
            trendReportLoaded={trendReportLoaded}
            trendsLoading={trendsLoading}
            trendsError={trendsError}
            onDismissError={() => setTrendsError(null)}
            historyReports={historyReports}
            viewingHistoryId={viewingHistoryId}
            onSelectHistory={setViewingHistoryId}
            seasonalExpanded={seasonalExpanded}
            onToggleSeasonalExpanded={() => setSeasonalExpanded(x => !x)}
            region={region}
            seasonalItems={seasonalItems}
            currentMonth={currentMonth}
            inSeasonNow={inSeasonNow}
            comingSoon={comingSoon}
            hasProfileState={!!restaurantProfile?.state}
            bridgeCard={bridgeCard}
            regularCards={regularCards}
          />
        </div>

        {/* RIGHT: Recipe Build — dish-description intake through hand-off, one panel */}
        <div className="lg:col-span-3 h-full min-h-0">
          <DishBuildPanel unitSystem={unitSystem} onOpenRecipe={onOpenRecipe} />
        </div>
      </div>
    </div>
  );
}
