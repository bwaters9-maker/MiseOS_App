import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Sun, Moon, Trash2, PlusCircle, AlertTriangle, Pencil, Check, X, Scale, LogOut, User, ChefHat, Image } from 'lucide-react';
import type { UnitSystem } from './lib/units';
import { db } from './firebaseConfig';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, updateDoc, setDoc, deleteField } from 'firebase/firestore';
import { AlertDialog } from './components/AlertDialog';
import { useAuth } from './components/AuthContext';
import { useKitchenSelector } from './components/KitchenStateContext';
import Ingredients from './IngredientsTable';
import Vendors from './Vendors';
import type { RestaurantProfile, CuisineStyle, PricePoint } from './types';

interface SettingsProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  unitSystem?: UnitSystem;
  setUnitSystem?: (u: UnitSystem) => void;
  targetFcPercent?: number;
  setTargetFcPercent?: (v: number) => void;
}

interface StationPreset {
  id: string;
  name: string;
}

const DEFAULT_RECIPE_CATEGORIES = ['Sides', 'Sauces', 'Salads', 'Soups', 'Proteins', 'Desserts'];

interface RecipeCategoryPreset {
  id: string;
  name: string;
}

const DEFAULT_EVENT_TYPES = ['Wedding', 'Private Dining', 'Buyout', 'Bridal Shower', 'Corporate', 'Celebration of Life', 'Special Event'];

interface EventTypePreset {
  id: string;
  name: string;
}

const CUISINE_STYLES: CuisineStyle[] = [
  'American', 'Italian', 'French', 'Mexican', 'Asian', 'Mediterranean',
  'Steakhouse', 'Seafood', 'Farm-to-Table', 'BBQ', 'Pizza', 'Bakery/Café', 'Fusion', 'Other',
];

const PRICE_POINTS: PricePoint[] = ['$', '$$', '$$$', '$$$$'];

const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

interface ProfileFormState {
  name: string;
  chefName: string;
  brandColor: string;
  cuisineStyle: CuisineStyle | '';
  pricePoint: PricePoint | '';
  city: string;
  state: string;
  regionalNotes: string;
}

const BLANK_PROFILE_FORM = (): ProfileFormState => ({
  name: '', chefName: '', brandColor: '', cuisineStyle: '', pricePoint: '', city: '', state: '', regionalNotes: '',
});

const profileToForm = (p: RestaurantProfile): ProfileFormState => ({
  name: p.name ?? '',
  chefName: p.chefName ?? '',
  brandColor: p.brandColor ?? '',
  cuisineStyle: p.cuisineStyle ?? '',
  pricePoint: p.pricePoint ?? '',
  city: p.city ?? '',
  state: p.state ?? '',
  regionalNotes: p.regionalNotes ?? '',
});

/** Every field is written explicitly — blank ones use deleteField() so
 * clearing a field in the form actually clears it in Firestore, rather than
 * silently leaving the old value behind. Combined with setDoc(..., {merge:
 * true}) at the call site, this only ever touches these profile fields —
 * targetFcPercent/menuTemplate (owned by App.tsx) are never affected. */
const profileToDoc = (f: ProfileFormState) => ({
  name: f.name.trim() ? f.name.trim() : deleteField(),
  chefName: f.chefName.trim() ? f.chefName.trim() : deleteField(),
  brandColor: f.brandColor ? f.brandColor : deleteField(),
  cuisineStyle: f.cuisineStyle ? f.cuisineStyle : deleteField(),
  pricePoint: f.pricePoint ? f.pricePoint : deleteField(),
  city: f.city.trim() ? f.city.trim() : deleteField(),
  state: f.state ? f.state : deleteField(),
  regionalNotes: f.regionalNotes.trim() ? f.regionalNotes.trim() : deleteField(),
});

