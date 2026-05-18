export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const buf = new Uint8Array(16);
  (typeof window !== 'undefined' && window.crypto ? window.crypto : crypto).getRandomValues(buf);
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  return [...buf].map((b, i) => ([4, 6, 8, 10].includes(i) ? '-' : '') + b.toString(16).padStart(2, '0')).join('');
};

export const isUuid = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  // Accept UUID v1-v5.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

export const normalizeToUuid = (value: unknown): string => {
  return isUuid(value) ? value : generateUUID();
};
