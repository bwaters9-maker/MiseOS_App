export type PrepStation = string;

export interface CostHistoryPoint {
  date: string;
  cost: number;
}

// Base ingredient definition from master list
export interface Ingredient {
  id: string;
  name:string;
  costPerUnit: number;
  purchaseUnit: string;
  yieldPercent?: number;
  historicalCost?: CostHistoryPoint[];
  // quantity and unit are part of on-hand inventory, not master data
}

// Represents an on-hand prep item, often derived from an Ingredient
export interface ProductionRun {
  id: string;
  name: string;
  quantity: number; // Current on-hand amount
  unit: string;
  par?: number;
  checked: boolean;
  station?: PrepStation;
  priority?: 'low' | 'medium' | 'high'; // from DailyCribSheet
  notes?: string;
  lastModified?: string;
  recipe_id: string;
  requires_temp_check?: boolean;
  // Computed for UI
  deficit?: number;
  status?: 'SHORTAGE' | 'STABLE';
}

export interface Item86Entry {
  id: string;
  name: string;
  station: PrepStation | 'All';
  blockedAt: string;
}

// A formal record of a shift transition for a specific station.
export interface HandoverLog {
  id: string;
  shift_id: string; // e.g., '2024-06-17-PM'
  station: PrepStation;
  status: 'pass' | 'fail' | 'incomplete';
  notes: string;
  items86: string[]; // Names of items 86'd during the shift
  submitted_by: string; // Name of the station lead
  timestamp: string; // ISO String
}

export interface KitchenTimer {
  id: string;
  label: string;
  station: PrepStation;
  durationMs: number;
  elapsedMs: number;
  status: 'idle' | 'running' | 'paused';
  startTime?: number; // JS timestamp (ms)
}

// Ingredient as part of a recipe spec
export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  purchaseUnit: string;
  yieldPercent: number;
  isSubRecipe?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  station: PrepStation;
  originalCovers: number;
  targetCovers: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  totalCost: number;
  salePrice: number;
  createdAt: any; // Firestore serverTimestamp
  // from costEngine
  menu_price?: number;
  food_cost_percent?: number;
}

export interface KitchenAlert {
  id: string;
  recipeId: string;
  recipeName: string;
  type: 'REVENUE_RISK';
  message: string;
  timestamp: any; // Firestore Timestamp
  read: boolean;
}

export interface TrendReport {
  recipe_scores: {
    [recipe_id: string]: {
      status: 'hot' | 'cold' | 'stable';
    };
  };
}

// Alias for backward compatibility
export type PrepItem = ProductionRun;