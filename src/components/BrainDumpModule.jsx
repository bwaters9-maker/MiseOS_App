import React, { useState } from 'react';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { brainDumpsRef } from './dashboard/config.js';
import { Send } from 'lucide-react';

/**
 * A clean, minimalist text area for raw data intake. This acts as a digital
 * station pad for a chef to quickly jot down notes, ideas, or reminders
 * without distraction.
 */
export const BrainDumpModule = () => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim() === '') return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // This is like dropping a ticket on the spike. We add the raw text
      // with a timestamp to the 'brain_dumps' collection for later processing.
      await addDoc(brainDumpsRef, {
        note_content: text,
        created_at: serverTimestamp(),
        processed: false,
      });
      
      setText('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000); // Clear success message after 2s
    } catch (err) {
      console.error("Error submitting to station log:", err);
      setError('Failed to submit note. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-5 shadow-lg">
      <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2 mb-4">
        Station Log / Brain Dump
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Jot down anything... prep notes, menu ideas, service feedback..."
          className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between">
          <div className="h-5">
            {error && <p className="text-xs text-red-500">{error}</p>}
            {success && <p className="text-xs text-emerald-500">Note logged successfully.</p>}
          </div>
          <button
            type="submit"
            disabled={isLoading || text.trim() === ''}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold px-4 py-2 rounded-md border border-emerald-500 shadow-md transition-all disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            {isLoading ? 'Logging...' : 'Send to Logs'}
          </button>
        </div>
      </form>
    </div>
  );
};