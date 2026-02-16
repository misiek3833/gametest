import { useState, useEffect, useRef } from 'react';
import { 
  getDatabase, ref, onValue, runTransaction, set, push, get, query, orderByChild, equalTo, update 
} from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import toast from 'react-hot-toast';

// Importy konfiguracji i narzędzi (zakładamy, że te pliki istnieją wg poprzednich instrukcji)
import { 
  GAME_CONSTANTS, 
  BUILDING_STATS, 
  UNIT_STATS, 
  getUpgradeCost, 
  getStorageCapacity, 
  getProductionRate,
  calculateUsedPopulation,
  getMaxPopulation,
  getDistance,
  getTravelTimeMs
} from '../gameConfig';

/**
 * Pomocnicza funkcja do obliczania surowców na podstawie czasu.
 * Używana lokalnie w hooku do predykcji UI oraz wewnątrz transakcji.
 */
const calculateCurrentResources = (villageData, timestamp = Date.now()) => {
  if (!villageData) return { wood: 0, stone: 0, iron: 0, storage_cap: 0 };

  const { resources, buildings } = villageData;
  const timeDiffHours = (timestamp - resources.last_update) / 1000 / 3600;

  // Jeśli czas jest ujemny (np. różnice zegarów), zwróć stan z bazy
  if (timeDiffHours <= 0) return resources;

  const cap = getStorageCapacity(buildings.warehouse);
  const woodRate = getProductionRate(buildings.timber_camp);
  const stoneRate = getProductionRate(buildings.clay_pit);
  const ironRate = getProductionRate(buildings.iron_mine);

  return {
    wood: Math.min(cap, Math.floor(resources.wood + woodRate * timeDiffHours)),
    stone: Math.min(cap, Math.floor(resources.stone + stoneRate * timeDiffHours)),
    iron: Math.min(cap, Math.floor(resources.iron + ironRate * timeDiffHours)),
    storage_cap: cap,
    // Zachowujemy last_update z bazy do obliczeń relatywnych, 
    // ale UI może go ignorować
    last_update: resources.last_update 
  };
};

