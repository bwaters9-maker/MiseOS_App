import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, onSnapshot, DocumentData, DocumentSnapshot, QuerySnapshot, QueryDocumentSnapshot, FirestoreError } from 'firebase/firestore';
import type { Feature, Employee, Shift, KitchenEvent, KitchenAlert, CribNote, Ingredient, Recipe, Client, Vendor, RestaurantProfile, TrendReport } from '../types';

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

export interface Item86 {
  id: string;
  name: string;
  status: 'out' | 'limited';
  substitute?: string;
  timestamp: string;
}

export const useKitchenState = () => {
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items86, setItems86] = useState<Item86[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [events, setEvents] = useState<KitchenEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [alerts, setAlerts] = useState<KitchenAlert[]>([]);
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
      collection(db, 'prepItems'),
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
      collection(db, 'recipes'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Recipe));
        setRecipes(items);
      },
      (error: FirestoreError) => {
        setError(error);
      }
    );

    const unsub86 = onSnapshot(
      collection(db, 'items86'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Item86));
        setItems86(items);
      },
      (error: FirestoreError) => {
        setError(error);
      }
    );

    const unsubFeatures = onSnapshot(
      collection(db, 'features'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setFeatures(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Feature)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubStaff = onSnapshot(
      collection(db, 'staff'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setStaff(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Employee)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubShifts = onSnapshot(
      collection(db, 'shifts'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setShifts(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Shift)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubEvents = onSnapshot(
      collection(db, 'events'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setEvents(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as KitchenEvent)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubClients = onSnapshot(
      collection(db, 'clients'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setClients(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Client)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubAlerts = onSnapshot(
      collection(db, 'alerts'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setAlerts(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as KitchenAlert)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubCribNotes = onSnapshot(
      collection(db, 'crib_notes'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setCribNotes(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as CribNote)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubIngredients = onSnapshot(
      collection(db, 'ingredients'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setIngredients(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Ingredient)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubVendors = onSnapshot(
      collection(db, 'vendors'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setVendors(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Vendor)));
      },
      (err: FirestoreError) => { setError(err); }
    );

    const unsubProfile = onSnapshot(
      doc(db, 'restaurant_profile', 'main'),
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
      doc(db, 'trend_reports', 'latest'),
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
      unsub86();
      unsubFeatures();
      unsubStaff();
      unsubShifts();
      unsubEvents();
      unsubClients();
      unsubAlerts();
      unsubCribNotes();
      unsubIngredients();
      unsubVendors();
      unsubProfile();
      unsubTrendReport();
    };
  }, []);

  return { prepItems, setPrepItems, recipes, setRecipes, items86, features, staff, shifts, events, clients, alerts, cribNotes, ingredients, vendors, restaurantProfile, restaurantProfileLoaded, trendReport, trendReportLoaded, loading, error };
};