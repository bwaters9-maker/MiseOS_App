import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebaseConfig';
import { collection, onSnapshot, DocumentData } from 'firebase/firestore';
import { Ingredient } from './types';

interface PrepItem extends Ingredient {
  parLevel: number;
  station: string;
}

export const PrepChecklist: React.FC = () => {
  const [liveIngredients, setLiveIngredients] = useState<PrepItem[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      const fetchedIngredients = snapshot.docs.map(doc => ({ ...doc.data() } as PrepItem));
      setLiveIngredients(fetchedIngredients);
    });
    
    // Cleanup the listener on component unmount
    return () => unsubscribe();
  }, []);
  
  const checklistData = useMemo(() => {
    return liveIngredients.map(ing => {
      const onHand = ing.quantity || 0;
      const par = ing.parLevel || 0;
      const deficit = Math.max(0, par - onHand);
      const status = deficit > 0 ? 'SHORTAGE' : 'STABLE';
      
      return { ...ing, onHand, par, deficit, status };
    });
  }, [liveIngredients]);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-zinc-950 text-zinc-100 font-mono tracking-tight">
      <div className="border-b border-zinc-900 pb-4 mb-6">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Line Prep Checklist</h1>
        <p className="text-xs text-zinc-500 mt-1">Automated par-to-hand deficiency tracking</p>
      </div>
      <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-900/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950 text-zinc-500 uppercase font-bold border-b border-zinc-900">
            <tr>
              <th className="p-4">Item</th>
              <th className="p-4 text-center">Station</th>
              <th className="p-4 text-right">On Hand</th>
              <th className="p-4 text-right">Par Level</th>
              <th className="p-4 text-right">Deficit Order</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {checklistData.map((item, idx) => (
              <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                <td className="p-4 font-bold text-zinc-200">{item.name}</td>
                <td className="p-4 text-center text-zinc-400">{item.station}</td>
                <td className="p-4 text-right text-zinc-400">{item.onHand} {item.unit}</td>
                <td className="p-4 text-right text-zinc-400">{item.par} {item.unit}</td>
                <td className={`p-4 text-right font-bold ${item.deficit > 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                  {item.deficit > 0 ? `${item.deficit} ${item.unit}` : '0'}
                </td>
                <td className="p-4 text-center">
                  <span className={`inline-block border px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                    item.status === 'SHORTAGE' 
                      ? 'border-red-950 bg-red-950/20 text-red-400' 
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                  }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
