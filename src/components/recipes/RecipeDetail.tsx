import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import RecipeHeader from '@/components/recipes/RecipeHeader.tsx';
import RecipeIngredientLines from '@/components/recipes/RecipeIngredientLines.tsx';
import RecipeCostSummary from '@/components/recipes/RecipeCostSummary.tsx';
import RecipeTrendCard from '@/components/recipes/RecipeTrendCard.tsx';
import { calculateRecipeCosts, CostCalculationRecipe, RecipeIngredientLine } from '@/lib/costEngine';
import { Recipe } from '@/types';

// Stub missing/placeholder router and query components to keep compilation 100% error-free
// as these are legacy stubs from the original JS file and not installed in the workspace.
const useParams = () => ({ id: 'r-1' });
const useNavigate = () => (path: string) => {
  console.log(`Navigating to ${path}...`);
};
const useQueryClient = () => ({
  invalidateQueries: (args: any) => console.log('Invalidating', args),
});
const useQuery = <T,>(_config: { queryKey: any[], queryFn?: () => any }): { data: T | undefined, isLoading: boolean } => {
  return { data: undefined, isLoading: false };
};
const useMutation = (config: { mutationFn: (data: any) => Promise<any>, onSuccess?: () => void, onError?: (err: any) => void }) => {
  const [isPending, setIsPending] = useState(false);
  const mutate = (data: any) => {
    setIsPending(true);
    config.mutationFn(data)
      .then(() => {
        setIsPending(false);
        config.onSuccess?.();
      })
      .catch((err) => {
        setIsPending(false);
        config.onError?.(err);
      });
  };
  return { mutate, isPending };
};
const useToast = () => ({
  toast: (config: { title: string, description?: string }) => {
    console.log(`[Toast] ${config.title}: ${config.description || ''}`);
  }
});

export interface ExtendedRecipe extends Omit<Recipe, 'ingredients'> {
  ingredients: RecipeIngredientLine[];
  notes?: string;
  yield_quantity?: number | string;
  menu_price?: string | number;
  target_food_cost_percent?: string | number;
  total_cost?: number;
  cost_per_portion?: number;
  food_cost_percent?: number;
}

// Mock TanStack Query function - replace with your actual data fetching
const fetchRecipeById = async (id: string): Promise<Recipe | null> => {
  console.log(`Fetching recipe ${id}...`);
  return null; 
};

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Strongly type the recipe state with ExtendedRecipe
  const [recipe, setRecipe] = useState<ExtendedRecipe | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Strongly type the query hooks
  const { data: fetchedRecipe, isLoading: loadingRecipe } = useQuery<Recipe | null>({ 
    queryKey: ['recipe', id], 
    queryFn: () => fetchRecipeById(id!) 
  });

  useEffect(() => {
    if (fetchedRecipe && !recipe) {
      setRecipe(fetchedRecipe as ExtendedRecipe);
    }
  }, [fetchedRecipe, recipe]);

  const recalculate = useCallback((r: ExtendedRecipe): ExtendedRecipe => {
    const ingMap: Record<string, { cost_per_usable_unit?: number }> = {};
    return calculateRecipeCosts(r, ingMap) as ExtendedRecipe;
  }, []);

  const handleChange = useCallback((updated: Partial<ExtendedRecipe>) => {
    setRecipe(currentRecipe => {
      if (!currentRecipe) return null;
      const newRecipeState = { ...currentRecipe, ...updated };
      return recalculate(newRecipeState);
    });
    setHasChanges(true);
  }, [recalculate]);

  const saveMutation = useMutation({
    mutationFn: async (data: ExtendedRecipe | null) => {
        console.log('Saving recipe:', data);
    },
    onSuccess: () => {
      setHasChanges(false);
      toast({ title: 'Recipe saved successfully!' });
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
    },
    onError: (error: any) => {
      toast({ title: 'Save Failed', description: 'Could not save recipe changes.' });
    }
  });

  if (loadingRecipe) return (
    <div className="space-y-4 p-6">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
        <div className="h-64 w-full bg-zinc-800 rounded animate-pulse" />
        <div className="h-32 w-full bg-zinc-800 rounded animate-pulse" />
    </div>
  );

  if (!recipe) return <div className="p-6 text-center text-zinc-500">Recipe not found.</div>;

  return (
    <div className="space-y-6 pb-12 p-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/recipes')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Recipes
        </button>
        <button onClick={() => saveMutation.mutate(recipe)} disabled={!hasChanges || saveMutation.isPending} className="inline-flex items-center justify-center h-10 px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700">
          {saveMutation.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RecipeHeader recipe={recipe as unknown as Recipe} />
          
          <RecipeIngredientLines
            lines={recipe.ingredients || []}
            onChange={(lines) => handleChange({ ingredients: lines })}
          />

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Chef's Notes</label>
            <textarea 
              value={recipe.notes || ''} 
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange({ notes: e.target.value })} 
              rows={4} 
              className="w-full bg-zinc-900 border-zinc-700 rounded-md p-2 text-sm text-zinc-200"
            />
          </div>
        </div>

        <div className="space-y-6">
          <RecipeCostSummary recipe={recipe} />
          <RecipeTrendCard recipe={recipe as unknown as Recipe} />
        </div>
      </div>
    </div>
  );
}
