import { describe, expect, it, vi } from 'vitest';
import {
  BATTLE_STATE_V1_KEY,
  BATTLE_STATE_V2_KEY,
  BATTLE_STATE_V2_SIGNATURE_KEY,
  createBattlePersistence,
  decodeBattleEnvelope,
  encodeBattleSnapshot,
} from '../../services/battle/battlePersistence';
import { createInitialBattleProgress, DEFAULT_BATTLE_REGISTRY } from '../../services/battle/battleEngine';
import { MemoryStorage, createSequenceRng, createTestDependencies } from './battleTestUtils';

const signer = {
  sign: async (data: string): Promise<string> => `sig:${data}`,
  verify: async (data: string, signature: string): Promise<boolean> => signature === `sig:${data}`,
};

const createProgress = (questionsAnswered = 0) => {
  const dependencies = createTestDependencies(DEFAULT_BATTLE_REGISTRY, createSequenceRng([0]));
  return {
    ...createInitialBattleProgress(DEFAULT_BATTLE_REGISTRY, dependencies),
    questionsAnswered,
  };
};

describe('battlePersistence', () => {
  it('encodes only canonical durable fields', () => {
    const encoded = encodeBattleSnapshot(createProgress(3));
    expect(encoded).not.toBeNull();
    if (!encoded) return;

    const parsed = JSON.parse(encoded) as Record<string, unknown>;
    const snapshot = parsed.snapshot as Record<string, unknown>;
    expect(parsed.version).toBe(2);
    expect(snapshot.questionsAnswered).toBe(3);
    expect(snapshot).not.toHaveProperty('currentMonster');
    expect(snapshot).not.toHaveProperty('pendingSkill');
    expect(snapshot).not.toHaveProperty('currentAnimation');
    expect(snapshot).not.toHaveProperty('presentationEvents');
  });

  it('reads V1, migrates once to V2, and never writes V1', async () => {
    const storage = new MemoryStorage();
    const legacy = {
      streak: 4,
      maxStreak: 8,
      heroHp: 70,
      heroMaxHp: 100,
      monsterHp: 20,
      monsterMaxHp: 50,
      currentMonster: {
        id: 'slime_blue',
        name: '藍色史萊姆',
        difficulty: 'normal',
        imagePath: '/battle/monsters/slime_blue.png',
        hurtImagePath: '/battle/monsters/slime_blue.png',
        attackImagePath: '/battle/monsters/slime_blue.png',
        maxHp: 50,
        attackPower: 10,
        attackDialogues: [],
        hurtDialogues: [],
        defeatDialogues: [],
      },
      monstersDefeated: 2,
      questionsAnswered: 9,
      monsterPool: [],
      seenMonsters: ['slime_blue'],
      pendingSkill: null,
      currentAnimation: null,
      lastAction: 'idle',
      isActive: true,
      currentDialogue: null,
      lastDamage: 0,
      isLastHitCrit: false,
    };
    const legacyBytes = JSON.stringify(legacy);
    storage.setItem(BATTLE_STATE_V1_KEY, legacyBytes);
    storage.setItem(`${BATTLE_STATE_V1_KEY}_sig`, `sig:${legacyBytes}`);

    const persistence = createBattlePersistence(storage, signer);
    const migrated = await persistence.load();

    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.questionsAnswered).toBe(9);
    expect(storage.getItem(BATTLE_STATE_V1_KEY)).toBe(legacyBytes);
    expect(storage.getItem(BATTLE_STATE_V2_KEY)).not.toBeNull();
    expect(storage.getItem(BATTLE_STATE_V2_SIGNATURE_KEY)).not.toBeNull();
  });

  it('prefers valid V2 and leaves V1 untouched when old client coexists', async () => {
    const storage = new MemoryStorage();
    const progress = createProgress(12);
    const encoded = encodeBattleSnapshot(progress);
    if (!encoded) throw new Error('test fixture encoding failed');
    storage.setItem(BATTLE_STATE_V2_KEY, encoded);
    storage.setItem(BATTLE_STATE_V2_SIGNATURE_KEY, `sig:${encoded}`);
    storage.setItem(BATTLE_STATE_V1_KEY, '{"streak":1}');

    const persistence = createBattlePersistence(storage, signer);
    const loaded = await persistence.load();

    expect(loaded?.questionsAnswered).toBe(12);
    expect(storage.getItem(BATTLE_STATE_V1_KEY)).toBe('{"streak":1}');
  });

  it('rejects tampered and unknown-version snapshots without touching other keys', async () => {
    const storage = new MemoryStorage();
    storage.setItem(BATTLE_STATE_V2_KEY, '{"version":99}');
    storage.setItem(BATTLE_STATE_V2_SIGNATURE_KEY, 'sig:{"version":99}');
    storage.setItem('mindspark_banks', 'untouched');
    const persistence = createBattlePersistence(storage, signer);

    expect(await persistence.load()).toBeNull();
    expect(storage.getItem('mindspark_banks')).toBe('untouched');
    expect(decodeBattleEnvelope('{"version":99}')).toBeNull();
    expect(decodeBattleEnvelope('{}')).toBeNull();
  });

  it('keeps ordered writes and deduplicates identical bytes', async () => {
    const storage = new MemoryStorage();
    const sign = vi.fn(signer.sign);
    const persistence = createBattlePersistence(storage, { ...signer, sign });
    const first = createProgress(1);
    const second = createProgress(2);

    await Promise.all([
      persistence.write(first),
      persistence.write(first),
      persistence.write(second),
    ]);

    const raw = storage.getItem(BATTLE_STATE_V2_KEY);
    expect(raw).not.toBeNull();
    expect(raw ? decodeBattleEnvelope(raw)?.questionsAnswered : null).toBe(2);
    expect(sign).toHaveBeenCalledTimes(2);
  });
});
