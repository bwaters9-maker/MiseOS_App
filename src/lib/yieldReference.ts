/**
 * Common product usable-yield percentages, transcribed 2026-07-06 from
 * "MPP Online — Common Product Yields and Conversions" (chef-provided PDF).
 * Static reference data per the Master Pantry Mandate — no runtime calls.
 *
 * Used to ground the AI ingredient lookup's yieldPercent proposals
 * (see AiIngredientLookup.tsx). Values are reference standards; the chef
 * remains the verifier on every save.
 *
 * Transcription notes for chef review:
 * - "Chicken / Breast Skin On 74%" sits beside Game Hen in the PDF layout;
 *   assigned to Chicken here.
 * - Chicken lists Drum twice (63% and 69%) and Thighs 70% vs Thigh 82% —
 *   transcribed as printed; likely different fabrication bases.
 * - "Back 23%" follows Crawfish Tail in the PDF; assigned to Crawfish.
 */

export interface YieldRefEntry {
  item: string;
  prep?: string;
  /** Usable yield as printed — a number ("74") or range ("83-90"). */
  yieldPct: string;
}

export interface YieldRefSection {
  section: string;
  entries: YieldRefEntry[];
}

export const YIELD_REFERENCE: YieldRefSection[] = [
  {
    section: 'Vegetables',
    entries: [
      { item: 'Acorn Squash', prep: 'flesh raw', yieldPct: '74' },
      { item: 'Artichoke', prep: 'edible leaves and base', yieldPct: '40' },
      { item: 'Asparagus', prep: 'trimmed ends', yieldPct: '80' },
      { item: 'Beets', prep: 'peeled and diced', yieldPct: '91' },
      { item: 'Broccoli', prep: 'cored, florets only', yieldPct: '47' },
      { item: 'Brussels Sprouts', prep: 'trimmed, ready to cook', yieldPct: '90' },
      { item: 'Butternut Squash', yieldPct: '84' },
      { item: 'Cabbage, Red & Green', prep: 'trimmed without core', yieldPct: '64' },
      { item: 'Carrots', yieldPct: '68' },
      { item: 'Cauliflower', prep: 'cored, florets only', yieldPct: '53' },
      { item: 'Celery', yieldPct: '60' },
      { item: 'Cilantro', yieldPct: '90' },
      { item: 'Corn', prep: 'raw kernels cut off cob', yieldPct: '36' },
      { item: 'Cucumber', prep: 'pared and sliced', yieldPct: '84' },
      { item: 'Eggplant', prep: 'trimmed, pared, and sliced', yieldPct: '81' },
      { item: 'Endive', prep: 'trimmed and cored', yieldPct: '86' },
      { item: 'Fennel', prep: 'trimmed and cored', yieldPct: '86' },
      { item: 'Garlic', prep: 'peeled cloves', yieldPct: '87' },
      { item: 'Ginger Root', prep: 'peeled root', yieldPct: '83-90' },
      { item: 'Iceberg Lettuce', yieldPct: '62' },
      { item: 'Leek', prep: 'bulb and flower leaves', yieldPct: '44' },
      { item: 'Mushrooms', yieldPct: '90' },
      { item: 'Onions', yieldPct: '63' },
      { item: 'Peppers', yieldPct: '59' },
      { item: 'Potatoes', prep: 'skinned by hand, raw', yieldPct: '63' },
      { item: 'Romaine', yieldPct: '86' },
      { item: 'Spinach', prep: 'trimmed leaves', yieldPct: '72' },
      { item: 'Zucchini', yieldPct: '78' },
    ],
  },
  {
    section: 'Fruits',
    entries: [
      { item: 'Apples', prep: 'peeled and cored', yieldPct: '40' },
      { item: 'Avocado', prep: 'skinned and seeded', yieldPct: '63' },
      { item: 'Banana', yieldPct: '66' },
      { item: 'Blackberries', yieldPct: '96' },
      { item: 'Cantaloupe', prep: 'rind and seeded', yieldPct: '43' },
      { item: 'Cherries', prep: 'flesh', yieldPct: '62' },
      { item: 'Coconut', prep: 'meat', yieldPct: '48' },
      { item: 'Figs', prep: 'without stem', yieldPct: '97' },
      { item: 'Grapefruit', prep: 'segments without membrane', yieldPct: '52' },
      { item: 'Grapes', prep: 'stems removed', yieldPct: '96' },
      { item: 'Honeydew', prep: 'rind and seeded', yieldPct: '48' },
      { item: 'Lemons', prep: 'juiced and strained', yieldPct: '36' },
      { item: 'Lime/Lemon Zest', yieldPct: '16' },
      { item: 'Limes', prep: 'juiced and strained', yieldPct: '47' },
      { item: 'Mango', prep: 'without pit and skin', yieldPct: '69' },
      { item: 'Oranges', prep: 'pared, flesh', yieldPct: '44' },
      { item: 'Papayas', yieldPct: '65' },
      { item: 'Peaches', prep: 'without pit and skin', yieldPct: '76' },
      { item: 'Pears', prep: 'without pit and skin', yieldPct: '78' },
      { item: 'Pineapple', prep: 'peeled and cored', yieldPct: '38' },
      { item: 'Plantains', prep: 'fully ripe', yieldPct: '65' },
      { item: 'Plums', prep: 'pitted', yieldPct: '94' },
      { item: 'Pomegranates', prep: 'seeded', yieldPct: '44' },
      { item: 'Prickly Pear', prep: 'pulp', yieldPct: '44' },
      { item: 'Strawberries', prep: 'good quality, no stem', yieldPct: '90' },
      { item: 'Tomato', prep: 'stem and base', yieldPct: '90' },
      { item: 'Watermelon', prep: 'rind and seeded', yieldPct: '52' },
    ],
  },
  {
    section: 'Meat',
    entries: [
      { item: 'Beef Chuck', yieldPct: '85' },
      { item: 'Beef Flank', yieldPct: '90' },
      { item: 'Beef Flap Meat', yieldPct: '80' },
      { item: 'Beef Inside Round', yieldPct: '65' },
      { item: 'Beef Neck', yieldPct: '75' },
      { item: 'Beef Rib Chop', yieldPct: '83' },
      { item: 'Beef Rump', yieldPct: '79' },
      { item: 'Beef Shank, Hind', yieldPct: '43' },
      { item: 'Beef Shank, Fore', yieldPct: '61' },
      { item: 'Beef Shoulder Clod', yieldPct: '75' },
      { item: 'Beef Short Ribs', yieldPct: '68' },
      { item: 'Beef Sirloin Butt', yieldPct: '70' },
      { item: 'Beef Sirloin Top, Full Cut', yieldPct: '71' },
      { item: 'Beef Club Steak', yieldPct: '83' },
      { item: 'Beef Porterhouse Steak', yieldPct: '91' },
      { item: 'Beef T-Bone Steak', yieldPct: '88' },
      { item: 'Beef Tenderloin PSMO', yieldPct: '75' },
      { item: 'Beef Ribeye Steak, Lip Off', prep: 'cut steak', yieldPct: '72' },
      { item: 'Beef Ribeye Steak, Lip On', prep: 'cut steak', yieldPct: '78' },
      { item: 'Beef Strip Steak, Center Cut', prep: 'cut steak', yieldPct: '50' },
      { item: 'Beef Strip Steak, End Cut', prep: 'cut steak', yieldPct: '63' },
      { item: 'Beef Top Butt Steak, Cap On', prep: 'cut steak', yieldPct: '52' },
      { item: 'Beef Top Butt Steak, Center Cut', prep: 'cut steak', yieldPct: '38' },
      { item: 'Beef Peeled Tenderloin', prep: 'cut steak', yieldPct: '52' },
      { item: 'Beef Peeled Tenderloin, Center Cut', prep: 'cut steak', yieldPct: '38' },
      { item: 'Lamb Breast and Flank', yieldPct: '89' },
      { item: 'Lamb Chop', yieldPct: '75' },
      { item: 'Lamb Foreleg', yieldPct: '70' },
      { item: 'Lamb Loin', yieldPct: '89' },
      { item: 'Lamb Rib', yieldPct: '81' },
      { item: 'Lamb Shoulder', yieldPct: '86' },
      { item: 'Pork Bacon', yieldPct: '93' },
      { item: 'Pork Butt, Boneless', yieldPct: '85' },
      { item: 'Pork Chop', yieldPct: '75' },
      { item: 'Pork Ham', yieldPct: '85' },
      { item: 'Pork Picnic', yieldPct: '81' },
      { item: 'Pork Shoulder', yieldPct: '84' },
      { item: 'Pork Tenderloin', yieldPct: '95' },
      { item: 'Veal Chuck', yieldPct: '80' },
      { item: 'Veal Flank', yieldPct: '99' },
      { item: 'Veal Fore Shank', yieldPct: '52' },
      { item: 'Veal Leg', prep: 'boned and trimmed', yieldPct: '68' },
      { item: 'Veal Loin', yieldPct: '83' },
      { item: 'Veal Plate', yieldPct: '79' },
      { item: 'Veal Rib', yieldPct: '77' },
      { item: 'Veal Round', yieldPct: '77' },
    ],
  },
  {
    section: 'Poultry and Fish',
    entries: [
      { item: 'Game Hen', prep: 'with neck and giblets', yieldPct: '91' },
      { item: 'Chicken Breast, Skin On', yieldPct: '74' },
      { item: 'Chicken Broiler/Fryer', prep: 'without neck/giblets', yieldPct: '89' },
      { item: 'Chicken Drum', yieldPct: '63' },
      { item: 'Chicken Thighs', yieldPct: '70' },
      { item: 'Chicken Wings', yieldPct: '50' },
      { item: 'Chicken Breast', yieldPct: '87' },
      { item: 'Chicken Breast Quarter', yieldPct: '75' },
      { item: 'Chicken Drum (alt basis)', yieldPct: '69' },
      { item: 'Chicken Leg', yieldPct: '75' },
      { item: 'Chicken Leg Quarter', yieldPct: '71' },
      { item: 'Chicken Thigh (alt basis)', yieldPct: '82' },
      { item: 'Duck', prep: 'dressed', yieldPct: '88' },
      { item: 'Duck Legs', yieldPct: '24' },
      { item: 'Duck Wings', yieldPct: '11' },
      { item: 'Turkey', prep: 'whole, dressed', yieldPct: '90' },
      { item: 'Venison Loin Chop', yieldPct: '75' },
      { item: 'Bass', prep: 'fillet without skin', yieldPct: '59' },
      { item: 'Clams', prep: 'edible portion', yieldPct: '15' },
      { item: 'Cod', prep: 'fillet without skin', yieldPct: '30' },
      { item: 'Crab, Blue', prep: 'from shell', yieldPct: '17' },
      { item: 'Crab, Dungeness', prep: 'from shell', yieldPct: '27' },
      { item: 'Crab, King', prep: 'from shell', yieldPct: '25' },
      { item: 'Crawfish Tail', yieldPct: '12' },
      { item: 'Crawfish Back', yieldPct: '23' },
      { item: 'Flounder', prep: 'fillet without skin', yieldPct: '41' },
      { item: 'Frog Legs', prep: 'flesh', yieldPct: '65' },
      { item: 'Halibut', prep: 'fillet without skin', yieldPct: '59' },
      { item: 'Trout', prep: 'fillet without skin', yieldPct: '59' },
      { item: 'Lobster', prep: 'meat, body/claw/tail', yieldPct: '28' },
      { item: 'Oyster', prep: 'meat and liquor', yieldPct: '18' },
      { item: 'Snapper', prep: 'fillet with skin', yieldPct: '73' },
      { item: 'Salmon', prep: 'meat, boneless, raw', yieldPct: '88' },
      { item: 'Shrimp', prep: 'cleaned, without shell', yieldPct: '81' },
    ],
  },
];

/** Compact text block for injection into AI system prompts. */
export const yieldReferenceText = (): string =>
  YIELD_REFERENCE
    .map(s =>
      `${s.section}:\n` +
      s.entries
        .map(e => `- ${e.item}${e.prep ? ` (${e.prep})` : ''}: ${e.yieldPct}%`)
        .join('\n'),
    )
    .join('\n');
