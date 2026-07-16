import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BATTLE_MOTION_PROFILES } from '../../services/battle/battleEngine';
import { BattlePresentationEvent, BattleState, INITIAL_BATTLE_STATE } from '../../types/battleTypes';
import { BattleArena } from '../../components/BattleArena';
import { DEFAULT_BATTLE_REGISTRY } from '../../services/battle/battleEngine';

vi.mock('../../hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({
    playBgm: vi.fn(),
    playBattleCue: vi.fn(),
    stopBgm: vi.fn(),
  }),
}));

const createEvent = (): BattlePresentationEvent => ({
  eventId: 'presentation-test',
  correlationId: 'answer-test',
  sequence: 0,
  kind: 'hero_attack',
  actorId: 'hero',
  targetId: 'slime_blue',
  phase: 'anticipation',
  durationProfile: BATTLE_MOTION_PROFILES.hero_attack,
  payload: {
    damage: 12,
    baseDamage: 12,
    isCrit: false,
    multiplier: 1,
    shieldAbsorbed: 0,
  },
});

const createState = (): BattleState => {
  const monster = DEFAULT_BATTLE_REGISTRY.monsters[0];
  return {
    ...INITIAL_BATTLE_STATE,
    isActive: true,
    currentMonster: monster,
    monsterHp: monster.maxHp - 12,
    monsterMaxHp: monster.maxHp,
  };
};

describe('BattleArena', () => {
  it('exposes semantic HP progress bars and one live event message', () => {
    render(
      <BattleArena
        battleState={createState()}
        activeEvent={createEvent()}
        onPresentationComplete={vi.fn()}
      />
    );

    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(2);
    expect(bars[0].getAttribute('aria-valuemin')).toBe('0');
    expect(bars[1].getAttribute('aria-valuenow')).toBe('38');
    expect(screen.getByText('造成 12 點傷害')).not.toBeNull();
  });

  it('falls back to a local silhouette when a character image fails', () => {
    render(
      <BattleArena
        battleState={createState()}
        activeEvent={createEvent()}
        onPresentationComplete={vi.fn()}
      />
    );
    const monsterImage = screen.getByAltText(DEFAULT_BATTLE_REGISTRY.monsters[0].name);

    fireEvent.error(monsterImage);

    expect(screen.getByRole('img', { name: DEFAULT_BATTLE_REGISTRY.monsters[0].name })).not.toBeNull();
    expect(document.querySelector('img[src^="data:"]')).toBeNull();
  });

  it('shows a recoverable prompt when no valid monster is available', () => {
    render(
      <BattleArena
        battleState={{
          ...INITIAL_BATTLE_STATE,
          isActive: false,
          failure: {
            code: 'MONSTER_UNAVAILABLE',
            message: 'No monster',
            recoverable: true,
          },
        }}
        activeEvent={null}
        onPresentationComplete={vi.fn()}
      />
    );

    expect(screen.getByRole('status').textContent).toContain('測驗流程仍可繼續');
  });

  it('keeps the defeated monster visible until its queued spawn event begins', () => {
    const defeated = DEFAULT_BATTLE_REGISTRY.monsters[0];
    const nextMonster = DEFAULT_BATTLE_REGISTRY.monsters.find(monster => monster.id !== defeated.id);
    if (!nextMonster) throw new Error('Expected at least two battle monsters');
    const defeatEvent: BattlePresentationEvent = {
      ...createEvent(),
      kind: 'monster_defeat',
      actorId: defeated.id,
      targetId: defeated.id,
      phase: 'defeat',
      payload: {
        ...createEvent().payload,
        monsterId: defeated.id,
        monsterDifficulty: defeated.difficulty,
      },
    };

    render(
      <BattleArena
        battleState={{
          ...createState(),
          currentMonster: nextMonster,
          monsterHp: nextMonster.maxHp,
          monsterMaxHp: nextMonster.maxHp,
        }}
        activeEvent={defeatEvent}
        onPresentationComplete={vi.fn()}
      />
    );

    expect(screen.getByAltText(defeated.name)).not.toBeNull();
    expect(screen.queryByAltText(nextMonster.name)).toBeNull();
  });

  it('announces a bounded boss entrance with a visible title', () => {
    const boss = DEFAULT_BATTLE_REGISTRY.monsters.find(monster => monster.difficulty === 'boss');
    if (!boss) throw new Error('Expected a boss fixture');
    const bossEvent: BattlePresentationEvent = {
      ...createEvent(),
      kind: 'boss_entrance',
      actorId: 'monster',
      targetId: boss.id,
      phase: 'entrance',
      payload: {
        ...createEvent().payload,
        monsterId: boss.id,
        monsterDifficulty: 'boss',
      },
    };

    render(
      <BattleArena
        battleState={{
          ...createState(),
          currentMonster: boss,
          monsterHp: boss.maxHp,
          monsterMaxHp: boss.maxHp,
        }}
        activeEvent={bossEvent}
        onPresentationComplete={vi.fn()}
      />
    );

    expect(screen.getByText(`BOSS 來襲：${boss.name}`)).not.toBeNull();
    expect(screen.getByText(`${boss.name} · BOSS`)).not.toBeNull();
  });
});
