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

export interface KitchenEvent {
  id: string;
  title: string;
  time?: string;
  covers?: number;
  notes?: string;
  type?: string;
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