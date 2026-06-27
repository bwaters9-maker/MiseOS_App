import React from 'react';
import { Loader } from 'lucide-react'; // Assuming a loader icon component
import { usePrepList } from '../hooks/usePrepList.js';

/**
 * The DailyCribSheet provides a real-time overview of the line, from 86'd
 * items to prep deficits. It must remain stable even with incomplete data.
 */
export const DailyCribSheet = () => {
  // This component now fetches its own data, like a line cook grabbing
  // their own prep list from the main board.
  const { prepItems, isLoading, error } = usePrepList();

  // Defensively guard the reduce call. If prepItems is not an array,
  // it defaults to an empty one, preventing a crash. We also guard
  // against items that might lack a `prepTime` property.
  const totalPrepTime = (prepItems || []).reduce(
    (total, item) => total + (item.prepTime || 0),
    0
  );

  if (isLoading) {
    return (
      <div className="p-6 text-center text-sm text-zinc-500">
        <Loader className="animate-spin inline-block mr-2" />
        Loading Prep List...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-sm text-red-500">
        Error loading prep list.
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-5 shadow-lg">
      <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2 mb-4">
        Daily Crib Sheet
      </h3>
      <div>
        <p className="text-zinc-400">
          Total Estimated Prep Time:
          <span className="font-bold text-emerald-400 ml-2">{totalPrepTime} minutes</span>
        </p>
        {/* ... other rendering for prep items ... */}
        {(prepItems || []).length === 0 && !isLoading && (
          <p className="text-center text-xs text-zinc-600 uppercase py-8 tracking-widest">No Prep Items Logged</p>
        )}
      </div>
    </div>
  );
};