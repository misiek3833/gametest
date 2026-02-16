// src/combatEngine.js (Uzupełnienie)
import { UNIT_STATS, BUILDING_STATS } from './gameConfig';

export const resolveCombat = (attackerUnits, defenderUnits, wallLevel, defenderResources) => {
  // ... (poprzednia logika obliczania siły i strat - patrz Faza 2) ...
  
  // PONIŻEJ TYLKO SEKCJA OBLICZANIA LOOTU (wklej to na końcu funkcji zamiast starego returna)
  
  // 1. Oblicz pojemność ocalałych atakujących
  let carryCapacity = 0;
  Object.keys(attResult.remaining).forEach(unitType => {
      // UNIT_STATS musi mieć pole 'capacity' (np. 10, 80, 10 dla lekkiej)
      // Jeśli nie ma w configu, użyjmy domyślnego 10 * pop
      const capPerUnit = UNIT_STATS[unitType].capacity || (UNIT_STATS[unitType].pop * 10); 
      carryCapacity += attResult.remaining[unitType] * capPerUnit;
  });

  // 2. Pobierz surowce
  const loot = { wood: 0, stone: 0, iron: 0 };
  const targetTotal = defenderResources.wood + defenderResources.stone + defenderResources.iron;

  if (targetTotal > 0 && carryCapacity > 0) {
      if (carryCapacity >= targetTotal) {
          // Bierzemy wszystko
          loot.wood = Math.floor(defenderResources.wood);
          loot.stone = Math.floor(defenderResources.stone);
          loot.iron = Math.floor(defenderResources.iron);
      } else {
          // Bierzemy proporcjonalnie
          const percentage = carryCapacity / targetTotal;
          loot.wood = Math.floor(defenderResources.wood * percentage);
          loot.stone = Math.floor(defenderResources.stone * percentage);
          loot.iron = Math.floor(defenderResources.iron * percentage);
      }
  }

  // Określ kolor kropki wyniku (dla UI raportów)
  let status = 'green';
  const totalAttackerSent = Object.values(attackerUnits).reduce((a,b)=>a+b,0);
  const totalAttackerLost = Object.values(attResult.lost).reduce((a,b)=>a+b,0);

  if (lossRatioAttacker >= 1) status = 'red'; // Przegrana
  else if (totalAttackerLost > 0) status = 'yellow'; // Wygrana ze stratami

  return {
    winner: lossRatioAttacker >= 1 ? 'defender' : 'attacker',
    attackerLosses: attResult.lost,
    attackerRemaining: attResult.remaining,
    defenderLosses: defResult.lost,
    defenderRemaining: defResult.remaining,
    loot: loot,
    status: status
  };
};