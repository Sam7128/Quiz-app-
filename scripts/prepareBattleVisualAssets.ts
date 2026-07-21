import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceDir = join(projectRoot, 'assets-prep', 'battle-visual-upgrade', 'production-source-v2');
const slicedDir = join(projectRoot, 'assets-prep', 'battle-visual-upgrade', 'sliced');

interface CellDef {
  col: number;
  row: number;
  id: string;
  targetPath?: string;
  excluded?: boolean;
}

interface AtlasDef {
  cols: number;
  rows: number;
  cells: readonly CellDef[];
}

const ATLAS_MAP: Readonly<Record<string, AtlasDef>> = Object.freeze({
  'hero-actions.png': {
    cols: 6,
    rows: 1,
    cells: [
      { col: 0, row: 0, id: 'hero-idle', excluded: true },
      { col: 1, row: 0, id: 'hero-attack', targetPath: 'public/battle/hero_attack.webp' },
      { col: 2, row: 0, id: 'hero-cast', targetPath: 'public/battle/hero_cast.webp' },
      { col: 3, row: 0, id: 'hero-hurt', targetPath: 'public/battle/hero_hurt.webp' },
      { col: 4, row: 0, id: 'hero-victory', excluded: true },
      { col: 5, row: 0, id: 'hero-defeat', targetPath: 'public/battle/hero_defeat.webp' },
    ],
  },
  'normal-monster-actions.png': {
    cols: 4,
    rows: 3,
    cells: [
      { col: 0, row: 0, id: 'slime_blue-idle', excluded: true },
      { col: 1, row: 0, id: 'slime_blue-attack', targetPath: 'public/battle/monsters/slime_blue_attack.webp' },
      { col: 2, row: 0, id: 'slime_blue-hurt', targetPath: 'public/battle/monsters/slime_blue_hurt.webp' },
      { col: 3, row: 0, id: 'slime_blue-defeat', targetPath: 'public/battle/monsters/slime_blue_defeat.webp' },
      { col: 0, row: 1, id: 'bat_shadow-idle', excluded: true },
      { col: 1, row: 1, id: 'bat_shadow-attack', targetPath: 'public/battle/monsters/bat_shadow_attack.webp' },
      { col: 2, row: 1, id: 'bat_shadow-hurt', targetPath: 'public/battle/monsters/bat_shadow_hurt.webp' },
      { col: 3, row: 1, id: 'bat_shadow-defeat', targetPath: 'public/battle/monsters/bat_shadow_defeat.webp' },
      { col: 0, row: 2, id: 'goblin_green-idle', excluded: true },
      { col: 1, row: 2, id: 'goblin_green-attack', targetPath: 'public/battle/monsters/goblin_green_attack.webp' },
      { col: 2, row: 2, id: 'goblin_green-hurt', targetPath: 'public/battle/monsters/goblin_green_hurt.webp' },
      { col: 3, row: 2, id: 'goblin_green-defeat', targetPath: 'public/battle/monsters/goblin_green_defeat.webp' },
    ],
  },
  'elite-monster-actions.png': {
    cols: 3,
    rows: 4,
    cells: [
      { col: 0, row: 0, id: 'orc_berserker-idle', excluded: true },
      { col: 0, row: 1, id: 'orc_berserker-attack', targetPath: 'public/battle/monsters/orc_berserker_attack.webp' },
      { col: 0, row: 2, id: 'orc_berserker-hurt', targetPath: 'public/battle/monsters/orc_berserker_hurt.webp' },
      { col: 0, row: 3, id: 'orc_berserker-defeat', targetPath: 'public/battle/monsters/orc_berserker_defeat.webp' },
      { col: 1, row: 0, id: 'skeleton_warrior-idle', excluded: true },
      { col: 1, row: 1, id: 'skeleton_warrior-attack', targetPath: 'public/battle/monsters/skeleton_warrior_attack.webp' },
      { col: 1, row: 2, id: 'skeleton_warrior-hurt', targetPath: 'public/battle/monsters/skeleton_warrior_hurt.webp' },
      { col: 1, row: 3, id: 'skeleton_warrior-defeat', targetPath: 'public/battle/monsters/skeleton_warrior_defeat.webp' },
      { col: 2, row: 0, id: 'skeleton_wizard-idle', excluded: true },
      { col: 2, row: 1, id: 'skeleton_wizard-attack', targetPath: 'public/battle/monsters/skeleton_wizard_attack.webp' },
      { col: 2, row: 2, id: 'skeleton_wizard-hurt', targetPath: 'public/battle/monsters/skeleton_wizard_hurt.webp' },
      { col: 2, row: 3, id: 'skeleton_wizard-defeat', targetPath: 'public/battle/monsters/skeleton_wizard_defeat.webp' },
    ],
  },
  'dragon-actions.png': {
    cols: 6,
    rows: 1,
    cells: [
      { col: 0, row: 0, id: 'dragon_fire-entrance', targetPath: 'public/battle/monsters/dragon_fire_entrance.webp' },
      { col: 1, row: 0, id: 'dragon_fire-idle', excluded: true },
      { col: 2, row: 0, id: 'dragon_fire-attack', targetPath: 'public/battle/monsters/dragon_fire_attack.webp' },
      { col: 3, row: 0, id: 'dragon_fire-fire-breath', excluded: true },
      { col: 4, row: 0, id: 'dragon_fire-hurt', targetPath: 'public/battle/monsters/dragon_fire_hurt.webp' },
      { col: 5, row: 0, id: 'dragon_fire-defeat', targetPath: 'public/battle/monsters/dragon_fire_defeat.webp' },
    ],
  },
  'elemental-vfx.png': {
    cols: 4,
    rows: 3,
    cells: [
      { col: 0, row: 0, id: 'vfx-fire-charge', targetPath: 'public/battle/vfx/fire_charge.webp' },
      { col: 1, row: 0, id: 'vfx-fire-travel', targetPath: 'public/battle/vfx/fire_travel.webp' },
      { col: 2, row: 0, id: 'vfx-fire-impact', targetPath: 'public/battle/vfx/fire_impact.webp' },
      { col: 3, row: 0, id: 'vfx-fire-residue', targetPath: 'public/battle/vfx/fire_residue.webp' },
      { col: 0, row: 1, id: 'vfx-ice-charge', targetPath: 'public/battle/vfx/ice_charge.webp' },
      { col: 1, row: 1, id: 'vfx-ice-travel', targetPath: 'public/battle/vfx/ice_travel.webp' },
      { col: 2, row: 1, id: 'vfx-ice-impact', targetPath: 'public/battle/vfx/ice_impact.webp' },
      { col: 3, row: 1, id: 'vfx-ice-residue', targetPath: 'public/battle/vfx/ice_residue.webp' },
      { col: 0, row: 2, id: 'vfx-lightning-charge', targetPath: 'public/battle/vfx/lightning_charge.webp' },
      { col: 1, row: 2, id: 'vfx-lightning-travel', targetPath: 'public/battle/vfx/lightning_travel.webp' },
      { col: 2, row: 2, id: 'vfx-lightning-impact', targetPath: 'public/battle/vfx/lightning_impact.webp' },
      { col: 3, row: 2, id: 'vfx-lightning-residue', targetPath: 'public/battle/vfx/lightning_residue.webp' },
    ],
  },
  'signature-skills.png': {
    cols: 3,
    rows: 3,
    cells: [
      { col: 0, row: 0, id: 'fireball', targetPath: 'public/battle/skills/fireball.webp' },
      { col: 1, row: 0, id: 'flame_storm', targetPath: 'public/battle/skills/flame_storm.webp' },
      { col: 2, row: 0, id: 'meteor_strike', targetPath: 'public/battle/skills/meteor_strike.webp' },
      { col: 0, row: 1, id: 'ice_arrow', targetPath: 'public/battle/skills/ice_arrow.webp' },
      { col: 1, row: 1, id: 'ice_barrier', targetPath: 'public/battle/skills/ice_barrier.webp' },
      { col: 2, row: 1, id: 'absolute_zero', targetPath: 'public/battle/skills/absolute_zero.webp' },
      { col: 0, row: 2, id: 'thunder_bolt', targetPath: 'public/battle/skills/thunder_bolt.webp' },
      { col: 1, row: 2, id: 'thunder_hammer', targetPath: 'public/battle/skills/thunder_hammer.webp' },
      { col: 2, row: 2, id: 'judgment_thunder', targetPath: 'public/battle/skills/judgment_thunder.webp' },
    ],
  },
  'environment-overlays.png': {
    cols: 4,
    rows: 2,
    cells: [
      { col: 0, row: 0, id: 'environment-fog', targetPath: 'public/battle/environment/fog.webp' },
      { col: 1, row: 0, id: 'environment-embers', targetPath: 'public/battle/environment/embers.webp' },
      { col: 2, row: 0, id: 'environment-rubble', excluded: true },
      { col: 3, row: 0, id: 'environment-shockwave', targetPath: 'public/battle/environment/shockwave.webp' },
      { col: 0, row: 1, id: 'environment-ice-motes', excluded: true },
      { col: 1, row: 1, id: 'environment-sparks', excluded: true },
      { col: 2, row: 1, id: 'environment-speed-lines', targetPath: 'public/battle/environment/speed_lines.webp' },
      { col: 3, row: 1, id: 'environment-shadow', targetPath: 'public/battle/environment/shadow.webp' },
    ],
  },
});

