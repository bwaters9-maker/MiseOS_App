import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { BTN_ACTION, BTN_DESTRUCTIVE, BTN_GHOST } from '../lib/formStyles';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
  icon?: React.ReactNode;
}

/**
 * The one shared confirm dialog — every "Delete X?" flow in the app renders
 * through here. Confirm/cancel buttons use the shared form styles (P-028):
 * destructive is an outline with a leading Trash2 icon, primary/default is a
 * solid fill, so the two are distinguishable by FORM, not hue — the button
 * pairing that colour vision deficiency defeats fastest. `confirmText` should
 * always name the actual action ("Delete station preset"), never "Delete" or
 * "Confirm" alone.
 *
 * The dialog chrome itself (bg-zinc-950 panel) is still the legacy dark skin,
 * pending its own screen's brand pass — the tokenized buttons render light
 * inside it, the same accepted mixed state as Recipes.tsx's category select.
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon,
}) => {
  if (!isOpen) {
    return null;
  }

  const dialogIcon = icon || (
    <div className={`rounded-full p-2 ${variant === 'destructive' ? 'bg-red-950/50 border border-red-800 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
      <AlertTriangle className="w-5 h-5" />
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-start gap-3">
          {dialogIcon}
          <div>
            <h2 id="alert-dialog-title" className="text-lg font-bold text-white">{title}</h2>
            <div id="alert-dialog-description" className="text-xs text-zinc-400 mt-1">{children}</div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className={BTN_GHOST}>{cancelText}</button>
          {variant === 'destructive' ? (
            <button onClick={onConfirm} className={BTN_DESTRUCTIVE}>
              <Trash2 className="w-3.5 h-3.5" />
              {confirmText}
            </button>
          ) : (
            <button onClick={onConfirm} className={BTN_ACTION}>{confirmText}</button>
          )}
        </div>
      </div>
    </div>
  );
};