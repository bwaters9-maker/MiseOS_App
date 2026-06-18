import React, { Suspense, useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { AppHeader } from './components/AppHeader';
import { useKitchenState } from './hooks/useKitchenState';

// --- LAZY-LOADING STRUCTURE ---
const Dashboard = React.lazy(() => import('./components/dashboard/DailyCribSheet'));
const TestKitchenHub = React.lazy(() => import('./TestKitchenHub'));
const PrepChecklist = React.lazy(() => import('./PrepChecklist').then(m => ({ default: m.PrepChecklist })));
const KitchenTimers = React.lazy(() => import('./KitchenTimers').then(m => ({ default: m.KitchenTimers })));
const ShiftHandoverLog = React.lazy(() => import('./ShiftHandoverLog').then(m => ({ default: m.ShiftHandoverLog })));
const HandoverLogForm = React.lazy(() => import('./HandoverLog').then(m => ({ default: m.HandoverLogForm })));
const Settings = React.lazy(() => import('./Settings').then(m => ({ default: m.Settings })));

// --- VIEW MAPPING ---
const viewMap: { [key: string]: React.LazyExoticComponent<React.ComponentType<any>> } = {
  dashboard: Dashboard,
  prep: PrepChecklist,
  timers: KitchenTimers,
  handover: ShiftHandoverLog,
  'new-handover': HandoverLogForm,
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
  const kitchenState = useKitchenState();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 antialiased font-sans">
      <AppHeader activeView={activeView} onNavigate={setActiveView} />
      <main className="py-6">
        <ErrorBoundary>
          <Suspense fallback={<div className="p-12 text-center text-sm text-zinc-500">Loading...</div>}>
            <ActiveViewRenderer view={activeView} {...kitchenState} theme={theme} setTheme={setTheme} />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
