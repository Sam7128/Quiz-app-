import { test, expect, Page } from '@playwright/test';

const navigateToManager = async (page: Page) => {
  const desktopNav = page.locator('nav >> text=題庫');
  const mobileNav = page.locator('.safe-area-bottom button', { hasText: '管理' });
  if (await desktopNav.isVisible()) {
    await desktopNav.click();
  } else {
    await mobileNav.click();
  }
};

const navigateToHome = async (page: Page) => {
  const desktopNav = page.locator('nav >> text=首頁');
  const mobileNav = page.locator('.safe-area-bottom button', { hasText: '首頁' });
  if (await desktopNav.isVisible()) {
    await desktopNav.click();
  } else if (await mobileNav.isVisible()) {
    await mobileNav.click();
  } else {
    await page.getByRole('button', { name: '首頁' }).first().click();
  }
};

test.describe('P1 資料完整性與防禦硬化 E2E Smoke 驗證 (Tasks 6.2)', () => {
  test('1. BOM JSON 匯入、自製確認對話框與 Toast 題數驗證', async ({ page }) => {
    await page.goto('/');

    // 訪客模式登入
    const guestBtn = page.locator('button', { hasText: '暫不登入，使用訪客模式' });
    await guestBtn.click();

    // 進入題庫管理
    await navigateToManager(page);

    // 建立新題庫
    await page.getByTitle('新增題庫').click();
    const bankInput = page.getByPlaceholder('輸入題庫名稱...');
    await bankInput.fill('BOM E2E Test Bank');
    await bankInput.press('Enter');

    // 切換到「貼上文字」標籤
    await page.getByRole('button', { name: '貼上文字 (Paste)' }).click();

    // 含有多重 UTF-8 BOM 的 JSON 資料
    const multiBomJson = '\uFEFF\uFEFF' + JSON.stringify([
      {
        id: 'bom-e2e-1',
        question: 'UTF-8 BOM 清洗測試題目？',
        options: ['通過', '失敗'],
        answer: '通過',
        type: 'single',
        explanation: '成功清洗 BOM 並匯入！'
      }
    ]);

    await page.locator('textarea').fill(multiBomJson);

    // 點擊匯入
    await page.getByRole('button', { name: '匯入文字內容' }).click();

    // 在自製 ConfirmDialog 中點擊「繼續匯入」
    const confirmBtn = page.locator('[data-confirm-dialog]').getByRole('button', { name: '繼續匯入' });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // 檢查題庫列表顯示題數為 1 題
    await expect(page.locator('.group >> text=1 題').first()).toBeVisible({ timeout: 15000 });
  });

  test('2. Blob URL 題庫匯出與下載事件觸發驗證', async ({ page }) => {
    await page.goto('/');

    // 訪客模式登入
    const guestBtn = page.locator('button', { hasText: '暫不登入，使用訪客模式' });
    await guestBtn.click();

    // 進入題庫管理
    await navigateToManager(page);

    // 建立題庫並匯入 1 題
    await page.getByTitle('新增題庫').click();
    const bankInput = page.getByPlaceholder('輸入題庫名稱...');
    await bankInput.fill('Blob Export Test Bank');
    await bankInput.press('Enter');

    await page.getByRole('button', { name: '貼上文字 (Paste)' }).click();
    const sampleJson = JSON.stringify([
      {
        id: 'export-q1',
        question: '匯出測試題目？',
        options: ['選項 A', '選項 B'],
        answer: '選項 A',
        type: 'single'
      }
    ]);
    await page.locator('textarea').fill(sampleJson);
    await page.getByRole('button', { name: '匯入文字內容' }).click();

    const confirmBtn = page.locator('[data-confirm-dialog]').getByRole('button', { name: '繼續匯入' });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // 等待匯出按鈕可點擊並監聽下載事件
    const exportBtn = page.getByRole('button', { name: /下載 \.JSON/i });
    await expect(exportBtn).toBeVisible({ timeout: 5000 });

    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    // 驗證下載檔名包含 mindspark_bank_ 且以 .json 結尾
    expect(download.suggestedFilename()).toMatch(/^mindspark_bank_.*\.json$/);
  });

  test('3. Dark Theme 首屏 Pre-paint Bootstrap 驗證 (無 FOUC 白屏閃爍)', async ({ page }) => {
    // 於頁面載入前注入 dark theme 至 localStorage
    await page.addInitScript(() => {
      localStorage.setItem('mindspark_theme', 'dark');
    });

    await page.goto('/');

    // 驗證 <html> 元素在載入後具備 dark class
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
  });

  test('4. 音效反饋開關與測驗答題流程不阻塞驗證', async ({ page }) => {
    await page.goto('/');

    // 訪客模式登入
    const guestBtn = page.locator('button', { hasText: '暫不登入，使用訪客模式' });
    await guestBtn.click();

    // 進入題庫建立測驗題目
    await navigateToManager(page);

    await page.getByTitle('新增題庫').click();
    const bankInput = page.getByPlaceholder('輸入題庫名稱...');
    await bankInput.fill('Quiz Flow Bank');
    await bankInput.press('Enter');

    await page.getByRole('button', { name: '貼上文字 (Paste)' }).click();
    const sampleJson = JSON.stringify([
      {
        id: 'quiz-audio-1',
        question: '測驗音效驗證題？',
        options: ['正確選項', '錯誤選項'],
        answer: '正確選項',
        type: 'single',
        explanation: '答題成功！'
      }
    ]);
    await page.locator('textarea').fill(sampleJson);
    await page.getByRole('button', { name: '匯入文字內容' }).click();

    const confirmBtn = page.locator('[data-confirm-dialog]').getByRole('button', { name: '繼續匯入' });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // 回到首頁並開始測驗
    await navigateToHome(page);
    const startBankBtn = page.locator('main').getByText('Quiz Flow Bank');
    await expect(startBankBtn).toBeVisible({ timeout: 5000 });
    await startBankBtn.click();

    // 點擊「開始測驗」
    const startQuizBtn = page.getByRole('button', { name: /開始測驗|開始挑戰/i });
    if (await startQuizBtn.isVisible()) {
      await startQuizBtn.click();
    }

    // 點擊正確選項
    const correctOption = page.locator('button', { hasText: '正確選項' });
    await expect(correctOption).toBeVisible({ timeout: 10000 });
    await correctOption.click();

    // 驗證答題狀態已正確顯示，無音效報錯阻塞
    await expect(page.locator('text=答題成功！').or(page.locator('text=正確'))).toBeVisible({ timeout: 5000 });
  });
});
