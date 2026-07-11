// types/global.d.ts
// 擴充 Navigator 宣告，包含 Web Locks API，以供並發同步鎖使用

interface NavigatorLocksManager {
  request(
    name: string,
    callback: (lock: any) => Promise<any>
  ): Promise<any>;
  request(
    name: string,
    options: { mode?: 'shared' | 'exclusive'; ifAvailable?: boolean; steal?: boolean; signal?: AbortSignal },
    callback: (lock: any | null) => Promise<any>
  ): Promise<any>;
  query(): Promise<{ pending: any[]; held: any[] }>;
}

declare global {
  interface Navigator {
    locks?: NavigatorLocksManager;
  }
}

export {};
