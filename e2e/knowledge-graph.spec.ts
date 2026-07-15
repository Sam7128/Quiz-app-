import { test, expect } from '@playwright/test';

test.describe('知識圖模組 V2 E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    // 進入首頁
    await page.goto('/');
    
    // 清空 localStorage 並開啟知識圖實驗室功能門禁
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('mindspark_settings', JSON.stringify({
        restBreakInterval: 20,
        betaFeatures: {
          knowledgeGraph: true
        }
      }));
    });

    // 訪客登入
    const guestBtn = page.locator('button', { hasText: '暫不登入，使用訪客模式' });
    await expect(guestBtn).toBeVisible();
    await guestBtn.click();

    // 點擊導航進入知識圖
    const graphNav = page.locator('nav').getByText('知識圖');
    await expect(graphNav).toBeVisible();
    await graphNav.click();
    
    // 確認進入知識圖工作區
    await expect(page.locator('h2', { hasText: '知識圖工作區' })).toBeVisible();
  });

  // ==================== TIER 1: Smoke Tests ====================

  test('KGV2-UX: 黑點快捷工具列、主題模板、版面模式與圖片節點可用', async ({ page }) => {
    const uncaughtErrors: string[] = [];
    page.on('pageerror', (error) => uncaughtErrors.push(error.message));
    await page.getByRole('button', { name: '新建圖表' }).click();
    await page.getByRole('button', { name: '新增節點' }).click();

    const firstNode = page.locator('.react-flow__node').first();
    const nodeCanvas = page.getByTestId('rf__wrapper');
    await expect(firstNode).toBeVisible();
    await firstNode.locator('.react-flow__handle-bottom').click({ force: true });
    await expect(nodeCanvas.getByRole('button', { name: '編輯節點', exact: true })).toBeVisible();
    await expect(nodeCanvas.getByRole('button', { name: '改變形狀' })).toBeVisible();
    await expect(nodeCanvas.getByRole('button', { name: '新增子節點' })).toBeVisible();
    await expect(nodeCanvas.getByRole('button', { name: '刪除節點' })).toBeVisible();

    await nodeCanvas.getByRole('button', { name: '改變形狀' }).click();
    await nodeCanvas.getByRole('menuitem', { name: '圓形' }).click();
    await expect(firstNode).toHaveClass(/react-flow__node-circle/);

    await nodeCanvas.getByRole('button', { name: '改變形狀' }).click();
    await nodeCanvas.getByRole('menuitem', { name: '六角形' }).click();
    await expect(firstNode).toHaveClass(/react-flow__node-hexagon/);
    await expect(firstNode.locator('svg polygon')).toHaveCount(1);

    await nodeCanvas.getByRole('button', { name: '改變形狀' }).click();
    await nodeCanvas.getByRole('menuitem', { name: '雲形' }).click();
    await expect(firstNode).toHaveClass(/react-flow__node-cloud/);
    await expect(firstNode.locator('svg path')).toHaveCount(1);

    await nodeCanvas.getByRole('button', { name: '新增子節點' }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(2);
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    await page.getByLabel('配色模板').click();
    await page.getByRole('menuitem', { name: '翡翠森林' }).click();
    await page.getByTitle('智慧放射排版').click();
    await expect(page.getByTitle('智慧放射排版')).toHaveClass(/text-cyan/);
    await page.getByTitle('自由拖曳模式').click();
    await expect(page.getByTitle('自由拖曳模式')).toHaveClass(/text-cyan/);

    await page.locator('input[type="file"][accept*="image/png"]').setInputFiles('public/battle/hero.png');
    await expect(page.locator('.react-flow__node-image')).toHaveCount(1);
    await expect(page.locator('.react-flow__node-image')).toContainText('hero');
    await page.waitForTimeout(11_000);
    expect(uncaughtErrors.filter((message) => /AbortError|locks\.ts/i.test(message))).toEqual([]);
  });

  test('KGV2-LAYOUT: 31 節點重疊資料經智慧放射排版後不再互相覆蓋', async ({ page }) => {
    await page.evaluate(() => {
      const now = new Date().toISOString();
      const nodes = Array.from({ length: 31 }, (_, index) => ({
        id: `node-${index}`,
        position: { x: 0, y: 0 },
        type: 'concept',
        data: { title: `概念 ${index}`, color: '#3B82F6', fontSize: 'md' },
      }));
      const edges = Array.from({ length: 30 }, (_, index) => ({
        id: `edge-${index}`,
        source: `node-${Math.floor(index / 3)}`,
        target: `node-${index + 1}`,
        arrowType: 'end',
      }));
      localStorage.setItem('mindspark_graphs', JSON.stringify([{
        id: 'layout-stress-graph',
        schemaVersion: 3,
        name: '佈局壓力測試',
        nodes,
        edges,
        viewState: { readingMode: 'progressive', zoom: 1, panX: 0, panY: 0 },
        notes: {},
        editMode: 'visual',
        backgroundOpacity: 'solid',
        layoutMode: 'free',
        theme: 'classic',
        createdAt: now,
        updatedAt: now,
      }]));
    });
    await page.reload();
    const guestBtn = page.locator('button', { hasText: '暫不登入，使用訪客模式' });
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.locator('nav').getByText('知識圖').click();
    await page.getByText('佈局壓力測試').click();
    await expect(page.locator('.react-flow__node')).toHaveCount(31);

    await page.getByTitle('智慧放射排版').click();
    await page.waitForTimeout(450);
    const rectangles = await page.locator('.react-flow__node').evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }));
    const overlappingPairs = rectangles.flatMap((first, firstIndex) => (
      rectangles.slice(firstIndex + 1).filter((second) => (
        Math.min(first.right, second.right) - Math.max(first.left, second.left) > 2
        && Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 2
      ))
    ));
    expect(overlappingPairs).toHaveLength(0);
  });
  
  test('KGV2-T1-01: 建立預設名稱的知識圖且能新增節點與連線與編輯筆記', async ({ page }) => {
    // 1. 建立預設名稱圖表
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await expect(newGraphBtn).toBeVisible();
    await newGraphBtn.click();

    // 進入編輯器，確認標題為「新圖表」
    await expect(page.locator('h2', { hasText: '新圖表' }).first()).toBeVisible();

    // 2. 視覺模式新增概念節點
    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await expect(addNodeBtn).toBeVisible();
    await addNodeBtn.click();
    await page.waitForTimeout(500); // 等待 canvas 渲染穩定

    // 畫布上應出現預設標題為「新概念」的節點
    const conceptNode1 = page.locator('.react-flow__node').first();
    await expect(conceptNode1).toBeVisible();
    await expect(conceptNode1).toContainText('新概念');

    // 3. 視覺模式新增第二個概念節點
    await addNodeBtn.click();
    await page.waitForTimeout(500);
    const conceptNode2 = page.locator('.react-flow__node').nth(1);
    await expect(conceptNode2).toBeVisible();

    // 4. 連線兩個節點
    // 切換至連線模式
    const connectModeBtn = page.getByLabel('連線模式切換');
    await expect(connectModeBtn).toBeVisible();
    await connectModeBtn.click();

    // 拖曳連線第一個節點到第二個節點
    const sourceHandle = conceptNode1.locator('.react-flow__handle-bottom');
    const targetHandle = conceptNode2.locator('.react-flow__handle-top');
    await sourceHandle.dragTo(targetHandle);

    // 關閉連線模式
    await connectModeBtn.click();

    // 5. 點擊選取第一個節點以編輯筆記
    await conceptNode1.click({ force: true });
    await page.waitForTimeout(200);

    // 點擊工具列的「編輯節點筆記」按鈕
    const editNotesBtn = page.getByLabel('編輯節點筆記');
    await expect(editNotesBtn).toBeVisible();

    // 如果按鈕尚未啟用，嘗試再次點擊節點防禦
    if (await editNotesBtn.isDisabled()) {
      await conceptNode1.click({ force: true });
      await page.waitForTimeout(200);
    }
    
    await expect(editNotesBtn).toBeEnabled();
    await editNotesBtn.click();

    // 在 Tiptap ProseMirror 編輯器中輸入筆記
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();
    await editor.fill('這是第一個新概念的測試筆記內容');

    // 稍微等待以確保 500ms 的筆記 autosave debounce 寫入
    await page.waitForTimeout(800);
  });

  // ==================== TIER 2: Core Features & Boundary Limits ====================

  test('KGV2-T2-01: 圖表命名與重命名邊界測試', async ({ page }) => {
    // 1. 新建圖表
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();
    await expect(page.locator('h2', { hasText: '新圖表' }).first()).toBeVisible();

    // 返回列表
    await page.getByLabel('返回圖表列表').click();
    await expect(page.locator('h2', { hasText: '知識圖工作區' })).toBeVisible();

    // 2. 有效名稱重命名
    const renameBtn = page.getByLabel('重新命名圖表').first();
    await expect(renameBtn).toBeVisible();
    await renameBtn.click();

    const nameInput = page.locator('input[type="text"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('歷史概念地圖');
    await nameInput.press('Enter');

    // 驗證列表重新命名成功
    await expect(page.getByText('歷史概念地圖')).toBeVisible();

    // 3. 超長名稱限制 (超出 50 字元截斷)
    await renameBtn.click();
    await expect(nameInput).toBeVisible();
    const longName = 'A'.repeat(60);
    await nameInput.fill(longName);
    await nameInput.press('Enter');

    // 驗證名稱被截斷為 50 字元
    await expect(page.getByText('A'.repeat(50))).toBeVisible();
    await expect(page.getByText('A'.repeat(60))).not.toBeVisible();
  });

  // V2 功能暫未實現：空白名稱自動回退為「未命名圖表」
  test('KGV2-T2-01-blank: 圖表命名空白回退為未命名圖表 (C1.4)', async ({ page }) => {
    // 1. 新建圖表
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();
    await expect(page.locator('h2', { hasText: '新圖表' }).first()).toBeVisible();

    // 返回列表
    await page.getByLabel('返回圖表列表').click();
    await expect(page.locator('h2', { hasText: '知識圖工作區' })).toBeVisible();

    // 點擊重新命名按鈕
    const renameBtn = page.getByLabel('重新命名圖表').first();
    await expect(renameBtn).toBeVisible();
    await renameBtn.click();

    const nameInput = page.locator('input[type="text"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('   ');
    await nameInput.press('Enter');

    // 驗證名稱回退為「未命名圖表」
    await expect(page.getByText('未命名圖表')).toBeVisible();
  });

  test('KGV2-T2-02: 節點屬性編輯測試與標題長度限制', async ({ page }) => {
    // 新建並進入編輯器
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();

    // 新增節點
    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await addNodeBtn.click();
    await page.waitForTimeout(500); // 等待 canvas 渲染穩定
    
    const conceptNode = page.locator('.react-flow__node').first();
    await conceptNode.click({ force: true });
    await page.waitForTimeout(200);

    // 確認右側「編輯節點」面板顯示
    const editPanelTitle = page.locator('h3', { hasText: '編輯節點' });
    
    // 如果編輯面板沒有顯示，嘗試再次點擊防禦
    if (!(await editPanelTitle.isVisible())) {
      await conceptNode.click({ force: true });
      await page.waitForTimeout(200);
    }
    
    await expect(editPanelTitle).toBeVisible();

    // 1. 修改標題為有效名稱
    const titleInput = page.getByPlaceholder('概念名稱');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('明朝的建立與衰亡');
    // 等待 300ms debounce
    await page.waitForTimeout(400);

    // 驗證畫布上節點標題同步更新
    await expect(conceptNode).toContainText('明朝的建立與衰亡');

    // 2. 切換形狀
    const shapeBtn = page.getByRole('button', { name: '圓角' });
    await expect(shapeBtn).toBeVisible();
    await shapeBtn.click();
    // 驗證形狀 (ConceptNode 中 rounded 形狀會帶有 react-flow__node-rounded class)
    await expect(conceptNode).toHaveClass(/react-flow__node-rounded/);

    // 3. 變更字體大小
    const fontLgBtn = page.getByRole('button', { name: '大', exact: true });
    await expect(fontLgBtn).toBeVisible();
    await fontLgBtn.click();

    // 4. 標題超長限制 (超出 100 字元截斷)
    const longTitle = 'B'.repeat(120);
    await titleInput.fill(longTitle);
    await page.waitForTimeout(400);

    // 驗證 input 中的值長度被限制為 100
    const inputValue = await titleInput.inputValue();
    expect(inputValue.length).toBe(100);
  });

  test('KGV2-T2-03: 便利貼新增、雙擊編輯與超長截斷', async ({ page }) => {
    // 新建並進入編輯器
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();

    // 新增便利貼
    const addStickyBtn = page.getByRole('button', { name: '新增便利貼' });
    await expect(addStickyBtn).toBeVisible();
    await addStickyBtn.click();
    await page.waitForTimeout(500); // 等待 canvas 渲染穩定

    // 畫布上應出現預設為「備忘」的便利貼
    const stickyNode = page.locator('.react-flow__node').first();
    await expect(stickyNode).toBeVisible();
    await expect(stickyNode).toContainText('備忘');

    // 雙擊便利貼進入編輯模式 (使用 force: true 避免雙擊被攔截)
    await stickyNode.dblclick({ force: true });

    // 應出現 textarea
    const stickyTextarea = page.locator('textarea[placeholder="輸入文字..."]');
    await expect(stickyTextarea).toBeVisible();

    // 1. 輸入有效文字並 Enter (儲存)
    await stickyTextarea.fill('記得複習這章節的重點');
    await stickyTextarea.press('Enter');

    // 驗證文字更新且 textarea 消失
    await expect(stickyTextarea).not.toBeVisible();
    await expect(stickyNode).toContainText('記得複習這章節的重點');

    // 2. 超長文字截斷 (超出 500 字元截斷)
    await stickyNode.dblclick({ force: true });
    await expect(stickyTextarea).toBeVisible();
    const longText = 'C'.repeat(600);
    await stickyTextarea.fill(longText);
    await stickyTextarea.press('Enter');

    // 驗證儲存後的文字長度僅 500
    await expect(stickyTextarea).not.toBeVisible();
    const textContent = await stickyNode.textContent();
    expect(textContent?.includes('C'.repeat(500))).toBe(true);
    expect(textContent?.includes('C'.repeat(600))).toBe(false);
  });

  // V2 功能暫未實現：節點與便利貼數量上限限制
  test('KGV2-T2-04: 節點與便利貼數量上限限制測試 (C2.3, C2.4)', async ({ page }) => {
    // 新建並進入編輯器
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();

    const addStickyBtn = page.getByRole('button', { name: '新增便利貼' });
    await expect(addStickyBtn).toBeVisible();

    // 點擊 20 次
    for (let i = 0; i < 20; i++) {
      await addStickyBtn.click();
      await page.waitForTimeout(50);
    }

    // 點擊第 21 次
    await addStickyBtn.click();

    // 斷言顯示 Toast 提示
    await expect(page.getByText('每張圖表最多只能有 20 個便利貼')).toBeVisible();
  });

  // V2 功能暫未實現：連線自環阻斷與連線上限
  test('KGV2-T2-05: 連線自環與上限限制測試 (C4.2, C4.5)', async ({ page }) => {
    // 新建並進入編輯器
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();

    // 新增節點
    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await addNodeBtn.click();
    await page.waitForTimeout(500);

    const conceptNode = page.locator('.react-flow__node').first();
    await expect(conceptNode).toBeVisible();

    // 切換至連線模式
    const connectModeBtn = page.getByLabel('連線模式切換');
    await connectModeBtn.click();

    // 拖曳自環
    const sourceHandle = conceptNode.locator('.react-flow__handle-bottom');
    const targetHandle = conceptNode.locator('.react-flow__handle-top');
    await sourceHandle.dragTo(targetHandle);

    // 關閉連線模式
    await connectModeBtn.click();

    // 斷言沒有連線被建立 (edge 不可見)
    const edge = page.locator('.react-flow__edge');
    await expect(edge).not.toBeVisible();
  });

  // ==================== TIER 3: Advanced Integrations ====================

  test('KGV2-T3-01: 雙模式轉換與結構保留測試', async ({ page }) => {
    // 1. 新建圖表
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();

    // 2. 視覺模式新增節點並自訂樣式
    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await addNodeBtn.click();
    await page.waitForTimeout(500); // 等待 canvas 渲染穩定
    
    const conceptNode = page.locator('.react-flow__node').first();
    await conceptNode.click({ force: true });
    await page.waitForTimeout(200);

    // 切換為「圓角」
    const roundedBtn = page.getByRole('button', { name: '圓角' });
    await roundedBtn.click();

    // 3. 切換至「代碼模式」
    // 在視覺模式下，切換按鈕的 title 是「代碼編輯模式」
    const codeModeBtn = page.getByTitle('代碼編輯模式');
    await expect(codeModeBtn).toBeVisible();
    await codeModeBtn.click();

    // 驗證代碼編輯器可見且含有對應的 Markdown
    const codeEditorTextarea = page.locator('textarea[placeholder*="概念圖"]');
    await expect(codeEditorTextarea).toBeVisible();
    const mdText = await codeEditorTextarea.inputValue();
    expect(mdText).toContain('- 新概念');

    // 4. 代碼模式下修改結構
    const newMarkdown = '# 概念圖\n- 明朝的建立\n  - 朱元璋\n  - 南京建都';
    await codeEditorTextarea.fill(newMarkdown);
    // 等待 500ms 的 markdown parse debounce
    await page.waitForTimeout(800);

    // 5. 切換回「視覺模式」
    // 在代碼模式下，切換按鈕的 title 是「視覺編輯模式']
    const visualModeBtn = page.getByTitle('視覺編輯模式');
    await expect(visualModeBtn).toBeVisible();
    await visualModeBtn.click();

    // 驗證樹狀結構與節點成功生成
    await expect(page.locator('.react-flow__node', { hasText: '明朝的建立' })).toBeVisible();
    await expect(page.locator('.react-flow__node', { hasText: '朱元璋' })).toBeVisible();
    await expect(page.locator('.react-flow__node', { hasText: '南京建都' })).toBeVisible();
  });

  test('KGV2-T3-02: Tiptap 筆記編輯與保存測試', async ({ page }) => {
    // 1. 新建圖表并新增節點
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();
    
    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await addNodeBtn.click();
    await page.waitForTimeout(500); // 等待 canvas 渲染穩定
    
    const conceptNode = page.locator('.react-flow__node').first();
    
    // 2. 選取節點並編輯筆記
    await conceptNode.click({ force: true });
    await page.waitForTimeout(200);
    
    const editNotesBtn = page.getByLabel('編輯節點筆記');
    
    // 如果按鈕尚未啟用，嘗試再次點擊節點防禦
    if (await editNotesBtn.isDisabled()) {
      await conceptNode.click({ force: true });
      await page.waitForTimeout(200);
    }
    
    await expect(editNotesBtn).toBeEnabled();
    await editNotesBtn.click();
    
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();
    await editor.fill('朱元璋於 1368 年建立明朝，定都南京。');
    
    // 等待筆記儲存
    await page.waitForTimeout(800);

    // 3. 關閉筆記面板再重新打開，驗證內容成功保留
    await page.getByLabel('關閉筆記面板').click();
    await expect(editor).not.toBeVisible();
    
    await page.getByLabel('編輯節點筆記').click();
    await expect(editor).toBeVisible();
    const noteText = await editor.innerText();
    expect(noteText).toContain('朱元璋於 1368 年建立明朝');
  });

  // V2 功能暫未實現：更名時筆記鍵值同步級聯變更
  test('KGV2-T3-02-cascade: 節點更名時筆記鍵值級聯變更測試 (C8.2)', async ({ page }) => {
    // 1. 新建圖表並新增節點
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();

    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await addNodeBtn.click();
    await page.waitForTimeout(500);

    const conceptNode = page.locator('.react-flow__node').first();
    await conceptNode.click({ force: true });
    await page.waitForTimeout(200);

    // 2. 編輯 Tiptap 筆記
    const editNotesBtn = page.getByLabel('編輯節點筆記');
    if (await editNotesBtn.isDisabled()) {
      await conceptNode.click({ force: true });
      await page.waitForTimeout(200);
    }
    await expect(editNotesBtn).toBeEnabled();
    await editNotesBtn.click();

    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();
    await editor.fill('明朝筆記內容');
    await page.waitForTimeout(800);

    // 3. 關閉筆記面板，選取該節點，並在屬性面板將其更名為「明朝」
    await page.getByLabel('關閉筆記面板').click();
    await conceptNode.click({ force: true });
    await page.waitForTimeout(200);

    const titleInput = page.getByPlaceholder('概念名稱');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('明朝');
    await page.waitForTimeout(500);

    // 4. 再次點擊編輯筆記，驗證在新標題「明朝」下筆記內容依然是「明朝筆記內容」
    await conceptNode.click({ force: true });
    await page.waitForTimeout(200);
    
    const editNotesBtn2 = page.getByLabel('編輯節點筆記');
    await editNotesBtn2.click();
    
    await expect(editor).toBeVisible();
    const noteText = await editor.innerText();
    expect(noteText).toContain('明朝筆記內容');
  });

  // V2 功能暫未實現：雙模式 Ancestor Path 還原與 Levenshtein 模糊匹配
  test('KGV2-T3-03: 雙模式 Ancestor Path 還原與 Levenshtein 模糊匹配測試 (C7.3, C7.4)', async ({ page }) => {
    // 1. 新建圖表並新增概念節點
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();

    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await addNodeBtn.click();
    await page.waitForTimeout(500);

    const conceptNode = page.locator('.react-flow__node').first();
    await conceptNode.click({ force: true });
    await page.waitForTimeout(200);

    // 自訂樣式：圓角，紅色顏色
    const roundedBtn = page.getByRole('button', { name: '圓角' });
    await roundedBtn.click();

    const redColorBtn = page.getByLabel('選擇顏色 #EF4444');
    await redColorBtn.click();
    
    await expect(conceptNode).toHaveClass(/react-flow__node-rounded/);
    
    // 2. 切換至代碼模式
    const codeModeBtn = page.getByTitle('代碼編輯模式');
    await codeModeBtn.click();

    const codeEditorTextarea = page.locator('textarea[placeholder*="概念圖"]');
    await expect(codeEditorTextarea).toBeVisible();
    
    await codeEditorTextarea.fill('# 概念圖\n- 新概念2');
    await page.waitForTimeout(800);

    // 切換回視覺模式
    const visualModeBtn = page.getByTitle('視覺編輯模式');
    await visualModeBtn.click();

    const conceptNodeUpdated = page.locator('.react-flow__node').first();
    await expect(conceptNodeUpdated).toContainText('新概念2');
    await expect(conceptNodeUpdated).toHaveClass(/react-flow__node-rounded/);

    // 3. 再次切換至代碼模式，修改為完全不同的名稱（Levenshtein 編輯距離 > 2）
    await codeModeBtn.click();
    await expect(codeEditorTextarea).toBeVisible();
    await codeEditorTextarea.fill('# 概念圖\n- 明朝的建立與大範圍制度調整');
    await page.waitForTimeout(800);

    // 切換回視覺模式
    await visualModeBtn.click();

    const conceptNodeReset = page.locator('.react-flow__node').first();
    await expect(conceptNodeReset).toContainText('明朝的建立與大範圍制度調整');
    await expect(conceptNodeReset).not.toHaveClass(/react-flow__node-rounded/);
  });

  // V2 功能暫未實現：富文本筆記圖片消毒與過濾
  test('KGV2-T3-04: Tiptap 筆記圖片貼入過濾消毒測試 (C8.3)', async ({ page }) => {
    // 1. 新建圖表並新增節點
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();

    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await addNodeBtn.click();
    await page.waitForTimeout(500);

    const conceptNode = page.locator('.react-flow__node').first();
    await conceptNode.click({ force: true });
    await page.waitForTimeout(200);

    // 2. 在屬性編輯面板中，尋找「圖片網址」欄位並輸入 `javascript:alert(1)`
    const imageUrlInput = page.getByPlaceholder('https://example.com/image.png');
    await expect(imageUrlInput).toBeVisible();
    await imageUrlInput.fill('javascript:alert(1)');
    await page.waitForTimeout(2500);

    // 3. 斷言顯示警告 Toast
    await expect(page.getByText('圖片網址必須以 http:// 或 https:// 開頭')).toBeVisible();

    // 4. 驗證節點中沒有渲染不合法 URL 的 img 元素
    const imgElement = conceptNode.locator('img');
    await expect(imgElement).not.toBeVisible();
  });

  // 逐步探索模式回歸測試
  test('KGV2-T3-05: 逐步探索模式與展開狀態重置測試 (C5)', async ({ page }) => {
    // 1. 新建圖表並新增節點
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();

    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await addNodeBtn.click();
    await page.waitForTimeout(500);

    const conceptNode = page.locator('.react-flow__node').first();
    await conceptNode.click({ force: true });
    await page.waitForTimeout(200);

    // 2. 設置定義 (definition) 與詳情 (details)
    const definitionInput = page.getByPlaceholder('概念的定義');
    await expect(definitionInput).toBeVisible();
    await definitionInput.fill('這是概念的定義');

    const detailsInput = page.getByPlaceholder('概念的詳細描述');
    await expect(detailsInput).toBeVisible();
    await detailsInput.fill('這是概念的詳細描述內容');
    await page.waitForTimeout(800);

    // 3. 斷言預設為「逐步探索」模式 (L0)，只顯示 Title，不顯示定義與詳情
    await expect(conceptNode).toContainText('新概念');
    await expect(conceptNode).not.toContainText('這是概念的定義');
    await expect(conceptNode).not.toContainText('這是概念的詳細描述內容');

    // 4. 點擊節點（展開 L1：顯示定義）
    await conceptNode.click({ force: true });
    await page.waitForTimeout(300);

    await expect(conceptNode).toContainText('這是概念的定義');
    await expect(conceptNode).not.toContainText('這是概念的詳細描述內容');

    // 5. 點擊「逐步探索」按鈕將其切換為「全展開」模式，斷言所有內容皆可見
    const readingModeBtn = page.getByRole('button', { name: '逐步探索' });
    await expect(readingModeBtn).toBeVisible();
    await readingModeBtn.click();
    await page.waitForTimeout(300);

    await expect(conceptNode).toContainText('這是概念的定義');
    await expect(conceptNode).toContainText('這是概念的詳細描述內容');

    // 6. 點擊「全展開」按鈕將其切換回「逐步探索」模式，斷言重置為 L0（只顯示 Title）
    const expandAllBtn = page.getByRole('button', { name: '全展開' });
    await expect(expandAllBtn).toBeVisible();
    await expandAllBtn.click();
    await page.waitForTimeout(300);

    await expect(conceptNode).toContainText('新概念');
    await expect(conceptNode).not.toContainText('這是概念的定義');
  });

  test('KGV2-T3-06: 逐步探索按分支逐層顯示子節點', async ({ page }) => {
    await page.evaluate(() => {
      const now = new Date().toISOString();
      const nodes = [
        { id: 'branch-main', position: { x: 0, y: 0 }, type: 'concept', data: { title: '主節點', color: '#3B82F6', fontSize: 'md' } },
        { id: 'branch-second-a', position: { x: -220, y: 220 }, type: 'concept', data: { title: '二級 A', color: '#10B981', fontSize: 'md' } },
        { id: 'branch-second-b', position: { x: 220, y: 220 }, type: 'concept', data: { title: '二級 B', color: '#F59E0B', fontSize: 'md' } },
        { id: 'branch-third-a', position: { x: -220, y: 440 }, type: 'concept', data: { title: '三級 A', color: '#EF4444', fontSize: 'md' } },
        { id: 'branch-third-b', position: { x: 220, y: 440 }, type: 'concept', data: { title: '三級 B', color: '#8B5CF6', fontSize: 'md' } },
      ];
      const edges = [
        { id: 'branch-edge-main-a', source: 'branch-main', target: 'branch-second-a', arrowType: 'arrow' },
        { id: 'branch-edge-main-b', source: 'branch-main', target: 'branch-second-b', arrowType: 'arrow' },
        { id: 'branch-edge-a-third', source: 'branch-second-a', target: 'branch-third-a', arrowType: 'arrow' },
        { id: 'branch-edge-b-third', source: 'branch-second-b', target: 'branch-third-b', arrowType: 'arrow' },
      ];
      localStorage.setItem('mindspark_graphs', JSON.stringify([{
        id: 'progressive-branch-graph',
        schemaVersion: 3,
        name: '逐步探索分支測試',
        nodes,
        edges,
        viewState: { readingMode: 'progressive', zoom: 1, panX: 0, panY: 0 },
        notes: {},
        editMode: 'visual',
        backgroundOpacity: 'solid',
        layoutMode: 'free',
        theme: 'classic',
        createdAt: now,
        updatedAt: now,
      }]));
    });
    await page.reload();
    const guestBtn = page.locator('button', { hasText: '暫不登入，使用訪客模式' });
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.locator('nav').getByText('知識圖').click();
    await page.getByText('逐步探索分支測試').click();

    const flowNodes = page.locator('.react-flow__node');
    const secondA = flowNodes.filter({ hasText: '二級 A' });
    const thirdA = flowNodes.filter({ hasText: '三級 A' });
    const thirdB = flowNodes.filter({ hasText: '三級 B' });
    await expect(flowNodes).toHaveCount(3);
    await expect(thirdA).toHaveCount(0);
    await expect(thirdB).toHaveCount(0);

    await secondA.click({ force: true });
    await expect(flowNodes).toHaveCount(4);
    await expect(thirdA).toBeVisible();
    await expect(thirdB).toHaveCount(0);

    await page.getByRole('button', { name: '逐步探索' }).click();
    await expect(flowNodes).toHaveCount(5);
    await page.getByRole('button', { name: '全展開' }).click();
    await expect(flowNodes).toHaveCount(3);
    await expect(thirdA).toHaveCount(0);
  });

  // ==================== TIER 4: Edge Cases & Network Resilience ====================

  // V2 功能暫未實現：拖曳至空白畫布彈出 DropNodeMenu
  test('KGV2-T4-01: 拖曳連線至空白處彈出 DropNodeMenu 測試 (C6.1)', async ({ page }) => {
    // 1. 新建圖表並新增節點
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();

    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await addNodeBtn.click();
    await page.waitForTimeout(500);

    const conceptNode = page.locator('.react-flow__node').first();
    await expect(conceptNode).toBeVisible();

    // 2. 拖曳它的 bottom handle 到畫布空白處 (在連線模式關閉狀態下，手動模擬滑鼠以保證穩定觸發 drag 連線)
    const sourceHandle = conceptNode.locator('.react-flow__handle-bottom');
    await sourceHandle.hover();
    await page.mouse.down();
    
    const handleBounding = await sourceHandle.boundingBox();
    expect(handleBounding).not.toBeNull();
    if (handleBounding) {
      await page.mouse.move(handleBounding.x + handleBounding.width / 2 + 250, handleBounding.y + handleBounding.height / 2 + 250);
    }
    await page.mouse.up();
    await page.waitForTimeout(300);

    // 3. 斷言 DropNodeMenu 選單顯示
    const dropMenu = page.getByText('新增節點並連線').first();
    await expect(dropMenu).toBeVisible();

    // 4. 點擊「概念 (新概念)」
    const conceptBtn = page.locator('button', { hasText: '概念 (新概念)' });
    await conceptBtn.click();
    await page.waitForTimeout(300);

    // 5. 驗證新節點與邊已建立
    const nodes = page.locator('.react-flow__node');
    await expect(nodes).toHaveCount(2);

    const edges = page.locator('.react-flow__edge');
    await expect(edges).toHaveCount(1);
  });

  // V2 功能暫未實現：Supabase 離線與自動重試
  test('KGV2-T4-02: Supabase 雲端同步與網路離線 LWW 自動重試測試 (C9.1)', async ({ page }) => {
    // 1. 模擬登入
    await page.evaluate(() => {
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
          user_metadata: { full_name: 'Mock User' }
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }));
    });

    // 攔截 User API
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-user-id',
          email: 'test@example.com',
          role: 'authenticated',
          user_metadata: { full_name: 'Mock User' }
        })
      });
    });

    // 攔截題庫與問題 API 防止 reload 後連線超時崩潰
    await page.route('**/rest/v1/banks*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/rest/v1/questions*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // 攔截 Supabase GET 返回空陣列，POST 失敗 (500)
    let shouldFail = true;
    await page.route('**/rest/v1/knowledge_graphs*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        if (shouldFail) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Database error simulated' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
      }
    });

    // 重新整理以套用登入狀態並加載工作區
    await page.reload();
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    const graphNav = page.locator('nav').getByText('知識圖');
    await expect(graphNav).toBeVisible();
    await graphNav.click();
    await expect(page.locator('h2', { hasText: '知識圖工作區' })).toBeVisible();

    // 2. 新增並進入圖表
    const newGraphBtn = page.getByRole('button', { name: '新建圖表' });
    await newGraphBtn.click();
    await expect(page.locator('h2', { hasText: '新圖表' }).first()).toBeVisible();

    const addNodeBtn = page.getByRole('button', { name: '新增節點' });
    await addNodeBtn.click();
    await page.waitForTimeout(2500);

    // 驗證圖表 id 被標記為 dirty
    const dirtyGraphs = await page.evaluate(() => {
      return localStorage.getItem('mindspark_dirty_graphs');
    });
    expect(JSON.parse(dirtyGraphs || '[]').length).toBeGreaterThan(0);

    // 3. 恢復網路 (online)，設定 shouldFail = false
    shouldFail = false;
    
    // Dispatch online event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
    await page.waitForTimeout(500);

    // 4. 驗證 dirty graphs 已被清空
    const dirtyGraphsAfter = await page.evaluate(() => {
      return localStorage.getItem('mindspark_dirty_graphs');
    });
    expect(dirtyGraphsAfter).toBe('[]');
  });

  // V2 功能暫未實現：Supabase 同步衝突與 ConfirmDialog 另存
  test('KGV2-T4-03: Supabase 同步衝突與 ConfirmDialog 另存為新圖表測試 (C9.2)', async ({ page }) => {
    const graphId = 'test-graph-uuid-conflict';
    const localUpdatedAt = '2026-07-12T12:00:00.000Z';
    const cloudUpdatedAt = '2026-07-12T13:00:00.000Z';

    // 1. 設置 localStorage，模擬已有該圖表，且被標記為 dirty
    await page.evaluate(({ graphId, localUpdatedAt }) => {
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
          user_metadata: { full_name: 'Mock User' }
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }));

      const localGraphs = [{
        id: graphId,
        schemaVersion: 2,
        name: '朱元璋與明朝',
        nodes: [],
        edges: [],
        viewState: { readingMode: 'progressive', zoom: 1, panX: 0, panY: 0 },
        notes: {},
        editMode: 'visual',
        createdAt: '2026-07-12T11:00:00.000Z',
        updatedAt: localUpdatedAt
      }];
      localStorage.setItem('mindspark_graphs', JSON.stringify(localGraphs));
      localStorage.setItem('mindspark_dirty_graphs', JSON.stringify([graphId]));
    }, { graphId, localUpdatedAt });

    // 攔截 User API
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-user-id',
          email: 'test@example.com',
          role: 'authenticated',
          user_metadata: { full_name: 'Mock User' }
        })
      });
    });

    // 攔截題庫與問題 API 防止 reload 後連線超時崩潰
    await page.route('**/rest/v1/banks*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/rest/v1/questions*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // 攔截 GET /rest/v1/knowledge_graphs 返回衝突的雲端圖表
    await page.route('**/rest/v1/knowledge_graphs*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: graphId,
            user_id: 'mock-user-id',
            graph_data: {
              id: graphId,
              schemaVersion: 2,
              name: '朱元璋與明朝',
              nodes: [],
              edges: [],
              viewState: { readingMode: 'progressive', zoom: 1, panX: 0, panY: 0 },
              notes: {},
              editMode: 'visual',
              createdAt: '2026-07-12T11:00:00.000Z',
              updatedAt: cloudUpdatedAt
            },
            created_at: '2026-07-12T11:00:00.000Z',
            updated_at: cloudUpdatedAt
          }])
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    // 2. 重新整理以套用登入狀態並載入工作區
    await page.reload();
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    const graphNav = page.locator('nav').getByText('知識圖');
    await expect(graphNav).toBeVisible();
    await graphNav.click();
    await expect(page.locator('h2', { hasText: '知識圖工作區' })).toBeVisible();

    // 3. 斷言第一個 ConfirmDialog 彈出（同步衝突）
    await expect(page.locator('h3', { hasText: '同步衝突' })).toBeVisible();
    await page.locator('button', { hasText: '其他選項' }).click();

    // 4. 斷言第二個 ConfirmDialog 彈出（衝突處理選項）
    await expect(page.locator('h3', { hasText: '衝突處理選項' })).toBeVisible();
    await page.locator('button', { hasText: '另存為衝突副本' }).click();

    // 5. 驗證列表中出現「朱元璋與明朝 (衝突副本)」
    await expect(page.getByText('朱元璋與明朝 (衝突副本)')).toBeVisible();
  });
});
