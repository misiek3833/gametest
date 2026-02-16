import React, { useState, useEffect } from 'react';

const ProgressBar = ({ finishTime, startTime }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = finishTime - startTime;
    const interval = setInterval(() => {
      const now = Date.now();
      const left = finishTime - now;
      const perc = 100 - (left / totalDuration * 100);
      
      if (perc >= 100) setProgress(100);
      else setProgress(perc);
    }, 1000); // Update co sekundę
    return () => clearInterval(interval);
  }, [finishTime, startTime]);

  return (
    <div className="w-full bg-slate-700 h-2 rounded mt-1">
      <div 
        className="bg-amber-500 h-2 rounded transition-all duration-1000" 
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      ></div>
    </div>
  );
};

const BuildQueue = ({ queue }) => {
  if (!queue || queue.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-slate-800 rounded border border-slate-600">
      <h4 className="text-gray-300 text-sm font-bold mb-2">Build Queue</h4>
      {queue.map((item, idx) => {
        // Oblicz start time dla paska (dla pierwszego itemu to 'teraz' lub czas utworzenia, dla kolejnych to koniec poprzedniego)
        // Uproszczenie: renderujemy pasek tylko dla aktywnego (pierwszego)
        const isFirst = idx === 0;
        const startTime = item.finishTime - (item.duration || 10000); // Potrzebowalibyśmy duration w obiekcie, tu uproszczone

        return (
          <div key={idx} className="mb-2 text-xs text-gray-400 border-b border-slate-700 pb-2">
            <div className="flex justify-between">
              <span>{item.type} (Lvl {item.level})</span>
              <span>{isFirst ? "Building..." : "Queued"}</span>
            </div>
            {isFirst && <ProgressBar finishTime={item.finishTime} startTime={Date.now() - 10000} />} 
          </div>
        );
      })}
    </div>
  );
};

export default BuildQueue;