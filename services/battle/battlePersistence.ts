import { STORAGE_KEYS } from '../../services/storage';
import { signData, verifyData } from '../../utils/integrityCheck';
import {
  BattleProgressState,
  EncounterSchedule,
  isBattleState,
} from '../../types/battleTypes';

export const BATTLE_STATE_V1_KEY = STORAGE_KEYS.BATTLE_STATE;
export const BATTLE_STATE_V2_KEY = STORAGE_KEYS.BATTLE_STATE_V2;
export const BATTLE_STATE_V2_SIGNATURE_KEY = `${BATTLE_STATE_V2_KEY}_sig`;

export interface BattlePersistenceStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface BattlePersistenceSigner {
  sign: (data: string) => Promise<string>;
  verify: (data: string, signature: string) => Promise<boolean>;
}

export interface BattlePersistence {
  load: () => Promise<BattleProgressState | null>;
  write: (progress: BattleProgressState) => Promise<void>;
  clearV2: () => void;
}

const defaultBattlePersistenceSigner: BattlePersistenceSigner = {
  sign: signData,
  verify: verifyData,
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const finiteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const stringValue = (value: unknown): value is string => (
  typeof value === 'string' && value.length > 0
);

const stringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every(item => typeof item === 'string')
);

const safeNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  if (!finiteNumber(value)) return fallback;
  return Math.min(Math.max(value, min), max);
};

const createSchedule = (): EncounterSchedule => ({
  nextEncounterKind: null,
  lastEliteMilestone: 0,
  lastBossMilestone: 0,
});

const isSchedule = (value: unknown): value is EncounterSchedule => {
  if (!isRecord(value)) return false;
  const next = value.nextEncounterKind;
  return (
    (next === null || next === 'normal' || next === 'elite' || next === 'boss')
    && finiteNumber(value.lastEliteMilestone)
    && value.lastEliteMilestone >= 0
    && finiteNumber(value.lastBossMilestone)
    && value.lastBossMilestone >= 0
  );
};

const isProgressSnapshot = (value: unknown): value is BattleProgressState => {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === 2
    && stringValue(value.battleId)
    && stringValue(value.sessionId)
    && finiteNumber(value.heroHp)
    && finiteNumber(value.heroMaxHp)
    && value.heroMaxHp > 0
    && value.heroHp >= 0
    && value.heroHp <= value.heroMaxHp
    && finiteNumber(value.shield)
    && value.shield >= 0
    && (value.currentMonsterId === null || stringValue(value.currentMonsterId))
    && finiteNumber(value.currentMonsterHp)
    && value.currentMonsterHp >= 0
    && finiteNumber(value.currentMonsterMaxHp)
    && value.currentMonsterMaxHp >= 0
    && finiteNumber(value.streak)
    && value.streak >= 0
    && finiteNumber(value.maxStreak)
    && value.maxStreak >= 0
    && finiteNumber(value.questionsAnswered)
    && value.questionsAnswered >= 0
    && finiteNumber(value.monstersDefeated)
    && value.monstersDefeated >= 0
    && stringArray(value.seenMonsters)
    && isSchedule(value.encounterSchedule)
    && typeof value.isActive === 'boolean'
  );
};

const canonicalize = (progress: BattleProgressState): BattleProgressState | null => {
  if (!isProgressSnapshot(progress)) return null;
  return {
    schemaVersion: 2,
    battleId: progress.battleId,
    sessionId: progress.sessionId,
    heroHp: Math.floor(progress.heroHp),
    heroMaxHp: Math.floor(progress.heroMaxHp),
    shield: Math.floor(progress.shield),
    currentMonsterId: progress.currentMonsterId,
    currentMonsterHp: Math.floor(Math.min(progress.currentMonsterHp, progress.currentMonsterMaxHp)),
    currentMonsterMaxHp: Math.floor(progress.currentMonsterMaxHp),
    streak: Math.floor(progress.streak),
    maxStreak: Math.floor(Math.max(progress.maxStreak, progress.streak)),
    questionsAnswered: Math.floor(progress.questionsAnswered),
    monstersDefeated: Math.floor(progress.monstersDefeated),
    seenMonsters: [...new Set(progress.seenMonsters)],
    encounterSchedule: {
      nextEncounterKind: progress.encounterSchedule.nextEncounterKind,
      lastEliteMilestone: Math.floor(progress.encounterSchedule.lastEliteMilestone),
      lastBossMilestone: Math.floor(progress.encounterSchedule.lastBossMilestone),
    },
    isActive: progress.isActive,
  };
};

