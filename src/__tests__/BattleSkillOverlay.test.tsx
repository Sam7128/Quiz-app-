import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BattleSkillOverlay } from '../../components/BattleSkillOverlay';
import { BATTLE_MOTION_PROFILES } from '../../services/battle/battleEngine';
import type { BattlePresentationEvent } from '../../types/battleTypes';

const createSkillEvent = (skillId = 'void_rift'): BattlePresentationEvent => ({
  eventId: `skill-${skillId}`,
  correlationId: 'answer-skill',
  sequence: 0,
  kind: 'skill_cast',
  actorId: 'hero',
  targetId: 'slime_blue',
  phase: 'travel',
  durationProfile: BATTLE_MOTION_PROFILES.skill_cast,
  payload: {
    skillId,
    skillName: '測試技能',
    damage: 20,
    baseDamage: 20,
    isCrit: false,
    multiplier: 1,
    shieldAbsorbed: 0,
  },
});

describe('BattleSkillOverlay', () => {
  const pause = vi.fn();
  const load = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pause });
    Object.defineProperty(HTMLMediaElement.prototype, 'load', { configurable: true, value: load });
  });

  it('signals the presenter gate with the exact video event ID', () => {
    const onComplete = vi.fn();
    const { container } = render(
      <BattleSkillOverlay event={createSkillEvent()} reducedMotion={false} onComplete={onComplete} />
    );
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    if (!video) return;

    fireEvent.ended(video);

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith('skill-void_rift', 'ended');
    expect(pause).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
  });

  it('uses the registry fallback after video failure and cleans media on unmount', () => {
    const { container, unmount } = render(
      <BattleSkillOverlay event={createSkillEvent()} reducedMotion={false} onComplete={vi.fn()} />
    );
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    if (!video) return;

    fireEvent.error(video);

    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByText('測試技能')).not.toBeNull();
    expect(container.querySelector('img[src="/battle/skills/fireball.webp"]')).not.toBeNull();
    unmount();
    expect(pause).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
  });

  it('never autoplays video in reduced-motion mode', () => {
    const { container } = render(
      <BattleSkillOverlay event={createSkillEvent()} reducedMotion onComplete={vi.fn()} />
    );

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img[src="/battle/skills/fireball.webp"]')).not.toBeNull();
  });
});
