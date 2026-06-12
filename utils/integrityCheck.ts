/**
 * 安全限制註解：
 * 此 HMAC 僅作前端完整性防篡改校驗，防範普通用戶 F12 修改，不可用於防範有逆向 JS 能力的進階攻擊者。
 * 若需最高防禦強度，關鍵數值與成就判定必須移至後端數據庫進行防護。
 */

/**
 * 獲取或生成 HMAC 金鑰
 */
async function getHMACKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined') {
    // SSR / Node 環境下的 dummy key 預防報錯
    const mockKey = new Uint8Array(32);
    return crypto.subtle.importKey(
      'raw',
      mockKey,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign', 'verify']
    );
  }

  const appVersion = '0.0.0';
  const staticSalt = 'mindspark_integrity_v1_' + appVersion;

  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(staticSalt + '_mindspark_integrity_key_secret');

  return window.crypto.subtle.importKey(
    'raw',
    keyMaterial,
    {
      name: 'HMAC',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign', 'verify']
  );
}

/**
 * 使用 HMAC-SHA256 對資料字串進行簽名，返回 Hex 字串
 */
export async function signData(data: string): Promise<string> {
  const key = await getHMACKey();
  const encoder = new TextEncoder();
  const signatureBuffer = await window.crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  const arr = new Uint8Array(signatureBuffer);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 驗證資料字串的 HMAC-SHA256 簽名是否有效
 */
export async function verifyData(data: string, signature: string): Promise<boolean> {
  if (!signature) {
    return false;
  }
  try {
    const key = await getHMACKey();
    const encoder = new TextEncoder();

    if (signature.length % 2 !== 0) {
      return false;
    }
    const sigBytes = new Uint8Array(signature.length / 2);
    for (let i = 0; i < sigBytes.length; i++) {
      sigBytes[i] = parseInt(signature.substring(i * 2, i * 2 + 2), 16);
    }

    return await window.crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(data)
    );
  } catch (error) {
    console.error('[IntegrityCheck] Verification failed with error:', error);
    return false;
  }
}
