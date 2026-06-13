import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/services/apiClient';
import { FlaskConical, Loader2, RefreshCw } from 'lucide-react';

export default function FDALabelCard({ recipe, onChange }) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Direct call to your backend via the new API service
      const data = await apiClient.request('/ai/nutrition', { 
        method: 'POST', 
        body: JSON.stringify({ ingredients: recipe.ingredients }) 
      });
      onChange({ ...recipe, ...data });
    } catch (e) {
      console.error("Nutrition calculation failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mise-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase text-[var(--muted)]">FDA Nutrition Analysis</h3>
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw size={14} />}
        </Button>
      </div>
    </div>
  );
}