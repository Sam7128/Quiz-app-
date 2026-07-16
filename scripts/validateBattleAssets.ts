import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BATTLE_ASSET_REGISTRY } from '../constants/battleAssetRegistry.ts';
import type { BattleAssetEntry, BattleAssetKind } from '../types/battleTypes.ts';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = join(projectRoot, 'public');
const battleRoot = join(publicRoot, 'battle');

const BUDGET_BYTES: Partial<Record<BattleAssetKind, number>> = {
  character: 250 * 1024,
  skillIcon: 120 * 1024,
  background: 700 * 1024,
  video: 6 * 1024 * 1024,
};

const ALLOWED_EXTENSIONS: Record<BattleAssetKind, readonly string[]> = {
  character: ['.png', '.webp'],
  skillIcon: ['.png', '.webp'],
  projectile: ['.png', '.webp'],
  impact: ['.png', '.webp'],
  background: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],
  video: ['.webm'],
  audio: ['.mp3', '.ogg', '.wav'],
};

const mediaExtensions = new Set([
  '.png', '.webp', '.jpg', '.jpeg', '.avif', '.webm', '.mp3', '.ogg', '.wav',
]);

// Knowledge-graph E2E uses the original hero file as an upload fixture, not runtime media.
const ignoredMedia = new Set(['/battle/hero.png']);

const fail = (errors: string[], asset: BattleAssetEntry | null, rule: string, detail: string): void => {
  const id = asset ? ` [${asset.id}]` : '';
  errors.push(`${id} ${rule}: ${detail}`);
};

const isWithin = (root: string, target: string): boolean => {
  const path = relative(root, target);
  return path === '' || (path !== '..' && !path.startsWith(`..${String.fromCharCode(92)}`) && !path.startsWith('/'));
};

const sourcePath = (asset: BattleAssetEntry): string | null => {
  if (!asset.src.startsWith('/') || asset.src.includes('://') || asset.src.startsWith('data:')) return null;
  if (asset.src.includes('assets-prep') || asset.src.includes('\\')) return null;
  const target = resolve(publicRoot, asset.src.slice(1));
  return isWithin(publicRoot, target) ? target : null;
};

const collectMedia = (directory: string): string[] => {
  const result: string[] = [];
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- directory starts at publicRoot and recursion only follows its entries.
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...collectMedia(target));
    else if (mediaExtensions.has(extname(entry.name).toLowerCase())) result.push(target);
  }
  return result;
};

const hasExpectedMagic = (path: string, extension: string): boolean => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- sourcePath confines registry paths to publicRoot.
  const bytes = readFileSync(path).subarray(0, 16);
  if (extension === '.webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (extension === '.png') return bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  if (extension === '.jpg' || extension === '.jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (extension === '.webm') return bytes.subarray(0, 4).toString('hex') === '1a45dfa3';
  if (extension === '.mp3') return bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  return true;
};

const validateAsset = (asset: BattleAssetEntry, errors: string[]): void => {
  if (!asset.id || !asset.src || !asset.sourceNote || !asset.usageNote) {
    fail(errors, asset, 'metadata', 'id/src/sourceNote/usageNote required');
  }
  const path = sourcePath(asset);
  if (!path) {
    fail(errors, asset, 'path', 'must be a local root-relative public path');
    return;
  }
  if (!statSafe(path)) {
    fail(errors, asset, 'existence', `missing file ${asset.src}`);
    return;
  }

  const extension = extname(path).toLowerCase();
  if (!ALLOWED_EXTENSIONS[asset.kind].includes(extension)) {
    fail(errors, asset, 'format', `${extension} not allowed for ${asset.kind}`);
  } else if (!hasExpectedMagic(path, extension)) {
    fail(errors, asset, 'format', `content does not match ${extension}`);
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename -- sourcePath confines registry paths to publicRoot.
  const bytes = statSync(path).size;
  const budget = BUDGET_BYTES[asset.kind];
  if (asset.status === 'approved' && budget !== undefined && bytes > budget) {
    fail(errors, asset, 'budget', `${bytes} bytes > ${budget} bytes; optimize or mark fallback`);
  }

  if (asset.width !== undefined && (!Number.isInteger(asset.width) || asset.width <= 0 || asset.width > 4096)) {
    fail(errors, asset, 'dimensions', 'width outside 1..4096');
  }
  if (asset.height !== undefined && (!Number.isInteger(asset.height) || asset.height <= 0 || asset.height > 4096)) {
    fail(errors, asset, 'dimensions', 'height outside 1..4096');
  }
  if (asset.anchor && (asset.anchor.x < 0 || asset.anchor.x > 1 || asset.anchor.y < 0 || asset.anchor.y > 1)) {
    fail(errors, asset, 'anchor', 'x/y must be within 0..1');
  }
  if (asset.visualScale !== undefined && (!Number.isFinite(asset.visualScale) || asset.visualScale <= 0 || asset.visualScale > 3)) {
    fail(errors, asset, 'visualScale', 'must be finite and within (0,3]');
  }
};

const statSafe = (path: string): boolean => {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- callers pass paths confined to publicRoot.
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

const validateRegistry = (): string[] => {
  const errors: string[] = [];
  const assets = BATTLE_ASSET_REGISTRY.assets;
  const ids = new Set<string>();
  const registeredSources = new Set<string>();

  for (const asset of assets) {
    if (ids.has(asset.id)) fail(errors, asset, 'id', 'duplicate asset ID');
    ids.add(asset.id);
    registeredSources.add(asset.src);
    validateAsset(asset, errors);
    if (asset.fallbackId !== null && !assets.some(candidate => candidate.id === asset.fallbackId)) {
      fail(errors, asset, 'fallback', `missing fallback ID ${asset.fallbackId}`);
    }
  }

  for (const media of collectMedia(battleRoot)) {
    const publicPath = `/${relative(publicRoot, media).replaceAll(String.fromCharCode(92), '/')}`;
    if (ignoredMedia.has(publicPath)) continue;
    if (!registeredSources.has(publicPath)) {
      fail(errors, null, 'orphan', `${basename(media)} is not registered`);
    }
  }

  const criticalIds = ['dungeon-background', 'hero', 'slime_blue'];
  const criticalBytes = criticalIds.reduce((total, id) => {
    const asset = assets.find(candidate => candidate.id === id);
    const path = asset ? sourcePath(asset) : null;
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- sourcePath confines registry paths to publicRoot.
    return total + (path && statSafe(path) ? statSync(path).size : 0);
  }, 0);
  const criticalBudget = 1.5 * 1024 * 1024;
  if (criticalBytes > criticalBudget) {
    fail(errors, null, 'initial-critical-bytes', `${criticalBytes} bytes > ${criticalBudget} bytes`);
  }

  return errors;
};

const errors = validateRegistry();
if (errors.length > 0) {
  console.error('Battle asset validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Battle asset validation passed: ${BATTLE_ASSET_REGISTRY.assets.length} registered assets.`);
}
