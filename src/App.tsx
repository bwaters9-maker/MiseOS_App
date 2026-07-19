import React, { Suspense, useState, useEffect, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { AppHeader } from './components/AppHeader';
import { KitchenStateProvider, useKitchenSelector } from './components/KitchenStateContext';
import { AuthProvider, useAuth, useRestaurantId } from './components/AuthContext';
import { SignIn } from './components/SignIn';
import { setDoc } from 'firebase/firestore';
import { rDoc } from './lib/firestorePaths';
import type { UnitSystem } from './lib/units';
import type { MenuTemplate, RestaurantProfile } from './types';

// --- LAZY-LOADING STRUCTURE ---
const CribSheetView = React.lazy(() => import('./DailyCribSheet'));
const ChefDashboardView = React.lazy(() => import('./ChefDashboard'));
const StaffView = React.lazy(() => import('./Staff'));
const EventsView = React.lazy(() => import('./EventCalendar'));
const RecipesHub = React.lazy(() => import('./RecipesHub'));
const FeaturesView = React.lazy(() => import('./Features'));
const TestKitchenHub = React.lazy(() => import('./TestKitchenHub'));
const PrepChecklist = React.lazy(() => import('./PrepChecklist').then(m => ({ default: m.PrepChecklist })));
const Settings = React.lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const AlertHistory = React.lazy(() => import('./HistoricalAlerts').then(m => ({ default: m.HistoricalAlerts })));

// --- VIEW MAPPING ---
const viewMap: { [key: string]: React.LazyExoticComponent<React.ComponentType<any>> } = {
  'dashboard-home': ChefDashboardView,
  dashboard: CribSheetView,
  staff: StaffView,
  events: EventsView,
  recipes: RecipesHub,
  features: FeaturesView,
  prep: PrepChecklist,
  'alert-history': AlertHistory,
  'test-kitchen': TestKitchenHub,
  settings: Settings,
};

// --- RENDERER AND APP COMPONENTS ---
const ActiveViewRenderer = ({ view, ...props }: { view: string; [key: string]: any }) => {
  const Component = viewMap[view];
  if (!Component) return <div className="p-6 text-slate">View not found.</div>;
  return <Component {...props} />;
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

const AuthGate: React.FC = () => {
  const { user, loading, restaurantId, restaurantIdLoaded, signOut } = useAuth();

  if (loading || (user && !restaurantIdLoaded)) {
    return (
      <div className="min-h-screen bg-bg-cool flex items-center justify-center">
        <p className="text-xs text-slate font-body uppercase tracking-wider">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-bg-cool flex items-center justify-center p-[21px]">
        <div className="max-w-[377px] text-center space-y-[13px]">
          <p className="text-sm font-bold text-navy">Account not fully configured</p>
          <p className="text-xs text-slate">
            Your account isn't linked to a restaurant yet. Contact your administrator to finish setup.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs font-bold uppercase tracking-wider text-teal hover:opacity-80"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <KitchenStateProvider restaurantId={restaurantId}>
      <AppShell />
    </KitchenStateProvider>
  );
};

const profileDocRef = (restaurantId: string) => rDoc(restaurantId, 'restaurant_profile', 'main');

const AppShell: React.FC = () => {
  const restaurantId = useRestaurantId();
  const restaurantProfile = useKitchenSelector((s: any) => s.restaurantProfile) as RestaurantProfile | null;
  const restaurantProfileLoaded = useKitchenSelector((s: any) => s.restaurantProfileLoaded) as boolean;

  const [activeView, setActiveView] = useState('dashboard-home');
  // 'day' (default, light) | 'service' (dark) — Brand v1.1 surface toggle.
  // Drives [data-surface="service"] token overrides in src/index.css; no
  // component may branch on this value directly, only via CSS custom
  // properties cascading from the attribute below.
  const [theme, setTheme] = useState<'day' | 'service'>('day');
  const [unitSystem, setUnitSystemRaw] = useState<UnitSystem>(
    () => (localStorage.getItem('miseos_unit_system') as UnitSystem | null) ?? 'imperial'
  );
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // targetFcPercent and menuTemplate now live on the restaurant profile doc
  // (migrated from App.tsx state + localStorage) — read fallback to the old
  // localStorage keys keeps a pre-migration browser from flashing defaults.
  const targetFcPercent = restaurantProfile?.targetFcPercent ?? (() => {
    const stored = parseFloat(localStorage.getItem('miseos_target_fc_percent') ?? '');
    return Number.isFinite(stored) && stored > 0 ? stored : 30;
  })();
  const menuTemplate: MenuTemplate = restaurantProfile?.menuTemplate
    ?? (localStorage.getItem('miseos_menu_template') as MenuTemplate | null)
    ?? 'clean';

  const openRecipeInBuilder = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setActiveView('recipes');
  };

  const openEventDetail = (eventId: string) => {
    setSelectedEventId(eventId);
    setActiveView('events');
  };

  const setUnitSystem = (u: UnitSystem) => {
    localStorage.setItem('miseos_unit_system', u);
    setUnitSystemRaw(u);
  };

  const setTargetFcPercent = (v: number) => {
    setDoc(profileDocRef(restaurantId), { targetFcPercent: v }, { merge: true });
  };

  const setMenuTemplate = (t: MenuTemplate) => {
    setDoc(profileDocRef(restaurantId), { menuTemplate: t }, { merge: true });
  };

  // One-time migration: once the profile doc has loaded (whether or not it
  // exists yet), carry any legacy localStorage values into it so future
  // sessions read from Firestore instead. Guarded so it only ever runs once
  // per app load, and only writes fields the profile doc doesn't already have.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (!restaurantProfileLoaded || migratedRef.current) return;
    migratedRef.current = true;
    const patch: Partial<RestaurantProfile> = {};
    if (restaurantProfile?.targetFcPercent == null) {
      const legacy = parseFloat(localStorage.getItem('miseos_target_fc_percent') ?? '');
      if (Number.isFinite(legacy) && legacy > 0) patch.targetFcPercent = legacy;
    }
    if (restaurantProfile?.menuTemplate == null) {
      const legacy = localStorage.getItem('miseos_menu_template');
      if (legacy === 'classic' || legacy === 'clean') patch.menuTemplate = legacy;
    }
    if (Object.keys(patch).length > 0) {
      setDoc(profileDocRef(restaurantId), patch, { merge: true });
    }
  }, [restaurantProfileLoaded, restaurantProfile]);

  useEffect(() => {
    window.document.documentElement.dataset.surface = theme;
  }, [theme]);

  return (
    <div className="h-screen w-full overflow-x-hidden bg-bg-cool text-navy antialiased font-body flex flex-col">
      <AppHeader activeView={activeView} onNavigate={setActiveView} />
      <main className="flex-1 min-h-0 overflow-y-auto py-6">
        <ErrorBoundary>
          <Suspense fallback={<div className="p-12 text-center text-sm text-slate">Loading...</div>}>
            <ActiveViewRenderer
              view={activeView}
              theme={theme}
              setTheme={setTheme}
              unitSystem={unitSystem}
              setUnitSystem={setUnitSystem}
              targetFcPercent={targetFcPercent}
              setTargetFcPercent={setTargetFcPercent}
              menuTemplate={menuTemplate}
              setMenuTemplate={setMenuTemplate}
              selectedRecipeId={selectedRecipeId}
              setSelectedRecipeId={setSelectedRecipeId}
              onOpenRecipe={openRecipeInBuilder}
              selectedEventId={selectedEventId}
              setSelectedEventId={setSelectedEventId}
              onOpenEvent={openEventDetail}
              onNavigate={setActiveView}
            />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
