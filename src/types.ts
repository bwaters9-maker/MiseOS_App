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
 * Represents a culinary recipe with dynamic scaling and cost analysis.
 */
export interface Recipe {
  id: string;
  name: string;
  originalCovers: number;
  targetCovers: number;
  station: 'Sauté' | 'Grill' | 'Garde Manger' | 'Pastry';
  ingredients: any[]; // Consider defining a more specific Ingredient type
  steps: any[]; // Consider defining a more specific Step type
  salePrice?: number;
}

/**
 * Represents an end-of-shift coordinating safety note.
 */
export interface HandoverLog {
  id: string;
  sender: string;
  submitted_by?: string;
  station: string;
  severity: 'info' | 'warning' | 'critical';
  status?: 'pass' | 'fail' | 'incomplete';
  message: string;
  notes?: string;
  items86?: string[];
  timestamp: string;
  resolved: boolean;
}

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