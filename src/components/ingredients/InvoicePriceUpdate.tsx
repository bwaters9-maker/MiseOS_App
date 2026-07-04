import React, { useEffect, useRef, useState } from 'react';
import { Receipt, Upload, Loader2, AlertTriangle, X, Check, FileWarning } from 'lucide-react';
import { db } from '../../firebaseConfig';
import { updateDoc, doc } from 'firebase/firestore';
import { callAi, parseAiJson } from '../../lib/ai';
import type { Ingredient } from '../../types';

const INVOICE_SYSTEM_PROMPT = `You are extracting line items from a restaurant supplier invoice (a photo or PDF). Extract ONLY food and beverage product line items — ignore delivery fees, taxes, fuel surcharges, account numbers, terms, and any other non-product lines.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"vendor":"...","invoiceDate":"...","items":[{"name":"...","packCost":0,"packDescription":"..."}]}

Rules:
- "vendor" is the supplier name as printed on the invoice, or "" if not legible.
- "invoiceDate" is the invoice date in YYYY-MM-DD format, or "" if not legible.
- "name" is the product name as printed on the invoice.
- "packCost" is the total price charged for that line's purchase unit, as a plain number with no currency symbol.
- "packDescription" is the pack size or unit as invoiced (e.g. "50 lb bag", "case of 6", "1 gal jug").
- If the image is unreadable or contains no product lines, return {"vendor":"","invoiceDate":"","items":[]}.`;

const normalize = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const findMatch = (invoiceName: string, ingredients: Ingredient[]): Ingredient | null => {
  const norm = normalize(invoiceName);
  if (!norm) return null;
  let best: Ingredient | null = null;
  let bestScore = 0;
  for (const ing of ingredients) {
    const ingNorm = normalize(ing.name);
    if (!ingNorm) continue;
    if (ingNorm === norm) return ing;
    if (norm.includes(ingNorm) || ingNorm.includes(norm)) {
      const score = Math.min(ingNorm.length, norm.length) / Math.max(ingNorm.length, norm.length);
      if (score > bestScore) {
        bestScore = score;
        best = ing;
      }
    }
  }
  return best;
};

interface ExtractedItem {
  name: string;
  packCost: number;
  packDescription: string;
}

interface ReviewRow {
  key: string;
  invoiceName: string;
  packDescription: string;
  ingredient: Ingredient | null;
  newPackCostDisplay: string;
  accepted: boolean;
}

type Stage = 'idle' | 'reading' | 'review' | 'failed' | 'empty';

const INPUT = 'w-full bg-zinc-900 border border-zinc-700 rounded-[5px] px-[8px] py-[5px] text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const BTN_PRIMARY = 'px-[13px] py-[8px] bg-emerald-900/50 border border-emerald-700 rounded-[8px] text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition-colors duration-[144ms]';
const BTN_GHOST = 'px-[13px] py-[8px] bg-zinc-900 border border-zinc-700 rounded-[8px] text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors duration-[144ms]';

const readFileAsBase64 = (file: File): Promise<{ base64: string; mediaType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        reject(new Error('Could not read that file.'));
        return;
      }
      resolve({ mediaType: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });

interface InvoicePriceUpdateProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
}

