import { expect, test } from '@playwright/test';

test('分階段練習：小題庫建立與續作流程', async ({ page }) => {
  await page.addInitScript(() => {
    const now = Date.now();
    const bankId = 'chunk-seed-bank';
    const banks = [{ id: bankId, name: 'Chunk Seed Bank', createdAt: now, questionCount: 8 }];
    const questions = Array.from({ length: 8 }, (_, index) => ({
      id: crypto.randomUUID(),
      question: `Chunk Q${index + 1}`,
      options: ['A', 'B', 'C', 'D'],
      answer: 'A',
      type: 'single',
      explanation: 'A',
    }));

    localStorage.setItem('mindspark_banks_meta', JSON.stringify(banks));
    localStorage.setItem(`mindspark_bank_${bankId}`, JSON.stringify(questions));
    localStorage.setItem('mindspark_current_bank_id', bankId);
  });

  await page.goto('/');
  await page.getByRole('button', { name: '暫不登入，使用訪客模式' }).click();
  await expect(page.getByRole('heading', { name: '歡迎回來，學習者！' })).toBeVisible();

  await page.getByRole('button', { name: '分階段練習' }).click();
  await page.getByRole('button', { name: '開始分階段練習' }).click();

  await expect(page.getByText(/題目 \d+ \/ 8/)).toBeVisible();
  await expect(page.getByText('📦 階段')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(page.getByText('分階段練習接力')).toBeVisible();
  await page.getByRole('button', { name: '繼續' }).first().click();

  await expect(page.getByText(/題目 \d+ \/ 8/)).toBeVisible();
});

test('分階段練習：放棄流程會移除 active session', async ({ page }) => {
  await page.addInitScript(() => {
    const now = Date.now();
    const bankId = 'chunk-seed-bank-2';
    const banks = [{ id: bankId, name: 'Chunk Seed Bank 2', createdAt: now, questionCount: 8 }];
    const questions = Array.from({ length: 8 }, (_, index) => ({
      id: crypto.randomUUID(),
      question: `Chunk2 Q${index + 1}`,
      options: ['A', 'B', 'C', 'D'],
      answer: 'A',
      type: 'single',
      explanation: 'A',
    }));

    localStorage.setItem('mindspark_banks_meta', JSON.stringify(banks));
    localStorage.setItem(`mindspark_bank_${bankId}`, JSON.stringify(questions));
    localStorage.setItem('mindspark_current_bank_id', bankId);
  });

  await page.goto('/');
  await page.getByRole('button', { name: '暫不登入，使用訪客模式' }).click();
  await expect(page.getByRole('heading', { name: '歡迎回來，學習者！' })).toBeVisible();

  await page.getByRole('button', { name: '分階段練習' }).click();
  await page.getByRole('button', { name: '開始分階段練習' }).click();

  // 確保題目已載入且鍵盤事件已綁定
  await expect(page.getByText(/題目 \d+ \/ 8/)).toBeVisible();
  await page.keyboard.press('Escape');
  // 等待測驗退出與卸載動畫完成，讓 DOM 穩定不再重繪
  await page.waitForTimeout(1000);

  await expect(page.getByText('分階段練習接力')).toBeVisible();
  await page.getByRole('button', { name: '放棄' }).first().click();
  await page.getByRole('button', { name: '確認' }).click();

  await expect(page.getByText('分階段練習接力')).toHaveCount(0);
});

test.skip('跨裝置（多 browser context）流程：Context A 登入並完成第一階段 → Context B 重新登入 → Dashboard 顯示同一 session 的下一個階段可繼續', async ({ browser }) => {
  // Test stub for cloud sync across devices
  // Requires proper auth mocking and Supabase request interception
  // 1. Context A: Login, create session, complete chunk 1, sync to cloud
  // 2. Context B: Login as same user, app fetches sessions from cloud
  // 3. Context B: Verify chunk 2 is available and start it
});
