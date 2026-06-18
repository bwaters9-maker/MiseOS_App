import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { HandoverLog, PrepStation } from './types';
import { CheckCircle, AlertTriangle, XCircle, BookOpen, Send } from 'lucide-react';

const STATUS_CONFIG = {
  pass: { icon: CheckCircle, style: 'text-green-400 border-green-900 bg-green-950/20' },
  incomplete: { icon: AlertTriangle, style: 'text-amber-400 border-amber-900 bg-amber-950/20' },
  fail: { icon: XCircle, style: 'text-red-400 border-red-900 bg-red-950/20' },
};

const getStatusInfo = (status: HandoverLog['status'] | undefined) => {
  const validStatus = status && STATUS_CONFIG[status] ? status : 'pass';
  const { icon: Icon, style } = STATUS_CONFIG[validStatus];
  return { Icon, style, name: validStatus };
}

export const ShiftHandoverLog: React.FC = () => {
  const [logs, setLogs] = useState<HandoverLog[]>([]);
  
  // Live listener for handover logs
  useEffect(() => {
    const q = query(collection(db, 'handover_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const fetchedLogs = snapshot.docs.map(d => {
          const data = d.data();
          // Ensure timestamp is a string for consistent rendering
          const timestamp = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString();
          return {
            ...data,
            id: d.id,
            timestamp: timestamp,
          } as HandoverLog;
        });
        setLogs(fetchedLogs);
      }, (error) => {
        console.error("Error fetching handover logs:", error);
      });
    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-zinc-950 text-zinc-100 font-mono tracking-tight">
      {/* Header */}
      <div className="border-b border-zinc-900 pb-4 mb-6">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" /> Shift Handover Log
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Real-time operational status and task pass-over notes</p>
      </div>

      {/* Log List */}
      <div className="space-y-4">
        {logs.map(log => {
          if (!log || !log.id) return null; // Defensive check for malformed log data
          const { Icon, style, name: statusName } = getStatusInfo(log.status);
          return (
            <div key={log.id} className={`border rounded-xl p-4 transition-all ${style}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{statusName}</span>
                    </div>
                    <div className="h-4 border-l border-zinc-800"></div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500">STATION: <span className="text-zinc-300">{log.station}</span></span>
                  </div>
                  <p className="text-sm text-zinc-200 mt-2 leading-relaxed">{log.notes || <span className="italic text-zinc-500">No notes provided.</span>}</p>
                  {log.items86 && log.items86.length > 0 && (
                    <div className="mt-2 text-[10px]">
                      <span className="font-bold text-red-400/80">86'd: </span>
                      <span className="text-red-400/70">{log.items86.join(', ')}</span>
                    </div>
                  )}
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className="text-xs font-bold text-zinc-300">{log.submitted_by}</p>
                  <p className="text-[10px] text-zinc-500">{new Date(log.timestamp).toLocaleString()}</p>
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
