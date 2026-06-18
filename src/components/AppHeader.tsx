import React, { useState } from 'react';
import { LayoutDashboard, ClipboardList, Clock, BookOpen, Send, History, Sparkles, Settings, Menu, X } from 'lucide-react';

interface AppHeaderProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

const navItems = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'prep', label: 'Prep Checklist', icon: ClipboardList },
  { view: 'timers', label: 'Kitchen Timers', icon: Clock },
  { view: 'handover', label: 'Handover Log', icon: BookOpen },
  { view: 'alert-history', label: 'Alert History', icon: History },
  { view: 'new-handover', label: 'New Handover', icon: Send },
  { view: 'test-kitchen', label: 'Test Kitchen', icon: Sparkles },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export const AppHeader: React.FC<AppHeaderProps> = ({ activeView, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileNav = (view: string) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
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
          <div className="hidden md:flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-inner">
            {navItems.map(item => (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-2 ${
                  activeView === item.view
                    ? 'bg-zinc-900 text-emerald-400 border-zinc-700 shadow-md'
                    : 'bg-transparent text-zinc-500 hover:text-zinc-300 border-transparent'
                }`}
              >
                <item.icon className='w-3.5 h-3.5' />
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className='text-right hidden md:block'>
          <span className='text-xs text-zinc-400 font-medium tracking-tight'>Active Workstation Configuration</span>
        </div>
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-zinc-300 hover:text-emerald-400 p-2"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      <div
        className={`md:hidden bg-zinc-950/95 backdrop-blur-sm absolute top-16 left-0 w-full border-b border-zinc-800 shadow-lg transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <nav className="flex flex-col p-4 gap-2">
          {navItems.map(item => (
            <button
              key={item.view}
              onClick={() => handleMobileNav(item.view)}
              className={`px-4 py-3 text-sm font-bold uppercase tracking-wider rounded-lg flex items-center gap-3 text-left transition-colors ${
                activeView === item.view
                  ? 'bg-emerald-800/50 text-emerald-300'
                  : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};