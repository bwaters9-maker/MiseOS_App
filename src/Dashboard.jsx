import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, Book, ChefHat } from 'lucide-react';

export default function DashboardView({ tasks = [], modules = [] }) {
  const [selectedTask, setSelectedTask] = useState(null);

  return (
    <div className="space-y-6">
      {/* KPI Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="mise-card">
          <p className="text-[var(--muted)] text-[9px] uppercase tracking-widest font-bold">Assigned Today</p>
          <h3 className="text-2xl font-black text-[var(--primary)]">{tasks.filter(t => t.status !== 'completed').length}</h3>
        </div>
        <div className="mise-card">
          <p className="text-[var(--muted)] text-[9px] uppercase tracking-widest font-bold">Completed</p>
          <h3 className="text-2xl font-black text-[var(--accent)]">{tasks.filter(t => t.status === 'completed').length}</h3>
        </div>
        <div className="mise-card">
          <p className="text-[var(--muted)] text-[9px] uppercase tracking-widest font-bold">Training Active</p>
          <h3 className="text-2xl font-black">{modules.length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] px-1">Today's Station Tasks</h2>
          {tasks.map(task => (
            <div key={task.id} className="mise-card hover:border-[var(--primary)] cursor-pointer transition-all" onClick={() => setSelectedTask(task)}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm text-[var(--primary)]">{task.title}</p>
                  <p className="text-[10px] uppercase text-[var(--muted)] tracking-widest">{task.station}</p>
                </div>
                {task.status === 'completed' ? <CheckCircle2 className="text-[var(--accent)]" size={18} /> : <Clock className="text-[var(--primary)]" size={18} />}
              </div>
            </div>
          ))}
        </div>

        {/* Training Sidebar */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] px-1">Training Modules</h2>
          <div className="mise-card p-0 overflow-hidden">
            {modules.map(module => (
              <div key={module.id} className="p-4 border-b border-[var(--border)] last:border-0 hover:bg-[var(--row)] transition-colors cursor-pointer">
                <p className="text-xs font-bold">{module.title}</p>
                <p className="text-[9px] text-[var(--muted)] uppercase">{module.duration_minutes} min</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}