import { beforeAll, describe, expect, it } from 'vitest';
import { signData, verifyData } from '../../utils/integrityCheck';
import { webcrypto } from 'crypto';

beforeAll(() => {
  if (typeof window !== 'undefined' && !window.crypto.subtle) {
    Object.defineProperty(window, 'crypto', {
      value: webcrypto,
      configurable: true,
      writable: true,
    });
  }
});

describe('HMAC-SHA256 Integrity Verification', () => {
  it('應能正確生成簽名並通過自身驗證', async () => {
    const testData = JSON.stringify({ streak: 12, heroHp: 100, monsterHp: 40 });
    const signature = await signData(testData);

    expect(signature).toHaveLength(64); // SHA-256 hex string is 64 chars
    const isValid = await verifyData(testData, signature);
    expect(isValid).toBe(true);
  });

  it('當載荷資料被惡意篡改時，驗證必須失敗', async () => {
    const originalData = JSON.stringify({ streak: 5 });
    const signature = await signData(originalData);

    // 篡改數據
    const tamperedData = JSON.stringify({ streak: 999 });
    const isValid = await verifyData(tamperedData, signature);
    expect(isValid).toBe(false);
  });

  it('當簽名本身被修改時，驗證必須失敗', async () => {
    const originalData = JSON.stringify({ streak: 5 });
    const signature = await signData(originalData);

    // 篡改簽名
    const tamperedSig = signature.substring(0, signature.length - 2) + 'ff';
    const isValid = await verifyData(originalData, tamperedSig);
    expect(isValid).toBe(false);
  });

  it('空簽名或長度格式不符的簽名驗證應直接返回 false 且不崩潰', async () => {
    const data = 'some-state-data';
    expect(await verifyData(data, '')).toBe(false);
    expect(await verifyData(data, 'abc')).toBe(false); // 奇數長度
  });

  it('簽名空字串應能正常簽名與驗證', async () => {
    const data = '';
    const signature = await signData(data);
    expect(signature).toHaveLength(64);
    expect(await verifyData(data, signature)).toBe(true);
  });

  it('支持 Unicode 與 Emoji 的簽名及驗證', async () => {
    const unicodeData = '哈囉，這是一段中文 🚀🔥 和 Emoji ✨';
    const signature = await signData(unicodeData);
    expect(await verifyData(unicodeData, signature)).toBe(true);
    
    // 篡改測試
    const tamperedData = '哈囉，這是一段中文 🚀🔥 和 Emoji ❌';
    expect(await verifyData(tamperedData, signature)).toBe(false);
  });

  it('驗證不依賴 localStorage 中的 salt 且不受其變更影響', async () => {
    const data = JSON.stringify({ level: 42, score: 9999 });
    const signature = await signData(data);
    const originalSalt = localStorage.getItem('mindspark_integrity_salt');

    try {
      // 就算寫入或修改了 localStorage 中的 salt，verifyData 依然能正確驗證，代表它是不受影響且安全隔離的
      localStorage.setItem('mindspark_integrity_salt', '8765432109fedcba8765432109fedcba');
      expect(await verifyData(data, signature)).toBe(true);
    } finally {
      if (originalSalt) {
        localStorage.setItem('mindspark_integrity_salt', originalSalt);
      } else {
        localStorage.removeItem('mindspark_integrity_salt');
      }
    }
  });
});
