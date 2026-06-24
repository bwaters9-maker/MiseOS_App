import React, { createContext, useContext, ReactNode } from 'react';
import { useKitchenState } from '../hooks/useKitchenState';

type KitchenStateContextType = ReturnType<typeof useKitchenState>;

const KitchenStateContext = createContext<KitchenStateContextType | undefined>(undefined);

export const KitchenStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const state = useKitchenState();
  return (
    <KitchenStateContext.Provider value={state}>
      {children}
    </KitchenStateContext.Provider>
  );
};

export const useKitchen = () => {
  const context = useContext(KitchenStateContext);
  if (context === undefined) {
    throw new Error('useKitchen must be used within a KitchenStateProvider');
  }
  return context;
};
