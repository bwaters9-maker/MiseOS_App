import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import RecipeHeader from '@/components/recipes/RecipeHeader';
import RecipeIngredientLines from '@/components/recipes/RecipeIngredientLines';
import RecipeCostSummary from '@/components/recipes/RecipeCostSummary';
import RecipeTrendCard from '@/components/recipes/RecipeTrendCard';
import { calculateRecipeCosts } from '@/lib/costEngine';
import { useToast } from '@/components/ui/use-toast';

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [recipe, setRecipe] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Replace these with your Azure/Firebase hooks
  const { data: fetchedRecipe, isLoading: loadingRecipe } = useQuery({ queryKey: ['recipe', id] });
  const { data: ingredients = [] } = useQuery({ queryKey: ['ingredients'] });
  const { data: allRecipes = [] } = useQuery({ queryKey: ['recipes'] });

  useEffect(() => {
    if (fetchedRecipe && !recipe) setRecipe(fetchedRecipe);
  }, [fetchedRecipe, recipe]);

  const recalculate = useCallback((r) => {
    const ingMap = {}; // Build your ingMap as per your original logic
    return calculateRecipeCosts(r, ingMap);
  }, []);

  const handleChange = (updated) => {
    setRecipe(recalculate({ ...updated }));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => console.log('Saving recipe to Azure:', recipe),
    onSuccess: () => {
      setHasChanges(false);
      toast({ title: 'Recipe saved' });
    },
  });

  if (loadingRecipe || !recipe) return <div className="space-y-4"><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/recipes')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Recipes
        </Button>
        <Button onClick={() => saveMutation.mutate()} disabled={!hasChanges}>
          {saveMutation.isPending ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RecipeHeader recipe={recipe} onChange={handleChange} />
          
          <RecipeIngredientLines
            lines={recipe.ingredients || []}
            onChange={(lines) => handleChange({ ...recipe, ingredients: lines })}
          />

          <div className="mise-card space-y-3">
            <Label>Chef's Notes</Label>
            <Textarea 
              value={recipe.notes || ''} 
              onChange={e => handleChange({ ...recipe, notes: e.target.value })} 
              rows={4} 
            />
          </div>
        </div>

        <div className="space-y-6">
          <RecipeCostSummary recipe={recipe} />
          <RecipeTrendCard recipe={recipe} />
        </div>
      </div>
    </div>
  );
}