export const Settings: React.FC<SettingsProps> = ({ theme, setTheme, unitSystem = 'imperial', setUnitSystem, targetFcPercent = 30, setTargetFcPercent }) => {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'ingredients' | 'vendors'>('general');

  const restaurantProfile = useKitchenSelector((s: any) => s.restaurantProfile) as RestaurantProfile | null;
  const restaurantProfileLoaded = useKitchenSelector((s: any) => s.restaurantProfileLoaded) as boolean;
  const [profileForm, setProfileForm] = useState<ProfileFormState>(BLANK_PROFILE_FORM());
  const [savingProfile, setSavingProfile] = useState(false);
  const profileSeeded = useRef(false);

  useEffect(() => {
    if (!restaurantProfileLoaded || profileSeeded.current) return;
    profileSeeded.current = true;
    if (restaurantProfile) setProfileForm(profileToForm(restaurantProfile));
  }, [restaurantProfileLoaded, restaurantProfile]);

  const handleSaveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      await setDoc(doc(db, 'restaurant_profile', 'main'), profileToDoc(profileForm), { merge: true });
    } finally {
      setSavingProfile(false);
    }
  };
  const [stations, setStations] = useState<StationPreset[]>([]);
  const [newStationName, setNewStationName] = useState('');
  const [stationToDelete, setStationToDelete] = useState<StationPreset | null>(null);
  const [stationToEdit, setStationToEdit] = useState<StationPreset | null>(null);
  const [editingStationName, setEditingStationName] = useState('');

  const [categories, setCategories] = useState<RecipeCategoryPreset[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<RecipeCategoryPreset | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<RecipeCategoryPreset | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const categorySeeding = useRef(false);

  const [eventTypes, setEventTypes] = useState<EventTypePreset[]>([]);
  const [newEventTypeName, setNewEventTypeName] = useState('');
  const [eventTypeToDelete, setEventTypeToDelete] = useState<EventTypePreset | null>(null);
  const [eventTypeToEdit, setEventTypeToEdit] = useState<EventTypePreset | null>(null);
  const [editingEventTypeName, setEditingEventTypeName] = useState('');
  const eventTypeSeeding = useRef(false);

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

  useEffect(() => {
    const q = query(collection(db, 'recipe_categories'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty && !categorySeeding.current) {
        categorySeeding.current = true;
        Promise.all(DEFAULT_RECIPE_CATEGORIES.map(name => addDoc(collection(db, 'recipe_categories'), { name })));
      }
      const categoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RecipeCategoryPreset));
      setCategories(categoryData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'event_types'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty && !eventTypeSeeding.current) {
        eventTypeSeeding.current = true;
        Promise.all(DEFAULT_EVENT_TYPES.map(name => addDoc(collection(db, 'event_types'), { name })));
      }
      const eventTypeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EventTypePreset));
      setEventTypes(eventTypeData);
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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() === '') return;
    await addDoc(collection(db, 'recipe_categories'), { name: newCategoryName.trim() });
    setNewCategoryName('');
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteDoc(doc(db, 'recipe_categories', id));
    setCategoryToDelete(null);
  };

  const handleEditCategoryClick = (category: RecipeCategoryPreset) => {
    setCategoryToEdit(category);
    setEditingCategoryName(category.name);
  };

  const handleCancelEditCategory = () => {
    setCategoryToEdit(null);
    setEditingCategoryName('');
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToEdit || editingCategoryName.trim() === '') return;
    await updateDoc(doc(db, 'recipe_categories', categoryToEdit.id), { name: editingCategoryName.trim() });
    handleCancelEditCategory();
  };

  const handleAddEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEventTypeName.trim() === '') return;
    await addDoc(collection(db, 'event_types'), { name: newEventTypeName.trim() });
    setNewEventTypeName('');
  };

  const handleDeleteEventType = async (id: string) => {
    await deleteDoc(doc(db, 'event_types', id));
    setEventTypeToDelete(null);
  };

  const handleEditEventTypeClick = (eventType: EventTypePreset) => {
    setEventTypeToEdit(eventType);
    setEditingEventTypeName(eventType.name);
  };

  const handleCancelEditEventType = () => {
    setEventTypeToEdit(null);
    setEditingEventTypeName('');
  };

  const handleUpdateEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTypeToEdit || editingEventTypeName.trim() === '') return;
    await updateDoc(doc(db, 'event_types', eventTypeToEdit.id), { name: editingEventTypeName.trim() });
    handleCancelEditEventType();
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
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

      <div className="flex items-center gap-2 mb-6">
        {(['general', 'ingredients', 'vendors'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSettingsTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-colors ${
              settingsTab === tab
                ? 'bg-emerald-700 text-white border-emerald-600'
                : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700/50 hover:text-zinc-200'
            }`}
          >
            {tab === 'general' ? 'General' : tab === 'ingredients' ? 'Ingredients' : 'Vendors'}
          </button>
        ))}
      </div>

      {settingsTab === 'general' && (
        <>
      <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md">
        <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800/80 pb-3 mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          Account
        </h3>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-300 font-semibold">{user?.email}</span>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-zinc-700 hover:bg-red-950/40 hover:border-red-900 hover:text-red-300 text-zinc-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            {signingOut ? 'Signing Out…' : 'Sign Out'}
          </button>
        </div>
      </div>

      <div className="mt-6 bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md">
        <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800/80 pb-3 mb-4 flex items-center gap-2">
          <ChefHat className="w-4 h-4" />
          Restaurant Profile
        </h3>
        <p className="text-[10px] text-zinc-600 mb-4 uppercase tracking-wider">
          Identity and regional context — injected into every AI prompt so suggestions fit this kitchen, not a generic one
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Restaurant Name</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              placeholder="Restaurant name"
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Chef Name</label>
            <input
              type="text"
              value={profileForm.chefName}
              onChange={e => setProfileForm({ ...profileForm, chefName: e.target.value })}
              placeholder="Executive chef name"
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Cuisine Style</label>
            <select
              value={profileForm.cuisineStyle}
              onChange={e => setProfileForm({ ...profileForm, cuisineStyle: e.target.value as CuisineStyle | '' })}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">— Select —</option>
              {CUISINE_STYLES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Price Point</label>
            <select
              value={profileForm.pricePoint}
              onChange={e => setProfileForm({ ...profileForm, pricePoint: e.target.value as PricePoint | '' })}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">— Select —</option>
              {PRICE_POINTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Brand Color</label>
            <input
              type="color"
              value={profileForm.brandColor || '#000000'}
              onChange={e => setProfileForm({ ...profileForm, brandColor: e.target.value })}
              className="w-full h-[34px] bg-zinc-900 border border-zinc-700 rounded-lg px-1 py-1 cursor-pointer"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">City</label>
            <input
              type="text"
              value={profileForm.city}
              onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
              placeholder="e.g. Buffalo"
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">State</label>
            <select
              value={profileForm.state}
              onChange={e => setProfileForm({ ...profileForm, state: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">— Select —</option>
              {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Regional Notes</label>
          <p className="text-[10px] text-zinc-600 mb-2">Local ingredients, traditions, whatever gives the AI a feel for this region — a chef in Buffalo has a different conversation than Napa</p>
          <textarea
            value={profileForm.regionalNotes}
            onChange={e => setProfileForm({ ...profileForm, regionalNotes: e.target.value })}
            placeholder="e.g. Heavy Western NY / Great Lakes influence — beef on weck, sponge candy, chicken wings culture, Niagara wine country nearby"
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
        <div className="flex items-center justify-between gap-3 bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2 mb-4">
          <span className="flex items-center gap-2 text-[10px] text-zinc-600 uppercase tracking-wider">
            <Image className="w-3.5 h-3.5" />
            Logo Upload
          </span>
          <span className="text-[10px] text-zinc-600 italic">Pending — not yet implemented</span>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-white text-xs uppercase font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      <div className="mt-6 bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md">
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
          Recipe Costing
        </h3>
        <p className="text-[10px] text-zinc-600 mb-3 uppercase tracking-wider">Target food cost % used for the Recipes cost panel and suggested pricing</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={targetFcPercent}
            onChange={(e) => setTargetFcPercent?.(parseFloat(e.target.value) || 0)}
            min={1}
            max={100}
            step="0.5"
            className="w-32 bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">% Target Food Cost</span>
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

      <div className="mt-6 bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md">
        <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800/80 pb-3 mb-4">
          Recipe Categories
        </h3>
        <p className="text-[10px] text-zinc-600 mb-3 uppercase tracking-wider">Used to categorize both Menu Recipes and Sub-Recipes in the Recipes tab</p>
        <div className="space-y-2 mb-4">
          {categories.map((category) => (
            <div key={category.id}>
              {categoryToEdit?.id === category.id ? (
                <form onSubmit={handleUpdateCategory} className="flex items-center justify-between bg-zinc-700/50 p-2 rounded-md text-xs">
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    className="flex-grow bg-zinc-900 border border-emerald-700 text-zinc-200 text-xs rounded-lg px-3 py-1 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-1 ml-2">
                    <button type="submit" className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-full hover:bg-emerald-950/50 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={handleCancelEditCategory} className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-full hover:bg-zinc-800 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-md text-xs group">
                  <span className="font-semibold text-zinc-300">{category.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      aria-label={`Edit recipe category name for ${category.name}`}
                      onClick={() => handleEditCategoryClick(category)} className="text-zinc-500 hover:text-blue-400 p-1 rounded-full hover:bg-blue-950/50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      aria-label={`Delete recipe category ${category.name}`}
                      onClick={() => setCategoryToDelete(category)}
                      className="text-zinc-500 hover:text-red-400 p-1 rounded-full hover:bg-red-950/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-xs text-zinc-600 italic text-center p-4">No recipe categories configured.</p>
          )}
        </div>
        <form onSubmit={handleAddCategory} className="flex items-center gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name..."
            className="flex-grow bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-white text-xs uppercase font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            disabled={!newCategoryName.trim()}
          >
            <PlusCircle className="w-4 h-4" />
            Add
          </button>
        </form>
      </div>

      <div className="mt-6 bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 shadow-md">
        <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800/80 pb-3 mb-4">
          Event Types
        </h3>
        <p className="text-[10px] text-zinc-600 mb-3 uppercase tracking-wider">Used to categorize events in the Events &amp; Clients tab</p>
        <div className="space-y-2 mb-4">
          {eventTypes.map((eventType) => (
            <div key={eventType.id}>
              {eventTypeToEdit?.id === eventType.id ? (
                <form onSubmit={handleUpdateEventType} className="flex items-center justify-between bg-zinc-700/50 p-2 rounded-md text-xs">
                  <input
                    type="text"
                    value={editingEventTypeName}
                    onChange={(e) => setEditingEventTypeName(e.target.value)}
                    className="flex-grow bg-zinc-900 border border-emerald-700 text-zinc-200 text-xs rounded-lg px-3 py-1 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-1 ml-2">
                    <button type="submit" className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-full hover:bg-emerald-950/50 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={handleCancelEditEventType} className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-full hover:bg-zinc-800 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-md text-xs group">
                  <span className="font-semibold text-zinc-300">{eventType.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      aria-label={`Edit event type name for ${eventType.name}`}
                      onClick={() => handleEditEventTypeClick(eventType)} className="text-zinc-500 hover:text-blue-400 p-1 rounded-full hover:bg-blue-950/50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      aria-label={`Delete event type ${eventType.name}`}
                      onClick={() => setEventTypeToDelete(eventType)}
                      className="text-zinc-500 hover:text-red-400 p-1 rounded-full hover:bg-red-950/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {eventTypes.length === 0 && (
            <p className="text-xs text-zinc-600 italic text-center p-4">No event types configured.</p>
          )}
        </div>
        <form onSubmit={handleAddEventType} className="flex items-center gap-2">
          <input
            type="text"
            value={newEventTypeName}
            onChange={(e) => setNewEventTypeName(e.target.value)}
            placeholder="New event type..."
            className="flex-grow bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-white text-xs uppercase font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            disabled={!newEventTypeName.trim()}
          >
            <PlusCircle className="w-4 h-4" />
            Add
          </button>
        </form>
      </div>
        </>
      )}
      {settingsTab === 'ingredients' && <Ingredients unitSystem={unitSystem} />}
      {settingsTab === 'vendors' && <Vendors />}

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

      <AlertDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => categoryToDelete && handleDeleteCategory(categoryToDelete.id)}
        title="Delete Recipe Category"
        confirmText="Delete"
        variant="destructive"
      >
        <p>
          Are you sure you want to delete the "<strong>{categoryToDelete?.name}</strong>" category? Recipes using it will show as uncategorized. This action cannot be undone.
        </p>
      </AlertDialog>

      <AlertDialog
        isOpen={!!eventTypeToDelete}
        onClose={() => setEventTypeToDelete(null)}
        onConfirm={() => eventTypeToDelete && handleDeleteEventType(eventTypeToDelete.id)}
        title="Delete Event Type"
        confirmText="Delete"
        variant="destructive"
      >
        <p>
          Are you sure you want to delete the "<strong>{eventTypeToDelete?.name}</strong>" event type? Events using it will keep the old label as plain text. This action cannot be undone.
        </p>
      </AlertDialog>
    </div>
  );
};