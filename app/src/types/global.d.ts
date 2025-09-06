// グローバル型定義
declare global {
  interface Window {
    gc?: () => void; // ガベージコレクション（Chrome DevTools）
  }
}

export {};
