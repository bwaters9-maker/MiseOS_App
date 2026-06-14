import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useKitchenState } from './hooks/useKitchenState';
import {
  PrepItem,
  KitchenTimer,
  Recipe,
  HandoverLog,
  Item86,
  PrepStation,
  Ingredient,
  SubRecipe
} from './types';
import {
  INITIAL_HANDOVERS,
  INITIAL_86_ITEMS,
  INITIAL_SUB_RECIPES
} from './data';
import {
  formatMs,
  calculateRawQuantity,
  calculateRecipeCostDetails
} from './utils';
import StationPassHeader from './components/StationPassHeader';
import ErrorBoundary from './components/ErrorBoundary';
import {
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  Sliders,
  Settings,
  PlusCircle,
  HelpCircle,
  Check,
  FileText,
  Volume2,
  VolumeX
} from 'lucide-react';
import { RecipeSpecSheet } from './RecipeSpecSheet';

export default function App() {
  // --- STATE (Hook Integrated) ---
  const { prepItems, setPrepItems, timers, setTimers, recipes, setRecipes } = useKitchenState();

  const [currentStation, setCurrentStation] = useState<PrepStation | 'All'>('All');
  const [handovers, setHandovers] = useState<HandoverLog[]>(() => {
    const saved = localStorage.getItem('miseos_handovers');
    return saved ? JSON.parse(saved) : INITIAL_HANDOVERS;
  });
  const [items86, setItems86] = useState<Item86[]>(() => {
    const saved = localStorage.getItem('miseos_86_items');
    return saved ? JSON.parse(saved) : INITIAL_86_ITEMS;
  });

  const [activeTab, setActiveTab] = useState<'prep' | 'recipes' | 'ai-parser' | 'wire' | 'branding'>('prep');
  const [recipeSubTab, setRecipeSubTab] = useState<'costing' | 'subrecipes' | 'builder'>('costing');
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  // Form Inputs
  const [newPrepName, setNewPrepName] = useState('');
  const [newPrepQty, setNewPrepQty] = useState('');
  const [newPrepUnit, setNewPrepUnit] = useState('oz');
  const [newPrepStation, setNewPrepStation] = useState<PrepStation>('Garde Manger');
  const [newPrepPriority, setNewPrepPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newPrepNotes, setNewPrepNotes] = useState('');

  const [newTimerLabel, setNewTimerLabel] = useState('');
  const [newTimerMins, setNewTimerMins] = useState<number>(5);
  const [newTimerStation, setNewTimerStation] = useState<PrepStation>('Garde Manger');

  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error(e);
    }
  };

  // --- BACKGROUND TIME LOOP MANAGEMENT ---
  useEffect(() => {
    const timerInterval = setInterval(() => {
      let triggeredAlarm = false;
      const nextTimers = timers.map((t: KitchenTimer) => {
        if (t.status === 'running') {
          const nextElapsed = t.elapsedMs + 1000;
          if (nextElapsed >= t.durationMs) {
            triggeredAlarm = true;
            return { ...t, elapsedMs: t.durationMs, status: 'alarm' } as KitchenTimer;
          }
          return { ...t, elapsedMs: nextElapsed } as KitchenTimer;
        }
        return t;
      });

      setTimers(nextTimers);
      if (triggeredAlarm) playAlertSound();
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [soundEnabled, timers]);

  // --- LOCAL ACTION EVENT HANDLERS ---
  const handleTogglePrep = (id: string) => {
    setPrepItems(prepItems.map((i: PrepItem) => i.id === id ? { ...i, checked: !i.checked, lastModified: new Date().toLocaleTimeString() } : i));
  };

  const handleDeletePrep = (id: string) => {
    setPrepItems(prepItems.filter((i: PrepItem) => i.id !== id));
  };

  const handleStartTimer = (id: string) => {
    setTimers(timers.map((t: KitchenTimer) => t.id === id ? { ...t, status: 'running' } : t));
  };

  const handlePauseTimer = (id: string) => {
    setTimers(timers.map((t: KitchenTimer) => t.id === id ? { ...t, status: 'paused' } : t));
  };

  const handleResetTimer = (id: string) => {
    setTimers(timers.map((t: KitchenTimer) => t.id === id ? { ...t, status: 'idle', elapsedMs: 0 } : t));
  };

  const handleDeleteTimer = (id: string) => {
    setTimers(timers.filter((t: KitchenTimer) => t.id !== id));
  };

  const handleAddTimer = (e: FormEvent) => {
    e.preventDefault();
    if (!newTimerLabel.trim() || newTimerMins <= 0) return;
    const newT: KitchenTimer = {
      id: `t-${Date.now()}`,
      label: newTimerLabel.trim(),
      durationMs: newTimerMins * 60 * 1000,
      elapsedMs: 0,
      status: 'idle',
      station: newTimerStation
    };
    setTimers([...timers, newT]);
    newTimerLabel;
    setNewTimerLabel('');
  };

  const handleAddPrep = (e: FormEvent) => {
    e.preventDefault();
    if (!newPrepName.trim() || !newPrepQty.trim()) return;
    const newItem: PrepItem = {
      id: `p-${Date.now()}`,
      name: newPrepName.trim(),
      quantity: newPrepQty,
      unit: newPrepUnit,
      checked: false,
      assignedStation: newPrepStation,
      priority: newPrepPriority,
      notes: newPrepNotes.trim() || undefined,
      lastModified: new Date().toLocaleTimeString()
    };
    setPrepItems([newItem, ...prepItems]);
    setNewPrepName(''); setNewPrepQty(''); setNewPrepNotes('');
  };

  // Filter lists by chosen active culinary station
  const activePrepSource = prepItems && prepItems.length > 0 ? prepItems : [];
  const activeRecipeSource = recipes && recipes.length > 0 ? recipes : [];

  const filteredPrepItems = activePrepSource.filter(item => 
    currentStation === 'All' || item.assignedStation?.toLowerCase() === currentStation.toLowerCase()
  );
  const filteredRecipes = activeRecipeSource.filter(r => 
    currentStation === 'All' || r.station?.toLowerCase() === currentStation.toLowerCase()
  );
  const totalPrepCount = prepItems.filter(i => !i.checked).length;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono text-sm antialiased selection:bg-emerald-800 selection:text-white">
        {/* Dynamic Navigation Header Element */}
        <StationPassHeader 
          currentStation={currentStation}
          setCurrentStation={setCurrentStation}
          totalPrepCount={totalPrepCount}
          completedPrepCount={prepItems.filter((i: any) => i.checked).length}
          activeAlarmsCount={timers.filter((t: any) => t.status === 'alarm').length}
          item86Count={items86.length}
        />

        <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
          {activeRecipe ? (
            <RecipeSpecSheet recipe={activeRecipe} onBack={() => setActiveRecipe(null)} />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* Station Control Board Title Grid Layout */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h2 className="text-base font-black tracking-widest uppercase text-zinc-400">
                  {currentStation} STATION PASS ACTIVE
                </h2>
              </div>

              {/* Grid System Renders Here */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map((recipe: Recipe) => (
                  <div 
                    key={recipe.id}
                    onClick={() => setActiveRecipe(recipe)}
                    className="group relative bg-zinc-900/40 border border-zinc-900 hover:border-emerald-500/50 p-5 rounded-xl transition-all duration-300 cursor-pointer shadow-md hover:shadow-emerald-950/20"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-zinc-950 text-zinc-400 rounded-md border border-zinc-800">
                        {recipe.station}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">${recipe.salePrice?.toFixed(2) || '0.00'}</span>
                    </div>
                    <h3 className="text-base font-black text-white uppercase group-hover:text-emerald-400 transition-colors">
                      {recipe.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-2">Click to open composition spec sheet &rarr;</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}









