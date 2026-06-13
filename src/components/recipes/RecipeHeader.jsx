import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = ['appetizer', 'entree', 'side', 'dessert', 'sauce', 'prep', 'beverage', 'bread', 'other'];

export default function RecipeHeader({ recipe, onChange }) {
  const update = (field, value) => onChange({ ...recipe, [field]: value });

  return (
    <div className="mise-card space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Recipe Meta</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Name</Label>
          <Input value={recipe.name || ''} onChange={e => update('name', e.target.value)} className="font-bold text-lg" />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={recipe.category || 'other'} onValueChange={v => update('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Station</Label>
          <Input value={recipe.station || ''} onChange={e => update('station', e.target.value)} />
        </div>
      </div>
    </div>
  );
}