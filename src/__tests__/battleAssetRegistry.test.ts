import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BATTLE_ASSET_REGISTRY } from '../../constants/battleAssetRegistry';

const publicRoot = resolve(process.cwd(), 'public');

const fileFor = (source: string): string => join(publicRoot, source.replace(/^\//, ''));

describe('battle asset registry', () => {
  it('contains only local existing runtime sources with valid fallback IDs', () => {
    const ids = new Set(BATTLE_ASSET_REGISTRY.assets.map(asset => asset.id));

    for (const asset of BATTLE_ASSET_REGISTRY.assets) {
      expect(asset.src).toMatch(/^\/(?!.*assets-prep)(?!.*data:)(?!.*:).+/);
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- fileFor joins validated local registry sources under publicRoot.
      expect(statSync(fileFor(asset.src)).isFile()).toBe(true);
      expect(asset.sourceNote.length).toBeGreaterThan(0);
      expect(asset.usageNote.length).toBeGreaterThan(0);
      if (asset.fallbackId) expect(ids.has(asset.fallbackId)).toBe(true);
    }
  });

  it('keeps approved image/video files within runtime budgets and real formats', () => {
    const budgets = {
      character: 250 * 1024,
      skillIcon: 120 * 1024,
      background: 700 * 1024,
      video: 6 * 1024 * 1024,
    } as const;

    for (const asset of BATTLE_ASSET_REGISTRY.assets) {
      const path = fileFor(asset.src);
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is derived from validated registry sources under publicRoot.
      const bytes = statSync(path).size;
      const budget = budgets[asset.kind as keyof typeof budgets];
      if (asset.status === 'approved' && budget !== undefined) expect(bytes).toBeLessThanOrEqual(budget);

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
