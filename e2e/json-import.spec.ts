import { test, expect } from '@playwright/test';

test('JSON 文字貼上匯入測試', async ({ page }) => {
    await page.goto('/');
    console.log('Page loaded');

    // 訪客模式登入
    const guestBtn = page.locator('button', { hasText: '暫不登入，使用訪客模式' });
    await guestBtn.click();
    console.log('Clicked guest button');

    // 1. 進入題庫管理
    const managerNav = page.locator('nav >> text=題庫');
    await managerNav.click();
    console.log('Entered Manager');

    // 2. 建立新題庫
    await page.getByTitle('新增題庫').click();
    const bankInput = page.getByPlaceholder('輸入題庫名稱...');
    await bankInput.fill('E2E Test Bank');
    await bankInput.press('Enter');
    console.log('Created Bank');

    // 3. 切換到「貼上文字」標籤
    await page.getByRole('button', { name: '貼上文字 (Paste)' }).click();
    console.log('Switched to Paste tab');

    // 4. 輸入 JSON
    const sampleJson = JSON.stringify([
        {
            "id": "e2e-i1",
            "question": "Playwright 測試問題？",
            "options": ["Yes", "No"],
            "answer": "Yes",
            "explanation": "匯入成功！"
        }
    ]);
    await page.locator('textarea').fill(sampleJson);
    console.log('Filled JSON');

    // 5. 點擊匯入
    page.on('dialog', dialog => {
        console.log('Dialog:', dialog.message());
        dialog.accept();
    });
    await page.getByRole('button', { name: '匯入文字內容' }).click();
    console.log('Imported JSON');

    // 6. 檢查題庫列表顯示題數
    await expect(page.getByText('1 題')).toBeVisible({ timeout: 15000 });
    console.log('Verified count');

    // 7. 回到首頁檢查是否可選
    await page.getByRole('button', { name: '首頁' }).click();
    await expect(page.getByText('E2E Test Bank')).toBeVisible();
    console.log('Verified bank in Dashboard');
});
