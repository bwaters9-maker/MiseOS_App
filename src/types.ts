/**
 * Represents a single task on the daily back-of-house prep checklist.
 * This type is also used for `ProductionRun` props in components.
 */
export interface PrepItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  assignedStation: 'Sauté' | 'Grill' | 'Garde Manger' | 'Pastry';
  priority: 'low' | 'medium' | 'high';
  par?: number;
  requires_temp_check?: boolean;
  station?: string;
  notes?: string;
  lastModified?: string;
  recipe_id?: string;
}

/**
 * A single component line within a recipe — either a Master Pantry ingredient
 * or another recipe used as a sub-recipe. `qty` is always in canonical base
 * units (g/ml/each) matching the referenced item's measureType.
 */
export interface RecipeLine {
  type: 'ingredient' | 'recipe';
  refId: string;
  /** Always canonical base units (g / ml / each), regardless of entryUnit. */
  qty: number;
  /**
   * 'each' when the chef entered this line by piece on a spec'd weight
   * ingredient (pieceWeightG) — qty still stores grams (pieces × spec).
   * Absent for normal weight/volume entry.
   */
  entryUnit?: 'each';
  note?: string;
}

/**
 * Represents a culinary recipe with dynamic scaling and cost analysis.
 * Sub-recipes are first-class: a line with type 'recipe' costs at that
 * recipe's cost per canonical base unit of its own batchYield.
 *
 * recipeType 'menu' is a finished, sellable plate (has menuPrice, full FC%
 * analysis). recipeType 'sub' is a component preparation (stock, sauce,
 * prep) — no menuPrice, and only 'sub' recipes may be referenced as a
 * RecipeLine inside another recipe. Menu recipes never nest.
 *
 * `onMenu` is independent of `recipeType` — whether a finished
 * (`recipeType: 'menu'`) recipe is *currently* offered, not whether it's
 * structurally capable of being offered. Recipes saved before this field
 * existed have no stored value; `isRecipeOnMenu` (costEngine.ts) treats a
 * missing value as `true` for menu-type recipes, so nothing already on the
 * menu silently disappears. Sub-recipes are never on the menu regardless.
 */
export interface Recipe {
  id: string;
  name: string;
  recipeType: 'sub' | 'menu';
  course: string;
  categoryId?: string;
  batchYield: { qty: number; measureType: MeasureType };
  portions: number;
  lines: RecipeLine[];
  methodSteps: string[];
  menuPrice?: number;
  menuDescription?: string;
  onMenu?: boolean;
  updatedAt: string;
}

/**
 * A chef-managed recipe category (Sides, Sauces, Salads, …), CRUD'd from
 * Settings the same way as station presets. `Recipe.categoryId` references
 * this by id; `Recipe.course` is kept in sync with the category's name at
 * save time as a denormalized display fallback for recipes saved before a
 * matching category existed or whose category was later deleted.
 */
export interface RecipeCategory {
  id: string;
  name: string;
}

/**
 * A seasonal grouping of menu recipes (`recipe_collections` collection),
 * managed from the Collections sub-tab in RecipesHub. At most one
 * collection is `active` at a time — activating one deactivates the rest
 * in a single batch write.
 *
 * When a collection is active it defines the menu set: `isRecipeOnMenu`
 * (costEngine.ts) requires membership in the active collection AND the
 * recipe's own `onMenu` toggle, so the per-recipe toggle survives as a
 * one-off off-switch within the season. With no active collection, menu
 * behavior is exactly the pre-collections `onMenu`-only rule.
 *
 * `recipeIds` may reference deleted recipes — stale ids are ignored at
 * read time, same "survives until re-saved" convention as deleted
 * categories.
 */
export interface RecipeCollection {
  id: string;
  name: string;
  recipeIds: string[];
  active: boolean;
}

/**
 * Test Kitchen Phase D — Plate Designer. A standalone visual layout tool,
 * not linked to Recipe / RecipeLine — no cost or nutrition implications.
 */
export type PlateShape = 'round-rimmed' | 'coupe' | 'bowl' | 'wide-rim-bowl' | 'rectangle' | 'square' | 'offset';

/**
 * 'sauceSmear' / 'sauceDots' are v1.0 sauce shapes — kept only so designs
 * saved before v1.1's technique registry (see sauceTechniques.tsx) keep
 * loading and rendering unchanged. Not offered in the palette anymore;
 * new sauce placements are always 'sauceTechnique'.
 */
export type PlateComponentType = 'protein' | 'starch' | 'vegetable' | 'sauceSmear' | 'sauceDots' | 'garnish' | 'sauceTechnique';

/**
 * One placed item on the plate. `x`/`y`/`scale`/`rotation` are all in the
 * canvas's own 0-400 SVG viewBox coordinate space, not screen pixels.
 */
