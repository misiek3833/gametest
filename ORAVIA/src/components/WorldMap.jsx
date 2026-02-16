// src/components/WorldMap.jsx
import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";

const TILE_SIZE = 15; // Grid 15x15

const WorldMap = ({ currentVillage, onAttackClick }) => {
  const [villagesMap, setVillagesMap] = useState({});
  const [center, setCenter] = useState({ x: 5, y: 5 }); // Domyślnie środek mapy

  useEffect(() => {
    // Wczytaj wszystkie wioski (w produkcji użyj GeoFire lub query ograniczającego zakres)
    const db = getDatabase();
    const vRef = ref(db, 'villages');
    onValue(vRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Mapowanie: "x_y" -> villageData
        const map = {};
        Object.values(data).forEach(v => {
          map[`${v.coords.x}_${v.coords.y}`] = v;
        });
        setVillagesMap(map);
      }
    });
  }, []);

  useEffect(() => {
    if (currentVillage) {
      setCenter(currentVillage.coords);
    }
  }, [currentVillage]);

  // Generowanie siatki wokół środka
  const renderGrid = () => {
    const grid = [];
    const startX = center.x - Math.floor(TILE_SIZE / 2);
    const startY = center.y - Math.floor(TILE_SIZE / 2);

    for (let y = startY; y < startY + TILE_SIZE; y++) {
      for (let x = startX; x < startX + TILE_SIZE; x++) {
        const key = `${x}_${y}`;
        const village = villagesMap[key];
        const isMine = village && currentVillage && village.owner_id === currentVillage.owner_id;

        grid.push(
          <div 
            key={key}
            className={`
              w-10 h-10 border border-slate-700 flex items-center justify-center text-xs cursor-pointer relative
              ${village ? (isMine ? 'bg-blue-900' : 'bg-red-900 hover:bg-red-700') : 'bg-slate-800 hover:bg-slate-700'}
            `}
            onClick={() => village && !isMine && onAttackClick(village)}
          >
            <span className="absolute top-0 left-0 text-[8px] text-slate-500 p-0.5">{x}|{y}</span>
            {village && (
               <span className="text-white font-bold">
                 {isMine ? '⌂' : '⚔'}
               </span>
            )}
          </div>
        );
      }
    }
    return grid;
  };

  return (
    <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 shadow-xl">
      <h3 className="text-gold mb-2 font-serif text-lg">World Map ({center.x}|{center.y})</h3>
      <div 
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${TILE_SIZE}, minmax(0, 1fr))` }}
      >
        {renderGrid()}
      </div>
    </div>
  );
};

export default WorldMap;