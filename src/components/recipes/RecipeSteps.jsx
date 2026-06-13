import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, X, GripVertical, Sparkles } from 'lucide-react';

export default function RecipeSteps({ steps = [], onChange }) {
  const updateStep = (index, val) => {
    const next = [...steps];
    next[index] = { ...next[index], instruction: val };
    onChange(next);
  };

  return (
    <div className="mise-card space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Instructions</h3>
        <Button size="sm" onClick={() => onChange([...steps, { order: steps.length + 1, instruction: '' }])}>
          <Plus size={14} className="mr-2" /> Add Step
        </Button>
      </div>
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3 bg-[var(--row)] p-3 rounded-lg border border-[var(--border)]">
          <GripVertical className="text-[var(--muted)] mt-2" size={16} />
          <Textarea value={step.instruction} onChange={e => updateStep(i, e.target.value)} className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => onChange(steps.filter((_, idx) => idx !== i))}><X size={14} /></Button>
        </div>
      ))}
    </div>
  );
}