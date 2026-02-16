import React, { useState } from 'react';
import { UNIT_STATS, calculateUsedPopulation, getMaxPopulation } from '../gameConfig';

const Barracks = ({ village, onRecruit }) => {
  const [amounts, setAmounts] = useState({});

  const currentPop = calculateUsedPopulation(village.troops);
  const maxPop = getMaxPopulation(village.buildings.farm);
  const popPercent = Math.min(100, (currentPop / maxPop) * 100);

  const handleRecruit = (unit) => {
    const amount = parseInt(amounts[unit] || 0);
    if (amount > 0) onRecruit(unit, amount);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-xl text-amber-500 font-serif">Barracks (Lvl {village.buildings.barracks})</h2>
        <div className="text-right text-xs">
            <div className="text-gray-400 mb-1">Population: {currentPop} / {maxPop}</div>
            <div className="w-32 h-2 bg-slate-700 rounded overflow-hidden">
                <div className={`h-full ${popPercent > 90 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${popPercent}%` }}></div>
            </div>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(UNIT_STATS).map(([unit, stats]) => (
          <div key={unit} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700">
            <div className="flex flex-col">
               <span className="capitalize font-bold text-gray-200">{unit}</span>
               <div className="text-[10px] text-gray-500 flex gap-2">
                 <span>🪵 {stats.cost.wood}</span>
                 <span>🪨 {stats.cost.stone}</span>
                 <span>⛓️ {stats.cost.iron}</span>
                 <span>👥 {stats.pop}</span>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500 text-right">
                    Own: {village.troops[unit] || 0}
                </div>
                <input 
                  type="number" 
                  className="w-16 bg-slate-900 border border-slate-600 rounded px-1 text-right text-sm"
                  placeholder="0"
                  onChange={(e) => setAmounts({...amounts, [unit]: e.target.value})}
                />
                <button 
                    onClick={() => handleRecruit(unit)}
                    className="bg-amber-700 hover:bg-amber-600 text-white text-xs px-2 py-1 rounded"
                >
                    TRAIN
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Barracks;