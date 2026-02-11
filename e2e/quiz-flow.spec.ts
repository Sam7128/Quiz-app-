import { test, expect } from '@playwright/test';

test('完整測驗流程測試', async ({ page }) => {
    await page.goto('/');
    console.log('Page loaded');

    // 1. 訪客模式登入
    const guestBtn = page.locator('button', { hasText: '暫不登入，使用訪客模式' });
    await expect(guestBtn).toBeVisible({ timeout: 20000 });
    await guestBtn.click();
    console.log('Clicked guest button');

    // 2. 確定進入 Dashboard
    const welcome = page.locator('h1', { hasText: '歡迎回來' });
    await expect(welcome).toBeVisible({ timeout: 20000 });
    console.log('Dashboard loaded');

    // 3. 全選題庫
    const selectAllBtn = page.getByRole('button', { name: /全選題庫|取消全選/ });
    if (await selectAllBtn.count() > 0 && await selectAllBtn.isVisible()) {
        await selectAllBtn.click();
        console.log('Clicked select all');
    }

    // 4. 開始測驗
    const startBtn = page.getByRole('button', { name: '開始測驗' });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();
    console.log('Clicked start quiz');

    // 5. 檢查是否進入 Quiz 頁面
    await expect(page.getByText(/題目 \d+ \//)).toBeVisible({ timeout: 15000 });
    console.log('Quiz started');

    // 6. 點選第一個選項
    await page.locator('.space-y-1 button').first().click();
    console.log('Selected first option');

    // 7. 檢查解析是否出現
    await expect(page.getByText(/下一題|查看結果/)).toBeVisible({ timeout: 15000 });
    console.log('Answered');

    // 8. 退出
    await page.keyboard.press('Escape');
    await expect(page.locator('h1', { hasText: '歡迎回來' })).toBeVisible({ timeout: 10000 });
    console.log('Exited quiz');
});
