/**
 * KONFIGURACJA GRY I MODELE MATEMATYCZNE
 * Wzorowane na mechanice gier typu Tribal Wars (Plemiona).
 */

export const GAME_CONSTANTS = {
  SPEED_MULTIPLIER: 10, // Mnożnik prędkości gry (1 = real time, 10 = szybkie testy)
  BASE_STORAGE: 1000,   // Bazowa pojemność magazynu
  BASE_PRODUCTION: 30,  // Bazowa produkcja surowców na godzinę (nawet przy poziomie 0)
};

/**
 * STATYSTYKI JEDNOSTEK
 * speed: minuty na pole (im wyższa liczba, tym wolniejsza jednostka)
 * capacity: ile surowców może unieść jedna jednostka
 * pop: ile miejsca w zagrodzie zajmuje
 */
export const UNIT_STATS = {
  spear: { 
    attack: 10, defense: 15, speed: 18, 
    cost: { wood: 50, stone: 30, iron: 10 }, 
    pop: 1, capacity: 25 
  },
  sword: { 
    attack: 25, defense: 50, speed: 22, 
    cost: { wood: 30, stone: 30, iron: 70 }, 
    pop: 1, capacity: 15 
  },
  axe: { 
    attack: 40, defense: 10, speed: 18, 
    cost: { wood: 60, stone: 30, iron: 40 }, 
    pop: 1, capacity: 10 
  },
  scout: { 
    attack: 0, defense: 2, speed: 9, 
    cost: { wood: 50, stone: 50, iron: 20 }, 
    pop: 2, capacity: 0 
  },
  light: { 
    attack: 130, defense: 30, speed: 10, 
    cost: { wood: 125, stone: 100, iron: 250 }, 
    pop: 4, capacity: 80 
  }
};

/**
 * STATYSTYKI BUDYNKÓW
 * factor: mnożnik kosztu dla następnego poziomu (Cost * factor^level)
 * baseTime: czas budowy poziomu 1 w sekundach
 */
export const BUILDING_STATS = {
  headquarters: { 
    baseCost: { wood: 200, stone: 200, iron: 200 }, 
    baseTime: 60, 
    factor: 1.2 
  },
  timber_camp: { 
    baseCost: { wood: 50, stone: 60, iron: 40 }, 
    baseTime: 30, 
    factor: 1.25, 
    productionBase: 30 
  },
  clay_pit: { 
    baseCost: { wood: 60, stone: 50, iron: 40 }, 
    baseTime: 30, 
    factor: 1.25, 
    productionBase: 30 
  },
  iron_mine: { 
    baseCost: { wood: 70, stone: 60, iron: 50 }, 
    baseTime: 30, 
    factor: 1.25, 
    productionBase: 30 
  },
  warehouse: { 
    baseCost: { wood: 100, stone: 100, iron: 0 }, 
    baseTime: 40, 
    factor: 1.2, 
    capacityBase: 1000 
  },
  farm: { 
    baseCost: { wood: 100, stone: 100, iron: 50 }, 
    baseTime: 40, 
    factor: 1.3, 
    popBase: 240 
  },
  barracks: { 
    baseCost: { wood: 200, stone: 150, iron: 100 }, 
    baseTime: 120, 
    factor: 1.2 
  },
  wall: { 
    baseCost: { wood: 100, stone: 200, iron: 50 }, 
    baseTime: 60, 
    factor: 1.3, 
    defenseBase: 50 
  }
};

// --- FUNKCJE MATEMATYCZNE (HELPERS) ---

/**
 * Oblicza koszt ulepszenia budynku na kolejny poziom.
 * Wzór: BaseCost * Factor^(CurrentLevel)
 */
export const getUpgradeCost = (buildingType, currentLevel) => {
  const stats = BUILDING_STATS[buildingType];
  if (!stats) return { wood: 0, stone: 0, iron: 0, time: 0 };

  const nextLevel = currentLevel + 1; // Obliczamy koszt NA następny poziom
  // Dla poziomu 0 (budowa od zera) mnożnik to 1 (factor^0)
  const multiplier = Math.pow(stats.factor, currentLevel); 
  
  return {
    wood: Math.floor(stats.baseCost.wood * multiplier),
    stone: Math.floor(stats.baseCost.stone * multiplier),
    iron: Math.floor(stats.baseCost.iron * multiplier),
    // Czas maleje wraz z rozbudową Ratusza (headquarters), ale tu upraszczamy:
    time: Math.floor((stats.baseTime * multiplier) / GAME_CONSTANTS.SPEED_MULTIPLIER)
  };
};

/**
 * Oblicza produkcję surowców na godzinę.
 * Wzór: Base * 1.16^level
 */
export const getProductionRate = (level) => {
  if (level === 0) return GAME_CONSTANTS.BASE_PRODUCTION * GAME_CONSTANTS.SPEED_MULTIPLIER;
  
  // Wzór zbliżony do Plemion: 30 * 1.16^lvl
  return Math.floor(
    (30 * Math.pow(1.16, level)) * GAME_CONSTANTS.SPEED_MULTIPLIER
  );
};

/**
 * Oblicza pojemność magazynu.
 */
export const getStorageCapacity = (level) => {
  if (level === 0) return GAME_CONSTANTS.BASE_STORAGE;
  return Math.floor(GAME_CONSTANTS.BASE_STORAGE * Math.pow(1.2, level));
};

/**
 * Oblicza maksymalną populację (Zagroda).
 */
export const getMaxPopulation = (level) => {
  if (level === 0) return 0;
  // Wzór: Base * 1.17^lvl
  return Math.floor(BUILDING_STATS.farm.popBase * Math.pow(1.17, level - 1));
};

/**
 * Oblicza zajętą populację przez wojsko.
 */
export const calculateUsedPopulation = (units) => {
  let used = 0;
  if (!units) return 0;
  Object.keys(units).forEach(u => {
    if (UNIT_STATS[u]) {
      used += (units[u] || 0) * UNIT_STATS[u].pop;
    }
  });
  return used;
};

/**
 * Oblicza dystans euklidesowy między dwoma polami.
 */
export const getDistance = (c1, c2) => {
  if (!c1 || !c2) return 0;
  return Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2));
};

/**
 * Oblicza czas podróży w milisekundach.
 * distance: liczba pól
 * slowestUnitSpeed: minuty na pole
 */
export const getTravelTimeMs = (distance, slowestUnitSpeed) => {
  // Czas bazowy w minutach
  const minutes = distance * slowestUnitSpeed;
  // Konwersja na ms i uwzględnienie przyspieszenia świata
  return Math.floor((minutes * 60 * 1000) / GAME_CONSTANTS.SPEED_MULTIPLIER);
};

/**
 * Formatuje sekundy na format HH:MM:SS
 */
export const formatTime = (seconds) => {
  if (seconds < 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};