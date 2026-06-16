import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, onSnapshot, addDoc, updateDoc, doc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { HandoverLog, PrepStation } from './types';
import { CheckCircle, AlertTriangle, XCircle, BookOpen, Send } from 'lucide-react';

const SEVERITY_MAP = {
  info: { icon: <CheckCircle className="w-3.5 h-3.5" />, style: 'text-blue-400 border-blue-900 bg-blue-950/20' },
  warning: { icon: <AlertTriangle className="w-3.5 h-3.5" />, style: 'text-amber-400 border-amber-900 bg-amber-950/20' },
  critical: { icon: <XCircle className="w-3.5 h-3.5" />, style: 'text-red-400 border-red-900 bg-red-950/20 animate-pulse' },
};

export const ShiftHandoverLog: React.FC = () => {
  const [logs, setLogs] = useState<HandoverLog[]>([]);
  const [stations, setStations] = useState<(PrepStation | 'All')[]>([]);
  
  // Form State
  const [newMessage, setNewMessage] = useState('');
  const [newSender, setNewSender] = useState('');
  const [newStation, setNewStation] = useState<PrepStation | 'All'>('All');
  const [newSeverity, setNewSeverity] = useState<'info' | 'warning' | 'critical'>('info');

  // Fetch station presets
  useEffect(() => {
    const fetchStations = async () => {
      const stationSnap = await getDocs(collection(db, "station_presets"));
      const stationData = stationSnap.docs.map(d => d.data().name as PrepStation);
      setStations(['All', ...stationData]);
    };
    fetchStations();
  }, []);
  
  // Live listener for handover logs
  useEffect(() => {
    const q = query(collection(db, 'handover_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          timestamp: data.timestamp?.toDate().toLocaleString() ?? new Date().toLocaleString(),
        } as HandoverLog;
      });
      setLogs(fetchedLogs);
    });
    return () => unsubscribe();
  }, []);

  const addLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !newSender.trim()) return;

    await addDoc(collection(db, 'handover_logs'), {
      sender: newSender,
      station: newStation,
      severity: newSeverity,
      message: newMessage,
      timestamp: serverTimestamp(),
      resolved: false,
    });

    setNewMessage('');
  };

  const toggleResolved = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'handover_logs', id), { resolved: !currentStatus });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-zinc-950 text-zinc-100 font-mono tracking-tight">
      {/* Header */}
      <div className="border-b border-zinc-900 pb-4 mb-6">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" /> Shift Handover Log
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Real-time operational status and task pass-over notes</p>
      </div>

      {/* New Log Form */}
      <form onSubmit={addLog} className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-5 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className='space-y-1'>
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Your Name</label>
            <input type="text" value={newSender} onChange={e => setNewSender(e.target.value)} placeholder="e.g., Chef Brian" className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs" />
          </div>
          <div className='space-y-1'>
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Station</label>
            <select value={newStation} onChange={e => setNewStation(e.target.value as PrepStation | 'All')} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs">
              {stations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className='space-y-1'>
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Severity</label>
            <select value={newSeverity} onChange={e => setNewSeverity(e.target.value as 'info' | 'warning' | 'critical')} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <div className='space-y-1'>
          <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Message</label>
          <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Leave a detailed note for the next shift..." className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs h-24 resize-none"></textarea>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-zinc-100 text-xs uppercase px-4 py-2.5 rounded-lg font-bold tracking-wider flex items-center gap-2">
            <Send className="w-3.5 h-3.5" /> Submit Handover
          </button>
        </div>
      </form>
      
      {/* Log List */}
      <div className="space-y-4">
        {logs.map(log => {
          const severity = SEVERITY_MAP[log.severity] || SEVERITY_MAP.info;
          return (
            <div key={log.id} className={`border rounded-xl p-4 transition-all ${severity.style} ${log.resolved ? 'opacity-40 bg-zinc-950' : 'bg-zinc-900/10'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider`}>
                      {severity.icon}
                      <span>{log.severity}</span>
                    </div>
                    <div className="h-4 border-l border-zinc-800"></div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500">STATION: <span className="text-zinc-300">{log.station}</span></span>
                  </div>
                  <p className="text-sm text-zinc-200 mt-2 leading-relaxed">{log.message}</p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className="text-xs font-bold text-zinc-300">{log.sender}</p>
                  <p className="text-[10px] text-zinc-500">{log.timestamp}</p>
                  <button onClick={() => toggleResolved(log.id, log.resolved)} className={`mt-2 text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded border transition-colors ${log.resolved ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-emerald-900 border-emerald-800 text-emerald-400 hover:bg-emerald-800'}`}>
                    {log.resolved ? 'Resolved' : 'Mark as Resolved'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {logs.length === 0 && (
            <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center text-xs text-zinc-600 uppercase tracking-widest">
                No handover logs recorded.
            </div>
        )}
      </div>
    </div>
  );
};
