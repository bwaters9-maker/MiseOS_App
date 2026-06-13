import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, ChefHat } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import RecipeIngredientLines from '@/components/recipes/RecipeIngredientLines';
import RecipeCostSummary from '@/components/recipes/RecipeCostSummary';
import RecipeAllergenSummary from '@/components/recipes/RecipeAllergenSummary';
import { calculateRecipeCosts } from '@/lib/costEngine';

const CATEGORIES = [
  { value: 'appetizer', label: 'Appetizer' },
  { value: 'entree', label: 'Entrée' },
  { value: 'side', label: 'Side' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'prep', label: 'Prep' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'bread', label: 'Bread' },
  { value: 'other', label: 'Other' },
];

const emptyRecipe = {
  name: '',
  category: 'entree',
  station: '',
  yield_quantity: 1,
  yield_unit: 'portions',
  menu_price: '',
  target_food_cost_percent: 30,
  prep_time_minutes: '',
  cook_time_minutes: '',
  notes: '',
  ingredients: [],
  steps: [],
  is_active: true,
};

export default function RecipeBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [recipe, setRecipe] = useState(emptyRecipe);

  // Note: Replace these hooks with your new Firebase/Azure service calls
  const { data: allIngredients = [] } = useQuery({ queryKey: ['ingredients'] });
  const { data: allRecipes = [] } = useQuery({ queryKey: ['recipes'] });

  const ingMap = Object.fromEntries([
    ...allIngredients.map(i => [i.id, i]),
    ...allRecipes.filter(r => r.is_active !== false).map(r => ({
      id: `recipe:${r.id}`,
      cost_per_usable_unit: r.yield_quantity > 0 ? (r.total_cost || 0) / (r.yield_quantity || 1) : 0,
      usable_unit: r.yield_unit || 'portion',
      purchase_unit: r.yield_unit || 'portion',
    })).map(v => [v.id, v]),
  ]);

  const recalculate = useCallback((r) => calculateRecipeCosts(r, ingMap), [ingMap]);

  const handleChange = (field, value) => {
    setRecipe(r => recalculate({ ...r, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Plug your Azure/Firebase save function here
      console.log('Saving recipe:', data);
    },
    onSuccess: () => {
      toast({ title: 'Recipe created!', description: `${recipe.name} has been saved.` });
      navigate('/recipes');
    },
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate('/recipes')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={() => saveMutation.mutate(recipe)} disabled={!recipe.name.trim() || saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Recipe
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="mise-card space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Recipe Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Recipe Name *</Label>
                <Input value={recipe.name} onChange={e => handleChange('name', e.target.value)} className="h-12 text-lg font-bold" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={recipe.category} onValueChange={v => handleChange('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Station</Label>
                <Input value={recipe.station} onChange={e => handleChange('station', e.target.value)} />
              </div>
            </div>
          </div>

          <RecipeIngredientLines lines={recipe.ingredients} allIngredients={allIngredients} allRecipes={allRecipes} onChange={(lines) => handleChange('ingredients', lines)} />

          <div className="mise-card space-y-3">
            <Label>Chef's Notes</Label>
            <Textarea value={recipe.notes} onChange={e => handleChange('notes', e.target.value)} rows={3} />
          </div>
        </div>

        <div className="space-y-6">
          <RecipeCostSummary recipe={recipe} />
          <RecipeAllergenSummary ingredientLines={recipe.ingredients} allIngredients={allIngredients} allRecipes={allRecipes} />
        </div>
      </div>
    </div>
  );
}