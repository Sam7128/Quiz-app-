export const isUuid = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  // Accept UUID v1-v5.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

export const normalizeToUuid = (value: unknown): string => {
  return isUuid(value) ? value : crypto.randomUUID();
};

