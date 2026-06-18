import React from 'react';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, icon, children }) => (
  <div>
    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
      {icon}
      <span>{title}</span>
    </h4>
    <div className="space-y-2">{children}</div>
  </div>
);