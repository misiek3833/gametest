import { getDatabase, ref, get, query, orderByChild, endAt, runTransaction, remove, push, update } from "firebase/database";
// Zakładam, że masz te pliki z poprzednich kroków:
import { resolveCombat } from './combatEngine'; 

const db = getDatabase();

export const processGameEvents = async () => {
  const now = Date.now();

  // 1. Przetwarzanie Komend (Ruchy wojsk)
  const commandsQuery = query(
    ref(db, 'commands'), 
    orderByChild('arrivalTime'), 
    endAt(now)
  );

  const snapshot = await get(commandsQuery);
  
  if (snapshot.exists()) {
    const commands = snapshot.val();
    const tasks = Object.keys(commands).map(async (cmdId) => {
      const cmd = commands[cmdId];
      try {
        if (cmd.type === 'attack') {
          await handleAttack(cmdId, cmd);
        } else if (cmd.type === 'return') {
          await handleReturn(cmdId, cmd);
        }
      } catch (err) {
        console.error(`Error processing cmd ${cmdId}`, err);
      }
    });
    await Promise.all(tasks);
  }

  // 2. Przetwarzanie Kolejek Budowy (Uproszczone: dla aktywnych graczy)
  // W pełnej wersji: Cloud Functions. Tutaj: Klient aktualizuje własne.
};

const handleAttack = async (cmdId, cmd) => {
  const targetRef = ref(db, `villages/${cmd.targetId}`);
  let battleResult = null;

  // Transakcja na wiosce obrońcy
  await runTransaction(targetRef, (targetVillage) => {
    if (!targetVillage) return;

    // Rozstrzygnij walkę (funkcja z combatEngine.js)
    battleResult = resolveCombat(
      cmd.units, 
      targetVillage.troops, 
      targetVillage.buildings.wall || 0,
      targetVillage.resources 
    );

    // Aplikuj straty u obrońcy
    targetVillage.troops = battleResult.defenderRemaining;
    
    if (battleResult.winner === 'attacker') {
        targetVillage.resources.wood -= battleResult.loot.wood;
        targetVillage.resources.stone -= battleResult.loot.stone;
        targetVillage.resources.iron -= battleResult.loot.iron;
    }
    return targetVillage;
  });

  if (battleResult) {
    // Generuj raporty (poza transakcją)
    const reportData = {
      timestamp: Date.now(),
      attackerId: cmd.originId,
      defenderId: cmd.targetId,
      winner: battleResult.winner,
      loot: battleResult.loot,
      attackerLosses: battleResult.attackerLosses,
      defenderLosses: battleResult.defenderLosses,
      isRead: false
    };

    // Znajdź właściciela celu, aby wysłać mu raport
    const targetSnap = await get(ref(db, `villages/${cmd.targetId}/owner_id`));
    const defenderUid = targetSnap.val();
    
    // Znajdź właściciela ataku
    const originSnap = await get(ref(db, `villages/${cmd.originId}/owner_id`));
    const attackerUid = originSnap.val();

    if (attackerUid) push(ref(db, `reports/${attackerUid}`), { ...reportData, type: 'attack_sent' });
    if (defenderUid) push(ref(db, `reports/${defenderUid}`), { ...reportData, type: 'defense' });

    // Obsługa powrotu ocalałych
    const survivors = battleResult.attackerRemaining;
    const hasSurvivors = Object.values(survivors).some(v => v > 0);

    if (hasSurvivors) {
      const returnTime = Date.now() + (cmd.arrivalTime - cmd.startTime);
      const returnCmd = {
        type: 'return',
        originId: cmd.targetId,
        targetId: cmd.originId,
        units: survivors,
        resources: battleResult.loot,
        startTime: Date.now(),
        arrivalTime: returnTime
      };
      push(ref(db, 'commands'), returnCmd);
    }
  }

  // Usuń przetworzoną komendę
  await remove(ref(db, `commands/${cmdId}`));
};

const handleReturn = async (cmdId, cmd) => {
  const homeRef = ref(db, `villages/${cmd.targetId}`);
  await runTransaction(homeRef, (village) => {
    if (!village) return;
    
    Object.keys(cmd.units).forEach(u => {
      village.troops[u] = (village.troops[u] || 0) + cmd.units[u];
    });

    if (cmd.resources) {
      village.resources.wood += cmd.resources.wood || 0;
      village.resources.stone += cmd.resources.stone || 0;
      village.resources.iron += cmd.resources.iron || 0;
    }
    return village;
  });
  await remove(ref(db, `commands/${cmdId}`));
};