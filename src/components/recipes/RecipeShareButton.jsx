import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Loader2, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export default function RecipeShareButton({ recipe }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');

  const generateLink = async () => {
    setLoading(true);
    // Replace with your Azure/Firebase function call
    const mockUrl = `${window.location.origin}/share/${recipe.id}`;
    setUrl(mockUrl);
    setLoading(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Share2 className="w-4 h-4 mr-2" /> Share</Button>
      </DialogTrigger>
      <DialogContent>
        <h2 className="font-bold text-lg">Share Recipe</h2>
        {!url ? (
          <Button onClick={generateLink} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Generate Secure Link'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <input readOnly value={url} className="border p-2 w-full text-xs" />
            <Button onClick={() => navigator.clipboard.writeText(url)}><Copy size={16}/></Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}