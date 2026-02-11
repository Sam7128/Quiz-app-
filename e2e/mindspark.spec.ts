import { test, expect } from '@playwright/test';

test('MindSpark 核心流程: 匯入題庫 -> 首頁選取 -> 開始測驗', async ({ page }) => {
    // 增加超時時間，因為 dev server 啟動較慢
    test.setTimeout(120000);

    await page.goto('/');
    console.log('Navigated to base URL');

    // 1. 訪客模式
    const guestBtn = page.locator('button:has-text("暫不登入")');
    await expect(guestBtn).toBeVisible({ timeout: 20000 });
    await guestBtn.click();
    await expect(page.locator('h1')).toContainText('歡迎回來', { timeout: 15000 });
    console.log('Logged in as guest');

    // 2. 到題庫管理匯入題目
    await page.locator('button:visible', { hasText: '題庫' }).click();
    await expect(page.locator('h3:has-text("我的題庫")')).toBeVisible();
    console.log('Entered Manager');

    // 建立題庫
    await page.locator('[title="新增題庫"]').click();
    await page.locator('[placeholder="輸入題庫名稱..."]').fill('E2E Test Bank');
    await page.keyboard.press('Enter');
    console.log('Created Bank');

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

    // 匯入 (處理 Alert)
    page.on('dialog', d => {
        console.log('Dialog:', d.message());
        d.accept();
    });
    await page.locator('button:has-text("匯入文字內容")').click();
    console.log('Imported JSON');

    // 驗證題數顯示
    await expect(page.locator('.group >> text=1 題').first()).toBeVisible({ timeout: 10000 });
    console.log('Verified bank exists in list');

    // 3. 回到首頁並開始測驗
    await page.locator('button:visible', { hasText: '首頁' }).click();
    const bankItem = page.locator('main >> text=E2E Test Bank');
    await expect(bankItem).toBeVisible();

    // 選取題庫 (點擊項目會切換選取狀態)
    await bankItem.click();
    // 等待選取樣式出現 (確保已選中)
    await expect(bankItem).toHaveClass(/border-brand-500/, { timeout: 5000 });
    console.log('Selected bank in Dashboard');

    // 點擊開始
    const startBtn = page.locator('button:has-text("開始測驗")');
    await expect(startBtn).toBeEnabled({ timeout: 5000 });
    await startBtn.click();
    console.log('Started Quiz');

    // 4. 進行測驗
    await expect(page.locator('text=題目 1 / 1')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("2")').click();
    console.log('Answered Q1');

    // 5. 檢查解析
    await expect(page.locator('text=回答正確')).toBeVisible({ timeout: 10000 });
    console.log('Verified feedback');

    // 6. 查看結果
    await page.locator('button:has-text("查看結果")').click();
    await expect(page.locator('text=測驗完成')).toBeVisible();
    console.log('Test completed successfully!');
});
