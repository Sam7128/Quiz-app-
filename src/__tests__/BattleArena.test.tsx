import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BATTLE_MOTION_PROFILES } from '../../services/battle/battleEngine';
import { BattlePresentationEvent, BattleState, INITIAL_BATTLE_STATE } from '../../types/battleTypes';
import { BattleArena } from '../../components/BattleArena';
import { DEFAULT_BATTLE_REGISTRY } from '../../services/battle/battleEngine';

const { reducedMotionMock } = vi.hoisted(() => ({
  reducedMotionMock: vi.fn(() => false),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useReducedMotion: reducedMotionMock,
  };
});

vi.mock('../../hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({
    playBgm: vi.fn(),
    playBattleCue: vi.fn(),
    stopBattleCue: vi.fn(),
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
  phase: 'travel',
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
  beforeEach(() => {
    reducedMotionMock.mockReturnValue(false);
  });

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

    const defeatedImg = screen.getByAltText(defeated.name) as HTMLImageElement;
    expect(defeatedImg).not.toBeNull();
    expect(defeatedImg.src).toContain('/battle/monsters/slime_blue_defeat.webp');
    expect(screen.queryByAltText(nextMonster.name)).toBeNull();
  });

  it('announces a bounded boss entrance with a visible title and entrance action asset', () => {
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
    const bossImg = screen.getByAltText(boss.name) as HTMLImageElement;
    expect(bossImg.src).toContain('/battle/monsters/dragon_fire_entrance.webp');
  });

  it('renders correct action assets for hero attack, cast, hurt, and defeat', () => {
    const baseState = createState();

    // Hero Attack (travel phase)
    const { rerender } = render(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'hero_attack', phase: 'travel' }}
        onPresentationComplete={vi.fn()}
      />
    );
    const heroAttackImg = screen.getByAltText('勇者') as HTMLImageElement;
    expect(heroAttackImg.src).toContain('/battle/hero_attack.webp');

    // Hero Cast (travel phase)
    rerender(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'skill_cast', phase: 'travel' }}
        onPresentationComplete={vi.fn()}
      />
    );
    const heroCastImg = screen.getByAltText('勇者') as HTMLImageElement;
    expect(heroCastImg.src).toContain('/battle/hero_cast.webp');

    // Hero Hurt (impact phase during monster attack)
    rerender(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'monster_attack', phase: 'impact' }}
        onPresentationComplete={vi.fn()}
      />
    );
    const heroHurtImg = screen.getByAltText('勇者') as HTMLImageElement;
    expect(heroHurtImg.src).toContain('/battle/hero_hurt.webp');

    // Hero Defeat (defeat phase)
    rerender(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'hero_defeat', phase: 'defeat' }}
        onPresentationComplete={vi.fn()}
      />
    );
    const heroDefeatImg = screen.getByAltText('勇者') as HTMLImageElement;
    expect(heroDefeatImg.src).toContain('/battle/hero_defeat.webp');
  });

  it('renders correct action assets for monster attack, hurt, and defeat', () => {
    const baseState = createState();
    const monsterName = baseState.currentMonster!.name;

    // Monster Attack (travel phase)
    const { rerender } = render(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'monster_attack', phase: 'travel' }}
        onPresentationComplete={vi.fn()}
      />
    );
    const monsterAttackImg = screen.getByAltText(monsterName) as HTMLImageElement;
    expect(monsterAttackImg.src).toContain('/battle/monsters/slime_blue_attack.webp');

    // Monster Hurt (impact phase during hero attack)
    rerender(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'hero_attack', phase: 'impact' }}
        onPresentationComplete={vi.fn()}
      />
    );
    const monsterHurtImg = screen.getByAltText(monsterName) as HTMLImageElement;
    expect(monsterHurtImg.src).toContain('/battle/monsters/slime_blue_hurt.webp');

    // Monster Defeat (defeat phase)
    rerender(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'monster_defeat', phase: 'defeat' }}
        onPresentationComplete={vi.fn()}
      />
    );
    const monsterDefeatImg = screen.getByAltText(monsterName) as HTMLImageElement;
    expect(monsterDefeatImg.src).toContain('/battle/monsters/slime_blue_defeat.webp');
  });

  it('uses idle assets during anticipation without falling back other action assets', () => {
    const baseState = createState();
    const monsterName = baseState.currentMonster!.name;
    const { rerender } = render(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'hero_attack', phase: 'anticipation' }}
        onPresentationComplete={vi.fn()}
      />
    );

    expect((screen.getByAltText('勇者') as HTMLImageElement).src).toContain('/battle/hero.webp');

    rerender(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'monster_attack', phase: 'anticipation' }}
        onPresentationComplete={vi.fn()}
      />
    );

    expect((screen.getByAltText(monsterName) as HTMLImageElement).src)
      .toContain('/battle/monsters/slime_blue.webp');

    rerender(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'monster_attack', phase: 'travel' }}
        onPresentationComplete={vi.fn()}
      />
    );

    expect((screen.getByAltText(monsterName) as HTMLImageElement).src)
      .toContain('/battle/monsters/slime_blue_attack.webp');
  });

  it('mounts reduced-motion shockwave and speed lines at their static final state', () => {
    reducedMotionMock.mockReturnValue(true);
    const baseState = createState();
    const { rerender } = render(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'hero_attack', phase: 'impact' }}
        onPresentationComplete={vi.fn()}
      />
    );

    const shockwave = document.querySelector<HTMLImageElement>(
      'img[src$="/battle/environment/shockwave.webp"]',
    );
    expect(shockwave).not.toBeNull();
    expect(shockwave?.style.opacity).not.toBe('0');
    expect(shockwave?.style.transform).not.toContain('0.5');

    rerender(
      <BattleArena
        battleState={baseState}
        activeEvent={{ ...createEvent(), kind: 'boss_entrance', phase: 'entrance' }}
        onPresentationComplete={vi.fn()}
      />
    );

    const speedLines = document.querySelector<HTMLImageElement>(
      'img[src$="/battle/environment/speed_lines.webp"]',
    );
    expect(speedLines).not.toBeNull();
    expect(speedLines?.style.opacity).not.toBe('0');
  });
});
