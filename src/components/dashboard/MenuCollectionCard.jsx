import { calculateCollectionMetrics } from '@/services/collectionEngine';
import { Card } from '@/components/ui/card';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export default function MenuCollectionCard({ collection, allRecipes }) {
  const metrics = calculateCollectionMetrics(collection, allRecipes);
  const isHealthy = metrics.status === 'HEALTHY';

  return (
    <Card className="mise-card space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-black uppercase tracking-widest text-xs text-[var(--muted)]">{collection.name}</h3>
          <p className="text-[var(--primary)] font-bold">{metrics.recipeCount} Dishes</p>
        </div>
        <div className={isHealthy ? "text-green-500" : "text-red-500"}>
          {isHealthy ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[var(--muted)] text-xs uppercase">Avg Food Cost</p>
          <p className="text-xl font-black">{metrics.averageFoodCostPercent.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[var(--muted)] text-xs uppercase">Total Menu Cost</p>
          <p className="text-xl font-black">${metrics.totalCost.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="h-2 w-full bg-[var(--row)] rounded-full overflow-hidden">
        <div 
          className={cn("h-full", isHealthy ? "bg-green-500" : "bg-red-500")} 
          style={{ width: `${Math.min(metrics.averageFoodCostPercent, 100)}%` }} 
        />
      </div>
    </Card>
  );
}