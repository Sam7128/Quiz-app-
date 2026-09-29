import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLocalDateString } from '../../utils/dateUtils';

describe('dateUtils - getLocalDateString', () => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = 'Asia/Taipei';
    vi.useRealTimers();
  });

  afterEach(() => {
    process.env.TZ = originalTz;
    vi.useRealTimers();
  });

  it('(a) default parameter returns today as local YYYY-MM-DD without tautology', () => {
    const todayStr = getLocalDateString();
    expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const now = new Date();
    const expectedYear = now.getFullYear();
    const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(now.getDate()).padStart(2, '0');
    expect(todayStr).toBe(`${expectedYear}-${expectedMonth}-${expectedDay}`);
  });

  it('(b) passing a specific Date returns the expected YYYY-MM-DD', () => {
    const target = new Date(2026, 8, 29, 14, 30, 0); // Note: month 8 is September
    const result = getLocalDateString(target);
    expect(result).toBe('2026-09-29');

    const newYear = new Date(2025, 0, 1, 0, 0, 0); // Jan 1, 2025
    expect(getLocalDateString(newYear)).toBe('2025-01-01');
  });

  it('(c) returned format strictly satisfies YYYY-MM-DD regular expression', () => {
    const dates = [
      new Date(2026, 0, 5),
      new Date(2026, 11, 31),
      new Date(2024, 1, 29), // Leap year
    ];

    for (const d of dates) {
      const formatted = getLocalDateString(d);
      expect(formatted).toMatch(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
    }
  });

  it('(d) passing Invalid Date falls back to current local date without throwing RangeError', () => {
    const invalidDate1 = new Date(NaN);
    const invalidDate2 = new Date('not-a-valid-date');

    expect(() => getLocalDateString(invalidDate1)).not.toThrow();
    expect(() => getLocalDateString(invalidDate2)).not.toThrow();

    const now = new Date();
    const expectedFallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(getLocalDateString(invalidDate1)).toBe(expectedFallback);
    expect(getLocalDateString(invalidDate2)).toBe(expectedFallback);
  });

  it('(e) works correctly under fake timers across local day boundaries without tautology', () => {
    // Test early morning boundary (e.g. 00:00:05 local)
    const earlyMorning = new Date(2026, 8, 30, 0, 0, 5);
    vi.useFakeTimers();
    vi.setSystemTime(earlyMorning);

    const dateStr = getLocalDateString();
    expect(dateStr).toBe('2026-09-30');

    // Test late night boundary (e.g. 23:59:55 local)
    const lateNight = new Date(2026, 8, 30, 23, 59, 55);
    vi.setSystemTime(lateNight);

    const lateDateStr = getLocalDateString();
    expect(lateDateStr).toBe('2026-09-30');
  });

  it('(f) handles UTC morning timestamp (01:00Z) without falling back to previous day in positive timezones', () => {
    // 2026-09-29T01:00:00.000Z is 01:00 UTC and >= 01:00 on Sep 29 across all positive UTC offsets (e.g. UTC+8 09:00)
    const utcMorning = new Date('2026-09-29T01:00:00.000Z');
    const localDateStr = getLocalDateString(utcMorning);

    // Hard assert getLocalDateString returns Sep 29 directly
    expect(localDateStr).toBe('2026-09-29');
  });

  it('(g) Asia/Taipei timezone pinning test: UTC 16:30 translates to next day 00:30 in UTC+8', () => {
    // 2026-09-29T16:30:00.000Z: in UTC it's 2026-09-29, but in Asia/Taipei (UTC+8) it's 2026-09-30 00:30:00
    const testDate = new Date('2026-09-29T16:30:00.000Z');
    
    // Hard assert getLocalDateString directly on the testDate under Asia/Taipei environment
    expect(getLocalDateString(testDate)).toBe('2026-09-30');
  });
});
