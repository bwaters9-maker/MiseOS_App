/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrepItem, KitchenTimer, Recipe, HandoverLog, Item86, SubRecipe } from './types';

export const INITIAL_PREP_ITEMS: PrepItem[] = [
  {
    id: 'p-1',
    name: 'Brunoise Shallots',
    quantity: '500',
    unit: 'g',
    checked: false,
    assignedStation: 'Garde Manger',
    priority: 'high',
    notes: 'Keep wrapped in damp paper towels, tightly sealed to prevent oxidation.',
    lastModified: '08:30 AM'
  },
  {
    id: 'p-2',
    name: 'Clean Atlantic Salmon',
    quantity: '10',
    unit: 'portions',
    checked: false,
    assignedStation: 'Sauté',
    priority: 'high',
    notes: 'Skin off, pinbones removed, cut to exactly 150g portions.',
    lastModified: '08:45 AM'
  },
  {
    id: 'p-3',
    name: 'Chocolate Ganache',
    quantity: '2',
    unit: 'L',
    checked: true,
    assignedStation: 'Pastry',
    priority: 'medium',
    notes: 'Use 64% Valrhona chocolate. Keep warm in bain-marie if needed immediately.',
    lastModified: '09:15 AM'
  },
  {
    id: 'p-4',
    name: 'Portion Prime Ribeye',
    quantity: '15',
    unit: 'portions',
    checked: false,
    assignedStation: 'Grill',
    priority: 'medium',
    notes: 'Trim excess exterior fat to 1/4 inch. Store on wire rack in drawer.',
    lastModified: '09:00 AM'
  }
];

export const INITIAL_TIMERS: KitchenTimer[] = [
  {
    id: 't-1',
    label: 'Bone Marrow Roast',
    durationMs: 20 * 60 * 1000, // 20 mins
    elapsedMs: 0,
    status: 'idle',
    station: 'Grill'
  },
  {
    id: 't-2',
    label: 'Demi-Glace Simmer',
    durationMs: 45 * 60 * 1000, // 45 mins
    elapsedMs: 15 * 60 * 1000,
    status: 'running',
    station: 'Sauté'
  },
  {
    id: 't-3',
    label: 'Panna Cotta Set',
    durationMs: 120 * 60 * 1000, // 2 hours
    elapsedMs: 120 * 60 * 1000,
    status: 'alarm',
    station: 'Pastry'
  }
];

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'r-1',
    name: 'Prime Salmon Tartar',
    originalCovers: 10,
    targetCovers: 10,
    station: 'Garde Manger',
    ingredients: [
      {
        name: 'Atlantic Salmon Fillet',
        quantity: 1.5, // 1.5kg
        unit: 'kg',
        costPerUnit: 36.00,
        purchaseUnit: 'kg',
        yieldPercent: 80 // 80% clean yield after bone/skin trim
      },
      {
        name: 'Fresh Avocado',
        quantity: 0.2, // 200g
        unit: 'kg',
        costPerUnit: 9.00,
        purchaseUnit: 'kg',
        yieldPercent: 70 // 70% yield post pitted/scooped
      },
      {
        name: 'Shallots',
        quantity: 0.1, // 100g
        unit: 'kg',
        costPerUnit: 5.00,
        purchaseUnit: 'kg',
        yieldPercent: 92
      },
      {
        name: 'Olive Oil',
        quantity: 0.05, // 50ml -> 0.05L
        unit: 'L',
        costPerUnit: 14.00,
        purchaseUnit: 'L',
        yieldPercent: 100
      }
    ],
    steps: [
      'Chill salmon in freezer for 15 minutes before cold-cubing (1/8 inch) to maintain clean edges.',
      'Gently fold in avocado dice with citrus juice to prevent oxidization.',
      'Incorporate shallots, olive oil, salt, and chives right before plattering.',
      'Ring mold presentation with micro-greens.'
    ],
    salePrice: 24.00
  },
  {
    id: 'r-2',
    name: 'Grilled Ribeye with Herb Butter',
    originalCovers: 4,
    targetCovers: 4,
    station: 'Grill',
    ingredients: [
      {
        name: 'Prime Ribeye Steaks',
        quantity: 1.6, // 1.6kg total for 4 plates (400g raw EP)
        unit: 'kg',
        costPerUnit: 48.00,
        purchaseUnit: 'kg',
        yieldPercent: 90 // 90% yield after final silver/fat portion trim
      },
      {
        name: 'Compound Herb Butter',
        quantity: 0.1, // 100g
        unit: 'kg',
        costPerUnit: 12.00,
        purchaseUnit: 'kg',
        yieldPercent: 100
      }
    ],
    steps: [
      'Tempering beef for at least 30 minutes at room temp prior to firing.',
      'Sear ribeye over red-hot charcoal to form a caramelized crust.',
      'Rest for 8 minutes before slicing.',
      'Top with compound herb butter coin and serve on warmed dinner plate.'
    ],
    salePrice: 45.00
  }
];

