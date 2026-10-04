import { test, expect } from '@playwright/test';

test.describe('P1 核心學習體驗與統計全流程 E2E 測試', () => {
    test.setTimeout(120000);

    test('E2E-1 (Auto-Advance): 答對自動切題，最後一題自動轉入結果頁', async ({ page }) => {
        // 1. 初始化題庫與開啟 autoAdvanceOnCorrect 設定
        await page.addInitScript(() => {
            const now = Date.now();
            const bankId = 'bank-auto-advance';
            const banks = [{ id: bankId, name: '自動切題題庫', createdAt: now, questionCount: 2 }];
            const questions = [
                { id: 'q-auto-1', question: '題目一：1+1=?', options: ['2', '3'], answer: '2', type: 'single', explanation: '1+1 等於 2' },
                { id: 'q-auto-2', question: '題目二：2+2=?', options: ['4', '5'], answer: '4', type: 'single', explanation: '2+2 等於 4' },
            ];

            localStorage.setItem('mindspark_banks_meta', JSON.stringify(banks));
            localStorage.setItem(`mindspark_bank_${bankId}`, JSON.stringify(questions));
            localStorage.setItem('mindspark_current_bank_id', bankId);
            localStorage.setItem('mindspark_selected_quiz_banks', JSON.stringify([bankId]));
            localStorage.setItem('mindspark_settings', JSON.stringify({
                autoAdvanceOnCorrect: true,
                restBreakInterval: 0,
                soundEnabled: false,
            }));
        });

        await page.goto('/');

        // 訪客模式登入
        const guestBtn = page.locator('button:has-text("暫不登入")');
        await expect(guestBtn).toBeVisible({ timeout: 20000 });
        await guestBtn.click();

        // 確認進入 Dashboard
        await expect(page.locator('h1')).toContainText('歡迎回來', { timeout: 15000 });

        // 開始測驗
        const startBtn = page.getByRole('button', { name: '開始測驗' });
        await expect(startBtn).toBeEnabled();
        await startBtn.click();

        // 驗證進入第一題
        await expect(page.getByText('題目 1 / 2')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('題目一：1+1=?')).toBeVisible();

        // 點擊正確答案 '2'
        const opt1 = page.locator('.space-y-1 button').filter({ hasText: '2' });
        await opt1.click();

        // 驗證無需手動點擊「下一題」，在 ~800ms 後自動切換至第二題
        await expect(page.getByText('題目 2 / 2')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('題目二：2+2=?')).toBeVisible();

        // 點擊最後一題的正確答案 '4'
        const opt2 = page.locator('.space-y-1 button').filter({ hasText: '4' });
        await opt2.click();

        // 驗證無需手動點擊「查看結果」，最後一題自動轉入 QuizResult 結果頁
        await expect(page.locator('text=測驗完成！')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=100%')).toBeVisible();
    });

    test('E2E-2 (Wrong Answer Comparison & Accessibility): 錯題選項對比與無障礙標籤', async ({ page }) => {
        // 1. 初始化題庫，關閉 autoAdvanceOnCorrect
        await page.addInitScript(() => {
            const now = Date.now();
            const bankId = 'bank-wrong-compare';
            const banks = [{ id: bankId, name: '錯題對比題庫', createdAt: now, questionCount: 1 }];
            const questions = [
                {
                    id: 'q-wrong-compare-1',
                    question: '太陽從哪邊升起？',
                    options: ['東邊', '西邊', '南邊', '北邊'],
                    answer: '東邊',
                    type: 'single',
                    explanation: '太陽由東方升起、西方落下'
                },
            ];

            localStorage.setItem('mindspark_banks_meta', JSON.stringify(banks));
            localStorage.setItem(`mindspark_bank_${bankId}`, JSON.stringify(questions));
            localStorage.setItem('mindspark_current_bank_id', bankId);
            localStorage.setItem('mindspark_selected_quiz_banks', JSON.stringify([bankId]));
            localStorage.setItem('mindspark_settings', JSON.stringify({
                autoAdvanceOnCorrect: false,
                restBreakInterval: 0,
                soundEnabled: false,
            }));
        });

        await page.goto('/');

        const guestBtn = page.locator('button:has-text("暫不登入")');
        await expect(guestBtn).toBeVisible({ timeout: 20000 });
        await guestBtn.click();

        await expect(page.locator('h1')).toContainText('歡迎回來', { timeout: 15000 });

        const startBtn = page.getByRole('button', { name: '開始測驗' });
        await expect(startBtn).toBeEnabled();
        await startBtn.click();

        await expect(page.getByText('太陽從哪邊升起？')).toBeVisible({ timeout: 10000 });

        // 故意選擇錯誤答案 '西邊'
        const wrongOpt = page.locator('.space-y-1 button').filter({ hasText: '西邊' });
        await wrongOpt.click();

        // 驗證答錯時停留並顯示解析與反饋
        await expect(page.locator('text=❌ 再接再厲！解析如下')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=太陽由東方升起、西方落下')).toBeVisible();

        // 點擊「查看結果」按鈕
        const resultBtn = page.getByRole('button', { name: /查看結果/ });
        await expect(resultBtn).toBeVisible();
        await resultBtn.click();

        // 驗證進入結果頁
        await expect(page.locator('text=測驗完成！')).toBeVisible({ timeout: 5000 });

        // 點擊「查看錯題解析」按鈕展開列表
        const toggleMistakesBtn = page.locator('button:has-text("查看錯題解析")');
        await expect(toggleMistakesBtn).toBeVisible();
        await toggleMistakesBtn.click();

        // 驗證錯題對比區塊中的標籤與 ARIA 屬性
        const userPick = page.locator('[aria-invalid="true"]');
        await expect(userPick).toBeVisible();
        await expect(userPick).toContainText('❌ 你的選擇: 西邊');

        const correctPick = page.locator('[aria-label="正確答案"]');
        await expect(correctPick).toBeVisible();
        await expect(correctPick).toContainText('✅ 正確答案: 東邊');

        // 驗證解析內容渲染
        await expect(page.locator('text=解析：')).toBeVisible();
        await expect(page.locator('text=太陽由東方升起、西方落下')).toBeVisible();
    });

    test('E2E-3 (Achievement Pruning): 儀表板與成就 Modal 僅展示 4 個白名單成就', async ({ page }) => {
        // 1. 初始化包含已實作成就與未知歷史成就的 localStorage
        await page.addInitScript(() => {
            const now = Date.now();
            const bankId = 'bank-achievements';
            const banks = [{ id: bankId, name: '成就題庫', createdAt: now, questionCount: 1 }];
            const questions = [
                { id: 'q-ach-1', question: '測試題', options: ['A'], answer: 'A', type: 'single' }
            ];

            localStorage.setItem('mindspark_banks_meta', JSON.stringify(banks));
            localStorage.setItem(`mindspark_bank_${bankId}`, JSON.stringify(questions));
            localStorage.setItem('mindspark_current_bank_id', bankId);
            // 包含 1 個合法白名單成就 ('perfect_score') 與 1 個未實作/未知舊成就 ('legacy_unimplemented_ach')
            localStorage.setItem('mindspark_unlocked_achievements', JSON.stringify(['perfect_score', 'legacy_unimplemented_ach']));
        });

        await page.goto('/');

        const guestBtn = page.locator('button:has-text("暫不登入")');
        await expect(guestBtn).toBeVisible({ timeout: 20000 });
        await guestBtn.click();

        await expect(page.locator('h1')).toContainText('歡迎回來', { timeout: 15000 });

        // 驗證 Dashboard 成就卡片的分母為 4 (即 1/4，絕非 1/22 或 2/22)
        const achCard = page.locator('div:has(h3:has-text("成就系統"))').first();
        await expect(achCard).toBeVisible({ timeout: 10000 });
        await expect(achCard).toContainText('1/4');

        // 點擊成就卡片開啟成就 Modal
        await achCard.click();

        // 驗證 Modal 出現
        const modalHeader = page.locator('h2:has-text("成就一覽")');
        await expect(modalHeader).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=已解鎖 1 / 4')).toBeVisible();

        // 驗證 4 個白名單成就均渲染在 Modal 中
        await expect(page.locator('h3:has-text("初次嘗試")')).toBeVisible();
        await expect(page.locator('h3:has-text("完美答題")')).toBeVisible();
        await expect(page.locator('h3:has-text("夜貓子")')).toBeVisible();
        await expect(page.locator('h3:has-text("早起的鳥兒")')).toBeVisible();

        // 驗證未實作與未知成就未被渲染
        await expect(page.locator('text=屠龍者')).not.toBeVisible();
        await expect(page.locator('text=怪物獵人')).not.toBeVisible();
        await expect(page.locator('text=legacy_unimplemented_ach')).not.toBeVisible();

        // 關閉 Modal
        const closeBtn = page.locator('button[aria-label="關閉視窗"]');
        await closeBtn.click();
        await expect(modalHeader).not.toBeVisible();
    });

    test('E2E-4 (Esc Mid-quiz Settlement & Dashboard Stats): 測驗中途按 ESC 退出結算與統計累計', async ({ page }) => {
        // 1. 初始化題庫，清空學習紀錄
        await page.addInitScript(() => {
            const now = Date.now();
            const bankId = 'bank-esc-settle';
            const banks = [{ id: bankId, name: 'ESC結算題庫', createdAt: now, questionCount: 3 }];
            const questions = [
                { id: 'q-esc-1', question: '第一題', options: ['A', 'B'], answer: 'A', type: 'single' },
                { id: 'q-esc-2', question: '第二題', options: ['C', 'D'], answer: 'C', type: 'single' },
                { id: 'q-esc-3', question: '第三題', options: ['E', 'F'], answer: 'E', type: 'single' },
            ];

            localStorage.setItem('mindspark_banks_meta', JSON.stringify(banks));
            localStorage.setItem(`mindspark_bank_${bankId}`, JSON.stringify(questions));
            localStorage.setItem('mindspark_current_bank_id', bankId);
            localStorage.setItem('mindspark_selected_quiz_banks', JSON.stringify([bankId]));
            localStorage.setItem('mindspark_study_sessions', JSON.stringify([]));
            localStorage.setItem('mindspark_settings', JSON.stringify({ autoAdvanceOnCorrect: false, soundEnabled: false }));
        });

        await page.goto('/');

        const guestBtn = page.locator('button:has-text("暫不登入")');
        await expect(guestBtn).toBeVisible({ timeout: 20000 });
        await guestBtn.click();

        await expect(page.locator('h1')).toContainText('歡迎回來', { timeout: 15000 });

        // 開始測驗
        const startBtn = page.getByRole('button', { name: '開始測驗' });
        await expect(startBtn).toBeEnabled();
        await startBtn.click();

        await expect(page.getByText('題目 1 / 3')).toBeVisible({ timeout: 10000 });

        // 做 1 題（點擊正確答案 'A'）
        const optA = page.locator('.space-y-1 button').filter({ hasText: 'A' });
        await optA.click();
        await expect(page.locator('text=回答正確')).toBeVisible({ timeout: 5000 });

        // 停留 1.5 秒以保證作答時長 >= 1 秒
        await page.waitForTimeout(1500);

        // 中途按 ESC 退出測驗
        await page.keyboard.press('Escape');

        // 驗證順利回到 Dashboard
        await expect(page.locator('h1')).toContainText('歡迎回來', { timeout: 10000 });

        // 驗證 Dashboard 的 StudyStatsCard 統計數據已累加已做 1 題
        const statsCard = page.locator('div:has(h3:has-text("學習統計"))').first();
        await expect(statsCard).toBeVisible({ timeout: 10000 });
        await expect(statsCard).toContainText('1/1 題');
        await expect(statsCard).toContainText('100%');

        // 驗證 localStorage 中的 study_sessions 含有 1 筆測驗結算記錄
        const storedSessions = await page.evaluate(() => {
            const raw = localStorage.getItem('mindspark_study_sessions');
            return raw ? JSON.parse(raw) : [];
        });
        expect(storedSessions.length).toBe(1);
        expect(storedSessions[0].questionsAnswered).toBe(1);
        expect(storedSessions[0].correctCount).toBe(1);
        expect(storedSessions[0].durationSeconds).toBeGreaterThanOrEqual(1);
    });
});
