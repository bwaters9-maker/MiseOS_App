/**
 * src/components/handover/HandoverLog.jsx
 * Operational log for shift transfers.
 */

export default function HandoverLog({ logs = [] }) {
  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="mise-card space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Shift Handover Log</h3>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className={`p-3 rounded-lg border text-sm ${getSeverityStyle(log.severity)}`}>
            <div className="flex justify-between font-bold mb-1">
              <span>{log.sender}</span>
              <span className="text-[10px] opacity-70">{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-xs">{log.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}