export const InvoicePriceUpdate: React.FC<InvoicePriceUpdateProps> = ({ isOpen, onClose, ingredients }) => {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [vendor, setVendor] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const lastFile = useRef<{ base64: string; mediaType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  if (!isOpen) return null;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const runExtraction = async (base64: string, mediaType: string) => {
    setStage('reading');
    setError(null);
    try {
      const contentBlock = mediaType === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } }
        : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
      const raw = await callAi(
        INVOICE_SYSTEM_PROMPT,
        [contentBlock, { type: 'text', text: 'Extract the food and beverage line items from this invoice.' }],
        2048,
      );
      let parsed: any;
      try {
        parsed = parseAiJson(raw);
      } catch {
        throw new Error('The AI response could not be read. Try again.');
      }
      const items: ExtractedItem[] = Array.isArray(parsed.items)
        ? parsed.items
            .filter((it: any) => it && typeof it.name === 'string' && it.name.trim())
            .map((it: any) => ({
              name: it.name.trim(),
              packCost: typeof it.packCost === 'number' ? it.packCost : parseFloat(it.packCost) || 0,
              packDescription: typeof it.packDescription === 'string' ? it.packDescription : '',
            }))
        : [];

      if (items.length === 0) {
        setStage('empty');
        return;
      }

      setVendor(typeof parsed.vendor === 'string' ? parsed.vendor : '');
      setInvoiceDate(typeof parsed.invoiceDate === 'string' ? parsed.invoiceDate : '');
      setRows(items.map((item, idx) => {
        const match = findMatch(item.name, ingredients);
        return {
          key: `${idx}-${item.name}`,
          invoiceName: item.name,
          packDescription: item.packDescription,
          ingredient: match,
          newPackCostDisplay: item.packCost > 0 ? String(item.packCost) : '',
          accepted: !!match,
        };
      }));
      setStage('review');
    } catch (e: any) {
      setError(e?.message || 'Could not read the invoice. Try again.');
      setStage('failed');
    }
  };

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { base64, mediaType } = await readFileAsBase64(file);
      lastFile.current = { base64, mediaType };
      await runExtraction(base64, mediaType);
    } catch (e: any) {
      setError(e?.message || 'Could not read that file.');
      setStage('failed');
    }
  };

  const handleRetry = () => {
    if (lastFile.current) {
      runExtraction(lastFile.current.base64, lastFile.current.mediaType);
    } else {
      setStage('idle');
      setError(null);
    }
  };

  const toggleAccept = (key: string) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, accepted: !r.accepted } : r));
  };

  const updatePrice = (key: string, value: string) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, newPackCostDisplay: value } : r));
  };

  const matchedRows = rows.filter(r => r.ingredient);
  const unmatchedRows = rows.filter(r => !r.ingredient);
  const acceptedCount = matchedRows.filter(r => r.accepted).length;

  const resetToIdle = () => {
    setStage('idle');
    setError(null);
    setRows([]);
    setVendor('');
    setInvoiceDate('');
    lastFile.current = null;
  };

  const handleApply = async () => {
    if (applying) return;
    const toApply = matchedRows.filter(r => r.accepted);
    if (toApply.length === 0) return;
    setApplying(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await Promise.all(toApply.map(r => {
        const cost = parseFloat(r.newPackCostDisplay);
        if (isNaN(cost) || cost < 0) return Promise.resolve();
        return updateDoc(doc(db, 'ingredients', r.ingredient!.id), {
          purchaseCost: cost,
          priceSource: 'invoice',
          lastVerified: today,
        });
      }));
      showToast(`Updated ${toApply.length} ingredient price${toApply.length !== 1 ? 's' : ''}.`);
      resetToIdle();
    } catch (e: any) {
      setError(e?.message || 'Could not save the price updates.');
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    resetToIdle();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-[21px]">
      <div className="bg-zinc-950 border border-zinc-800 rounded-[13px] shadow-2xl w-full max-w-[900px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-[21px] py-[13px] border-b border-zinc-900 shrink-0">
          <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-[8px]">
            <Receipt className="w-4 h-4 text-amber-400" />
            Update Prices From Invoice
          </h2>
          <button onClick={handleClose} className="p-[5px] text-zinc-500 hover:text-zinc-200 transition-colors duration-[144ms]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={e => { handleFileSelected(e.target.files?.[0]); e.target.value = ''; }}
        />

        <div className="p-[21px] overflow-y-auto space-y-[13px]">
          {stage === 'idle' && (
            <div className="border-2 border-dashed border-zinc-800 rounded-[13px] p-[55px] text-center space-y-[13px]">
              <Upload className="w-8 h-8 text-zinc-700 mx-auto" />
              <p className="text-xs text-zinc-500">
                Upload or photograph an invoice. Nothing is stored — the image is sent for extraction only.
              </p>
              <button onClick={() => fileInputRef.current?.click()} className={`${BTN_PRIMARY} inline-flex items-center gap-[8px]`}>
                <Upload className="w-3.5 h-3.5" />
                Choose Invoice
              </button>
            </div>
          )}

          {stage === 'reading' && (
            <div className="p-[55px] text-center space-y-[13px]">
              <Loader2 className="w-8 h-8 text-emerald-400 mx-auto animate-spin" />
              <p className="text-xs text-zinc-400">Reading invoice…</p>
            </div>
          )}

          {stage === 'failed' && (
            <div className="p-[34px] text-center space-y-[13px]">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
              <p className="text-xs text-red-300">{error || 'Could not read the invoice.'}</p>
              <div className="flex items-center justify-center gap-[8px]">
                <button onClick={handleRetry} className={BTN_PRIMARY}>Retry</button>
                <button onClick={() => fileInputRef.current?.click()} className={BTN_GHOST}>Choose Different File</button>
              </div>
            </div>
          )}

          {stage === 'empty' && (
            <div className="p-[34px] text-center space-y-[13px]">
              <FileWarning className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-500">No ingredient prices found — try a clearer photo.</p>
              <button onClick={() => fileInputRef.current?.click()} className={BTN_PRIMARY}>Choose Different File</button>
            </div>
          )}

          {stage === 'review' && (
            <div className="space-y-[13px]">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{vendor || 'Vendor not detected'}</span>
                <span>{invoiceDate || 'Date not detected'}</span>
              </div>

              <div className="border border-zinc-800 rounded-[8px] overflow-hidden">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-900/40">
                    <tr>
                      <th className="px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Invoice Item</th>
                      <th className="px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Matched Ingredient</th>
                      <th className="px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">Current</th>
                      <th className="px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">New Cost</th>
                      <th className="px-[13px] py-[8px] text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center">Accept</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedRows.map(r => (
                      <tr key={r.key} className="border-t border-zinc-900">
                        <td className="px-[13px] py-[8px]">
                          <span className="block text-zinc-200 font-bold">{r.invoiceName}</span>
                          {r.packDescription && <span className="block text-[10px] text-zinc-600">{r.packDescription}</span>}
                        </td>
                        <td className="px-[13px] py-[8px] text-emerald-400">{r.ingredient!.name}</td>
                        <td className="px-[13px] py-[8px] text-zinc-500 tabular-nums">${r.ingredient!.purchaseCost.toFixed(2)}</td>
                        <td className="px-[13px] py-[8px]">
                          <input
                            type="number"
                            value={r.newPackCostDisplay}
                            onChange={e => updatePrice(r.key, e.target.value)}
                            min="0"
                            step="0.01"
                            className={`${INPUT} w-24`}
                          />
                        </td>
                        <td className="px-[13px] py-[8px] text-center">
                          <input
                            type="checkbox"
                            checked={r.accepted}
                            onChange={() => toggleAccept(r.key)}
                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                    {unmatchedRows.map(r => (
                      <tr key={r.key} className="border-t border-zinc-900 opacity-50">
                        <td className="px-[13px] py-[8px]">
                          <span className="block text-zinc-300 font-bold">{r.invoiceName}</span>
                          {r.packDescription && <span className="block text-[10px] text-zinc-600">{r.packDescription}</span>}
                        </td>
                        <td className="px-[13px] py-[8px] text-zinc-600 italic" colSpan={3}>No pantry match</td>
                        <td className="px-[13px] py-[8px]" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-[5px]">
                <p className="text-xs text-zinc-500">
                  {acceptedCount} of {matchedRows.length} prices will be updated
                </p>
                <div className="flex items-center gap-[8px]">
                  <button onClick={() => fileInputRef.current?.click()} className={BTN_GHOST}>New Invoice</button>
                  <button
                    onClick={handleApply}
                    disabled={applying || acceptedCount === 0}
                    className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {applying ? 'Applying…' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className="absolute bottom-[21px] left-1/2 -translate-x-1/2 bg-emerald-950/90 border border-emerald-700 rounded-[8px] px-[13px] py-[8px] flex items-center gap-[8px] shadow-lg">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-300">{toast}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePriceUpdate;
