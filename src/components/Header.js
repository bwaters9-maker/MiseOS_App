import React from 'react';

const Header = () => {
  return (
    <header className="bg-zinc-950 border-b border-zinc-800 p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-lg font-bold text-white">Welcome, Brian Michael Waters</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Status:</span>
          <span className="bg-emerald-900/50 text-emerald-300 text-xs font-bold uppercase px-2 py-1 rounded-md border border-emerald-800">
            Firmitas
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;