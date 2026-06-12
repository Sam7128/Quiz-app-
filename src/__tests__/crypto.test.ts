import { beforeAll, describe, expect, it } from 'vitest';
import { encryptString, decryptString, isEncryptedPayload } from '../../utils/crypto';
import { webcrypto } from 'crypto';

beforeAll(() => {
  // 解決 jsdom 缺乏 SubtleCrypto 的缺陷
  if (typeof window !== 'undefined' && !window.crypto.subtle) {
    Object.defineProperty(window, 'crypto', {
      value: webcrypto,
      configurable: true,
      writable: true,
    });
  }
});

describe('AES-GCM Crypto Utilities', () => {
  it('應能正確加密與解密資料', async () => {
    const originalText = 'secret-api-key-12345';
    const payload = await encryptString(originalText);
    
    expect(isEncryptedPayload(payload)).toBe(true);
    expect(payload.iv).toBeDefined();
    expect(payload.ciphertext).toBeDefined();

    const decryptedText = await decryptString(payload);
    expect(decryptedText).toBe(originalText);
  });

  it('兩次加密相同文字應產生不同的 iv 與密文 (隨機鹽/向量保護)', async () => {
    const text = 'same-text';
    const enc1 = await encryptString(text);
    const enc2 = await encryptString(text);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it('密文被修改/篡改時，解密應拋出異常 (AEAD 完整性驗證保護)', async () => {
    const text = 'important-data';
    const payload = await encryptString(text);
    
    // 篡改密文的最後兩個字元
    const corruptedCiphertext = payload.ciphertext.substring(0, payload.ciphertext.length - 2) + '00';
    const corruptedPayload = { ...payload, ciphertext: corruptedCiphertext };

    await expect(decryptString(corruptedPayload)).rejects.toThrow();
  });

  it('無效的 IV 長度或非 Hex 格式解密時應拋錯', async () => {
    const badPayload = { iv: 'short', ciphertext: 'aabbcc' };
    await expect(decryptString(badPayload)).rejects.toThrow();
  });

  it('加密空字串應能正常工作', async () => {
    const originalText = '';
    const payload = await encryptString(originalText);
    expect(isEncryptedPayload(payload)).toBe(true);
    const decryptedText = await decryptString(payload);
    expect(decryptedText).toBe(originalText);
  });

  it('解密非 Hex 字元格式的 IV 或密文應拋出異常', async () => {
    const badPayload = { iv: 'zzzzzzzzzzzzzzzzzzzzzzzz', ciphertext: 'aabbcc' };
    await expect(decryptString(badPayload)).rejects.toThrow();
  });

  it('當 localStorage 中的 salt 被改變，解密舊 Payload 應失敗拋錯', async () => {
    const text = 'persistent-secret';
    const payload = await encryptString(text);
    const originalSalt = localStorage.getItem('mindspark_crypto_salt');

    try {
      // 修改 localStorage 中的 salt
      localStorage.setItem('mindspark_crypto_salt', '1234567890abcdef1234567890abcdef');
      // 由於 key 發生改變，解密應該失敗
      await expect(decryptString(payload)).rejects.toThrow();
    } finally {
      if (originalSalt) {
        localStorage.setItem('mindspark_crypto_salt', originalSalt);
      } else {
        localStorage.removeItem('mindspark_crypto_salt');
      }
    }
  });
});
