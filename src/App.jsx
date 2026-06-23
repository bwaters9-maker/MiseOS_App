import React from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 antialiased font-sans">
      <Header />
      <main className="py-6">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;