const parseInput = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const migrateLegacyBattleState = (value: unknown): BattleProgressState | null => {
  if (!isRecord(value)) return null;
  const currentMonster = isRecord(value.currentMonster) ? value.currentMonster : null;
  const currentMonsterId = currentMonster && stringValue(currentMonster.id)
    ? currentMonster.id
    : null;
  const fallbackMonsterMaxHp = currentMonster && finiteNumber(currentMonster.maxHp)
    ? currentMonster.maxHp
    : 0;
  const monsterMaxHp = safeNumber(value.monsterMaxHp, fallbackMonsterMaxHp, 0, Number.MAX_SAFE_INTEGER);
  const monsterHp = safeNumber(value.monsterHp, monsterMaxHp, 0, monsterMaxHp);
  const heroMaxHp = safeNumber(value.heroMaxHp, 100, 1, Number.MAX_SAFE_INTEGER);
  const heroHp = safeNumber(value.heroHp, heroMaxHp, 0, heroMaxHp);
  const seenMonsters = stringArray(value.seenMonsters) ? [...new Set(value.seenMonsters)] : [];
  if (currentMonsterId && !seenMonsters.includes(currentMonsterId)) {
    seenMonsters.push(currentMonsterId);
  }

  const progress: BattleProgressState = {
    schemaVersion: 2,
    battleId: stringValue(value.battleId) ? value.battleId : 'legacy-battle',
    sessionId: stringValue(value.sessionId) ? value.sessionId : 'legacy-session',
    heroHp,
    heroMaxHp,
    shield: 0,
    currentMonsterId,
    currentMonsterHp: monsterHp,
    currentMonsterMaxHp: monsterMaxHp,
    streak: safeNumber(value.streak, 0, 0, Number.MAX_SAFE_INTEGER),
    maxStreak: safeNumber(value.maxStreak, 0, 0, Number.MAX_SAFE_INTEGER),
    questionsAnswered: safeNumber(value.questionsAnswered, 0, 0, Number.MAX_SAFE_INTEGER),
    monstersDefeated: safeNumber(value.monstersDefeated, 0, 0, Number.MAX_SAFE_INTEGER),
    seenMonsters,
    encounterSchedule: isSchedule(value.encounterSchedule) ? value.encounterSchedule : createSchedule(),
    isActive: typeof value.isActive === 'boolean' ? value.isActive : currentMonsterId !== null,
  };
  return canonicalize(progress);
};

/** 讀舊版或 V2 snapshot；只回傳 durable fields。 */
function migrateBattleSnapshot(snapshot: unknown): BattleProgressState | null;
function migrateBattleSnapshot(version: number, snapshot: unknown): BattleProgressState | null;
function migrateBattleSnapshot(versionOrSnapshot: number | unknown, snapshot?: unknown): BattleProgressState | null {
  const value = typeof versionOrSnapshot === 'number' ? snapshot : versionOrSnapshot;
  if (!isRecord(value)) return null;

  const explicitVersion = typeof versionOrSnapshot === 'number'
    ? versionOrSnapshot
    : finiteNumber(value.schemaVersion)
      ? value.schemaVersion
      : finiteNumber(value.version)
        ? value.version
        : undefined;
  if (explicitVersion !== undefined && explicitVersion !== 1 && explicitVersion !== 2) {
    return null;
  }
  if (isProgressSnapshot(value)) return canonicalize(value);
  if (explicitVersion === 2) return null;
  if (isBattleState(value)) return migrateLegacyBattleState(value);
  return null;
}

