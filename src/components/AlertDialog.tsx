import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

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

  const confirmButtonClasses = {
    default: 'bg-emerald-700 hover:bg-emerald-600 border-emerald-800 text-white',
    destructive: 'bg-red-700 hover:bg-red-600 border-red-800 text-white',
  };

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
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs uppercase font-bold px-4 py-2 rounded-lg transition-colors">{cancelText}</button>
          <button onClick={onConfirm} className={`flex items-center gap-2 text-xs uppercase font-bold px-4 py-2 rounded-lg transition-colors ${confirmButtonClasses[variant]}`}>
            {variant === 'destructive' && <Trash2 className="w-3.5 h-3.5" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};