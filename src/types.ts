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
  recipe_id: string;
}

/**
 * A single component line within a recipe — either a Master Pantry ingredient
 * or another recipe used as a sub-recipe. `qty` is always in canonical base
 * units (g/ml/each) matching the referenced item's measureType.
 */
export interface RecipeLine {
  type: 'ingredient' | 'recipe';
  refId: string;
  qty: number;
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
 * Guest-facing menu print/preview styling choice, selected from the Menu
 * view's Guest Preview toggle. Persisted the same way as unitSystem /
 * targetFcPercent (App.tsx state + localStorage) until Restaurant Profile
 * (build order item 15) owns it alongside logo/brand color.
 */
export type MenuTemplate = 'classic' | 'clean';

/**
 * Represents an 86'd (out-of-stock) item.
 */
export interface Item86 {
  id: string;
  name: string;
  status: 'out' | 'limited';
  station?: PrepStation | 'All';
  substitute?: string;
  blockedAt: string;
  timestamp: string;
}

export type PrepStation = 'Sauté' | 'Grill' | 'Garde Manger' | 'Pastry';

export type ProductionRun = PrepItem;

export type Item86Entry = Item86;

export interface TrendReport {
  recipe_scores?: {
    [recipe_id: string]: {
      status: 'hot' | 'cold' | 'stable';
    };
  };
  // Other potential properties for TrendReport
}

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
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  station?: PrepStation;
  clockIn?: string;
  date?: string;
}

export type EventType = 'Private Dining' | 'Buyout' | 'Special Event';

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
  nutritionPer100g?: NutritionPer100g;
  allergens?: Allergen[];
  vendorId?: string;
  lastVerified: string;
  priceSource: PriceSource;
}

export interface KitchenEvent {
  id: string;
  title: string;
  date?: string;
  time?: string;
  covers?: number;
  notes?: string;
  eventType?: EventType;
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