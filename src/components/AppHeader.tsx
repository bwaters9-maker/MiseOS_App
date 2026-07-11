import React, { useState } from 'react';
import { LayoutDashboard, ClipboardList, Clock, History, Sparkles, Settings, Menu, X, Star, Users, CalendarDays, Package, ChefHat, UtensilsCrossed, LogOut, Truck } from 'lucide-react';
import { useAuth } from './AuthContext';

interface AppHeaderProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

const navItems = [
  { view: 'dashboard', label: 'Crib Sheet', icon: LayoutDashboard },
  { view: 'features', label: 'Features', icon: Star },
  { view: 'staff', label: 'Staff', icon: Users },
  { view: 'events', label: 'Events & Clients', icon: CalendarDays },
  { view: 'ingredients', label: 'Ingredients', icon: Package },
  { view: 'vendors', label: 'Vendors', icon: Truck },
  { view: 'recipes', label: 'Recipes', icon: ChefHat },
  { view: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { view: 'prep', label: 'Prep Checklist', icon: ClipboardList },
  { view: 'timers', label: 'Kitchen Timers', icon: Clock },
  { view: 'alert-history', label: 'Alert History', icon: History },
  { view: 'test-kitchen', label: 'Test Kitchen', icon: Sparkles },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export const AppHeader: React.FC<AppHeaderProps> = ({ activeView, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();

  const handleMobileNav = (view: string) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className='border-b border-line bg-surface/80 backdrop-blur-md sticky top-0 z-50'>
      <div className='max-w-7xl mx-auto px-4 h-16 flex items-center justify-between'>
        <div className='flex items-center gap-6'>
          <div className='flex items-center gap-3'>
              <div className='h-9 w-9 rounded-tile bg-navy flex items-center justify-center font-display font-bold text-cream text-lg'>M</div>
              <div>
                  <div className='flex items-center gap-2'><span className='font-display font-bold tracking-tight text-navy uppercase text-sm'>MISEOS</span><span className='px-1.5 py-0.5 rounded-full bg-saffron-soft text-[10px] font-bold text-saffron-text uppercase'>The Pass</span></div>
                  <p className='text-[10px] text-slate font-medium'>System Operator Matrix</p>
              </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-bg-cool p-1 rounded-card border border-line shadow-inner">
            {navItems.map(item => (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-2 ${
                  activeView === item.view
                    ? 'bg-navy text-cream border-navy shadow-md'
                    : 'bg-transparent text-slate hover:text-navy border-transparent'
                }`}
              >
                <item.icon className='w-3.5 h-3.5' />
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className='hidden md:flex items-center gap-4'>
          <span className='text-xs text-slate font-medium tracking-tight'>Active Workstation Configuration</span>
          <button
            onClick={() => signOut()}
            className='flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate hover:text-navy border border-line rounded-lg transition-colors'
          >
            <LogOut className='w-3.5 h-3.5' />
            Sign Out
          </button>
        </div>
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate hover:text-teal p-2"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      <div
        className={`md:hidden bg-surface/95 backdrop-blur-sm absolute top-16 left-0 w-full border-b border-line shadow-lg transition-all duration-300 ease-in-out ${
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
                  ? 'bg-teal/15 text-teal'
                  : 'text-slate hover:bg-bg-cool'
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