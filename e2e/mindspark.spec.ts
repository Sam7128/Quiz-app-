import { test, expect } from '@playwright/test';

test('MindSpark 核心流程: 匯入題庫 -> 首頁選取 -> 開始測驗', async ({ page }) => {
    // 增加超時時間，因為 dev server 啟動較慢
    test.setTimeout(120000);

    await page.goto('/');

    // 1. 訪客模式
    const guestBtn = page.locator('button:has-text("暫不登入")');
    await expect(guestBtn).toBeVisible({ timeout: 20000 });
    await guestBtn.click();
    await expect(page.locator('h1')).toContainText('歡迎回來', { timeout: 15000 });

    // 2. 到題庫管理匯入題目
    await page.locator('button:visible', { hasText: '題庫' }).click();
    await expect(page.locator('h3:has-text("我的題庫")')).toBeVisible();

    // 建立題庫
    await page.locator('[title="新增題庫"]').click();
    await page.locator('[placeholder="輸入題庫名稱..."]').fill('E2E Test Bank');
    await page.keyboard.press('Enter');

    // 選擇「貼上文字」
    await page.locator('button:has-text("貼上文字")').click();
    const json = JSON.stringify([
        {
            "id": "e2e-q1",
            "question": "1 + 1 = ?",
            "options": ["1", "2", "3", "4"],
            "answer": "2",
            "explanation": "數學常識"
        }
    ]);
    await page.locator('textarea').fill(json);

    // 匯入 (在自製 ConfirmDialog 點擊繼續匯入)
    await page.locator('button:has-text("匯入文字內容")').click();
    const confirmBtn = page.locator('[data-confirm-dialog]').getByRole('button', { name: '繼續匯入' });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // 驗證題數顯示
    await expect(page.locator('.group >> text=1 題').first()).toBeVisible({ timeout: 10000 });

    // 3. 回到首頁並開始測驗
    await page.locator('button:visible', { hasText: '首頁' }).click();
    const bankItem = page.locator('main >> text=E2E Test Bank');
    await expect(bankItem).toBeVisible();

    // 選取題庫 (點擊項目會切換選取狀態)
    await bankItem.click();
    // 等待選取樣式出現 (確保已選中)
    await expect(bankItem).toHaveClass(/text-brand-900/, { timeout: 5000 });

    // 點擊開始
    const startBtn = page.locator('button:has-text("開始測驗")');
    await expect(startBtn).toBeEnabled({ timeout: 5000 });
    await startBtn.click();

    // 4. 進行測驗
    await expect(page.locator('text=題目 1 / 1')).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => {
        const buttons = document.querySelectorAll('.space-y-1 button');
        for (const btn of Array.from(buttons)) {
            const text = btn.textContent || '';
            if (text.trim().endsWith('2')) {
                (btn as HTMLButtonElement).click();
                break;
            }
        }
    });

    // 5. 檢查解析
    await expect(page.locator('text=回答正確')).toBeVisible({ timeout: 10000 });

    // 6. 查看結果
    await page.locator('button:has-text("查看結果")').click();
    await expect(page.locator('text=測驗完成')).toBeVisible();
});
