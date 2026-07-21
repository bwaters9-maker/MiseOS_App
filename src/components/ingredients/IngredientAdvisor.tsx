import React, { useState } from 'react';
import { Compass, X, Search, ExternalLink, AlertTriangle } from 'lucide-react';
import { useKitchenSelector } from '../KitchenStateContext';
import { withRegionContext } from '../../lib/regionContext';
import { ADVISOR_SYSTEM_PROMPT } from '../../lib/advisorPersona';
import { getAiAuthHeader, AI_SIGNED_OUT_MESSAGE } from '../../lib/ai';
import type { RestaurantProfile } from '../../types';

interface SourceLink {
  url: string;
  title: string;
}

interface AdvisorResult {
  text: string;
  sources: SourceLink[];
}

const extractResult = (content: any[]): AdvisorResult => {
  const parts: string[] = [];
  const sources = new Map<string, string>();
  for (const block of content ?? []) {
    if (block?.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text);
      for (const c of block.citations ?? []) {
        if (c?.url && !sources.has(c.url)) sources.set(c.url, c.title || c.url);
      }
    }
  }
  return {
    text: parts.join('').trim(),
    sources: [...sources.entries()].map(([url, title]) => ({ url, title })),
  };
};

interface IngredientAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const IngredientAdvisor: React.FC<IngredientAdvisorProps> = ({ isOpen, onClose, initialQuery }) => {
  const restaurantProfile = useKitchenSelector((s: any) => s.restaurantProfile) as RestaurantProfile | null;
  const [query, setQuery] = useState('');
  const [askedFor, setAskedFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [seededFrom, setSeededFrom] = useState<string | undefined>(undefined);

  if (!isOpen) return null;

  if (initialQuery !== seededFrom) {
    setSeededFrom(initialQuery);
    setQuery(initialQuery ?? '');
    setResult(null);
    setError(null);
    setAskedFor('');
  }

  const ask = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAskedFor(trimmed);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAiAuthHeader()) },
        body: JSON.stringify({
          max_tokens: 3000,
          system: withRegionContext(ADVISOR_SYSTEM_PROMPT, restaurantProfile),
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: `Ingredient brief: ${trimmed}` }],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) throw new Error(AI_SIGNED_OUT_MESSAGE);
        throw new Error(data.error?.message || `API error: ${response.status}`);
      }
      const extracted = extractResult(data.content);
      if (!extracted.text) throw new Error('No advisory text returned. Try again.');
      setResult(extracted);
    } catch (err: any) {
      setError(err.message || 'Advisor request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-[21px]">
      <div className="bg-surface border border-line rounded-card shadow-2xl w-full max-w-[780px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-[21px] py-[13px] border-b border-line shrink-0">
          <h2 className="text-sm font-display font-bold text-navy flex items-center gap-[8px]">
            <Compass className="w-4 h-4 text-teal" />
            Ingredient Advisor
          </h2>
          <button onClick={onClose} className="p-[5px] text-slate hover:text-navy transition-colors duration-[144ms]" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-[21px] py-[13px] border-b border-line shrink-0">
          <div className="flex items-center gap-[8px]">
            <div className="relative flex-1">
              <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 w-3 h-3 text-slate" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') ask(); }}
                placeholder="Ingredient name — e.g. ramps, yuzu kosho, dry-aged duck"
                className="w-full bg-bg-cool border border-line rounded-[8px] pl-[26px] pr-[8px] py-[8px] text-xs text-navy font-body focus:outline-none focus:border-teal placeholder-slate/60"
              />
            </div>
            <button
              onClick={ask}
              disabled={loading || !query.trim()}
              className="px-[13px] py-[8px] rounded-[8px] bg-navy text-cream text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 hover:opacity-90 transition-opacity duration-[144ms] whitespace-nowrap"
            >
              {loading ? 'Searching…' : 'Get Brief'}
            </button>
          </div>
        </div>

        <div className="px-[21px] py-[21px] overflow-y-auto flex-1">
          {loading && (
            <p className="text-xs text-slate">Searching current sources for {askedFor}…</p>
          )}
          {error && (
            <div className="flex items-start gap-[8px] bg-red-950/10 border border-red-400/40 rounded-[8px] px-[13px] py-[8px]">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-[2px] shrink-0" />
              <p className="text-[11px] text-red-400 leading-relaxed">{error}</p>
            </div>
          )}
          {!loading && !error && !result && (
            <p className="text-xs text-slate">
              Enter an ingredient to get a web-grounded brief: availability in your region, sourcing channels, and how it&apos;s showing up on menus right now.
            </p>
          )}
          {result && (
            <>
              <div className="text-xs text-navy font-body leading-relaxed whitespace-pre-wrap">{result.text}</div>
              {result.sources.length > 0 && (
                <div className="mt-[21px] pt-[13px] border-t border-line">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-[8px]">Sources</p>
                  <div className="flex flex-col gap-[5px]">
                    {result.sources.map(s => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-teal hover:underline flex items-center gap-[5px] break-all"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-[21px] py-[8px] border-t border-line shrink-0">
          <p className="text-[10px] text-slate">
            AI advisory grounded in web search — informational only. Verify availability and pricing with your vendor. Nothing here writes to the Master Pantry.
          </p>
        </div>
      </div>
    </div>
  );
};