export const useGameEngine = (firebaseApp) => {
  const db = getDatabase(firebaseApp);
  const auth = getAuth(firebaseApp);

  // --- STATE ---
  const [user, setUser] = useState(null);
  const [village, setVillage] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // "Live" resources - aktualizowane co sekundę (Client-side prediction)
  const [liveResources, setLiveResources] = useState({ wood: 0, stone: 0, iron: 0, storage_cap: 0 });
  
  // Lista nadchodzących ataków
  const [incomingAttacks, setIncomingAttacks] = useState([]);

  // Ref do interwału, aby go czyścić
  const tickerRef = useRef(null);

  // --- 1. AUTH & INITIALIZATION ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (currentUser) {
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();

        if (userData && userData.active_village_id) {
          subscribeToVillage(userData.active_village_id);
          subscribeToAttacks(userData.active_village_id);
        } else {
          await initializeNewPlayer(currentUser);
        }
      } else {
        setVillage(null);
        setIncomingAttacks([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // --- 2. LISTENERS ---

  const subscribeToVillage = (villageId) => {
    const villageRef = ref(db, `villages/${villageId}`);
    onValue(villageRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setVillage(data);
        // Natychmiastowa aktualizacja surowców po zmianie w bazie
        setLiveResources(calculateCurrentResources(data));
      }
      setLoading(false);
    });
  };

  const subscribeToAttacks = (villageId) => {
    // Pobieramy komendy, gdzie targetId == villageId
    const commandsRef = query(ref(db, 'commands'), orderByChild('targetId'), equalTo(villageId));
    onValue(commandsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Filtrujemy tylko ataki (nie powroty)
        const attacks = Object.values(data).filter(cmd => cmd.type === 'attack');
        setIncomingAttacks(attacks);
      } else {
        setIncomingAttacks([]);
      }
    });
  };

  // --- 3. RESOURCE TICKER (Loop) ---
  useEffect(() => {
    if (!village) return;

    // Funkcja aktualizująca UI
    const tick = () => {
      setLiveResources(calculateCurrentResources(village, Date.now()));
    };

    // Uruchom natychmiast i potem co sekundę
    tick();
    tickerRef.current = setInterval(tick, 1000);

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [village]); // Restartuj timer, gdy zmienią się dane bazowe wioski (np. po budowie)

  // --- 4. ACTIONS (TRANSACTIONS) ---

  const initializeNewPlayer = async (u) => {
    try {
      // Losowe kordy 0-14
      const x = Math.floor(Math.random() * 15);
      const y = Math.floor(Math.random() * 15);
      const vid = `V_${x}_${y}`; // Proste ID oparte na kordach (uwaga: w produkcji może być kolizja)

      // Sprawdź czy miejsce zajęte
      const checkRef = ref(db, `villages/${vid}`);
      const checkSnap = await get(checkRef);
      if (checkSnap.exists()) {
        // Prosty retry (w produkcji lepiej szukać wolnego miejsca algorytmem)
        toast.error("Location occupied, reloading...");
        window.location.reload(); 
        return;
      }

      const initialVillage = {
        id: vid,
        owner_id: u.uid,
        name: `${u.displayName || 'Player'}'s Village`,
        coords: { x, y },
        points: 50,
        resources: { 
          wood: 500, stone: 500, iron: 500, 
          last_update: Date.now() 
        },
        buildings: { 
          headquarters: 1, timber_camp: 1, clay_pit: 1, iron_mine: 1, 
          warehouse: 1, farm: 1, barracks: 1, wall: 0 
        },
        troops: { spear: 0, sword: 0, axe: 0, light: 0, scout: 0 },
        tribeId: null
      };

      // Atomic update: User + Village
      const updates = {};
      updates[`villages/${vid}`] = initialVillage;
      updates[`users/${u.uid}`] = {
        username: u.displayName || u.email.split('@')[0],
        email: u.email,
        active_village_id: vid
      };

      await update(ref(db), updates);
      
      // Manual trigger subskrypcji po utworzeniu
      subscribeToVillage(vid);
      subscribeToAttacks(vid);
      toast.success("New village founded!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to init player.");
    }
  };

  const upgradeBuilding = async (buildingType) => {
    if (!village) return;
    const vRef = ref(db, `villages/${village.id}`);

    try {
      await runTransaction(vRef, (data) => {
        if (!data) return;

        // 1. Oblicz surowce na TERAZ (wewnątrz transakcji)
        const now = Date.now();
        const currentRes = calculateCurrentResources(data, now);
        
        // 2. Koszt
        const currentLevel = data.buildings[buildingType] || 0;
        const cost = getUpgradeCost(buildingType, currentLevel);

        // 3. Walidacja
        if (currentRes.wood < cost.wood || 
            currentRes.stone < cost.stone || 
            currentRes.iron < cost.iron) {
          throw new Error("Not enough resources!"); // Przerywa transakcję
        }

        // 4. Pobierz surowce i zaktualizuj czas
        data.resources = {
          wood: currentRes.wood - cost.wood,
          stone: currentRes.stone - cost.stone,
          iron: currentRes.iron - cost.iron,
          last_update: now
        };

        // 5. Zwiększ poziom (uproszczone - natychmiastowe budowanie)
        // W pełnej wersji: dodaj do buildQueue
        data.buildings[buildingType] = currentLevel + 1;
        
        // Dodaj punkty
        data.points = (data.points || 0) + 10; 

        return data;
      });
      toast.success(`Upgraded ${buildingType}!`);
    } catch (e) {
      toast.error(e.message === "Not enough resources!" ? e.message : "Build failed");
      console.error(e);
    }
  };

  const recruitUnit = async (unitType, quantity) => {
    if (!village || quantity <= 0) return;
    const vRef = ref(db, `villages/${village.id}`);

    try {
      await runTransaction(vRef, (data) => {
        if (!data) return;

        const now = Date.now();
        const currentRes = calculateCurrentResources(data, now);
        
        const uStats = UNIT_STATS[unitType];
        const totalCost = {
          wood: uStats.cost.wood * quantity,
          stone: uStats.cost.stone * quantity,
          iron: uStats.cost.iron * quantity
        };

        // Walidacja surowców
        if (currentRes.wood < totalCost.wood || 
            currentRes.stone < totalCost.stone || 
            currentRes.iron < totalCost.iron) {
          throw new Error("Not enough resources!");
        }

        // Walidacja Populacji (Farm)
        const usedPop = calculateUsedPopulation(data.troops);
        const maxPop = getMaxPopulation(data.buildings.farm);
        const requiredPop = uStats.pop * quantity;

        if (usedPop + requiredPop > maxPop) {
          throw new Error("Farm limit reached!");
        }

        // Wykonaj zmiany
        data.resources = {
          wood: currentRes.wood - totalCost.wood,
          stone: currentRes.stone - totalCost.stone,
          iron: currentRes.iron - totalCost.iron,
          last_update: now
        };

        if (!data.troops[unitType]) data.troops[unitType] = 0;
        data.troops[unitType] += quantity;

        return data;
      });
      toast.success(`Recruited ${quantity} ${unitType}s!`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const sendArmy = async (targetCoords, units) => {
    if (!village) return;

    // 1. Znajdź ID celu na podstawie koordynatów
    // Pobieramy snapshot wszystkich wiosek (nieoptymalne przy dużej skali, ale ok na MVP)
    // Lepsze podejście: index "x_y" w bazie.
    const vilsRef = query(ref(db, 'villages'), orderByChild('coords/x'), equalTo(targetCoords.x));
    const snapshot = await get(vilsRef);
    
    let targetId = null;
    if (snapshot.exists()) {
      const candidates = snapshot.val();
      // Filtruj po Y (bo query było tylko po X)
      const found = Object.values(candidates).find(v => v.coords.y === targetCoords.y);
      if (found) targetId = found.id;
    }

    if (!targetId) {
      toast.error("Target village not found!");
      return;
    }

    if (targetId === village.id) {
      toast.error("Cannot attack yourself!");
      return;
    }

    // 2. Oblicz czas
    const dist = getDistance(village.coords, targetCoords);
    let slowest = 999;
    let hasUnits = false;
    Object.keys(units).forEach(u => {
      if (units[u] > 0) {
        hasUnits = true;
        // W configu: speed = minuty/pole. Im więcej tym wolniej.
        // Szukamy największej wartości speed.
        if (UNIT_STATS[u].speed > slowest || slowest === 999) {
           // Fix logiki: UNIT_STATS.speed = minuty na pole. 
           // Inicjalnie 999 (bardzo wolny?) Nie, szukamy MAX speed value.
           slowest = 0; 
        }
        if (UNIT_STATS[u].speed > slowest) slowest = UNIT_STATS[u].speed;
      }
    });

    if (!hasUnits) {
      toast.error("No units selected!");
      return;
    }

    const travelTime = getTravelTimeMs(dist, slowest);
    const arrivalTime = Date.now() + travelTime;

    // 3. Transakcja: Zabierz wojsko
    const vRef = ref(db, `villages/${village.id}`);
    try {
      await runTransaction(vRef, (data) => {
        if (!data) return;
        
        for (let u in units) {
          if ((data.troops[u] || 0) < units[u]) {
             throw new Error("Not enough troops!"); 
          }
          data.troops[u] -= units[u];
        }
        return data;
      });

      // 4. Utwórz komendę (jeśli transakcja się udała)
      const cmdRef = push(ref(db, 'commands'));
      await set(cmdRef, {
        id: cmdRef.key,
        type: 'attack',
        originId: village.id,
        targetId: targetId,
        targetCoords,
        units,
        startTime: Date.now(),
        arrivalTime,
        status: 'moving'
      });

      toast.success("Army sent!");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const createTribe = async (name, tag) => {
    if (!user) return;
    try {
        const tribeRef = push(ref(db, 'tribes'));
        const tribeId = tribeRef.key;
        
        await set(tribeRef, {
            id: tribeId,
            name,
            tag: tag.toUpperCase(),
            ownerId: user.uid,
            members: { [user.uid]: true }
        });

        // Update User & Village
        const updates = {};
        updates[`users/${user.uid}/tribeId`] = tribeId;
        if (village) updates[`villages/${village.id}/tribeId`] = tribeId;
        
        await update(ref(db), updates);
        toast.success(`Tribe ${tag} created!`);
    } catch (e) {
        toast.error("Failed to create tribe");
    }
  };

  const sendMessage = async (recipientId, subject, body) => {
     // W MVP: wysyłanie wymaga podania UID odbiorcy
     if(!recipientId) return;
     try {
        const msgRef = push(ref(db, `messages/${recipientId}`));
        await set(msgRef, {
            senderId: user.uid,
            senderName: user.displayName || "Unknown",
            subject,
            body,
            timestamp: Date.now(),
            isRead: false
        });
        toast.success("Message sent");
     } catch(e) {
        toast.error("Failed to send");
     }
  };

  return {
    user,
    village,
    resources: liveResources, // Zwracamy te obliczane co sekundę
    incomingAttacks,
    loading,
    actions: {
      upgradeBuilding,
      recruitUnit,
      sendArmy,
      createTribe,
      sendMessage
    }
  };
};