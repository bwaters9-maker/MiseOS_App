import { GripVertical, X, ChefHat } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RecipeIngredientLines({ lines = [], onChange }) {
  const updateLine = (index, field, value) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="mise-card space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Ingredients</h3>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={index} className="flex items-center gap-3 bg-[var(--row)] p-3 rounded-lg border border-[var(--border)]">
            <GripVertical size={16} className="text-[var(--muted)] cursor-grab" />
            {line.ingredient_id?.startsWith('recipe:') && <ChefHat size={14} className="text-[var(--primary)]" />}
            <span className="flex-1 text-sm font-bold truncate">{line.ingredient_name}</span>
            <Input 
              type="number" className="w-20 h-8" value={line.quantity || ''} 
              onChange={e => updateLine(index, 'quantity', parseFloat(e.target.value))} 
            />
            <span className="w-16 text-right font-mono text-sm font-bold text-[var(--primary)]">
              ${(line.line_cost || 0).toFixed(2)}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange(lines.filter((_, i) => i !== index))}>
              <X size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}