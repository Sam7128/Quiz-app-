import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressGraphImage, isSafeGraphImageDataUrl } from '@/services/graphImage';
import { GRAPH_LIMITS } from '@/types/graphTypes';

describe('graphImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('只接受有大小上限的 PNG/JPEG/WebP base64 data URL', () => {
    expect(isSafeGraphImageDataUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isSafeGraphImageDataUrl('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(isSafeGraphImageDataUrl('data:image/webp;base64,AAAA')).toBe(true);
    expect(isSafeGraphImageDataUrl('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(isSafeGraphImageDataUrl('data:image/png,not-base64')).toBe(false);
    expect(isSafeGraphImageDataUrl(`data:image/png;base64,${'A'.repeat(GRAPH_LIMITS.IMAGE_DATA_URL_MAX)}`)).toBe(false);
  });

  it('在解碼前拒絕不支援格式與超過 6 MB 的來源檔', async () => {
    const svg = new File(['<svg/>'], 'unsafe.svg', { type: 'image/svg+xml' });
    const oversized = new File(
      [new Uint8Array(GRAPH_LIMITS.IMAGE_UPLOAD_MAX_BYTES + 1)],
      'large.png',
      { type: 'image/png' },
    );

    await expect(compressGraphImage(svg)).resolves.toEqual({ success: false, error: 'unsupported-type' });
    await expect(compressGraphImage(oversized)).resolves.toEqual({ success: false, error: 'file-too-large' });
  });

  it('把有效點陣圖壓縮為 WebP 並釋放 ImageBitmap', async () => {
    const close = vi.fn();
    const bitmap = { width: 640, height: 320, close } as unknown as ImageBitmap;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const drawImage = vi.fn();
    const context = { drawImage } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (() => context) as unknown as HTMLCanvasElement['getContext'],
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/webp;base64,AAAA');

    const result = await compressGraphImage(new File(['png'], 'diagram.png', { type: 'image/png' }));

    expect(result).toEqual({ success: true, dataUrl: 'data:image/webp;base64,AAAA' });
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 640, 320);
    expect(close).toHaveBeenCalledOnce();
  });
});
