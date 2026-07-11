import type { RestaurantProfile } from '../types';

/**
 * Builds a compact context block from the restaurant profile for injection
 * into /api/ai system prompts. Returns '' when the profile is missing or
 * has nothing worth surfacing — callers must treat that as "no context,"
 * not prepend an empty block, so every AI feature still works with zero
 * profile data.
 */
export const buildRegionContext = (profile: RestaurantProfile | null | undefined): string => {
  if (!profile) return '';
  const lines: string[] = [];
  if (profile.name) lines.push(`Restaurant: ${profile.name}`);
  if (profile.cuisineStyle) lines.push(`Cuisine style: ${profile.cuisineStyle}`);
  if (profile.pricePoint) lines.push(`Price point: ${profile.pricePoint}`);
  const location = [profile.city, profile.state].filter(Boolean).join(', ');
  if (location) lines.push(`Location: ${location}`);
  if (profile.regionalNotes) lines.push(`Regional context: ${profile.regionalNotes}`);
  if (lines.length === 0) return '';
  return `Restaurant context:\n${lines.join('\n')}`;
};

/** Prepends the region context block to a base system prompt, or returns
 * the base prompt unchanged when there's no context to add. */
export const withRegionContext = (basePrompt: string, profile: RestaurantProfile | null | undefined): string => {
  const region = buildRegionContext(profile);
  return region ? `${region}\n\n${basePrompt}` : basePrompt;
};
