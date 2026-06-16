import React, { useState } from 'react';
import Dashboard from './Dashboard';
import { PrepChecklist } from './PrepChecklist';
import { LayoutDashboard, ClipboardList } from 'lucide-react';

// Mock data for the PrepChecklist component
const mockPrepItems = [
  {
    name: 'Shallots, Brunoise',
    quantity: 0.5,
    unit: 'kg',
    costPerUnit: 5.00,
    purchaseUnit: 'kg',
    yieldPercent: 92,
    parLevel: 1,
    station: 'Garde Manger',
  },
  {
    name: 'Atlantic Salmon, Portioned',
    quantity: 8,
    unit: 'portions',
    costPerUnit: 36.00,
    purchaseUnit: 'kg',
    yieldPercent: 80,
    parLevel: 15,
    station: 'Sauté',
  },
  {
    name: 'Compound Herb Butter',
    quantity: 0.8,
    unit: 'kg',
    costPerUnit: 12.00,
    purchaseUnit: 'kg',
    yieldPercent: 100,
    parLevel: 1,
    station: 'Grill',
  },
  {
    name: 'Veal Demi-Glace',
    quantity: 2,
    unit: 'L',
    costPerUnit: 25,
    purchaseUnit: 'L',
    yieldPercent: 100,
    parLevel: 4,
    station: 'Saucier',
  }
];

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div className='min-h-screen bg-black text-zinc-100 antialiased font-sans'>
      <header className='border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 h-16 flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-3'>
                <div className='h-9 w-9 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-lg'>M</div>
                <div>
                    <div className='flex items-center gap-2'><span className='font-bold tracking-tight text-white uppercase text-sm'>MISEOS</span><span className='px-1.5 py-0.5 rounded bg-red-950 text-[10px] font-bold border border-red-900 text-red-400 font-mono uppercase'>The Pass</span></div>
                    <p className='text-[10px] text-zinc-500 font-medium'>System Operator Matrix</p>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-inner">
                 <button
                    onClick={() => setActiveView('dashboard')}
                    className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-2 ${
                    activeView === 'dashboard'
                        ? 'bg-zinc-900 text-emerald-400 border-zinc-700 shadow-md'
                        : 'bg-transparent text-zinc-500 hover:text-zinc-300 border-transparent'
                    }`}
                >
                    <LayoutDashboard className='w-3.5 h-3.5' />
                    Dashboard
                </button>
                 <button
                    onClick={() => setActiveView('prep')}
                    className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-2 ${
                    activeView === 'prep'
                        ? 'bg-zinc-900 text-emerald-400 border-zinc-700 shadow-md'
                        : 'bg-transparent text-zinc-500 hover:text-zinc-300 border-transparent'
                    }`}
                >
                    <ClipboardList className='w-3.5 h-3.5' />
                    Prep Checklist
                </button>
            </div>
          </div>
          <div className='text-right hidden sm:block'>
            <span className='text-xs text-zinc-400 font-medium tracking-tight'>Active Workstation Configuration</span>
          </div>
        </div>
      </header>
      <main className='py-6'>
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'prep' && <PrepChecklist ingredients={mockPrepItems} />}
      </main>
    </div>
  );
}
