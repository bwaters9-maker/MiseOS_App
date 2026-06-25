import { useKitchenStateContext } from '../context/KitchenStateContext';

/**
 * Hook to access the global kitchen state.
 * Optimized to consume a centralized context, avoiding redundant Firestore listeners.
 */
export const useKitchenState = () => {
  return useKitchenStateContext();
};
