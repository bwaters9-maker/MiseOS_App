import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, Send, X } from 'lucide-react';

export default function IngredientAdvisorChat() {
  const [open, setOpen] = useState(false);
  
  if (!open) return (
    <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-50 bg-[var(--primary)] text-white p-4 rounded-full shadow-lg">
      <TrendingUp size={20} />
    </button>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 h-96 bg-card border rounded-xl shadow-2xl flex flex-col">
      <div className="p-3 border-b flex justify-between items-center bg-[var(--primary)] text-white rounded-t-xl">
        <span className="text-sm font-bold">Market Advisor</span>
        <X size={16} className="cursor-pointer" onClick={() => setOpen(false)} />
      </div>
      <div className="flex-1 p-4 text-sm text-[var(--muted)]">Market analysis engine ready.</div>
      <div className="p-3 border-t flex gap-2">
        <Input placeholder="Ask about trends..." className="text-sm" />
        <Button size="icon"><Send size={14} /></Button>
      </div>
    </div>
  );
}