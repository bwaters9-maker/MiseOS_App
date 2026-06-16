import React from 'react';
import { GripVertical, X, ChefHat } from 'lucide-react';
import { RecipeIngredientLine } from '@/lib/costEngine';

interface RecipeIngredientLinesProps {
  lines: RecipeIngredientLine[];
  onChange: (lines: RecipeIngredientLine[]) => void;
}

const RecipeIngredientLines: React.FC<RecipeIngredientLinesProps> = ({ lines = [], onChange }) => {
  const updateLine = (index: number, field: keyof RecipeIngredientLine, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };
  
  const calculateLineCost = (line: RecipeIngredientLine): number => {
    const costPerUnit = line.costPerUnit ?? 0;
    const yieldPercent = line.yieldPercent ?? 100;
    const yieldFactor = yieldPercent / 100;
    const rawQty = yieldFactor > 0 ? line.quantity / yieldFactor : line.quantity;
    return rawQty * costPerUnit;
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-md">
      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Ingredients</h3>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={line.id || index} className="flex items-center gap-3 bg-zinc-950/50 p-3 rounded-lg border border-zinc-850">
            <GripVertical size={16} className="text-zinc-600 cursor-grab" />
            {line.id?.startsWith('recipe:') && <ChefHat size={14} className="text-emerald-400" />}
            <span className="flex-1 text-sm font-bold truncate text-zinc-200">{line.name}</span>
            <input 
              type="number" 
              className="w-24 h-8 bg-zinc-900 border-zinc-700 text-right font-mono rounded-md border p-2" 
              value={line.quantity || ''} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLine(index, 'quantity', parseFloat(e.target.value))} 
            />
             <span className="w-12 text-left text-sm text-zinc-400">{line.unit}</span>
            <span className="w-20 text-right font-mono text-sm font-bold text-zinc-300">
              ${calculateLineCost(line).toFixed(2)}
            </span>
            <button className="h-8 w-8 text-zinc-500 hover:bg-red-900/50 hover:text-red-400 inline-flex items-center justify-center rounded-md" onClick={() => onChange(lines.filter((_, i) => i !== index))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecipeIngredientLines;
