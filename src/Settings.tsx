import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Sun, Moon, Trash2, PlusCircle, AlertTriangle, Pencil, Check, X, Scale } from 'lucide-react';
import type { UnitSystem } from './lib/units';
import { db } from './firebaseConfig';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { AlertDialog } from './components/AlertDialog';

interface SettingsProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  unitSystem?: UnitSystem;
  setUnitSystem?: (u: UnitSystem) => void;
}

interface StationPreset {
  id: string;
  name: string;
}

export const Settings: React.FC<SettingsProps> = ({ theme, setTheme, unitSystem = 'imperial', setUnitSystem }) => {
  const [stations, setStations] = useState<StationPreset[]>([]);
  const [newStationName, setNewStationName] = useState('');
  const [stationToDelete, setStationToDelete] = useState<StationPreset | null>(null);
  const [stationToEdit, setStationToEdit] = useState<StationPreset | null>(null);
  const [editingStationName, setEditingStationName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'station_presets'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StationPreset));
      setStations(stationData);
    });

    return () => unsubscribe();
  }, []);

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStationName.trim() === '') return;
    await addDoc(collection(db, 'station_presets'), { name: newStationName.trim() });
    setNewStationName('');
  };

  const handleDeleteStation = async (id: string) => {
    await deleteDoc(doc(db, 'station_presets', id));
    setStationToDelete(null);
  };

  const handleEditClick = (station: StationPreset) => {
    setStationToEdit(station);
    setEditingStationName(station.name);
  };

  const handleCancelEdit = () => {
    setStationToEdit(null);
    setEditingStationName('');
  };

  const handleUpdateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationToEdit || editingStationName.trim() === '') return;
    await updateDoc(doc(db, 'station_presets', stationToEdit.id), { name: editingStationName.trim() });
    handleCancelEdit();
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-zinc-950 text-zinc-100 font-mono tracking-tight">
      <div className="border-b border-zinc-900 pb-4 mb-6">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-emerald-400" />
          System Settings
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Configure global application settings and preferences.</p>
      </div>

      <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md">
        <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800/80 pb-3 mb-4">
          Theme
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
              theme === 'light'
                ? 'bg-zinc-200 text-zinc-900 border-zinc-400'
                : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700/50 hover:text-zinc-200'
            }`}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
              theme === 'dark'
                ? 'bg-emerald-700 text-white border-emerald-600'
                : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700/50 hover:text-zinc-200'
            }`}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
        </div>
      </div>

      <div className="mt-6 bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md">
        <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800/80 pb-3 mb-4 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          Display Units
        </h3>
        <p className="text-[10px] text-zinc-600 mb-3 uppercase tracking-wider">Used throughout the app for ingredient quantities and costs</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnitSystem?.('imperial')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
              unitSystem === 'imperial'
                ? 'bg-emerald-700 text-white border-emerald-600'
                : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700/50 hover:text-zinc-200'
            }`}
          >
            Imperial (oz · lb · fl oz · qt)
          </button>
          <button
            onClick={() => setUnitSystem?.('metric')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
              unitSystem === 'metric'
                ? 'bg-emerald-700 text-white border-emerald-600'
                : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700/50 hover:text-zinc-200'
            }`}
          >
            Metric (g · kg · ml · L)
          </button>
        </div>
      </div>

      <div className="mt-6 bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md">
        <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800/80 pb-3 mb-4">
          Station Presets
        </h3>
        <div className="space-y-2 mb-4">
          {stations.map((station) => (
            <div key={station.id}>
              {stationToEdit?.id === station.id ? (
                <form onSubmit={handleUpdateStation} className="flex items-center justify-between bg-zinc-700/50 p-2 rounded-md text-xs">
                  <input
                    type="text"
                    value={editingStationName}
                    onChange={(e) => setEditingStationName(e.target.value)}
                    className="flex-grow bg-zinc-900 border border-emerald-700 text-zinc-200 text-xs rounded-lg px-3 py-1 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-1 ml-2">
                    <button type="submit" className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-full hover:bg-emerald-950/50 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={handleCancelEdit} className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-full hover:bg-zinc-800 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-md text-xs group">
                  <span className="font-semibold text-zinc-300">{station.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      aria-label={`Edit station name for ${station.name}`}
                      onClick={() => handleEditClick(station)} className="text-zinc-500 hover:text-blue-400 p-1 rounded-full hover:bg-blue-950/50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      aria-label={`Delete station preset ${station.name}`}
                      onClick={() => setStationToDelete(station)}
                      className="text-zinc-500 hover:text-red-400 p-1 rounded-full hover:bg-red-950/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {stations.length === 0 && (
            <p className="text-xs text-zinc-600 italic text-center p-4">No station presets configured.</p>
          )}
        </div>
        <form onSubmit={handleAddStation} className="flex items-center gap-2">
          <input
            type="text"
            value={newStationName}
            onChange={(e) => setNewStationName(e.target.value)}
            placeholder="New station name..."
            className="flex-grow bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-white text-xs uppercase font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            disabled={!newStationName.trim()}
          >
            <PlusCircle className="w-4 h-4" />
            Add
          </button>
        </form>
      </div>

      <AlertDialog
        isOpen={!!stationToDelete}
        onClose={() => setStationToDelete(null)}
        onConfirm={() => stationToDelete && handleDeleteStation(stationToDelete.id)}
        title="Delete Station Preset"
        confirmText="Delete"
        variant="destructive"
      >
        <p>
          Are you sure you want to delete the "<strong>{stationToDelete?.name}</strong>" preset? This action cannot be undone.
        </p>
      </AlertDialog>
    </div>
  );
};