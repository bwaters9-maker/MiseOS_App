/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PrepStation = 'Sauté' | 'Grill' | 'Garde Manger' | 'Pastry';

export interface PrepItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  checked: boolean;
  assignedStation: PrepStation;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  lastModified: string;
}

export interface KitchenTimer {
  id: string;
  label: string;
  durationMs: number;
  elapsedMs: number;
  status: 'idle' | 'paused' | 'running' | 'alarm';
  station: PrepStation;
  startTime?: number; // Optional starting timestamp for active countdowns
}

export interface Ingredient {
  name: string;
  quantity: number; // Edible Portion (EP) quantity
  unit: string;
  costPerUnit: number; // Unit price as purchased (AP)
  purchaseUnit: string;
  yieldPercent: number; // Yield factor from trim wastage (50-100)
}

export interface Recipe {
  id: string;
  name: string;
  originalCovers: number;
  targetCovers: number;
  station: PrepStation;
  ingredients: Ingredient[];
  steps: string[];
  salePrice?: number;
}

export interface HandoverLog {
  id: string;
  sender: string;
  station: PrepStation | 'All';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface Item86 {
  id: string;
  name: string;
  status: 'out' | 'limited';
  substitute?: string;
  timestamp: string;
}

export interface SubRecipe {
  id: string;
  name: string;
  station: PrepStation;
  batchSize: number;
  unit: string; // e.g., 'kg', 'L', 'portions'
  ingredients: Ingredient[];
  steps: string[];
}

