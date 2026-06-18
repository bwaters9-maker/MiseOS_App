import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AppHeader } from './components/AppHeader';
import { useKitchenState } from './hooks/useKitchenState';

// Lazy load the main views to split them into separate chunks
const DashboardView = lazy(() => import('./Dashboard'));
const PrepChecklist = lazy(() => import('./PrepChecklist').then(module => ({ default: module.PrepChecklist })));
const KitchenTimers = lazy(() => import('./KitchenTimers').then(module => ({ default: module.KitchenTimers })));
const ShiftHandoverLog = lazy(() => import('./ShiftHandoverLog').then(module => ({ default: module.ShiftHandoverLog })));
const HandoverLogForm = lazy(() => import('./HandoverLog').then(module => ({ default: module.HandoverLogForm })));
const Settings = lazy(() => import('./Settings').then(module => ({ default: module.Settings })));
const TestKitchenHub = lazy(() => import('./TestKitchenHub'));
const HistoricalAlerts = lazy(() => import('./HistoricalAlerts').then(module => ({ default: module.HistoricalAlerts })));

// A simple loading fallback component to show while chunks are loading
const LoadingFallback = () => (
  <div className="p-12 text-center text-sm text-zinc-500 uppercase tracking-widest">
    Loading View...
  </div>
);

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const { prepItems, setPrepItems, recipes } = useKitchenState();
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <div className='min-h-screen bg-black text-zinc-100 antialiased font-sans'>
      <AppHeader activeView={activeView} onNavigate={setActiveView} />
      <main className='py-6'>
        <Suspense fallback={<LoadingFallback />}>
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'prep' && <PrepChecklist prepItems={prepItems} />}
          {activeView === 'timers' && <KitchenTimers />}
          {activeView === 'handover' && <ShiftHandoverLog />}
          {activeView === 'alert-history' && <HistoricalAlerts />}
          {activeView === 'test-kitchen' && <TestKitchenHub />}
          {activeView === 'settings' && <Settings theme={theme} setTheme={setTheme} />}
          {activeView === 'new-handover' && (
            <div className="max-w-4xl mx-auto p-6">
              <HandoverLogForm
                recipes={recipes}
                productionRuns={prepItems}
                setProductionRuns={setPrepItems}
                currentUser="Chef Brian"
              />
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}