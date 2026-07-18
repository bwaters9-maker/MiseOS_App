/**
 * Static seasonal produce/protein reference by US region, keyed off
 * RestaurantProfile.state. General chef-knowledge seasonality (not
 * transcribed from a single cited source, unlike yieldReference.ts) —
 * a planning aid, not a precise agricultural record. Same no-runtime-calls
 * pattern as yieldReference.ts: versioned static data, no live feeds.
 *
 * Northeast windows chef-verified 2026-07-17 (Brian Waters) against the
 * printed Seasonal Sourcing Calendar; other regions remain general
 * chef-knowledge pending their own verification pass.
 *
 * Each item's window is per-region since the same crop peaks at different
 * times across the country. Months are 1-12. rampUp/prime/tailOff can wrap
 * the year boundary (e.g. citrus prime [12, 1, 2]) — consumers should test
 * month membership directly rather than treating the arrays as ranges.
 */

export type SeasonalRegion = 'Northeast' | 'Southeast' | 'Midwest' | 'Southwest' | 'West';

export const DEFAULT_REGION: SeasonalRegion = 'Northeast';

interface RegionWindow {
  rampUp: number[];
  prime: number[];
  tailOff: number[];
}

export interface SeasonalItem {
  name: string;
  type: 'produce' | 'protein';
  regions: Partial<Record<SeasonalRegion, RegionWindow>>;
}

export interface SeasonalItemForRegion {
  name: string;
  type: 'produce' | 'protein';
  rampUp: number[];
  prime: number[];
  tailOff: number[];
}

