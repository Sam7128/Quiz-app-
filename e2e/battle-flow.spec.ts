import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

interface SeedQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  type: 'single';
  explanation: string;
}

interface BattleSnapshotProbe {
  isActive: boolean;
  streak: number;
  heroHp: number;
  questionsAnswered: number;
  currentMonsterId: string | null;
  nextEncounterKind: string | null;
}

const makeQuestions = (count: number): SeedQuestion[] => Array.from(
  { length: count },
  (_, index) => ({
    id: `battle-flow-q-${index + 1}`,
    question: `Battle Q${index + 1}`,
    options: ['A', 'B'],
    answer: 'A',
    type: 'single',
    explanation: 'Battle flow explanation',
  }),
);

const seedQuiz = async (page: Page, count: number): Promise<void> => {
  const questions = makeQuestions(count);
  await page.addInitScript((seed: { questions: SeedQuestion[] }) => {
    const bankId = 'battle-flow-bank';
    const now = Date.now();
    localStorage.setItem('mindspark_banks_meta', JSON.stringify([{
      id: bankId,
      name: 'Battle Flow Bank',
      createdAt: now,
      questionCount: seed.questions.length,
    }]));
    localStorage.setItem(`mindspark_bank_${bankId}`, JSON.stringify(seed.questions));
    localStorage.setItem('mindspark_current_bank_id', bankId);
    localStorage.setItem('mindspark_game_mode', 'true');
    localStorage.setItem('mindspark_bgm_enabled', 'false');
    localStorage.setItem('mindspark_sfx_enabled', 'false');
    localStorage.setItem('mindspark_settings', JSON.stringify({ restBreakInterval: 0 }));
    localStorage.removeItem('mindspark_battle_state');
    localStorage.removeItem('mindspark_battle_state_v2');
    localStorage.removeItem('mindspark_battle_state_v2_signature');
  }, { questions });
};

const enterQuiz = async (page: Page, totalQuestions: number): Promise<void> => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: '暫不登入，使用訪客模式' }).click();
  await expect(page.getByRole('heading', { name: '歡迎回來' })).toBeVisible();
  await page.getByRole('button', { name: '開始測驗' }).click();
  await expect(page.getByText(`題目 1 / ${totalQuestions}`)).toBeVisible();
  await expect(page.locator('[data-battle-phase]')).toBeVisible();
};

const answerCurrentQuestion = async (
  page: Page,
  answer: string,
  doubleClick = false,
): Promise<void> => {
  const option = page.locator('.space-y-1 button').filter({ hasText: answer }).first();
  await expect(option).toBeVisible();
  if (doubleClick) {
    await option.dblclick();
  } else {
    await option.click();
  }
  await expect(page.getByRole('button', { name: /下一題|查看結果/ })).toBeVisible();
};

const readBattleSnapshot = (page: Page): Promise<BattleSnapshotProbe | null> => page.evaluate(() => {
  const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
  );

  const raw = localStorage.getItem('mindspark_battle_state_v2');
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.snapshot)) return null;
    const snapshot = parsed.snapshot;
    const currentMonsterId = snapshot.currentMonsterId;
    const nextEncounterKind = isRecord(snapshot.encounterSchedule)
      ? snapshot.encounterSchedule.nextEncounterKind
      : null;
    if (
      typeof snapshot.isActive !== 'boolean'
      || typeof snapshot.streak !== 'number'
      || typeof snapshot.heroHp !== 'number'
      || typeof snapshot.questionsAnswered !== 'number'
      || (currentMonsterId !== null && typeof currentMonsterId !== 'string')
      || (nextEncounterKind !== null && typeof nextEncounterKind !== 'string')
    ) {
      return null;
    }

    return {
      isActive: snapshot.isActive,
      streak: snapshot.streak,
      heroHp: snapshot.heroHp,
      questionsAnswered: snapshot.questionsAnswered,
      currentMonsterId,
      nextEncounterKind,
    };
  } catch {
    return null;
  }
});