/** 將 durable progress 編碼為 canonical V2 bytes；不含 presentation/transient 欄位。 */
export function encodeBattleSnapshot(progress: BattleProgressState): string | null {
  const canonical = canonicalize(progress);
  if (!canonical) return null;
  return JSON.stringify({
    version: 2,
    snapshot: canonical,
  });
}

/** 解 envelope，支援 canonical V2、直接 V2 snapshot 與合法 legacy snapshot。 */
export function decodeBattleEnvelope(value: unknown): BattleProgressState | null {
  const parsed = parseInput(value);
  if (!isRecord(parsed)) return null;

  if (finiteNumber(parsed.version) || finiteNumber(parsed.schemaVersion)) {
    const versionValue = parsed.version;
    const schemaVersionValue = parsed.schemaVersion;
    const version = finiteNumber(versionValue)
      ? versionValue
      : finiteNumber(schemaVersionValue)
        ? schemaVersionValue
        : null;
    if (version === null) return null;
    if (version === 2 && (parsed.snapshot !== undefined || parsed.payload !== undefined)) {
      return migrateBattleSnapshot(2, parsed.snapshot ?? parsed.payload);
    }
    return migrateBattleSnapshot(version, parsed);
  }
  return migrateBattleSnapshot(parsed);
}

const createDefaultStorage = (): BattlePersistenceStorage | null => {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

/**
 * V1 只讀、V2 只寫。write queue 永遠收斂，單一壞寫入不阻塞後續答案。
 */
export function createBattlePersistence(
  storage: BattlePersistenceStorage | null = createDefaultStorage(),
  signer: BattlePersistenceSigner = defaultBattlePersistenceSigner,
): BattlePersistence {
  let lastEncoded: string | null = null;
  let writeQueue: Promise<void> = Promise.resolve();

  const write = (progress: BattleProgressState): Promise<void> => {
    writeQueue = writeQueue.then(async () => {
      if (!storage) return;
      const encoded = encodeBattleSnapshot(progress);
      if (!encoded || encoded === lastEncoded) return;
      try {
        const signature = await signer.sign(encoded);
        storage.setItem(BATTLE_STATE_V2_KEY, encoded);
        storage.setItem(BATTLE_STATE_V2_SIGNATURE_KEY, signature);
        lastEncoded = encoded;
      } catch (error) {
        console.warn('[BattlePersistence] V2 write failed; keeping quiz flow alive.', error);
      }
    }).catch(error => {
      console.warn('[BattlePersistence] Write queue recovered after failure.', error);
    });
    return writeQueue;
  };

  const load = async (): Promise<BattleProgressState | null> => {
    if (!storage) return null;
    try {
      const v2 = storage.getItem(BATTLE_STATE_V2_KEY);
      if (v2) {
        const signature = storage.getItem(BATTLE_STATE_V2_SIGNATURE_KEY) ?? '';
        if (!(await signer.verify(v2, signature))) return null;
        const decoded = decodeBattleEnvelope(v2);
        if (decoded) lastEncoded = encodeBattleSnapshot(decoded);
        return decoded;
      }

      const v1 = storage.getItem(BATTLE_STATE_V1_KEY);
      if (!v1) return null;
      const v1Signature = storage.getItem(`${BATTLE_STATE_V1_KEY}_sig`) ?? '';
      if (!(await signer.verify(v1, v1Signature))) return null;
      const migrated = decodeBattleEnvelope(v1);
      if (migrated) await write(migrated);
      return migrated;
    } catch (error) {
      console.warn('[BattlePersistence] Load failed; using safe initial state.', error);
      return null;
    }
  };

  return {
    load,
    write,
    clearV2: () => {
      try {
        storage?.removeItem(BATTLE_STATE_V2_KEY);
        storage?.removeItem(BATTLE_STATE_V2_SIGNATURE_KEY);
        lastEncoded = null;
      } catch (error) {
        console.warn('[BattlePersistence] Clear failed.', error);
      }
    },
  };
}
