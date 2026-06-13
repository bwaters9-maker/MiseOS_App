import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AllergenBadges from './AllergenBadges';

export default function IngredientDetailModal({ ingredient, onClose }) {
  if (!ingredient) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="mise-card w-full max-w-lg space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{ingredient.name}</h2>
          <X className="cursor-pointer" onClick={onClose} />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-[var(--muted)]">Vendor</p><p className="font-bold">{ingredient.vendor}</p></div>
          <div><p className="text-[var(--muted)]">Cost/Unit</p><p className="font-bold text-[var(--primary)]">${(ingredient.cost_per_usable_unit || 0).toFixed(4)}</p></div>
        </div>
        <AllergenBadges allergens={ingredient.allergens} />
        <Button className="w-full" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}