import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BattleSkillOverlay } from '../../components/BattleSkillOverlay';
import { BATTLE_MOTION_PROFILES } from '../../services/battle/battleEngine';
import type { BattlePresentationEvent, BattlePresentationPhase } from '../../types/battleTypes';

const createSkillEvent = (
  skillId = 'void_rift',
  phase: BattlePresentationPhase = 'travel',
  element: 'fire' | 'ice' | 'lightning' = 'fire',
): BattlePresentationEvent => ({
  eventId: `skill-${skillId}-${phase}`,
  correlationId: 'answer-skill',
  sequence: 0,
  kind: 'skill_cast',
  actorId: 'hero',
  targetId: 'slime_blue',
  phase,
  durationProfile: BATTLE_MOTION_PROFILES.skill_cast,
  payload: {
    skillId,
    skillName: '測試技能',
    element,
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
    expect(onComplete).toHaveBeenCalledWith('skill-void_rift-travel', 'ended');
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

  it('handles 4 presentation phases correctly for elemental VFX assets', () => {
    // 1. Anticipation -> charge
    const { container: c1, rerender } = render(
      <BattleSkillOverlay event={createSkillEvent('fireball', 'anticipation', 'fire')} reducedMotion={false} onComplete={vi.fn()} />
    );
    const vfx1 = c1.querySelector('[data-vfx-phase="charge"]');
    expect(vfx1).not.toBeNull();
    expect(c1.querySelector('img[src="/battle/vfx/fire_charge.webp"]')).not.toBeNull();

    // 2. Travel -> travel
    rerender(
      <BattleSkillOverlay event={createSkillEvent('fireball', 'travel', 'fire')} reducedMotion={false} onComplete={vi.fn()} />
    );
    expect(c1.querySelector('[data-vfx-phase="travel"]')).not.toBeNull();
    expect(c1.querySelector('img[src="/battle/vfx/fire_travel.webp"]')).not.toBeNull();

    // 3. Impact -> impact + unique skill image
    rerender(
      <BattleSkillOverlay event={createSkillEvent('fireball', 'impact', 'fire')} reducedMotion={false} onComplete={vi.fn()} />
    );
    expect(c1.querySelector('[data-vfx-phase="impact"]')).not.toBeNull();
    expect(c1.querySelector('img[src="/battle/vfx/fire_impact.webp"]')).not.toBeNull();
    expect(c1.querySelector('img[src="/battle/skills/fireball.webp"]')).not.toBeNull();

    // 4. Settle -> residue
    rerender(
      <BattleSkillOverlay event={createSkillEvent('fireball', 'settle', 'fire')} reducedMotion={false} onComplete={vi.fn()} />
    );
    expect(c1.querySelector('[data-vfx-phase="residue"]')).not.toBeNull();
    expect(c1.querySelector('img[src="/battle/vfx/fire_residue.webp"]')).not.toBeNull();
  });

  it('applies correct tier scale emphasis for basic, intermediate, and advanced skills', () => {
    // Basic (1x)
    const { container: c1, rerender } = render(
      <BattleSkillOverlay event={createSkillEvent('fireball', 'impact', 'fire')} reducedMotion={false} onComplete={vi.fn()} />
    );
    const containerBasic = c1.querySelector('[data-testid="skill-image-container"]');
    expect(containerBasic?.getAttribute('data-tier-scale')).toBe('1');

    // Intermediate (1.2x)
    rerender(
      <BattleSkillOverlay event={createSkillEvent('flame_storm', 'impact', 'fire')} reducedMotion={false} onComplete={vi.fn()} />
    );
    const containerInter = c1.querySelector('[data-testid="skill-image-container"]');
    expect(containerInter?.getAttribute('data-tier-scale')).toBe('1.2');

    // Advanced (1.4x)
    rerender(
      <BattleSkillOverlay event={createSkillEvent('meteor_strike', 'impact', 'fire')} reducedMotion={false} onComplete={vi.fn()} />
    );
    const containerAdv = c1.querySelector('[data-testid="skill-image-container"]');
    expect(containerAdv?.getAttribute('data-tier-scale')).toBe('1.4');
  });

  it('renders fallback sparkles when media fails', () => {
    const { container } = render(
      <BattleSkillOverlay event={createSkillEvent('unknown_skill', 'impact', 'fire')} reducedMotion={false} onComplete={vi.fn()} />
    );
    expect(container.querySelector('img[src="/battle/skills/fireball.webp"]')).not.toBeNull();

    const img = container.querySelector('img[src="/battle/skills/fireball.webp"]');
    if (img) fireEvent.error(img);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('handles rapid queued events without crash or broken state', () => {
    const { rerender, container } = render(
      <BattleSkillOverlay event={createSkillEvent('fireball', 'anticipation', 'fire')} reducedMotion={false} onComplete={vi.fn()} />
    );
    expect(container.querySelector('img[src="/battle/vfx/fire_charge.webp"]')).not.toBeNull();

    rerender(
      <BattleSkillOverlay event={createSkillEvent('ice_arrow', 'travel', 'ice')} reducedMotion={false} onComplete={vi.fn()} />
    );
    expect(container.querySelector('img[src="/battle/vfx/ice_travel.webp"]')).not.toBeNull();

    rerender(
      <BattleSkillOverlay event={createSkillEvent('thunder_bolt', 'impact', 'lightning')} reducedMotion={false} onComplete={vi.fn()} />
    );
    expect(container.querySelector('img[src="/battle/vfx/lightning_impact.webp"]')).not.toBeNull();
    expect(container.querySelector('img[src="/battle/skills/thunder_bolt.webp"]')).not.toBeNull();
  });
});
