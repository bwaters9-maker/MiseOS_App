import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, RefreshCw, Send, AlertCircle, ExternalLink, Flame, TrendingUp, TrendingDown, ChevronDown, CalendarDays, Printer } from 'lucide-react';
import PlateDesigner from './components/testKitchen/PlateDesigner';
import { SOUS_SYSTEM_PROMPT } from './lib/sousPersona';
import { withRegionContext } from './lib/regionContext';
import { callAi, parseAiJson, getAiAuthHeader } from './lib/ai';
import { todayDateKey } from './utils';
import { useKitchenSelector } from './components/KitchenStateContext';
import { useRestaurantId } from './components/AuthContext';
import { setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { rCollection, rDoc } from './lib/firestorePaths';
import { regionForState, itemsForRegion, type SeasonalItemForRegion } from './lib/seasonalData';
import { APP_NAME, APP_TAGLINE, APP_SHORT_DESC } from './lib/appParams';
import type { RestaurantProfile, TrendReport, TrendCard, PricingTrendItem } from './types';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const MarkdownContent = ({ content }: { content: string }) => (
  <div className="text-xs whitespace-pre-wrap font-body leading-relaxed text-navy">{content}</div>
);

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

const searchUrlFor = (headline: string) => `https://www.google.com/search?q=${encodeURIComponent(headline)}`;

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
 * never trusts model-written URLs, same principle as searchUrlFor below. */
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

const CATEGORY_STYLE: Record<string, string> = {
  Technique: 'text-teal border-teal/30 bg-teal/10',
  Ingredient: 'text-saffron-text border-saffron/40 bg-saffron-soft',
  Sourcing: 'text-navy border-navy/20 bg-navy/5',
  Format: 'text-slate border-slate/30 bg-slate/10',
  Hospitality: 'text-teal border-teal/30 bg-teal/10',
  Flavor: 'text-saffron-text border-saffron/40 bg-saffron-soft',
};

const formatReportDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// ===================================================================
// SEASONAL MATRIX
// ===================================================================

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type SeasonStatus = 'rampUp' | 'prime' | 'tailOff' | null;

const monthStatus = (item: SeasonalItemForRegion, month: number): SeasonStatus => {
  if (item.prime.includes(month)) return 'prime';
  if (item.rampUp.includes(month)) return 'rampUp';
  if (item.tailOff.includes(month)) return 'tailOff';
  return null;
};

const STATUS_LABEL: Record<Exclude<SeasonStatus, null>, string> = {
  rampUp: 'Ramping Up', prime: 'Prime', tailOff: 'Tail End',
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

const MONTH_SEASON = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter'];

const SEASON_CHIP_STYLE: Record<string, React.CSSProperties> = {
  winter: { background: '#D6EAF3', color: '#2C6E8F' },
  spring: { background: '#DFF0D0', color: '#4A7A2A' },
  summer: { background: '#FBEFC8', color: '#A07617' },
  fall: { background: '#F9E0D4', color: '#A5522B' },
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

const SEASON_GREEN = '#8FAE7C';
const SEASON_GOLD = '#C99A3C';
const SEASON_OFF = '#ECE5D2';

const seasonCellStyle = (status: SeasonStatus): React.CSSProperties => {
  const base: React.CSSProperties = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties;
  if (status === 'prime') return { ...base, backgroundColor: SEASON_GOLD };
  if (status === 'rampUp' || status === 'tailOff') return { ...base, backgroundColor: SEASON_GREEN };
  return { ...base, backgroundColor: SEASON_OFF };
};

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

const formatHistoryLabel = (dateKey: string): string => {
  const d = new Date(`${dateKey}T00:00:00`);
  if (isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

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

export default function TestKitchenHub() {
  const restaurantId = useRestaurantId();
  const restaurantProfile = useKitchenSelector((s: any) => s.restaurantProfile) as RestaurantProfile | null;
  const trendReport = useKitchenSelector((s: any) => s.trendReport) as TrendReport | null;
  const trendReportLoaded = useKitchenSelector((s: any) => s.trendReportLoaded) as boolean;
  const [activeSubTab, setActiveSubTab] = useState<'trends' | 'optimizer'>('trends');
  const [userInput, setUserInput] = useState('');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewSession = () => {
    setMessages([]);
    setSessionError(null);
    setUserInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isGenerating) return;
    setIsGenerating(true);
    setSessionError(null);
    const userMessage: Message = { role: 'user', content: userInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setUserInput('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAiAuthHeader()),
        },
        body: JSON.stringify({
          max_tokens: 2048,
          system: withRegionContext(SOUS_SYSTEM_PROMPT, restaurantProfile),
          messages: updatedMessages.map(msg => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.content,
          })),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', content: data.content[0]?.text || 'No response received.' }]);
    } catch (error: any) {
      setSessionError(error.message || 'An error occurred while communicating with the AI.');
    } finally {
      setIsGenerating(false);
    }
  };

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
      <div className="border-b border-line pb-[21px] flex flex-col sm:flex-row justify-between items-start sm:items-end gap-[21px]">
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight text-navy">Test Kitchen</h1>
          <p className="text-xs text-slate mt-[5px]">Develop new dishes with real-time AI assistance</p>
        </div>
        <div className="flex gap-[3px] bg-bg-cool p-[3px] rounded-tile border border-line">
          <button onClick={() => setActiveSubTab('trends')} className={`px-[13px] py-[8px] text-xs font-bold tracking-tight rounded-card transition-colors duration-[144ms] ${activeSubTab === 'trends' ? 'bg-surface text-navy shadow-sm' : 'bg-transparent text-slate hover:text-navy'}`}>Culinary Trends & Forecasts</button>
          <button onClick={() => setActiveSubTab('optimizer')} className={`px-[13px] py-[8px] text-xs font-bold tracking-tight rounded-card transition-colors duration-[144ms] flex items-center gap-[8px] ${activeSubTab === 'optimizer' ? 'bg-surface text-navy shadow-sm' : 'bg-transparent text-slate hover:text-navy'}`}><Sparkles className="w-3.5 h-3.5" /> The Menu Development Playground</button>
        </div>
      </div>

      {activeSubTab === 'trends' && (
        <div className="space-y-[34px] mt-[21px]">

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
                  onChange={e => setViewingHistoryId(e.target.value || null)}
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
                onClick={() => setViewingHistoryId(null)}
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
              <button onClick={() => setTrendsError(null)} className="text-[10px] font-bold uppercase text-slate hover:text-navy px-[8px] py-[3px] rounded-[5px] border border-line">Dismiss</button>
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
                  {region} region{!restaurantProfile?.state && ' — no state set in Restaurant Profile, defaulting to Northeast'}. Static reference, not a live feed.
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
                  onClick={() => setSeasonalExpanded(x => !x)}
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
      )}

      {activeSubTab === 'optimizer' && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* LEFT COLUMN, FULL HEIGHT: existing chat — relocated, logic untouched */}
            <div className="lg:col-span-1 lg:self-stretch flex flex-col gap-4">
              <div className="bg-surface border border-line rounded-card p-5 flex-1 min-h-[350px] flex flex-col justify-between">
                <div className="flex justify-between items-center border-b border-line pb-3">
                  {/* "Chef Matthew" is a placeholder persona name pending a future onboarding customization setting */}
                  <div className="text-xs font-bold uppercase tracking-widest text-navy">Chef Matthew — Sous Chef</div>
                  <button onClick={handleNewSession} className="text-[10px] font-bold uppercase text-slate hover:text-navy flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> New Session
                  </button>
                </div>
                <div ref={chatContainerRef} className="flex-1 p-4 my-4 overflow-y-auto h-96">
                  {messages.length === 0 && !isGenerating ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <p className="text-xs text-slate max-w-md leading-relaxed">Brainstorm and develop brand-new dishes from scratch. Get AI guidance on trending ingredients, flavor pairings, and precise menu costing adjustments.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'model' && <div className="w-6 h-6 rounded-full bg-teal/15 flex items-center justify-center text-teal shrink-0"><Sparkles className="w-3.5 h-3.5" /></div>}
                          <div className={`max-w-xl p-3 rounded-card text-navy ${msg.role === 'user' ? 'bg-bg-cool' : 'bg-surface border border-line'}`}>
                            <MarkdownContent content={msg.content} />
                          </div>
                        </div>
                      ))}
                      {isGenerating && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-6 h-6 rounded-full bg-teal/15 flex items-center justify-center text-teal shrink-0"><Sparkles className="w-3.5 h-3.5" /></div>
                          <div className="p-3"><span className="animate-pulse text-slate">...</span></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="pt-3">
                  <div className="relative">
                    <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Describe a dish concept you want to develop..." className="w-full bg-bg-cool border border-line p-3.5 pr-12 rounded-card text-xs focus:outline-none focus:border-teal text-navy placeholder:text-slate/60 font-body disabled:opacity-50" disabled={isGenerating} />
                    <button type="submit" disabled={isGenerating} className="absolute right-3 top-3 text-slate hover:text-teal transition-colors disabled:opacity-50"><Send className="w-4 h-4" /></button>
                  </div>
                </form>
              </div>
              {sessionError && (
                <div className="bg-surface border border-red-400 rounded-card p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2.5 text-red-400 text-xs font-bold"><AlertCircle className="w-4 h-4 shrink-0" /><span>{sessionError}</span></div>
                  <button onClick={() => setSessionError(null)} className="text-[9px] uppercase font-bold text-slate hover:text-navy px-2 py-1 rounded border border-line">Clear Status</button>
                </div>
              )}
            </div>

            {/* CENTER: Plate Design — largest zone, contains Ingredient Palette sub-section */}
            <div className="lg:col-span-2">
              <div className="bg-surface border border-line rounded-card p-5 min-h-[610px] flex flex-col">
                <div className="border-b border-line pb-3 mb-4">
                  <p className="text-[10px] text-slate uppercase tracking-wider">Working Dish</p>
                  <h2 className="text-lg font-display font-bold text-navy">Untitled Dish</h2>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <PlateDesigner />
                  </div>
                  <div className="md:col-span-1 bg-bg-cool border border-line rounded-card p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate mb-2">Ingredient Palette</h3>
                    <p className="text-xs text-slate leading-relaxed italic">Placeholder — a searchable ingredient palette will live here in a later phase.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Trends (top) + Recipe Build (below) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-surface border border-line rounded-card p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-navy border-b border-line pb-2 mb-3">Trends for This Dish</h3>
                <p className="text-xs text-slate leading-relaxed">Placeholder — dish-specific trend signals will surface here in a later phase.</p>
              </div>
              <div className="bg-surface border border-line rounded-card p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-navy border-b border-line pb-2">Recipe Build</h3>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Yield</p>
                  <p className="text-xs text-slate italic">Not yet specified.</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Ingredients</p>
                  <p className="text-xs text-slate italic">No ingredients added yet.</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Method</p>
                  <p className="text-xs text-slate italic">No method steps yet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
