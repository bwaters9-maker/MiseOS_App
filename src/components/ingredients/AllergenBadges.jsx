export const ALLERGEN_LABELS = {
  gluten: 'Gluten', dairy: 'Dairy', eggs: 'Eggs', fish: 'Fish',
  shellfish: 'Shellfish', tree_nuts: 'Tree Nuts', peanuts: 'Peanuts',
  soy: 'Soy', sesame: 'Sesame', wheat: 'Wheat', sulfites: 'Sulfites',
};

export const ALLERGEN_COLORS = {
  gluten: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  dairy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  eggs: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  fish: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  shellfish: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  tree_nuts: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  peanuts: 'bg-red-500/20 text-red-400 border-red-500/30',
  soy: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  sesame: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  wheat: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30',
  sulfites: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

export default function AllergenBadges({ allergens = [] }) {
  if (!allergens.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {allergens.map(a => (
        <span key={a} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ALLERGEN_COLORS[a] || 'bg-secondary text-muted-foreground border-border'}`}>
          {ALLERGEN_LABELS[a] || a}
        </span>
      ))}
    </div>
  );
}