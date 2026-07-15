import { GRAPH_LIMITS } from '@/types/graphTypes';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const DATA_URL_PREFIX = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i;
const MAX_DIMENSION = 1400;

export type GraphImageError = 'unsupported-type' | 'file-too-large' | 'compression-failed' | 'compressed-too-large';

export type GraphImageResult =
  | { success: true; dataUrl: string }
  | { success: false; error: GraphImageError };

export function isSafeGraphImageDataUrl(value: string | undefined): boolean {
  return Boolean(value && value.length <= GRAPH_LIMITS.IMAGE_DATA_URL_MAX && DATA_URL_PREFIX.test(value));
}

function canvasToDataUrl(source: CanvasImageSource, width: number, height: number, quality: number): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/webp', quality);
}

async function loadCanvasSource(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; dispose: () => void } | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    const loaded = await new Promise<boolean>((resolve) => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = objectUrl;
    });
    if (!loaded) {
      URL.revokeObjectURL(objectUrl);
      return null;
    }
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, dispose: () => URL.revokeObjectURL(objectUrl) };
  } catch {
    return null;
  }
}

export async function compressGraphImage(file: File): Promise<GraphImageResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return { success: false, error: 'unsupported-type' };
  if (file.size > GRAPH_LIMITS.IMAGE_UPLOAD_MAX_BYTES) return { success: false, error: 'file-too-large' };

  const loaded = await loadCanvasSource(file);
  if (!loaded || loaded.width <= 0 || loaded.height <= 0) return { success: false, error: 'compression-failed' };

  try {
    const initialScale = Math.min(1, MAX_DIMENSION / Math.max(loaded.width, loaded.height));
    let width = Math.max(1, Math.round(loaded.width * initialScale));
    let height = Math.max(1, Math.round(loaded.height * initialScale));
    let quality = 0.84;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const dataUrl = canvasToDataUrl(loaded.source, width, height, quality);
      if (!dataUrl) return { success: false, error: 'compression-failed' };
      if (isSafeGraphImageDataUrl(dataUrl)) return { success: true, dataUrl };
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
      quality = Math.max(0.5, quality - 0.07);
    }
    return { success: false, error: 'compressed-too-large' };
  } finally {
    loaded.dispose();
  }
}
