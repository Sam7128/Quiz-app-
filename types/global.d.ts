// types/global.d.ts
// 擴充 Window 宣告，包含同步鎖，用以防範重複同步/競態條件
declare global {
  interface Window {
    __MINDSPARK_SYNC_LOCK__?: boolean;
  }
}

export {};
