import React, { createContext, useContext } from 'react';
import { useKitchenState } from '../hooks/useKitchenState'; // Assuming original hook lives here

// The use-context-selector library would be ideal here for production
// to prevent re-renders, but for this concept, standard context works.
const KitchenStateContext = createContext<any | null>(null);

export const KitchenStateProvider = ({ children }: { children: React.ReactNode }) => {
  const kitchenState = useKitchenState();
  return (
    <KitchenStateContext.Provider value={kitchenState}>
      {children}
    </KitchenStateContext.Provider>
  );
};

export const useKitchenSelector = <T,>(selector: (state: any) => T): T => {
  const state = useContext(KitchenStateContext);
  if (state === null) {
    throw new Error('useKitchenSelector must be used within a KitchenStateProvider');
  }
  return selector(state);
};