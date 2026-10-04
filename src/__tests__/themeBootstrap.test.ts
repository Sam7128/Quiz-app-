import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { STORAGE_KEYS } from '../../services/storage';

describe('Dark mode FOUC Bootstrap (Task 5.1)', () => {
  const htmlPath = path.resolve(process.cwd(), 'index.html');
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  const extractHeadScript = (): string => {
    const headMatch = htmlContent.match(/<head>([\s\S]*?)<\/head>/i);
    expect(headMatch).not.toBeNull();
    const headContent = headMatch ? headMatch[1] : '';
    const scriptMatch = headContent.match(/<script>([\s\S]*?)<\/script>/i);
    expect(scriptMatch).not.toBeNull();
    return scriptMatch ? scriptMatch[1] : '';
  };

  const executeBootstrap = () => {
    const scriptCode = extractHeadScript();
    const fn = new Function(scriptCode);
    fn();
  };

  beforeEach(() => {
    document.documentElement.className = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.documentElement.className = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('HTML structure and positioning', () => {
    it('contains theme bootstrap script inside <head> before any module scripts', () => {
      const headEndIndex = htmlContent.indexOf('</head>');
      const scriptIndex = htmlContent.indexOf('<!-- Dark mode FOUC bootstrap -->');
      const moduleScriptIndex = htmlContent.indexOf('<script type="module"');

      expect(headEndIndex).toBeGreaterThan(-1);
      expect(scriptIndex).toBeGreaterThan(-1);
      expect(scriptIndex).toBeLessThan(headEndIndex);
      expect(moduleScriptIndex).toBeGreaterThan(-1);
      expect(scriptIndex).toBeLessThan(moduleScriptIndex);
    });

    it('uses correct STORAGE_KEYS.THEME key ("mindspark_theme")', () => {
      const scriptCode = extractHeadScript();
      expect(STORAGE_KEYS.THEME).toBe('mindspark_theme');
      expect(scriptCode).toContain('mindspark_theme');
    });
  });

  describe('Theme resolution scenarios', () => {
    it('applies dark class when mindspark_theme is "dark"', () => {
      localStorage.setItem('mindspark_theme', 'dark');

      executeBootstrap();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('does not apply dark class when mindspark_theme is "light"', () => {
      localStorage.setItem('mindspark_theme', 'light');

      executeBootstrap();

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('applies dark class when mindspark_theme is "system" and system prefers dark', () => {
      localStorage.setItem('mindspark_theme', 'system');
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      executeBootstrap();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('does not apply dark class when mindspark_theme is "system" and system prefers light', () => {
      localStorage.setItem('mindspark_theme', 'system');
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      executeBootstrap();

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('treats unknown/invalid theme values as light (fail-open)', () => {
      const invalidValues = ['auto', 'DARK', 'LIGHT', 'blue', 'custom', 'null', 'undefined', '', '   '];

      for (const val of invalidValues) {
        document.documentElement.className = '';
        localStorage.setItem('mindspark_theme', val);
        executeBootstrap();
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      }
    });

    it('treats missing/null theme as light when no stored value exists', () => {
      localStorage.removeItem('mindspark_theme');

      executeBootstrap();

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Exception safety and resilience', () => {
    it('does not throw and falls back to light when localStorage.getItem throws SecurityError', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });

      expect(() => executeBootstrap()).not.toThrow();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('does not throw and falls back to light when window.matchMedia is unavailable', () => {
      localStorage.setItem('mindspark_theme', 'system');
      const originalMatchMedia = window.matchMedia;
      // @ts-expect-error simulating legacy or stripped browser environment
      delete window.matchMedia;

      try {
        expect(() => executeBootstrap()).not.toThrow();
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      } finally {
        window.matchMedia = originalMatchMedia;
      }
    });

    it('does not throw and falls back to light when window.matchMedia throws', () => {
      localStorage.setItem('mindspark_theme', 'system');
      window.matchMedia = vi.fn().mockImplementation(() => {
        throw new Error('matchMedia failed');
      });

      expect(() => executeBootstrap()).not.toThrow();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('does not throw when document.documentElement.classList.add throws', () => {
      localStorage.setItem('mindspark_theme', 'dark');
      vi.spyOn(document.documentElement.classList, 'add').mockImplementation(() => {
        throw new Error('DOM manipulation blocked');
      });

      expect(() => executeBootstrap()).not.toThrow();
    });
  });
});