const answerAndAdvance = async (
  page: Page,
  questionNumber: number,
  totalQuestions: number,
  answer: string,
  doubleClick = false,
): Promise<void> => {
  await expect(page.getByText(`題目 ${questionNumber} / ${totalQuestions}`)).toBeVisible();
  await answerCurrentQuestion(page, answer, doubleClick);
  if (questionNumber < totalQuestions) {
    await page.getByRole('button', { name: '下一題' }).click();
  }
};

test.describe('Battle flow', () => {
  test('冷啟動只請求目前場景素材，不預取 WebM 或技能資產', async ({ page }) => {
    const battleImageRequests = new Set<string>();
    const responseBytes = new Map<string, number>();
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith('/battle/')) battleImageRequests.add(path);
    });
    page.on('response', response => {
      const path = new URL(response.url()).pathname;
      if (!path.startsWith('/battle/') || !path.endsWith('.webp')) return;
      void response.body()
        .then(body => responseBytes.set(path, body.byteLength))
        .catch(() => undefined);
    });

    await seedQuiz(page, 1);
    await enterQuiz(page, 1);
    await expect.poll(
      () => [...battleImageRequests].filter(path => path.endsWith('.webp')).length,
      { timeout: 10000 },
    ).toBeGreaterThanOrEqual(3);
    await expect.poll(() => responseBytes.size, { timeout: 10000 }).toBeGreaterThanOrEqual(3);

    const paths = [...battleImageRequests];
    const initialImageBytes = [...responseBytes.values()].reduce((total, bytes) => total + bytes, 0);
    console.log(`Battle initial image bytes: ${initialImageBytes}`);
    expect(initialImageBytes).toBeLessThanOrEqual(1.5 * 1024 * 1024);
    expect(paths.some(path => path.endsWith('.webm'))).toBe(false);
    expect(paths.some(path => path.startsWith('/battle/skills/'))).toBe(false);
    expect(paths.filter(path => path.startsWith('/battle/monsters/'))).toHaveLength(1);
    expect(paths).toContain('/battle/hero.webp');
    expect(paths).toContain('/battle/dungeon_bg.webp');
  });

  test('pending encounter settles before preloading one elite sprite', async ({ page }) => {
    test.setTimeout(120000);
    const monsterRequests = new Set<string>();
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith('/battle/monsters/')) monsterRequests.add(path);
    });

    await seedQuiz(page, 6);
    await enterQuiz(page, 6);
    for (let question = 1; question <= 5; question += 1) {
      await answerAndAdvance(page, question, 6, 'A');
    }

    await expect.poll(
      async () => (await readBattleSnapshot(page))?.nextEncounterKind ?? null,
      { timeout: 10000 },
    ).toBe('elite');
    await expect.poll(
      () => [...monsterRequests].some(path => path.endsWith('/skeleton_warrior.webp') || path.endsWith('/orc_berserker.webp')),
      { timeout: 10000 },
    ).toBe(true);
  });

  test('公開流程涵蓋 streak、錯答、Boss spawn、素材 fallback 與雙擊鎖', async ({ page }) => {
    test.setTimeout(120000);
    await seedQuiz(page, 25);
    await page.route('**/battle/monsters/*.webp', route => route.abort());
    await enterQuiz(page, 25);

    await expect.poll(
      async () => page.locator('img').evaluateAll((images) => images.some(
        (image) => image instanceof HTMLImageElement
          && image.alt !== '勇者'
          && image.getAttribute('src')?.endsWith('/battle/hero.webp'),
      )),
      { timeout: 10000 },
    ).toBe(true);

    await answerAndAdvance(page, 1, 25, 'A', true);
    await expect.poll(
      async () => (await readBattleSnapshot(page))?.questionsAnswered ?? 0,
      { timeout: 10000 },
    ).toBe(1);

    for (let questionNumber = 2; questionNumber <= 25; questionNumber += 1) {
      const answer = questionNumber === 6 ? 'B' : 'A';
      await answerAndAdvance(page, questionNumber, 25, answer);

      if (questionNumber === 5) {
        await expect.poll(
          async () => (await readBattleSnapshot(page))?.streak ?? -1,
          { timeout: 15000 },
        ).toBe(5);
      }

      if (questionNumber === 6) {
        await expect.poll(
          async () => (await readBattleSnapshot(page))?.streak ?? -1,
          { timeout: 15000 },
        ).toBe(0);
        await expect.poll(
          async () => (await readBattleSnapshot(page))?.heroHp ?? 100,
          { timeout: 15000 },
        ).toBeLessThan(100);
      }

      if (questionNumber === 10) {
        await expect.poll(
          async () => (await readBattleSnapshot(page))?.nextEncounterKind ?? null,
          { timeout: 15000 },
        ).toBe('boss');
      }
    }

    await expect(
      page.locator('img[alt="炎龍・伊格尼斯"], img[alt="骷髏巫師・涅克羅斯"]'),
    ).toBeVisible({ timeout: 30000 });
  });

  test('Game Mode OFF 清演出但保留 V2，重新開啟可建立新戰鬥', async ({ page }) => {
    test.setTimeout(120000);
    await seedQuiz(page, 2);
    await enterQuiz(page, 2);
    await answerAndAdvance(page, 1, 2, 'A');
    await expect.poll(
      async () => (await readBattleSnapshot(page))?.isActive ?? false,
      { timeout: 10000 },
    ).toBe(true);

    await page.getByRole('button', { name: '開啟設定' }).click();
    await page.getByRole('button', { name: '關閉遊戲模式' }).click();
    await expect(page.locator('[data-battle-phase]')).toHaveCount(0);
    await expect.poll(
      async () => (await readBattleSnapshot(page))?.isActive ?? true,
      { timeout: 15000 },
    ).toBe(false);

    await page.getByRole('button', { name: '開啟遊戲模式' }).click();
    await expect(page.getByRole('button', { name: '關閉遊戲模式' })).toBeVisible();
    await page.getByRole('button', { name: '關閉設定' }).click();
    await expect(page.locator('[data-battle-phase]')).toBeVisible();
    await expect.poll(
      async () => (await readBattleSnapshot(page))?.isActive ?? false,
      { timeout: 15000 },
    ).toBe(true);
  });

  test('公開分階段流程換 chunk 只重置一次 battle progress', async ({ page }) => {
    test.setTimeout(120000);
    await seedQuiz(page, 11);
    await page.goto('/');
    await page.getByRole('button', { name: '暫不登入，使用訪客模式' }).click();
    await expect(page.getByRole('heading', { name: '歡迎回來' })).toBeVisible();

    await page.getByRole('button', { name: '分階段練習' }).click();
    await expect(page.getByText('新建分階段練習')).toBeVisible();
    await page.locator('select').nth(1).selectOption('10');
    await page.getByRole('button', { name: '開始分階段練習' }).click();

    await expect(page.getByText('題目 1 / 10')).toBeVisible();
    await expect(page.getByText('📦 階段 1 / 2')).toBeVisible();
    await expect(page.locator('[data-battle-phase]')).toBeVisible();

    for (let questionNumber = 1; questionNumber <= 10; questionNumber += 1) {
      await answerAndAdvance(page, questionNumber, 10, 'A');
    }

    await page.getByRole('button', { name: '查看結果' }).click();
    await expect(page.getByText('第 1 階段完成')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: '繼續下一階段' }).click();
    await expect(page.getByText('📦 階段 2 / 2')).toBeVisible();
    await expect(page.getByText('題目 1 / 1')).toBeVisible();
    await expect.poll(
      async () => (await readBattleSnapshot(page))?.questionsAnswered ?? -1,
      { timeout: 15000 },
    ).toBe(0);
  });
});
