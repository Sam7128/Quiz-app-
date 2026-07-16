# Hooks 模組

## 領域 Hooks 清單

| Hook | 檔案 | 職責 | 持久化 Key |
|------|------|------|-----------|
| useBattleSystem | `useBattleSystem.ts` | 純 battle engine commit + V2 persistence + presentation adapter | `mindspark_battle_state_v2`（讀 V1、只寫 V2） |
| useChunkedPractice | `useChunkedPractice.ts` | 分階段練習 Session 建立/恢復/同步/draft | `mindspark_practice_sessions`, `mindspark_chunk_draft:*` |
| useAchievements | `useAchievements.ts` | 成就解鎖追蹤 | `mindspark_achievements` |
| useChallenges | `useChallenges.ts` | 挑戰排行榜 | Supabase |
| useStreak | `useStreak.ts` | 連續正確計數 | `mindspark_streak_data` |
| useStudyStats | `useStudyStats.ts` | 學習統計（總題數/正確率/時間） | `mindspark_study_sessions` |
| useSoundEffects | `useSoundEffects.ts` | Howler.js 音效管理（Lazy init） | — |
| useKeyboardShortcuts | `useKeyboardShortcuts.ts` | 鍵盤快捷鍵（Enter/Space/Esc/1-4） | — |
| useQuizEngine | `useQuizEngine.ts` | 測驗引擎核心邏輯 | `mindspark_quiz_session` |
| useAppDataLoader | `useAppDataLoader.ts` | 初始資料載入 + 題庫池建構 | — |

## 戰鬥系統關鍵邏輯

- **邊界**: `services/battle/battleEngine.ts` 保持純函式；Hook 只提交最新 durable state、enqueue presentation、寫 V2。
- **演出生命週期**: `useBattlePresentation.ts` 單一 active event、ID gate；hidden/unmount/game-off/chunk-change 取消並 settle，不恢復舊動畫。
- **怪物輪替**: Normal → Elite → Boss，唯一 pending encounter；q5 非 q10 排 Elite，q10 倍數排 Boss 並覆蓋未生成 Elite。
- **技能觸發**: 只在 milestone 等級觸發：5, 10, 20, 30, 40, 50（不是每 5 題）
- **傷害計算**: 基礎傷害 + 技能乘數 + 15% 暴擊率（1.5-3.0x 乘數）
- **護盾機制**: Normal ≤70%、Elite ≤50%、Boss ≤40% 單次傷害上限

## 測驗引擎三模式

1. **Random**: 所選題庫全部題目隨機排列
2. **Mistake**: 只從 `mistakeLog` 抽取錯題
3. **Retry Session**: 從 `mindspark_quiz_session` 恢復未完成測驗
4. **Chunked**: 從 `mindspark_practice_sessions` + chunk draft 接力恢復

## 開發慣例

1. **函式式更新**: 一律使用 `setState(prev => ({ ...prev, field: value }))`
2. **隔離原則**: 每個 Hook 管理一個獨立功能，不跨域耦合
3. **新快捷鍵**: 統一加入 `useKeyboardShortcuts`，不要散落在各元件
