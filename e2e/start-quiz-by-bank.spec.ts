import { test, expect } from '@playwright/test';

test('select bank A then "直接開始" bank B starts quiz from bank B', async ({ page }) => {
  await page.addInitScript(() => {
    const now = Date.now();
    const banks = [
      { id: 'bankA', name: 'Bank A', createdAt: now, questionCount: 1 },
      { id: 'bankB', name: 'Bank B', createdAt: now, questionCount: 1 },
    ];

    const qA = [
      { id: crypto.randomUUID(), question: 'From A', options: ['A'], answer: 'A', type: 'single', explanation: 'A' },
    ];
    const qB = [
      { id: crypto.randomUUID(), question: 'From B', options: ['B'], answer: 'B', type: 'single', explanation: 'B' },
    ];

    localStorage.setItem('mindspark_banks_meta', JSON.stringify(banks));
    localStorage.setItem('mindspark_bank_bankA', JSON.stringify(qA));
    localStorage.setItem('mindspark_bank_bankB', JSON.stringify(qB));
    localStorage.setItem('mindspark_current_bank_id', 'bankA');
  });

  await page.goto('/');

  await page.getByRole('button', { name: '暫不登入，使用訪客模式' }).click();
  await expect(page.getByText('歡迎回來，學習者！')).toBeVisible();

  // Initially, reducer selects all banks by default; leave only bankA selected.
  await page.getByText('Bank B', { exact: true }).click();

  // Start bankB directly.
  await page.getByText('Bank B', { exact: true }).hover();
  await page.getByRole('button', { name: '直接開始 Bank B' }).click();

  // Quiz should show bankB question.
  await expect(page.getByText('From B', { exact: true })).toBeVisible();
});

