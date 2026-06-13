import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RecipeChecklist({ recipe }) {
  if (!recipe.steps?.length) return null;

  return (
    <div className="mise-card space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Live Prep Checklist</h3>
      {recipe.steps.map((step, i) => (
        <div key={i} className="flex gap-3 items-center p-3 border border-[var(--border)] rounded-lg">
          <Circle className="text-[var(--primary)]" size={20} />
          <p className="text-sm font-medium">{step.instruction}</p>
        </div>
      ))}
    </div>
  );
}