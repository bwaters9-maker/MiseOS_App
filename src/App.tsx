import React, { Suspense, useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { AppHeader } from './components/AppHeader';
import { KitchenStateProvider } from './components/KitchenStateContext';
import type { UnitSystem } from './lib/units';

// --- LAZY-LOADING STRUCTURE ---
const Dashboard = React.lazy(() => import('./DailyCribSheet'));
const FeaturesView = React.lazy(() => import('./Features'));
const StaffView = React.lazy(() => import('./Staff'));
const EventsView = React.lazy(() => import('./EventCalendar'));
const IngredientsView = React.lazy(() => import('./IngredientsTable'));
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
  prep: PrepChecklist,
  timers: KitchenTimers,
  'alert-history': AlertHistory,
  'test-kitchen': TestKitchenHub,
  settings: Settings,
};

// --- RENDERER AND APP COMPONENTS ---
const ActiveViewRenderer = ({ view, ...props }: { view: string; [key: string]: any }) => {
  const Component = viewMap[view];
  if (!Component) return <div className="p-6 text-zinc-500">View not found.</div>;
  return <Component {...props} />;
};

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [unitSystem, setUnitSystemRaw] = useState<UnitSystem>(
    () => (localStorage.getItem('miseos_unit_system') as UnitSystem | null) ?? 'imperial'
  );

  const setUnitSystem = (u: UnitSystem) => {
    localStorage.setItem('miseos_unit_system', u);
    setUnitSystemRaw(u);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <KitchenStateProvider>
      <div className="min-h-screen bg-black text-zinc-100 antialiased font-sans">
        <AppHeader activeView={activeView} onNavigate={setActiveView} />
        <main className="py-6">
          <ErrorBoundary>
            <Suspense fallback={<div className="p-12 text-center text-sm text-zinc-500">Loading...</div>}>
              <ActiveViewRenderer
                view={activeView}
                theme={theme}
                setTheme={setTheme}
                unitSystem={unitSystem}
                setUnitSystem={setUnitSystem}
              />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </KitchenStateProvider>
  );
}
