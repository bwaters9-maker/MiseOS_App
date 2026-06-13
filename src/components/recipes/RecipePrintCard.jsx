import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Printer, FileDown } from 'lucide-react';

export default function RecipePrintCard({ recipe }) {
  const [open, setOpen] = useState(false);
  const printRef = useRef(null);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Printer className="w-4 h-4 mr-2" /> Print/PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <div ref={printRef} className="bg-white p-8 text-black font-serif">
            <div className="border-b-4 border-[var(--primary)] pb-4 flex justify-between">
              <div>
                <h1 className="text-4xl font-bold">{recipe.name}</h1>
                <p className="text-xs uppercase tracking-widest text-[var(--muted)]">{recipe.category}</p>
              </div>
              <div className="text-right">
                <h2 className="font-bold text-xl uppercase tracking-widest">Bacchus</h2>
                <p className="text-[10px] uppercase tracking-widest">Wine Bar</p>
              </div>
            </div>
            {/* Inject your Ingredient & Instruction grid here */}
          </div>
          <Button onClick={() => window.print()}>Export to PDF</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}