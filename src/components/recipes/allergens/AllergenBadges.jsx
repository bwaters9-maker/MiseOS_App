/**
 * src/components/recipes/allergens/AllergenBadges.jsx
 * Displays allergen tags based on the Recipe interface.
 */

export default function AllergenBadges({ allergens = [] }) {
  if (!allergens || allergens.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {allergens.map((allergen) => (
        <span 
          key={allergen} 
          className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700 border border-red-200"
        >
          {allergen}
        </span>
      ))}
    </div>
  );
}