export const SEASONAL_DATA: SeasonalItem[] = [
  {
    name: 'Asparagus', type: 'produce',
    regions: {
      Northeast: { rampUp: [4], prime: [5], tailOff: [6] },
      Southeast: { rampUp: [3], prime: [4], tailOff: [5] },
      Midwest: { rampUp: [4], prime: [5], tailOff: [6] },
      Southwest: { rampUp: [3], prime: [4], tailOff: [5] },
      West: { rampUp: [3], prime: [4], tailOff: [5] },
    },
  },
  {
    name: 'Ramps', type: 'produce',
    regions: {
      Northeast: { rampUp: [4], prime: [4], tailOff: [5] },
      Midwest: { rampUp: [4], prime: [4], tailOff: [5] },
    },
  },
  {
    name: 'Rhubarb', type: 'produce',
    regions: {
      Northeast: { rampUp: [4], prime: [5], tailOff: [6] },
      Midwest: { rampUp: [4], prime: [5], tailOff: [6] },
    },
  },
  {
    name: 'Fiddlehead Ferns', type: 'produce',
    regions: {
      Northeast: { rampUp: [4], prime: [5], tailOff: [5] },
    },
  },
  {
    name: 'Strawberries', type: 'produce',
    regions: {
      Northeast: { rampUp: [], prime: [6], tailOff: [7] },
      Southeast: { rampUp: [3], prime: [4], tailOff: [5] },
      Midwest: { rampUp: [5], prime: [6], tailOff: [7] },
      Southwest: { rampUp: [3], prime: [4], tailOff: [5] },
      West: { rampUp: [4], prime: [5], tailOff: [6] },
    },
  },
  {
    name: 'Sweet Corn', type: 'produce',
    regions: {
      Northeast: { rampUp: [7], prime: [8], tailOff: [9] },
      Southeast: { rampUp: [5], prime: [6], tailOff: [7] },
      Midwest: { rampUp: [7], prime: [8], tailOff: [9] },
      Southwest: { rampUp: [6], prime: [7], tailOff: [8] },
      West: { rampUp: [6], prime: [7], tailOff: [8] },
    },
  },
  {
    name: 'Heirloom Tomatoes', type: 'produce',
    regions: {
      Northeast: { rampUp: [7], prime: [8], tailOff: [9] },
      Southeast: { rampUp: [5], prime: [6], tailOff: [7] },
      Midwest: { rampUp: [7], prime: [8], tailOff: [9] },
      Southwest: { rampUp: [6], prime: [7], tailOff: [8] },
      West: { rampUp: [6], prime: [7], tailOff: [8] },
    },
  },
  {
    name: 'Zucchini & Summer Squash', type: 'produce',
    regions: {
      Northeast: { rampUp: [6], prime: [7, 8], tailOff: [9] },
      Southeast: { rampUp: [5], prime: [6], tailOff: [7] },
      Midwest: { rampUp: [6], prime: [7], tailOff: [8] },
      Southwest: { rampUp: [5], prime: [6], tailOff: [7] },
      West: { rampUp: [5], prime: [6], tailOff: [7] },
    },
  },
  {
    name: 'Green Beans', type: 'produce',
    regions: {
      Northeast: { rampUp: [6], prime: [7, 8], tailOff: [9] },
      Southeast: { rampUp: [5], prime: [6], tailOff: [7] },
      Midwest: { rampUp: [6], prime: [7], tailOff: [8] },
    },
  },
  {
    name: 'Blueberries', type: 'produce',
    regions: {
      Northeast: { rampUp: [6], prime: [7], tailOff: [8] },
      Southeast: { rampUp: [5], prime: [6], tailOff: [6] },
      Midwest: { rampUp: [7], prime: [7], tailOff: [8] },
      West: { rampUp: [6], prime: [7], tailOff: [8] },
    },
  },
  {
    name: 'Sweet Cherries', type: 'produce',
    regions: {
      Northeast: { rampUp: [6], prime: [7], tailOff: [7] },
      Midwest: { rampUp: [6], prime: [7], tailOff: [7] },
      West: { rampUp: [5], prime: [6], tailOff: [7] },
    },
  },
  {
    name: 'Stone Fruit — Peaches & Plums', type: 'produce',
    regions: {
      Northeast: { rampUp: [7], prime: [8], tailOff: [9] },
      Southeast: { rampUp: [5], prime: [6], tailOff: [7] },
      Southwest: { rampUp: [6], prime: [7], tailOff: [8] },
      West: { rampUp: [6], prime: [7], tailOff: [8] },
    },
  },
  {
    name: 'Sweet Peppers', type: 'produce',
    regions: {
      Northeast: { rampUp: [7], prime: [8, 9], tailOff: [10] },
      Southeast: { rampUp: [6], prime: [7], tailOff: [8] },
      Midwest: { rampUp: [7], prime: [8], tailOff: [9] },
      Southwest: { rampUp: [6], prime: [7], tailOff: [8] },
      West: { rampUp: [6], prime: [7], tailOff: [8] },
    },
  },
  {
    name: 'Eggplant', type: 'produce',
    regions: {
      Northeast: { rampUp: [7], prime: [8], tailOff: [9] },
      Southeast: { rampUp: [6], prime: [7], tailOff: [8] },
      Southwest: { rampUp: [6], prime: [7], tailOff: [8] },
    },
  },
  {
    name: 'Winter Squash — Butternut, Acorn, Kabocha', type: 'produce',
    regions: {
      Northeast: { rampUp: [9], prime: [10, 11], tailOff: [12] },
      Southeast: { rampUp: [9], prime: [10], tailOff: [11] },
      Midwest: { rampUp: [9], prime: [10], tailOff: [11] },
      West: { rampUp: [9], prime: [10], tailOff: [11] },
    },
  },
  {
    name: 'Apples', type: 'produce',
    regions: {
      Northeast: { rampUp: [8], prime: [9, 10], tailOff: [11] },
      Midwest: { rampUp: [9], prime: [10], tailOff: [11] },
      West: { rampUp: [8], prime: [9], tailOff: [10] },
    },
  },
  {
    name: 'Brussels Sprouts', type: 'produce',
    regions: {
      Northeast: { rampUp: [9], prime: [10, 11], tailOff: [12] },
      Midwest: { rampUp: [10], prime: [11], tailOff: [12] },
      West: { rampUp: [10], prime: [11], tailOff: [12] },
    },
  },
  {
    name: 'Root Vegetables — Beets, Carrots, Turnips', type: 'produce',
    regions: {
      Northeast: { rampUp: [7, 8], prime: [9, 10], tailOff: [11] },
      Southeast: { rampUp: [10], prime: [11], tailOff: [12] },
      Midwest: { rampUp: [9], prime: [10], tailOff: [11] },
      Southwest: { rampUp: [10], prime: [11], tailOff: [12] },
      West: { rampUp: [9], prime: [10], tailOff: [11] },
    },
  },
  {
    name: 'Citrus — Meyer Lemon, Blood Orange', type: 'produce',
    regions: {
      Southeast: { rampUp: [12], prime: [1], tailOff: [2] },
      Southwest: { rampUp: [12], prime: [1], tailOff: [2] },
      West: { rampUp: [12], prime: [1], tailOff: [3] },
    },
  },
  {
    name: 'Soft-Shell Crab', type: 'protein',
    regions: {
      Northeast: { rampUp: [], prime: [5, 6], tailOff: [7, 8, 9] },
      Southeast: { rampUp: [4], prime: [5], tailOff: [6] },
    },
  },
  {
    name: 'Stone Crab', type: 'protein',
    regions: {
      Southeast: { rampUp: [10], prime: [11], tailOff: [3] },
    },
  },
  {
    name: 'Dungeness Crab', type: 'protein',
    regions: {
      West: { rampUp: [11], prime: [12], tailOff: [1] },
    },
  },
  {
    name: 'Venison', type: 'protein',
    regions: {
      Northeast: { rampUp: [10], prime: [11], tailOff: [12] },
      Midwest: { rampUp: [10], prime: [11], tailOff: [12] },
    },
  },
  {
    name: 'Wild Mushrooms — Chanterelle', type: 'produce',
    regions: {
      Northeast: { rampUp: [7], prime: [8], tailOff: [9] },
      Midwest: { rampUp: [9], prime: [10], tailOff: [11] },
      West: { rampUp: [10], prime: [11], tailOff: [12] },
    },
  },
];

