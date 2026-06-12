// utils/crypto.ts
// 基於 AES-GCM 的 API Key 加解密工具。隨機 Salt 儲存於 localStorage (鍵名 mindspark_crypto_salt)。

const SALT_KEY = 'mindspark_crypto_salt';

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
}

/**
 * 驗證是否為加密後的 Payload 格式
 */
export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const p = value as Record<string, unknown>;
  return typeof p.iv === 'string' && typeof p.ciphertext === 'string';
}

/**
 * 將 ArrayBuffer 轉換為 Hex 字串
 */
function bufToHex(buffer: ArrayBuffer): string {
  const arr = new Uint8Array(buffer);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 將 Hex 字串轉換為 ArrayBuffer
 */
function hexToBuf(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new Error('無效的 Hex 字串長度');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

/**
 * 獲取或生成持久化的隨機 Salt
 */
function getOrGenerateSalt(): Uint8Array {
  if (typeof window === 'undefined') {
    return new Uint8Array(16);
  }
  let saltHex = localStorage.getItem(SALT_KEY);
  if (!saltHex) {
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
    saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(SALT_KEY, saltHex);
  }
  const bytes = new Uint8Array(saltHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(saltHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * 基於隨機 Salt 派生加密用的 CryptoKey
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const salt = getOrGenerateSalt();
  const encoder = new TextEncoder();
  const seed = encoder.encode('mindspark_secure_key_seed');
  const combined = new Uint8Array(salt.length + seed.length);
  combined.set(salt, 0);
  combined.set(seed, salt.length);

  const keyData = await window.crypto.subtle.digest('SHA-256', combined);
  return window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * AES-GCM 加密函數
 */
export async function encryptString(text: string): Promise<EncryptedPayload> {
  const key = await getCryptoKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM 推薦 12 bytes IV
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encodedText
  );

  return {
    iv: bufToHex(iv.buffer),
    ciphertext: bufToHex(ciphertextBuffer)
  };
}

/**
 * AES-GCM 解密函數
 */
export async function decryptString(payload: EncryptedPayload): Promise<string> {
  const key = await getCryptoKey();
  const iv = new Uint8Array(hexToBuf(payload.iv));
  const ciphertext = hexToBuf(payload.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