export const INITIAL_HANDOVERS: HandoverLog[] = [
  {
    id: 'h-1',
    sender: 'Sous Chef Marco',
    station: 'All',
    severity: 'warning',
    message: 'Health inspector visiting tomorrow early morning. Scrub all lowboy seals and check thermometers are calibrated.',
    timestamp: '09:30 PM',
    resolved: false
  },
  {
    id: 'h-2',
    sender: 'Chef de Partie Sarah',
    station: 'Sauté',
    severity: 'critical',
    message: 'The Sauté induction burner #2 thermostat is overheating. Do not use for high sear, keep it for low simmers only until technician arrives Thursday!',
    timestamp: '10:00 PM',
    resolved: false
  }
];

export const INITIAL_86_ITEMS: Item86[] = [
  {
    id: '86-1',
    name: 'Black Cod',
    status: 'out',
    substitute: 'Seared Wild Halibut',
    timestamp: '05:00 PM'
  },
  {
    id: '86-2',
    name: 'Pastry Chantilly Cream',
    status: 'limited',
    substitute: 'Crème Fraîche alternative',
    timestamp: '07:15 PM'
  }
];

export const INITIAL_SUB_RECIPES: SubRecipe[] = [
  {
    id: 'sr-1',
    name: 'Compound Herb Butter',
    station: 'Grill',
    batchSize: 1.0,
    unit: 'kg',
    ingredients: [
      {
        name: 'Unsalted Butter',
        quantity: 0.95,
        unit: 'kg',
        costPerUnit: 11.00,
        purchaseUnit: 'kg',
        yieldPercent: 100
      },
      {
        name: 'Mixed Fresh Herbs',
        quantity: 0.08,
        unit: 'kg',
        costPerUnit: 15.00,
        purchaseUnit: 'kg',
        yieldPercent: 80
      },
      {
        name: 'Lemon Juice & Zest',
        quantity: 0.02,
        unit: 'kg',
        costPerUnit: 4.50,
        purchaseUnit: 'kg',
        yieldPercent: 45
      }
    ],
    steps: [
      'Temper butter to soft room temperature (do not melt).',
      'Finely mince chives, parsley, and tarragon - squeeze excess moisture out.',
      'Whip butter, adding slow streams of lemon juice, zest, chopped herbs, and kosher salt.',
      'Roll into 1kg tight chef cylinders using plastic wrap. Freeze or refrigerate.'
    ]
  },
  {
    id: 'sr-2',
    name: 'Veal Demi-Glace Base',
    station: 'Sauté',
    batchSize: 2.0,
    unit: 'L',
    ingredients: [
      {
        name: 'Roasted Veal Bones',
        quantity: 5.0,
        unit: 'kg',
        costPerUnit: 5.50,
        purchaseUnit: 'kg',
        yieldPercent: 100
      },
      {
        name: 'Mirepoix vegetables',
        quantity: 1.5,
        unit: 'kg',
        costPerUnit: 2.20,
        purchaseUnit: 'kg',
        yieldPercent: 70
      },
      {
        name: 'Dry Wine Red',
        quantity: 1.0,
        unit: 'L',
        costPerUnit: 8.50,
        purchaseUnit: 'L',
        yieldPercent: 100
      }
    ],
    steps: [
      'Roast bones at 425F until deep golden mahogany.',
      'Sauté mirepoix vegetables until caramelized.',
      'Deglaze with dry red wine, reduce by half.',
      'Add cold water, simmer gently for 24 hours skimming clean fat frequently.',
      'Strain through super fine chinois sieve, and reduce down to 2.0L of gelatinous glaze.'
    ]
  }
];

