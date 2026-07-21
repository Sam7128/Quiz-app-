import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BATTLE_ASSET_REGISTRY, getBattleAsset, getBattleCharacterAsset } from '../../constants/battleAssetRegistry';

const publicRoot = resolve(process.cwd(), 'public');

const fileFor = (source: string): string => join(publicRoot, source.replace(/^\//, ''));

describe('battle asset registry', () => {
  it('contains exactly 79 registered entries including actions, VFX, environment, and audio cues', () => {
    expect(BATTLE_ASSET_REGISTRY.assets.length).toBe(79);

    const actions = BATTLE_ASSET_REGISTRY.assets.filter(a => a.kind === 'character' && a.action && a.action !== 'idle');
    expect(actions).toHaveLength(26);

    const vfx = BATTLE_ASSET_REGISTRY.assets.filter(a => a.id.startsWith('vfx-'));
    expect(vfx).toHaveLength(12);

    const environment = BATTLE_ASSET_REGISTRY.assets.filter(a => a.kind === 'environment');
    expect(environment).toHaveLength(5);
    const envIds = new Set(environment.map(a => a.id));
    expect(envIds).toEqual(new Set([
      'environment-fog',
      'environment-embers',
      'environment-shockwave',
      'environment-speed-lines',
      'environment-shadow',
    ]));

    const audioCues = BATTLE_ASSET_REGISTRY.assets.filter(a => a.kind === 'audio' && a.id.startsWith('cue-'));
    expect(audioCues).toHaveLength(12);
  });

  it('contains only local existing runtime sources with valid fallback IDs', () => {
    const ids = new Set(BATTLE_ASSET_REGISTRY.assets.map(asset => asset.id));

    for (const asset of BATTLE_ASSET_REGISTRY.assets) {
      expect(asset.src).toMatch(/^\/(?!.*assets-prep)(?!.*data:)(?!.*:).+/);
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- fileFor joins validated local registry sources under publicRoot.
      expect(statSync(fileFor(asset.src)).isFile()).toBe(true);
      if (asset.fallbackId) expect(ids.has(asset.fallbackId)).toBe(true);
    }
  });

  it('verifies action lookup and fallback graph via getBattleCharacterAsset', () => {
    // Valid action returns specific action asset
    const heroAttack = getBattleCharacterAsset('hero', 'attack');
    expect(heroAttack?.id).toBe('hero:attack');
    expect(heroAttack?.src).toBe('/battle/hero_attack.webp');

    const dragonEntrance = getBattleCharacterAsset('dragon_fire', 'entrance');
    expect(dragonEntrance?.id).toBe('dragon_fire:entrance');

    // Missing action falls back to base character idle asset
    const wizardCast = getBattleCharacterAsset('skeleton_wizard', 'cast');
    expect(wizardCast?.id).toBe('skeleton_wizard');
    expect(wizardCast?.src).toBe('/battle/monsters/skeleton_wizard.webp');

    // Idle action returns idle asset
    const heroIdle = getBattleCharacterAsset('hero', 'idle');
    expect(heroIdle?.id).toBe('hero');
  });

  it('keeps the shared skill fallback alias metadata aligned with its promoted source', () => {
    const fallback = getBattleAsset('skill-fallback');
    const fireball = getBattleAsset('fireball');

    expect(fallback?.src).toBe(fireball?.src);
    expect(fallback?.width).toBe(fireball?.width);
    expect(fallback?.height).toBe(fireball?.height);
  });

  it('ensures all action metadata matches idle base character metadata', () => {
    const actions = BATTLE_ASSET_REGISTRY.assets.filter(a => a.kind === 'character' && a.action && a.action !== 'idle');
    for (const actionAsset of actions) {
      const baseId = actionAsset.fallbackId ?? actionAsset.id.split(':')[0];
      const baseAsset = getBattleAsset(baseId);
      expect(baseAsset).not.toBeNull();
      expect(actionAsset.anchor).toEqual(baseAsset!.anchor);
      expect(actionAsset.facing).toBe(baseAsset!.facing);
      expect(actionAsset.visualScale).toBe(baseAsset!.visualScale);
    }
  });

  it('strictly excludes the 7 source-only entries', () => {
    const ids = new Set(BATTLE_ASSET_REGISTRY.assets.map(a => a.id));
    const sources = new Set(BATTLE_ASSET_REGISTRY.assets.map(a => a.src));

    expect(ids.has('hero:victory')).toBe(false);
    expect(ids.has('skeleton_wizard:cast')).toBe(false);
    expect(ids.has('dragon_fire:fire-breath')).toBe(false);
    expect(ids.has('environment-rubble')).toBe(false);
    expect(ids.has('environment-ice-motes')).toBe(false);
    expect(ids.has('environment-sparks')).toBe(false);
    expect(ids.has('cue-battle_victory')).toBe(false);

    expect(sources.has('/sounds/battle/battle_victory.ogg')).toBe(false);
  });

  it('keeps approved image/video files within runtime budgets and real formats', () => {
    const budgets = {
      character: 250 * 1024,
      skillIcon: 120 * 1024,
      background: 700 * 1024,
      video: 6 * 1024 * 1024,
      environment: 250 * 1024,
      audio: 500 * 1024,
    } as const;

    for (const asset of BATTLE_ASSET_REGISTRY.assets) {
      const path = fileFor(asset.src);
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is derived from validated registry sources under publicRoot.
      const bytes = statSync(path).size;
      const budget = budgets[asset.kind as keyof typeof budgets];
      if (budget !== undefined && asset.id !== 'bgm-dungeon') {
        expect(bytes).toBeLessThanOrEqual(budget);
      }

      // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is derived from validated registry sources under publicRoot.
      const header = readFileSync(path).subarray(0, 12).toString('hex');
      if (asset.kind === 'video') expect(header.startsWith('1a45dfa3')).toBe(true);
      if (asset.kind === 'character') {
        expect(asset.opaque).not.toBe(true);
        expect(['52494646', '89504e47']).toContain(header.slice(0, 8));
      }
      if (asset.kind === 'skillIcon') {
        expect(typeof asset.opaque).toBe('boolean');
        expect(['52494646', '89504e47']).toContain(header.slice(0, 8));
      }
      if (asset.kind === 'audio' && asset.src.endsWith('.ogg')) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is derived from validated local registry sources under publicRoot.
        const oggMagic = readFileSync(path).subarray(0, 4).toString();
        expect(oggMagic).toBe('OggS');
      }
    }
  });

  it('keeps initial critical image bytes below the 1.5 MiB budget', () => {
    const criticalIds = ['dungeon-background', 'hero', 'slime_blue'];
    const bytes = criticalIds.reduce((total, id) => {
      const asset = BATTLE_ASSET_REGISTRY.assets.find(item => item.id === id);
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- fileFor confines validated registry sources to publicRoot.
      return total + (asset ? statSync(fileFor(asset.src)).size : 0);
    }, 0);

    expect(bytes).toBeLessThanOrEqual(1.5 * 1024 * 1024);
  });
});
