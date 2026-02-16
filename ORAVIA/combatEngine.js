// src/combatEngine.js
import { UNIT_STATS, BUILDING_STATS } from './gameConfig';

/**
 * Oblicza siłę armii (atak lub obrona)
 */
const calculatePower = (units, type = 'attack') => {
  let power = 0;
  Object.keys(units).forEach(u => {
    const count = units[u] || 0;
    power += count * UNIT_STATS[u][type];
  });
  return power;
};

/**
 * Rozwiązuje starcie (Battle Engine)
 */
export const resolveCombat = (attackerUnits, defenderUnits, wallLevel, defenderResources) => {
  // 1. Oblicz siły
  const offPower = calculatePower(attackerUnits, 'attack');
  
  // Bonus muru: Podstawa + (Level * 5%)
  const wallBonus = BUILDING_STATS.wall.defenseBase + (wallLevel * (BUILDING_STATS.wall.defenseBase * 0.05));
  const defPower = calculatePower(defenderUnits, 'defense') + wallBonus;

  // 2. Jeśli atakujący nie ma siły, ginie od razu
  if (offPower <= 0) return { winner: 'defender', lossesAttacker: attackerUnits, lossesDefender: {}, loot: {} };

  // 3. Oblicz współczynnik strat (Uproszczony wzór plemion)
  // Ratio = (Def / Off)^1.5. Max 1.0 (czyli 100% strat).
  let lossRatioAttacker = Math.pow((defPower / offPower), 1.5);
  if (lossRatioAttacker > 1) lossRatioAttacker = 1;
  
  // Obrońca traci odwrotnie proporcjonalnie, ale jeśli wygrywa zdecydowanie, traci mniej.
  let lossRatioDefender = Math.pow((offPower / defPower), 1.5);
  if (lossRatioDefender > 1) lossRatioDefender = 1;

  // 4. Aplikuj straty
  const applyLosses = (units, ratio) => {
    const remaining = {};
    const lost = {};
    Object.keys(units).forEach(key => {
      const total = units[key];
      const dead = Math.floor(total * ratio);
      remaining[key] = total - dead;
      lost[key] = dead;
    });
    return { remaining, lost };
  };

  const attResult = applyLosses(attackerUnits, lossRatioAttacker);
  const defResult = applyLosses(defenderUnits, lossRatioDefender);

  // 5. Oblicz łupy (Loot)
  // Ocalałe jednostki mają "carry capacity" (pojemność)
  let carryCapacity = 0;
  // Przyjmijmy uproszczenie: każda jednostka nosi 10 * pop
  Object.keys(attResult.remaining).forEach(k => {
    carryCapacity += attResult.remaining[k] * 10 * UNIT_STATS[k].pop; 
  });

  const loot = { wood: 0, stone: 0, iron: 0 };
  const totalRes = defenderResources.wood + defenderResources.stone + defenderResources.iron;
  
  if (totalRes > 0 && carryCapacity > 0) {
    // Proporcjonalny podział łupów
    const portion = Math.min(1, carryCapacity / totalRes);
    loot.wood = Math.floor(defenderResources.wood * portion);
    loot.stone = Math.floor(defenderResources.stone * portion);
    loot.iron = Math.floor(defenderResources.iron * portion);
  }

  return {
    winner: lossRatioAttacker >= 1 ? 'defender' : 'attacker',
    attackerLosses: attResult.lost,
    attackerRemaining: attResult.remaining,
    defenderLosses: defResult.lost,
    defenderRemaining: defResult.remaining,
    loot: loot
  };
};