function verifyCornerAlpha(png: PNG): boolean {
  const w = png.width;
  const h = png.height;
  const corners = [
    0, // top-left
    (w - 1) * 4, // top-right
    (h - 1) * w * 4, // bottom-left
    ((h - 1) * w + (w - 1)) * 4, // bottom-right
  ];
  return corners.every(idx => png.data[idx + 3] === 0);
}

function sliceAtlas(filename: string, atlas: AtlasDef): void {
  const filePath = join(sourceDir, filename);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- filename comes only from the fixed ATLAS_MAP.
  if (!existsSync(filePath)) {
    throw new Error(`Source atlas missing: ${filePath}`);
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath is confined to sourceDir by the fixed ATLAS_MAP.
  const fileData = readFileSync(filePath);
  if (fileData.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`Invalid PNG magic bytes in ${filename}`);
  }

  const png = PNG.sync.read(fileData);
  if (png.width % atlas.cols !== 0 || png.height % atlas.rows !== 0) {
    throw new Error(`Grid indivisible for atlas ${filename}: ${png.width}x${png.height} not divisible by ${atlas.cols}x${atlas.rows}`);
  }

  const cellWidth = png.width / atlas.cols;
  const cellHeight = png.height / atlas.rows;

  if (!verifyCornerAlpha(png)) {
    throw new Error(`Four corners alpha not zero for atlas ${filename}`);
  }

  const cellBuffers: Array<{ path: string; buffer: Buffer }> = [];
  const written = new Set<string>();
  for (const cell of atlas.cells) {
    if (written.has(cell.id)) continue;
    written.add(cell.id);

    const cellPng = new PNG({ width: cellWidth, height: cellHeight });
    PNG.bitblt(png, cellPng, cell.col * cellWidth, cell.row * cellHeight, cellWidth, cellHeight, 0, 0);

    const outputPath = join(slicedDir, `${cell.id}.png`);
    cellBuffers.push({ path: outputPath, buffer: PNG.sync.write(cellPng) });
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename -- slicedDir is a fixed project-local directory.
  mkdirSync(slicedDir, { recursive: true });
  for (const item of cellBuffers) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- item.path is built from fixed atlas cell IDs under slicedDir.
    writeFileSync(item.path, item.buffer);
  }
}

