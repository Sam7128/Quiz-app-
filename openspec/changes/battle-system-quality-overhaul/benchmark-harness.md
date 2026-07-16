# Performance Benchmark Specification: battle-system-quality-overhaul

> 2026-07-15 plan review revision — Ponytail/YAGNI scope

## 1. Deterministic CI gates

只有跨一般 CI runner 可重現的項目可阻擋合併：

| Gate | Limit | Measurement |
|---|---:|---|
| Initial critical images | ≤ 1.5 MiB transfer bytes | Playwright request log；只計首次 Game Mode 所需 images |
| Character pose | ≤ 250 KiB/file | Node `fs.stat` |
| Skill icon | ≤ 120 KiB/file | Node `fs.stat` |
| Background layer | ≤ 700 KiB/file | Node `fs.stat` |
| Skill video | ≤ 6 MiB/file | Node `fs.stat` |
| Initial video requests | 0 | Playwright request log |
| Presentation completion | 每 active event 至多一次 | Vitest fake clock |
| Media cleanup | timeout/error/unmount 後 listener=0 且 video `src` cleared | Component test |
| Quiz continuity | battle failure/timeout 後答案與下一題仍可操作 | Component + public UI E2E |

不另設 8/10 MiB peak/hard video budget；單檔 6 MiB 是唯一規則。

## 2. Short reproducible scenarios

### A. Cold entry

- 以乾淨 Playwright context 開啟 Game Mode。
- 斷言 initial request set 只有 current background、hero、current monster、HUD/basic effects。
- 斷言沒有 WebM request；arena settled 後才可預載至多一個已確定的 next monster。

### B. Public quiz flow

- 經公開題庫匯入與 UI 完成 10 題，不直接改 battle state。
- 涵蓋一般攻擊、streak 5、Boss supersession/next spawn、錯答與下一題。
- 斷言沒有 page/console error，battle presentation 不阻塞 quiz。

### C. Presenter stress

- 在 component test 對 presenter 連續 enqueue/cancel 30 次。
- 在 active phase 交錯觸發 `ended`、`error`、`timeout`、hidden 與 unmount。
- 斷言每 event 至多完成一次，結束後 timer/listener/media handle 為零，durable state 保持最新。

### D. Media failure

- 用 Playwright route 或 component mock 令 WebM 失敗／逾時。
- 斷言在該 event safety deadline 內顯示 CSS/image fallback。
- 斷言解除 listeners、清空 `src` 並呼叫 `load()`，避免背景下載；domain result不變。

## 3. Advisory measurements

FPS、LCP、heap、實體 M1／中階／低階手機與長時 soak 易受 runner、瀏覽器、字型及背景程序影響，本 change 不把它們設為 CI hard gate。若短版情境或使用者回報顯示回歸，再以獨立工作建立固定硬體、warm-up、sampling interval 與 baseline-relative threshold。

本輪不自動回答 500/1800 題，不做一小時 soak，也不以未定義的斜率外推 `<5 MiB/hour>`。

## 4. Data safety

- 所有瀏覽器情境使用乾淨隔離 context 與測試題庫。
- LocalStorage failure 使用注入的 `MemoryStorage`，不得填滿或改寫真實 `mindspark_*`。
- 禁止 production cheat route、test button、私有 state mutation 或真實使用者 profile。
