import React, { Suspense, useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { AppHeader } from './components/AppHeader';
import { KitchenStateProvider } from './components/KitchenStateContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import { SignIn } from './components/SignIn';
import type { UnitSystem } from './lib/units';
import type { MenuTemplate } from './types';

// --- LAZY-LOADING STRUCTURE ---
const Dashboard = React.lazy(() => import('./DailyCribSheet'));
const FeaturesView = React.lazy(() => import('./Features'));
const StaffView = React.lazy(() => import('./Staff'));
const EventsView = React.lazy(() => import('./EventCalendar'));
const IngredientsView = React.lazy(() => import('./IngredientsTable'));
const VendorsView = React.lazy(() => import('./Vendors'));
const RecipesView = React.lazy(() => import('./Recipes'));
const MenuView = React.lazy(() => import('./Menu'));
const TestKitchenHub = React.lazy(() => import('./TestKitchenHub'));
const PrepChecklist = React.lazy(() => import('./PrepChecklist').then(m => ({ default: m.PrepChecklist })));
const KitchenTimers = React.lazy(() => import('./KitchenTimers').then(m => ({ default: m.KitchenTimers })));
const Settings = React.lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const AlertHistory = React.lazy(() => import('./HistoricalAlerts').then(m => ({ default: m.HistoricalAlerts })));

// --- VIEW MAPPING ---
const viewMap: { [key: string]: React.LazyExoticComponent<React.ComponentType<any>> } = {
  dashboard: Dashboard,
  features: FeaturesView,
  staff: StaffView,
  events: EventsView,
  ingredients: IngredientsView,
  vendors: VendorsView,
  recipes: RecipesView,
  menu: MenuView,
  prep: PrepChecklist,
  timers: KitchenTimers,
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
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-cool flex items-center justify-center">
        <p className="text-xs text-slate font-body uppercase tracking-wider">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  return <AppShell />;
};

const AppShell: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [unitSystem, setUnitSystemRaw] = useState<UnitSystem>(
    () => (localStorage.getItem('miseos_unit_system') as UnitSystem | null) ?? 'imperial'
  );
  const [targetFcPercent, setTargetFcPercentRaw] = useState<number>(() => {
    const stored = parseFloat(localStorage.getItem('miseos_target_fc_percent') ?? '');
    return Number.isFinite(stored) && stored > 0 ? stored : 30;
  });
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [menuTemplate, setMenuTemplateRaw] = useState<MenuTemplate>(
    () => (localStorage.getItem('miseos_menu_template') as MenuTemplate | null) ?? 'clean'
  );

  const openRecipeInBuilder = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setActiveView('recipes');
  };

  const setUnitSystem = (u: UnitSystem) => {
    localStorage.setItem('miseos_unit_system', u);
    setUnitSystemRaw(u);
  };

  const setTargetFcPercent = (v: number) => {
    localStorage.setItem('miseos_target_fc_percent', String(v));
    setTargetFcPercentRaw(v);
  };

  const setMenuTemplate = (t: MenuTemplate) => {
    localStorage.setItem('miseos_menu_template', t);
    setMenuTemplateRaw(t);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <KitchenStateProvider>
      <div className="min-h-screen bg-bg-cool text-navy antialiased font-body">
        <AppHeader activeView={activeView} onNavigate={setActiveView} />
        <main className="py-6">
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
              />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </KitchenStateProvider>
  );
}
