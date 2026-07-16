import {
  BattleClock,
  BattleEngineDependencies,
  BattleIdFactory,
  BattleRandomSource,
  BattleRegistry,
} from '../../types/battleTypes';
import { DEFAULT_BATTLE_REGISTRY } from '../../services/battle/battleEngine';

export class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

export const createSequenceRng = (
  values: readonly number[] = [],
  fallback = 0,
): BattleRandomSource => {
  let index = 0;
  return {
    next: () => {
      const value = values[index];
      index += 1;
      return value ?? fallback;
    },
  };
};

const createFakeClock = (initial = 0): BattleClock & { advance: (ms: number) => void } => {
  let current = initial;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
};

const createTestIdFactory = (): BattleIdFactory => {
  let index = 0;
  return {
    create: (prefix: string) => `${prefix}-${index++}`,
  };
};

export const createTestDependencies = (
  registry: BattleRegistry = DEFAULT_BATTLE_REGISTRY,
  rng = createSequenceRng(),
): BattleEngineDependencies => ({
  registry,
  rng,
  clock: createFakeClock(),
  idFactory: createTestIdFactory(),
});