async function promoteCells(): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    for (const [_filename, atlas] of Object.entries(ATLAS_MAP)) {
      const promotedCells = atlas.cells.filter(c => !c.excluded && c.targetPath);
      for (const cell of promotedCells) {
        const slicedPath = join(slicedDir, `${cell.id}.png`);
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- cell.id comes only from the fixed ATLAS_MAP.
        if (!existsSync(slicedPath)) {
          throw new Error(`Sliced cell missing for promotion: ${slicedPath}`);
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename -- slicedPath is confined to slicedDir by the fixed ATLAS_MAP.
        const pngBuffer = readFileSync(slicedPath);
        const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;

        const webpDataUrl = await page.evaluate(async (src) => {
          const img = new Image();
          img.src = src;
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = (e) => rej(e);
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('No 2d context');
          ctx.drawImage(img, 0, 0);
          return canvas.toDataURL('image/webp', 0.95);
        }, dataUrl);

        const base64Data = webpDataUrl.replace(/^data:image\/webp;base64,/, '');
        const webpBuffer = Buffer.from(base64Data, 'base64');

        const absTargetPath = join(projectRoot, cell.targetPath!);
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- targetPath comes only from the fixed ATLAS_MAP.
        mkdirSync(dirname(absTargetPath), { recursive: true });
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- absTargetPath comes only from the fixed ATLAS_MAP.
        writeFileSync(absTargetPath, webpBuffer);
      }
    }
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === 'slice') {
    for (const [filename, atlas] of Object.entries(ATLAS_MAP)) {
      sliceAtlas(filename, atlas);
    }
    console.log(`Sliced ${Object.keys(ATLAS_MAP).length} atlases successfully.`);
  } else if (command === 'promote') {
    await promoteCells();
    console.log(`Promoted runtime WebP cells successfully.`);
  } else {
    console.error('Usage: prepareBattleVisualAssets <slice|promote>');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Asset preparation failed:', err);
  process.exitCode = 1;
});
