import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";
import { UNIT_STATS, getDistance, getTravelTimeMs, formatTime } from '../gameConfig';

// --- KONFIGURACJA GRAFIKI ---
// W przyszłości podmień te linki na pliki lokalne np. "/assets/grass.png"
const ASSETS = {
  grass: "https://cdn-icons-png.flaticon.com/512/568/568087.png", // Tło trawy (lub kolor)
  village_own: "https://cdn-icons-png.flaticon.com/512/619/619034.png", // Niebieski zamek
  village_enemy: "https://cdn-icons-png.flaticon.com/512/619/619153.png", // Czerwona wieża
  village_ally: "https://cdn-icons-png.flaticon.com/512/619/619102.png", // Zielony zamek
  sword_icon: "https://cdn-icons-png.flaticon.com/512/834/834789.png",
};

const VIEW_RADIUS = 7; // Promień widzenia (siatka 15x15)

const WorldMap = ({ currentVillage, onAttackClick, userTribeId, incomingAttacks }) => {
  const [villagesMap, setVillagesMap] = useState({});
  const [center, setCenter] = useState({ x: 5, y: 5 });
  const [selectedVillage, setSelectedVillage] = useState(null);

  // Ładowanie danych wiosek
  useEffect(() => {
    const db = getDatabase();
    const vRef = ref(db, 'villages');
    const unsub = onValue(vRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const map = {};
        Object.values(data).forEach(v => {
          map[`${v.coords.x}_${v.coords.y}`] = v;
        });
        setVillagesMap(map);
      }
    });
    return () => unsub();
  }, []);

  // Centrowanie na własnej wiosce przy starcie
  useEffect(() => {
    if (currentVillage) {
      setCenter(currentVillage.coords);
    }
  }, [currentVillage]);

  // Nawigacja
  const moveMap = (dx, dy) => {
    setCenter(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  // Renderowanie kafelka
  const renderTile = (x, y) => {
    const key = `${x}_${y}`;
    const village = villagesMap[key];
    
    // Statusy
    const isMine = village && currentVillage && village.owner_id === currentVillage.owner_id;
    const isAlly = village && userTribeId && village.tribeId === userTribeId;
    const isUnderAttack = village && incomingAttacks.some(cmd => cmd.targetId === village.id);

    // Wybór grafiki
    let icon = null;
    let borderColor = "border-slate-800"; // Domyślna ramka trawy

    if (village) {
        if (isMine) {
            icon = ASSETS.village_own;
            borderColor = "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"; // Świecenie własnej
        } else if (isAlly) {
            icon = ASSETS.village_ally;
            borderColor = "border-blue-500";
        } else {
            icon = ASSETS.village_enemy;
            borderColor = "border-red-900";
        }
    }

    return (
      <div 
        key={key}
        onClick={() => village && setSelectedVillage(village)}
        className={`
          relative w-10 h-10 sm:w-12 sm:h-12 
          bg-slate-900 border ${borderColor} 
          flex items-center justify-center 
          cursor-pointer transition-all hover:scale-110 hover:z-10
          bg-[url('https://www.transparenttextures.com/patterns/grass.png')]
        `}
        style={{ imageRendering: 'pixelated' }} // Styl retro
      >
        {/* Koordynaty (małe) */}
        <span className="absolute top-0 left-0 text-[6px] sm:text-[8px] text-slate-500 p-0.5 z-0 font-mono">
          {x}|{y}
        </span>

        {/* Ikona Wioski */}
        {icon && (
            <img src={icon} alt="Village" className="w-8 h-8 z-10 drop-shadow-lg" />
        )}

        {/* Wskaźnik ataku (Animowane miecze) */}
        {isUnderAttack && isMine && (
             <div className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 animate-bounce z-20 border border-white">
                 <img src={ASSETS.sword_icon} className="w-3 h-3 invert" />
             </div>
        )}

        {/* Punkty (tooltip style) */}
        {village && (
            <div className="absolute bottom-0 right-0 bg-black/60 text-[8px] text-white px-1 rounded-tl-sm backdrop-blur-sm">
                {village.points}P
            </div>
        )}
      </div>
    );
  };

  // Generowanie siatki
  const grid = [];
  const startX = center.x - VIEW_RADIUS;
  const startY = center.y - VIEW_RADIUS;

  for (let y = startY; y <= startY + VIEW_RADIUS * 2; y++) {
    for (let x = startX; x <= startX + VIEW_RADIUS * 2; x++) {
      grid.push(renderTile(x, y));
    }
  }

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-2xl flex flex-col items-center">
      {/* Nagłówek Mapy i Nawigacja */}
      <div className="flex justify-between items-center w-full mb-4 px-2">
         <h3 className="text-amber-500 font-serif text-xl tracking-widest">
            WORLD MAP <span className="text-slate-500 text-sm">({center.x}|{center.y})</span>
         </h3>
         <div className="flex gap-1">
            <button onClick={() => moveMap(0, -1)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-amber-500">▲</button>
            <div className="flex flex-col gap-1">
                <button onClick={() => moveMap(-1, 0)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-amber-500">◀</button>
                <button onClick={() => moveMap(1, 0)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-amber-500">▶</button>
            </div>
            <button onClick={() => moveMap(0, 1)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-amber-500">▼</button>
         </div>
      </div>

      {/* Grid Mapy */}
      <div 
        className="grid gap-0.5 bg-slate-950 p-2 rounded border border-slate-800 shadow-inner"
        style={{ 
            gridTemplateColumns: `repeat(${VIEW_RADIUS * 2 + 1}, minmax(0, 1fr))` 
        }}
      >
        {grid}
      </div>

      {/* Modal Akcji (Action Modal) */}
      {selectedVillage && (
        <ActionModal 
            origin={currentVillage} 
            target={selectedVillage} 
            onClose={() => setSelectedVillage(null)}
            onSendArmy={onAttackClick}
        />
      )}
    </div>
  );
};

// --- SUBKOMPONENT: OKNO ATAKU ---
const ActionModal = ({ origin, target, onClose, onSendArmy }) => {
    const [units, setUnits] = useState({ spear: 0, sword: 0, axe: 0, light: 0, scout: 0 });
    const distance = getDistance(origin.coords, target.coords);
    
    // Obliczanie czasu
    let slowestSpeed = 0;
    Object.keys(units).forEach(u => {
        if(units[u] > 0 && UNIT_STATS[u].speed > slowestSpeed) slowestSpeed = UNIT_STATS[u].speed;
    });
    const travelTimeMs = slowestSpeed > 0 ? getTravelTimeMs(distance, slowestSpeed) : 0;

    const handleSend = () => {
        onSendArmy(target.coords, units); // Przekazujemy kordy i jednostki
        onClose();
    };

    const isMine = origin.id === target.id;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-slate-900 border-2 border-amber-600 rounded-lg p-6 w-full max-w-md shadow-2xl relative">
                <button onClick={onClose} className="absolute top-2 right-4 text-gray-500 hover:text-white text-xl">✕</button>
                
                <h2 className="text-2xl text-amber-500 font-serif mb-1 flex items-center gap-2">
                    <img src={ASSETS.sword_icon} className="w-6 h-6 invert" /> 
                    Command Center
                </h2>
                <p className="text-gray-400 text-sm mb-6 border-b border-slate-700 pb-2">
                    Target: <span className="text-white font-bold">{target.name}</span> ({target.coords.x}|{target.coords.y})<br/>
                    Distance: <span className="text-blue-400">{distance.toFixed(2)} fields</span>
                </p>

                {isMine ? (
                    <div className="text-center text-red-400 py-8">You cannot attack your own village!</div>
                ) : (
                    <>
                        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {Object.keys(UNIT_STATS).map(uKey => (
                                <div key={uKey} className="flex items-center justify-between bg-slate-800 p-2 rounded">
                                    <div className="flex items-center gap-2">
                                        {/* Tutaj można dodać ikonki jednostek */}
                                        <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center text-[10px] uppercase font-bold text-gray-400">
                                            {uKey[0]}{uKey[1]}
                                        </div>
                                        <div>
                                            <div className="text-sm capitalize text-gray-200 font-bold">{uKey}</div>
                                            <div className="text-[10px] text-gray-500">Speed: {UNIT_STATS[uKey].speed}min/field</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs text-gray-500 text-right cursor-pointer" onClick={() => setUnits({...units, [uKey]: origin.troops[uKey] || 0})}>
                                            ({origin.troops[uKey] || 0})
                                        </div>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            max={origin.troops[uKey] || 0}
                                            className="w-16 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-right text-white focus:border-amber-500 outline-none"
                                            value={units[uKey]}
                                            onChange={(e) => setUnits({...units, [uKey]: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-slate-950 p-3 rounded mb-4 flex justify-between items-center border border-slate-800">
                            <span className="text-gray-400 text-sm">Arrival Time:</span>
                            <span className="text-amber-400 font-mono font-bold text-lg">
                                {travelTimeMs > 0 ? formatTime(travelTimeMs / 1000) : "--:--:--"}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button className="py-2 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 font-bold">
                                SUPPORT (Soon)
                            </button>
                            <button 
                                onClick={handleSend}
                                disabled={travelTimeMs === 0}
                                className="py-2 bg-gradient-to-r from-red-700 to-red-600 text-white rounded hover:from-red-600 hover:to-red-500 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ⚔️ ATTACK
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default WorldMap;
