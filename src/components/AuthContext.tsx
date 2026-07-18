import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** The signed-in user's restaurantId custom claim, or null if absent/not yet resolved. */
  restaurantId: string | null;
  /** True once the restaurantId claim lookup for the current user has settled (signed-out counts as settled immediately). */
  restaurantIdLoaded: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantIdLoaded, setRestaurantIdLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      if (!u) {
        setRestaurantId(null);
        setRestaurantIdLoaded(true);
        return;
      }

      setRestaurantIdLoaded(false);
      try {
        // Force-refresh: a cached ID token (e.g. from a session persisted
        // before a claim was set or changed) would otherwise report stale
        // claims instead of the account's current restaurantId.
        const tokenResult = await u.getIdTokenResult(true);
        const claim = tokenResult.claims.restaurantId;
        setRestaurantId(typeof claim === 'string' && claim.length > 0 ? claim : null);
      } catch {
        setRestaurantId(null);
      } finally {
        setRestaurantIdLoaded(true);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, restaurantId, restaurantIdLoaded, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

/**
 * Non-null restaurantId for components that only ever render below
 * AuthGate's blocked-state check (i.e. everything inside AppShell).
 * Throws if that invariant is ever violated instead of silently
 * querying restaurants/null/... .
 */
export const useRestaurantId = (): string => {
  const { restaurantId } = useAuth();
  if (!restaurantId) {
    throw new Error('useRestaurantId called without a resolved restaurantId — this component must render below AuthGate\'s claim check.');
  }
  return restaurantId;
};