export interface PlateComponent {
  id: string;
  type: PlateComponentType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  /** Stacking order — higher renders on top. Mutated by bring-forward/send-backward. */
  z: number;
  /** Required when type is 'sauceTechnique' — id into the SAUCE_TECHNIQUES registry. */
  techniqueId?: string;
  /**
   * For protein/starch/vegetable/garnish — id into that type's structure
   * registry (see plateStructures.tsx) when the chef picked a named
   * variant (e.g. "Seared Duck Breast") instead of the type's plain
   * default shape. Absent means "render the original default shape", so
   * every design saved before this existed is unaffected.
   */
  structureId?: string;
  /**
   * Per-instance color override (hex), set via the Selected Item panel's
   * color picker. Sauce techniques are the only type this is currently
   * editable for — real sauces vary far more in color than a protein or
   * starch does. Absent means "use the type's PLATE_COMPONENT_COLORS
   * default", so designs saved before this existed are unaffected.
   */
  color?: string;
}

export interface PlateDesign {
  id: string;
  /** Dish name — free text, same allowed exception as other name fields. */
  name: string;
  plateShape: PlateShape;
  components: PlateComponent[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Guest-facing menu print/preview styling choice, selected from the Menu
 * view's Guest Preview toggle. Persisted in the `RestaurantProfile` doc
 * (`menuTemplate`), migrated from an earlier App.tsx + localStorage scheme.
 */
export type MenuTemplate = 'classic' | 'clean';

export type CuisineStyle =
  | 'American' | 'Italian' | 'French' | 'Mexican' | 'Asian' | 'Mediterranean'
  | 'Steakhouse' | 'Seafood' | 'Farm-to-Table' | 'BBQ' | 'Pizza' | 'Bakery/Café' | 'Fusion' | 'Other';

export type PricePoint = '$' | '$$' | '$$$' | '$$$$';

/**
 * Single-doc restaurant identity + regional context, stored at the fixed
 * path `restaurant_profile/main` (a singleton, not a growing collection —
 * there is only ever one restaurant). Every field is optional since the
 * chef may fill this in gradually, and a missing/blank profile must never
 * break anything that reads it (see `src/lib/regionContext.ts`).
 *
 * `regionalNotes` is free text by design — chef commentary on local
 * ingredients and traditions, the same allowed exception as names/comments
 * elsewhere. `state` is a plain string (USPS 2-letter code) rather than a
 * union — the UI constrains it to a fixed 50-state + DC select without
 * bloating this type with a 51-member union.
 *
 * `targetFcPercent` and `menuTemplate` live here too, migrated from the
 * earlier App.tsx + localStorage scheme, since both are restaurant-identity
 * settings rather than per-session UI state. Logo upload is deferred —
 * `brandColor` is the only visual-identity field implemented so far.
 */
export interface RestaurantProfile {
  name?: string;
  chefName?: string;
  brandColor?: string;
  cuisineStyle?: CuisineStyle;
  pricePoint?: PricePoint;
  city?: string;
  state?: string;
  regionalNotes?: string;
  targetFcPercent?: number;
  menuTemplate?: MenuTemplate;
}

export type PrepStation = 'Sauté' | 'Grill' | 'Garde Manger' | 'Pastry';

export type ProductionRun = PrepItem;

/**
 * A single editorial trend card shown in Test Kitchen's Culinary Trends &
 * Forecasts sub-tab. Drafted by AI per refresh, then independently verified
 * via a web-search-grounded follow-up call before it ships — `sourceUrl`/
 * `sourceName` are populated only from the API's own search citations,
 * never model-written text. A drafted card with no supporting citation is
 * dropped entirely rather than shipped unverified. Exactly one surviving
 * card may carry `isViralBridge: true` — the single most significant
 * viral/popular trend, framed as an elevated-version opportunity rather
 * than a straight chase of social volume.
 */
export interface TrendCard {
  headline: string;
  description: string;
  category: string;
  isViralBridge?: boolean;
  sourceUrl?: string;
  sourceName?: string;
}

/** One line of AI pricing commentary — informational only, never linked to
 * a real `Ingredient` or its `purchaseCost`. See the Master Pantry Mandate. */
export interface PricingTrendItem {
  item: string;
  direction: 'up' | 'down';
  movement: 'short-term' | 'structural';
  note: string;
}

/**
 * The persisted editorial trends report, stored as the singleton doc
 * `trend_reports/latest` so the last refresh survives a reload. Read-only
 * editorial content — see the hard boundary in CLAUDE.md's Test Kitchen
 * Phase B section. Replaces an old, unused `recipe_scores`-shaped
 * `TrendReport` left over from an orphaned Base44-era analysis script
 * (`src/services/analysis/TrendAnalyzer.js`, deleted) that wrote to this
 * same collection name but was never wired into the app.
 */
export interface TrendReport {
  generatedAt: string;
  cards: TrendCard[];
  pricingTrends: PricingTrendItem[];
}

/**
 * `recipeId` is set only when this feature was created by picking a recipe
 * — it's provenance, not a live reference. `name`/`description`/`price`/
 * `cost` are copied from the recipe once at creation time and never
 * resynced; editing the recipe later doesn't change an existing feature,
 * same as a printed menu doesn't silently reprice itself. Both kinds
 * (manual or recipe-derived) store identical fields and render
 * identically everywhere — nothing downstream needs to know which is which.
 */
export interface Feature {
  id: string;
  course: string;
  name: string;
  description?: string;
  price?: number;
  cost?: number;
  activeFrom?: string;
  activeTo?: string;
  is86d?: boolean;
  recipeId?: string;
}

export interface Employee {
  id: string;
  name: string;
  positions: string[];
  hourlyRate?: number;
  active: boolean;
}

export interface Shift {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  station?: PrepStation;
  note?: string;
}

/**
 * A chef-managed event type (Wedding, Buyout, Corporate, …), CRUD'd from
 * Settings the same way as recipe categories. `KitchenEvent.eventType`
 * stores the name directly (no id reference) since events don't need the
 * cross-entity grouping that justified `Recipe.categoryId`.
 */
export interface EventTypePreset {
  id: string;
  name: string;
}

/**
 * A catering/events client. `flagNote` surfaces as a persistent amber flag
 * line on the client's directory card (allergy history, payment issues,
 * VIP handling — whatever the chef needs surfaced every time this client
 * comes up).
 */
export interface Client {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  flagNote?: string;
}

export type IngredientCategory = 'Produce' | 'Protein' | 'Dairy' | 'Dry Goods' | 'Frozen' | 'Beverage' | 'Other' | 'Spices' | 'Oils & Fats' | 'Sauces' | 'Beverages' | 'Bakery';
export type MeasureType = 'weight' | 'volume' | 'each';
export type Allergen = 'milk' | 'eggs' | 'fish' | 'shellfish' | 'treeNuts' | 'peanuts' | 'wheat' | 'soybeans' | 'sesame' | 'gluten' | 'sulfites';
export type PriceSource = 'regional-estimate' | 'invoice' | 'manual';

export interface NutritionPer100g {
  calories?: number;
  totalFat?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  totalCarbs?: number;
  fiber?: number;
  sugars?: number;
  addedSugars?: number;
  protein?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  measureType: MeasureType;
  purchaseUnit: string;
  purchaseCost: number;
  purchaseQty: number;
  yieldPercent: number;
  /**
   * Ordered portion spec in grams, for weight-type ingredients bought
   * portioned (e.g. 6 oz chicken breasts → 170.1). Enables pieces-per-case
   * and cost-per-piece math. Absent for bulk/random product.
   */
  pieceWeightG?: number;
  nutritionPer100g?: NutritionPer100g;
  allergens?: Allergen[];
  vendorId?: string;
  lastVerified: string;
  priceSource: PriceSource;
  nutritionSource?: 'ai' | 'manual';
}

/** A single point on an event's day-of run-of-show timeline. */
export interface EventMilestone {
  time: string;
  label: string;
}

/**
 * A single course line on an event's tentative menu. `recipeId` optionally
 * links the line to a menu recipe for cost projection — `text` still carries
 * the display label either way (the recipe's name when linked, freely typed
 * otherwise), so the UI never needs to branch on which case it's rendering.
 */
export interface TentativeMenuLine {
  course: string;
  text: string;
  recipeId?: string;
}

/**
 * An append-only entry in an event's change log — the paper trail of what
 * changed and when. Entries are never edited or deleted once written, either
 * manually logged by the chef or auto-appended when attendees changes or a
 * tentative menu line is added/removed/swapped.
 */
export interface EventChangeLogEntry {
  date: string;
  text: string;
}

export interface KitchenEvent {
  id: string;
  title: string;
  date?: string;
  time?: string;
  attendees?: number;
  notes?: string;
  eventType?: string;
  clientId?: string;
  milestones?: EventMilestone[];
  tentativeMenu?: TentativeMenuLine[];
  changeLog?: EventChangeLogEntry[];
}

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/**
 * A supplier the Master Pantry can link ingredients to. `orderDays` is a
 * structured multi-select of weekdays (not free text) — the days the chef
 * can place an order with this vendor.
 */
export interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  accountNumber?: string;
  leadTimeDays?: number;
  orderDays?: Weekday[];
  notes?: string;
}

export interface KitchenAlert {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  resolved: boolean;
  timestamp: string;
  station?: string;
}

export interface CribNote {
  id: string;
  date: string;
  content: string;
  author?: string;
}

/**
 * Represents an active countdown timer in the kitchen.
 */
export interface KitchenTimer {
  id: string;
  label: string;
  station: string;
  durationMs: number;
  elapsedMs: number;
  status: 'running' | 'paused' | 'idle';
  startTime?: number;
}