import { expect, test } from '@playwright/test';
import { BATTLE_ASSET_REGISTRY } from '../constants/battleAssetRegistry';

interface BrowserAssetProbe {
  id: string;
  src: string;
  width: number | undefined;
  height: number | undefined;
  opaque: boolean | undefined;
}

interface BrowserAssetResult extends BrowserAssetProbe {
  actualWidth: number;
  actualHeight: number;
  hasTransparentPixel: boolean;
  hasOpaquePixel: boolean;
}

test('Battle image registry passes browser dimensions and alpha validation', async ({ page }) => {
  const imageAssets: BrowserAssetProbe[] = BATTLE_ASSET_REGISTRY.assets
    .filter(asset => asset.kind !== 'video' && asset.kind !== 'audio')
    .map(({ id, src, width, height, opaque }) => ({ id, src, width, height, opaque }));

  await page.goto('/');
  const results = await page.evaluate(async (assets): Promise<BrowserAssetResult[]> => {
    const loadImage = (asset: BrowserAssetProbe): Promise<BrowserAssetResult> => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          reject(new Error(`Canvas unavailable for ${asset.id}`));
          return;
        }

        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let hasTransparentPixel = false;
        let hasOpaquePixel = false;
        for (let index = 3; index < pixels.length; index += 4) {
          const alpha = pixels[index];
          if (alpha === 0) hasTransparentPixel = true;
          if (alpha === 255) hasOpaquePixel = true;
          if (hasTransparentPixel && hasOpaquePixel) break;
        }

        resolve({
          ...asset,
          actualWidth: image.naturalWidth,
          actualHeight: image.naturalHeight,
          hasTransparentPixel,
          hasOpaquePixel,
        });
      };
      image.onerror = () => reject(new Error(`Image failed to load: ${asset.src}`));
      image.src = asset.src;
    });

    return Promise.all(assets.map(loadImage));
  }, imageAssets);

  for (const result of results) {
    expect(result.actualWidth, result.id).toBe(result.width);
    expect(result.actualHeight, result.id).toBe(result.height);
    if (result.opaque) {
      expect(result.hasTransparentPixel, result.id).toBe(false);
    } else {
      expect(result.hasTransparentPixel, result.id).toBe(true);
      expect(result.hasOpaquePixel, result.id).toBe(true);
    }
  }
});
