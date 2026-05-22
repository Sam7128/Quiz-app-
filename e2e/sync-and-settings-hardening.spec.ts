import { test, expect } from '@playwright/test';

test.describe('同步與設定安全性強化 E2E 測試', () => {
    // 增加超時時間，以防開發伺服器啟動慢
    test.setTimeout(120000);

    test('同步容錯與重試機制：全部同步失敗，重試後完全成功', async ({ page }) => {
        let shouldFail = true;
        const cloudBanks: any[] = [];

        // 1. 初始化本地資料 (兩個本地題庫)
        await page.addInitScript(() => {
            // Mock 登入狀態 (sb-aotvcbfrgsxibemsogoh-auth-token)
            localStorage.setItem('sb-aotvcbfrgsxibemsogoh-auth-token', JSON.stringify({
                access_token: 'mock-token',
                token_type: 'bearer',
                expires_in: 3600,
                refresh_token: 'mock-refresh-token',
                user: {
                    id: 'mock-user-id',
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: 'test@example.com',
                    email_confirmed_at: '2026-05-21T12:00:00Z',
                    phone: '',
                    confirmed_at: '2026-05-21T12:00:00Z',
                    last_sign_in_at: '2026-05-21T12:00:00Z',
                    app_metadata: { provider: 'email', providers: ['email'] },
                    user_metadata: {},
                    identities: [],
                    created_at: '2026-05-21T12:00:00Z',
                    updated_at: '2026-05-21T12:00:00Z'
                },
                expires_at: Math.floor(Date.now() / 1000) + 3600
            }));

            // 本地題庫 metadata
            const localMeta = [
                { id: 'bank-1-id', name: 'Retry Bank 1', questionCount: 1, createdAt: Date.now() },
                { id: 'bank-2-id', name: 'Retry Bank 2', questionCount: 1, createdAt: Date.now() }
            ];
            localStorage.setItem('mindspark_banks_meta', JSON.stringify(localMeta));
            localStorage.setItem('mindspark_bank_bank-1-id', JSON.stringify([{ id: 'q1', question: '1+1=?', options: ['2'], answer: '2', type: 'single', explanation: 'desc' }]));
            localStorage.setItem('mindspark_bank_bank-2-id', JSON.stringify([{ id: 'q2', question: '2+2=?', options: ['4'], answer: '4', type: 'single', explanation: 'desc' }]));
        });

        // 2. 攔截 Supabase Auth & DB APIs
        await page.route('**/auth/v1/user', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'mock-user-id',
                    email: 'test@example.com',
                    role: 'authenticated'
                })
            });
        });

        // 攔截 GET / POST 題庫
        await page.route('**/rest/v1/banks*', async (route) => {
            const method = route.request().method();
            console.log(`[E2E Router 1] banks route request: ${method}`);
            if (method === 'GET') {
                console.log(`[E2E Router 1] GET banks returning:`, JSON.stringify(cloudBanks));
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(cloudBanks)
                });
            } else if (method === 'POST') {
                if (shouldFail) {
                    console.log(`[E2E Router 1] POST banks failed simulated (shouldFail=true)`);
                    // 模擬全部失敗
                    await route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ message: 'Database error simulated for sync failure' })
                    });
                } else {
                    const body = route.request().postDataJSON();
                    const title = body?.title || 'Mocked Bank';
                    const newBank = { id: `cloud-${title.replace(/\s+/g, '-')}`, title, description: 'From local storage' };
                    cloudBanks.push(newBank);
                    console.log(`[E2E Router 1] POST banks success, cloudBanks is now:`, JSON.stringify(cloudBanks));
                    await route.fulfill({
                        status: 201,
                        contentType: 'application/json',
                        body: JSON.stringify(newBank)
                    });
                }
            }
        });

        await page.route('**/rest/v1/questions*', async (route) => {
            const method = route.request().method();
            console.log(`[E2E Router 1] questions route request: ${method}`);
            if (method === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify([{ id: 'mock-q-id' }])
                });
            } else if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([])
                });
            } else {
                await route.continue();
            }
        });

        // 監聽瀏覽器主控台輸出，方便診斷
        page.on('console', msg => console.log(`[Browser Console 1] ${msg.type()}: ${msg.text()}`));

        // 3. 前往頁面
        await page.goto('/');

        // 點擊進入題庫管理
        await page.locator('button:visible', { hasText: '題庫' }).click();

        // 點擊 React Modal 中的「確認」同步按鈕
        const confirmBtn = page.locator('[data-confirm-dialog] button:has-text("確認")');
        await expect(confirmBtn).toBeVisible({ timeout: 15000 });
        await confirmBtn.click();
        console.log('Clicked confirm sync modal button');

        // 驗證 Toast 顯示全部同步失敗
        const failedToast = page.locator('text=同步失敗！所有 2 個題庫同步失敗，請稍後重試。');
        await expect(failedToast).toBeVisible({ timeout: 15000 });
        console.log('Verified all-failed toast');

        // 4. 重試：修改 shouldFail 為 false，並再次觸發同步 (重新整理/重新點擊題庫)
        shouldFail = false;
        
        // 透過重新整理頁面，再次觸發 useAppDataLoader 初始載入的 refreshBanksData
        await page.reload();

        // 再次點擊 React Modal 中的「確認」同步按鈕 (因為這時雲端回傳依舊是空，再次彈出確認)
        await expect(confirmBtn).toBeVisible({ timeout: 15000 });
        await confirmBtn.click();
        console.log('Clicked confirm sync modal button for retry');

        // 驗證 Toast 顯示同步完成
        const successToast = page.locator('text=同步完成！');
        await expect(successToast).toBeVisible({ timeout: 15000 });
        console.log('Verified retry success toast');
    });

    test('同步容錯與重試機制：部分同步失敗，更新本地 metadata 只留失敗者', async ({ page }) => {
        // 1. 初始化本地資料 (Success Bank & Failed Bank)
        await page.addInitScript(() => {
            localStorage.setItem('sb-aotvcbfrgsxibemsogoh-auth-token', JSON.stringify({
                access_token: 'mock-token',
                token_type: 'bearer',
                expires_in: 3600,
                refresh_token: 'mock-refresh-token',
                user: {
                    id: 'mock-user-id',
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: 'test@example.com',
                    email_confirmed_at: '2026-05-21T12:00:00Z',
                    phone: '',
                    confirmed_at: '2026-05-21T12:00:00Z',
                    last_sign_in_at: '2026-05-21T12:00:00Z',
                    app_metadata: { provider: 'email', providers: ['email'] },
                    user_metadata: {},
                    identities: [],
                    created_at: '2026-05-21T12:00:00Z',
                    updated_at: '2026-05-21T12:00:00Z'
                },
                expires_at: Math.floor(Date.now() / 1000) + 3600
            }));

            const localMeta = [
                { id: 'bank-success-id', name: 'Success Bank', questionCount: 1, createdAt: Date.now() },
                { id: 'bank-failed-id', name: 'Failed Bank', questionCount: 1, createdAt: Date.now() }
            ];
            localStorage.setItem('mindspark_banks_meta', JSON.stringify(localMeta));
            localStorage.setItem('mindspark_bank_bank-success-id', JSON.stringify([{ id: 'q1', question: '1+1=?', options: ['2'], answer: '2', type: 'single', explanation: 'desc' }]));
            localStorage.setItem('mindspark_bank_bank-failed-id', JSON.stringify([{ id: 'q2', question: '2+2=?', options: ['4'], answer: '4', type: 'single', explanation: 'desc' }]));
        });

        // 2. 攔截 Supabase Auth & DB APIs
        await page.route('**/auth/v1/user', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'mock-user-id', email: 'test@example.com', role: 'authenticated' })
            });
        });

        await page.route('**/rest/v1/banks*', async (route) => {
            const method = route.request().method();
            console.log(`[E2E Router 2] banks route request: ${method}`);
            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: '[]'
                });
            } else if (method === 'POST') {
                const body = route.request().postDataJSON();
                if (body?.title === 'Failed Bank') {
                    await route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ message: 'Simulated DB failure for Failed Bank' })
                    });
                } else {
                    await route.fulfill({
                        status: 201,
                        contentType: 'application/json',
                        body: JSON.stringify({ id: 'cloud-bank-success-id', title: 'Success Bank' })
                    });
                }
            }
        });

        await page.route('**/rest/v1/questions*', async (route) => {
            const method = route.request().method();
            console.log(`[E2E Router 2] questions route request: ${method}`);
            if (method === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify([{ id: 'mock-q-id' }])
                });
            } else if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([])
                });
            } else {
                await route.continue();
            }
        });

        // 監聽瀏覽器主控台輸出，方便診斷
        page.on('console', msg => console.log(`[Browser Console 2] ${msg.type()}: ${msg.text()}`));

        // 3. 前往頁面
        await page.goto('/');

        // 確保按鈕可見並點擊進入題庫管理
        const bankBtn = page.locator('button:visible', { hasText: '題庫' });
        await expect(bankBtn).toBeVisible({ timeout: 20000 });
        await bankBtn.click();
        console.log('Clicked bank tab button');

        // 點擊 React Modal 中的「確認」同步按鈕
        const confirmBtn = page.locator('[data-confirm-dialog] button:has-text("確認")');
        await expect(confirmBtn).toBeVisible({ timeout: 15000 });
        await confirmBtn.click();
        console.log('Clicked confirm sync modal button for partial sync');

        // 驗證 Toast 顯示部分成功警告
        const partialToast = page.locator('text=同步部分成功！1 個題庫同步成功，1 個失敗。');
        await expect(partialToast).toBeVisible({ timeout: 15000 });
        console.log('Verified partial-success toast');

        // 4. 驗證本地 metadata 是否僅剩 Failed Bank
        const localMetaAfter = await page.evaluate(() => {
            return localStorage.getItem('mindspark_banks_meta');
        });
        expect(localMetaAfter).not.toBeNull();
        const parsed = JSON.parse(localMetaAfter!);
        expect(parsed.length).toBe(1);
        expect(parsed[0].name).toBe('Failed Bank');
        console.log('Verified local storage contains only failed bank metadata');
    });

    test('損壞的 AI 設定容錯：當 localStorage 含有無效 JSON 時，設定頁面應可順利載入並自動回退為預設值', async ({ page }) => {
        // 1. 初始化損損的 AI Config
        await page.addInitScript(() => {
            localStorage.setItem('mindspark_ai_config', 'this-is-not-valid-json-string!');
        });

        // 2. 前往頁面
        await page.goto('/');

        // 3. 訪客登入以進入主頁面
        const guestBtn = page.locator('button:has-text("暫不登入")');
        await expect(guestBtn).toBeVisible({ timeout: 20000 });
        await guestBtn.click();

        // 4. 點擊「設定」齒輪按鈕
        const settingsBtn = page.locator('button[aria-label="打開設定"], button:has-text("設定"), button:has([class*="settings"]), [aria-label*="設定"]');
        await settingsBtn.first().click();

        // 5. 驗證設定 Modal 出現
        await expect(page.locator('h2:has-text("系統設定")')).toBeVisible({ timeout: 10000 });

        // 6. 驗證 AI 金鑰欄位為空 (表示已正確回退至預設值)
        const apiKeyInput = page.locator('input[placeholder="AIza..."]');
        await expect(apiKeyInput).toBeVisible();
        await expect(apiKeyInput).toHaveValue('');
        console.log('Verified AI key field falls back to empty string');

        // 7. 驗證 localStorage 中的壞資料已被清除
        const cleanConfig = await page.evaluate(() => {
            return localStorage.getItem('mindspark_ai_config');
        });
        expect(cleanConfig).toBeNull();
        console.log('Verified corrupted AI config is cleared from localStorage');
    });
});
