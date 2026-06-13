import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DishOptimizer() {
  const [active, setActive] = useState('new');
  
  return (
    <div className="mise-card h-full space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--primary)]">Test Kitchen</h1>
        <p className="text-xs text-[var(--muted)]">AI-Assisted Culinary Development</p>
      </div>

      <div className="flex gap-2">
        {['new', 'reform'].map((type) => (
          <button
            key={type}
            onClick={() => setActive(type)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all",
              active === type ? "bg-[var(--primary)] text-white" : "bg-[var(--row)] text-[var(--muted)]"
            )}
          >
            {type === 'new' ? <Sparkles size={14} /> : <RefreshCw size={14} />}
            {type === 'new' ? 'New Development' : 'Recipe Reform'}
          </button>
        ))}
      </div>
    </div>
  );
}