const STATE_TO_REGION: Record<string, SeasonalRegion> = {
  CT: 'Northeast', ME: 'Northeast', MA: 'Northeast', NH: 'Northeast', RI: 'Northeast',
  VT: 'Northeast', NJ: 'Northeast', NY: 'Northeast', PA: 'Northeast',
  DE: 'Southeast', FL: 'Southeast', GA: 'Southeast', MD: 'Southeast', NC: 'Southeast',
  SC: 'Southeast', VA: 'Southeast', WV: 'Southeast', DC: 'Southeast',
  AL: 'Southeast', KY: 'Southeast', MS: 'Southeast', TN: 'Southeast', LA: 'Southeast', AR: 'Southeast',
  IL: 'Midwest', IN: 'Midwest', MI: 'Midwest', OH: 'Midwest', WI: 'Midwest',
  IA: 'Midwest', KS: 'Midwest', MN: 'Midwest', MO: 'Midwest', NE: 'Midwest',
  ND: 'Midwest', SD: 'Midwest',
  AZ: 'Southwest', NM: 'Southwest', OK: 'Southwest', TX: 'Southwest',
  CO: 'Southwest', UT: 'Southwest', NV: 'Southwest',
  AK: 'West', CA: 'West', HI: 'West', OR: 'West', WA: 'West',
  ID: 'West', MT: 'West', WY: 'West',
};

/** Falls back to Northeast when the profile has no state set, or the state
 * code isn't recognized. */
export const regionForState = (stateCode: string | undefined): SeasonalRegion =>
  (stateCode && STATE_TO_REGION[stateCode]) || DEFAULT_REGION;

export const itemsForRegion = (region: SeasonalRegion): SeasonalItemForRegion[] =>
  SEASONAL_DATA
    .filter(i => i.regions[region])
    .map(i => ({ name: i.name, type: i.type, ...i.regions[region]! }))
    .sort((a, b) => a.name.localeCompare(b.name));
