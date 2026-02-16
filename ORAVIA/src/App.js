import React, { useState, useEffect, Suspense, lazy } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { Toaster } from 'react-hot-toast';
import { auth, default as firebaseApp } from './firebaseConfig';
import { useGameEngine } from './hooks/useGameEngine';
import { processGameEvents } from './gameLoop';

// Lazy loading komponentów (te pliki muszą istnieć w src/components/)
const WorldMap = lazy(() => import('./components/WorldMap'));
const Reports = lazy(() => import('./components/Reports'));
const SocialHub = lazy(() => import('./components/SocialHub'));
const Barracks = lazy(() => import('./components/Barracks'));

const App = () => {
  const [user, setUser] = useState(null);
  const { village, resources, incomingAttacks, actions, loading } = useGameEngine(firebaseApp);

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Game Loop Host (Admin/Client Logic)
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
         processGameEvents().catch(console.error);
      }, 5000); // Sprawdzaj zdarzenia co 5 sekund
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(console.error);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-6xl font-serif text-amber-600 mb-4 tracking-tighter">PLEMIONA 2.0</h1>
        <p className="text-gray-400 mb-8 max-w-md">Real-time MMO Strategy built with React & Firebase.</p>
        <button onClick={handleLogin} className="px-8 py-3 bg-amber-700 hover:bg-amber-600 text-white rounded font-bold shadow-lg transition">
          LOGIN WITH GOOGLE
        </button>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">Loading Realm...</div>;

  return (
    <div className="bg-slate-950 min-h-screen text-gray-200 font-sans pb-20">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-700 p-3 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex gap-4 font-mono text-sm">
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-700 rounded-full"></span> {resources.wood}</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-500 rounded-full"></span> {resources.stone}</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-400 rounded-full"></span> {resources.iron}</div>
        </div>
        <div className="text-amber-500 font-bold font-serif tracking-widest hidden md:block">
           {village?.name || 'VILLAGE'} ({village?.coords?.x}|{village?.coords?.y})
        </div>
        <button onClick={() => auth.signOut()} className="text-xs text-red-400 hover:text-red-300">LOGOUT</button>
      </header>

      {/* MAIN LAYOUT */}
      <main className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        
        {/* LEFT COLUMN: Actions */}
        <div className="space-y-6">
           <div className="bg-slate-900 p-4 rounded border border-slate-700">
              <h2 className="text-lg text-amber-500 mb-2 font-serif border-b border-slate-700 pb-1">Town Hall</h2>
              <div className="space-y-2">
                {['timber_camp', 'clay_pit', 'iron_mine', 'farm', 'warehouse', 'barracks', 'wall'].map(b => (
                   <div key={b} className="flex justify-between items-center text-sm">
                      <span className="capitalize text-gray-400">{b.replace('_', ' ')} (Lvl {village?.buildings[b]})</span>
                      <button 
                        onClick={() => actions.upgradeBuilding(b)}
                        className="bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-xs text-white"
                      >
                        UPGRADE
                      </button>
                   </div>
                ))}
              </div>
           </div>
           
           <Suspense fallback={<div className="h-20 bg-slate-900 animate-pulse"></div>}>
             {village && <Barracks village={village} onRecruit={actions.recruitUnit} />}
           </Suspense>
        </div>

        {/* CENTER COLUMN: Map */}
        <div className="lg:col-span-1 flex justify-center">
           <Suspense fallback={<div className="text-xs text-gray-500">Loading Map...</div>}>
              <WorldMap 
                currentVillage={village} 
                onAttackClick={(target) => actions.sendArmy(target.coords, { axe: 10 })} // Uproszczone wywołanie
                userTribeId={user.tribeId}
                incomingAttacks={incomingAttacks}
              />
           </Suspense>
        </div>

        {/* RIGHT COLUMN: Social & Info */}
        <div className="space-y-6">
            <Suspense fallback={<div className="h-40 bg-slate-900 animate-pulse rounded"></div>}>
                <SocialHub user={user} actions={actions} />
            </Suspense>

            <Suspense fallback={<div className="h-40 bg-slate-900 animate-pulse rounded"></div>}>
                <Reports user={user} />
            </Suspense>
        </div>
      </main>

      {/* WARNING FOOTER */}
      {incomingAttacks.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-red-900/90 text-white text-center py-2 font-bold animate-pulse border-t border-red-500 z-50">
             ⚠️ INCOMING ATTACK! ({incomingAttacks.length})
          </div>
      )}
    </div>
  );
};

export default App;