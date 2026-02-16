import React, { useState } from 'react';
import { UNIT_STATS, getDistance, getTravelTimeMs, formatTime } from '../gameConfig';

const AttackModal = ({ originVillage, targetVillage, onClose, onSend }) => {
  const [selectedUnits, setSelectedUnits] = useState({ spear: 0, sword: 0, axe: 0, light: 0 });

  const distance = getDistance(originVillage.coords, targetVillage.coords);
  
  // Oblicz czas dojścia dynamicznie
  const getTravelTime = () => {
    let slowest = 0;
    let hasUnits = false;
    Object.keys(selectedUnits).forEach(u => {
      if (selectedUnits[u] > 0) {
        hasUnits = true;
        if (UNIT_STATS[u].speed > slowest) slowest = UNIT_STATS[u].speed; // Uwaga: w gameConfig speed to minuty/pole? Sprawdź logikę. 
        // W configu Fazy 1: speed = minuty na pole. WIĘKSZA liczba = WOLNIEJSZA jednostka.
        // Zatem szukamy MAX speed (najwięcej minut na pole).
        if (UNIT_STATS[u].speed > slowest) slowest = UNIT_STATS[u].speed;
      }
    });
    if (!hasUnits) return 0;
    return getTravelTimeMs(distance, slowest) / 1000; // w sekundach
  };

  const travelTimeSeconds = getTravelTime();

  const handleSend = () => {
    onSend(targetVillage.coords, selectedUnits);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-900 border-2 border-amber-700 p-6 rounded w-96 text-gray-200">
        <h2 className="text-xl text-amber-500 font-bold mb-4">Attack: {targetVillage.name}</h2>
        <div className="text-sm mb-4">
          Coords: {targetVillage.coords.x}|{targetVillage.coords.y} <br/>
          Distance: {distance.toFixed(2)} fields
        </div>

        <div className="space-y-2 mb-6">
          {Object.keys(UNIT_STATS).map(unit => (
            <div key={unit} className="flex justify-between items-center">
              <label className="capitalize w-20">{unit}</label>
              <span className="text-xs text-gray-500">Avail: {originVillage.troops[unit]}</span>
              <input 
                type="number" 
                min="0" 
                max={originVillage.troops[unit]}
                className="bg-slate-800 border border-slate-600 rounded w-20 px-2 py-1 text-right"
                value={selectedUnits[unit]}
                onChange={(e) => setSelectedUnits({...selectedUnits, [unit]: parseInt(e.target.value) || 0})}
              />
            </div>
          ))}
        </div>

        <div className="bg-slate-800 p-2 mb-4 text-center rounded text-amber-300 font-mono">
          Travel Time: {formatTime(travelTimeSeconds)}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded">Cancel</button>
          <button 
            onClick={handleSend} 
            disabled={travelTimeSeconds === 0}
            className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white font-bold rounded disabled:opacity-50"
          >
            ATTACK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttackModal;