import { useState, useEffect } from 'react';
import { onSnapshot, DocumentData, DocumentSnapshot, QuerySnapshot, QueryDocumentSnapshot, FirestoreError } from 'firebase/firestore';
import { rCollection, rDoc } from '../lib/firestorePaths';
import type { Feature, Employee, Shift, KitchenEvent, CribNote, Ingredient, Recipe, Client, Vendor, RestaurantProfile, TrendReport } from '../types';

// Based on firebase-blueprint.json
export interface PrepItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  checked: boolean;
  assignedStation: 'Sauté' | 'Grill' | 'Garde Manger' | 'Pastry';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  lastModified?: string;
  recipe_id: string;
}

export const useKitchenState = (restaurantId: string) => {
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [events, setEvents] = useState<KitchenEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cribNotes, setCribNotes] = useState<CribNote[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [restaurantProfileLoaded, setRestaurantProfileLoaded] = useState(false);
  const [trendReport, setTrendReport] = useState<TrendReport | null>(null);
  const [trendReportLoaded, setTrendReportLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    const unsubPrep = onSnapshot(
      rCollection(restaurantId, 'prepItems'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as PrepItem));
        setPrepItems(items);
        setLoading(false);
      },
      (err: FirestoreError) => {
        setError(err);
        setLoading(false);
      }
    );

    const unsubRecipes = onSnapshot(
      rCollection(restaurantId, 'recipes'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Recipe));
        setRecipes(items);
      },
      (error: FirestoreError) => {
        setError(error);
      }
    );

    const unsubFeatures = onSnapshot(
      rCollection(restaurantId, 'features'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setFeatures(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Feature)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubStaff = onSnapshot(
      rCollection(restaurantId, 'staff'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setStaff(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Employee)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubShifts = onSnapshot(
      rCollection(restaurantId, 'shifts'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setShifts(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Shift)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubEvents = onSnapshot(
      rCollection(restaurantId, 'events'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setEvents(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as KitchenEvent)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubClients = onSnapshot(
      rCollection(restaurantId, 'clients'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setClients(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Client)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubCribNotes = onSnapshot(
      rCollection(restaurantId, 'crib_notes'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setCribNotes(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as CribNote)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubIngredients = onSnapshot(
      rCollection(restaurantId, 'ingredients'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setIngredients(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Ingredient)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubVendors = onSnapshot(
      rCollection(restaurantId, 'vendors'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setVendors(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Vendor)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubProfile = onSnapshot(
      rDoc(restaurantId, 'restaurant_profile', 'main'),
      (snap: DocumentSnapshot<DocumentData>) => {
        setRestaurantProfile(snap.exists() ? (snap.data() as RestaurantProfile) : null);
        setRestaurantProfileLoaded(true);
      },
      (err: FirestoreError) => {
        setError(err);
        setRestaurantProfileLoaded(true);
      }
    );

    const unsubTrendReport = onSnapshot(
      rDoc(restaurantId, 'trend_reports', 'latest'),
      (snap: DocumentSnapshot<DocumentData>) => {
        setTrendReport(snap.exists() ? (snap.data() as TrendReport) : null);
        setTrendReportLoaded(true);
      },
      (err: FirestoreError) => {
        setError(err);
        setTrendReportLoaded(true);
      }
    );

    return () => {
      unsubPrep();
      unsubRecipes();
      unsubFeatures();
      unsubStaff();
      unsubShifts();
      unsubEvents();
      unsubClients();
      unsubCribNotes();
      unsubIngredients();
      unsubVendors();
      unsubProfile();
      unsubTrendReport();
    };
  }, [restaurantId]);

  return { prepItems, setPrepItems, recipes, setRecipes, features, staff, shifts, events, clients, cribNotes, ingredients, vendors, restaurantProfile, restaurantProfileLoaded, trendReport, trendReportLoaded, loading, error };
};