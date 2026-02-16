import React from 'react';

const LandingPage = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden">
      {/* Tło ozdobne */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20"></div>
      <div className="absolute w-96 h-96 bg-amber-600 rounded-full blur-[150px] opacity-10 top-0 left-0"></div>
      
      <div className="z-10 max-w-2xl">
        <h1 className="text-6xl font-serif text-amber-500 mb-2 drop-shadow-lg tracking-tighter">
          PLEMIONA <span className="text-slate-200">2.0</span>
        </h1>
        <p className="text-xl text-gray-400 mb-8 font-light">
          Real-time MMO Strategy. Build, Recruit, Conquer.
        </p>

        <div className="bg-slate-900/80 border border-slate-700 p-8 rounded-2xl backdrop-blur-sm shadow-2xl">
          <div className="space-y-4 text-left text-gray-300 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏰</span>
              <span>Build your village from scratch in a persistent world.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚔️</span>
              <span>Train armies and plunder resources from real players.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <span>Form tribes and dominate the leaderboard.</span>
            </div>
          </div>

          <button 
            onClick={onLogin}
            className="w-full py-4 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg border border-amber-500"
          >
            ENTER THE WORLD (Google Login)
          </button>
        </div>
        
        <p className="mt-8 text-xs text-gray-600">
          Powered by React & Firebase Realtime Database
        </p>
      </div>
    </div>
  );
};

export default LandingPage;