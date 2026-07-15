// types/global.d.ts
// 擴充 Navigator 宣告，包含 Web Locks API，以供並發同步鎖使用

interface NavigatorLockRecord {
  name: string;
  mode: 'shared' | 'exclusive';
}

interface NavigatorLockSnapshot {
  pending: NavigatorLockRecord[];
  held: NavigatorLockRecord[];
}

interface NavigatorLocksManager {
  request<T>(
    name: string,
    callback: (lock: NavigatorLockRecord) => Promise<T> | T
  ): Promise<T>;
  request<T>(
    name: string,
    options: { mode?: 'shared' | 'exclusive'; ifAvailable?: boolean; steal?: boolean; signal?: AbortSignal },
    callback: (lock: NavigatorLockRecord | null) => Promise<T> | T
  ): Promise<T>;
  query(): Promise<NavigatorLockSnapshot>;
}

declare global {
  interface Navigator {
    locks?: NavigatorLocksManager;
  }
}

export {};
