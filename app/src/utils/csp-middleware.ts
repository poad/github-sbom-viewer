import { generateNonce, generateCSPString } from '../config/csp';

// CSPミドルウェア
export class CSPMiddleware {
  private static instance: CSPMiddleware;
  private currentNonce: string | null = null;
  private scriptHashes: string[] = [];
  private styleHashes: string[] = [];

  private constructor() {
    // シングルトンパターンのためのプライベートコンストラクタ
  }

  static getInstance(): CSPMiddleware {
    if (!CSPMiddleware.instance) {
      CSPMiddleware.instance = new CSPMiddleware();
    }
    return CSPMiddleware.instance;
  }

  // 新しいnonceを生成
  generateNewNonce(): string {
    this.currentNonce = generateNonce();
    this.updateCSP();
    return this.currentNonce;
  }

  // 現在のnonceを取得
  getCurrentNonce(): string | null {
    return this.currentNonce;
  }

  // スクリプトハッシュを追加
  addScriptHash(hash: string): void {
    if (!this.scriptHashes.includes(hash)) {
      this.scriptHashes.push(hash);
      this.updateCSP();
    }
  }

  // スタイルハッシュを追加
  addStyleHash(hash: string): void {
    if (!this.styleHashes.includes(hash)) {
      this.styleHashes.push(hash);
      this.updateCSP();
    }
  }

  // CSPを更新
  private updateCSP(): void {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cspString = generateCSPString({
      isDevelopment,
      nonce: this.currentNonce || undefined,
      scriptHashes: this.scriptHashes,
      styleHashes: this.styleHashes,
    });

    // メタタグを更新
    this.updateCSPMetaTag(cspString);
  }

  // CSPメタタグを更新
  private updateCSPMetaTag(cspString: string): void {
    if (typeof document === 'undefined') return;

    let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement;
    
    if (!cspMeta) {
      cspMeta = document.createElement('meta');
      cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
      document.head.appendChild(cspMeta);
    }
    
    cspMeta.setAttribute('content', cspString);
  }

  // 初期化
  initialize(): void {
    // ページロード時にnonceを生成
    this.generateNewNonce();
    
    // 既存のインラインスクリプトにnonceを追加
    this.addNonceToExistingScripts();
  }

  // 既存のスクリプトにnonceを追加
  private addNonceToExistingScripts(): void {
    if (typeof document === 'undefined' || !this.currentNonce) return;

    const inlineScripts = document.querySelectorAll('script:not([src])');
    inlineScripts.forEach(script => {
      if (!script.hasAttribute('nonce') && this.currentNonce) {
        script.setAttribute('nonce', this.currentNonce);
      }
    });

    const inlineStyles = document.querySelectorAll('style');
    inlineStyles.forEach(style => {
      if (!style.hasAttribute('nonce') && this.currentNonce) {
        style.setAttribute('nonce', this.currentNonce);
      }
    });
  }

  // セキュアなスクリプト実行
  executeSecureScript(scriptContent: string): void {
    if (typeof document === 'undefined') return;

    const script = document.createElement('script');
    script.textContent = scriptContent;
    
    if (this.currentNonce) {
      script.setAttribute('nonce', this.currentNonce);
    }
    
    document.head.appendChild(script);
    
    // 実行後に削除（セキュリティ強化）
    setTimeout(() => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }, 0);
  }

  // セキュアなスタイル追加
  addSecureStyle(styleContent: string): void {
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.textContent = styleContent;
    
    if (this.currentNonce) {
      style.setAttribute('nonce', this.currentNonce);
    }
    
    document.head.appendChild(style);
  }
}

// シングルトンインスタンスをエクスポート
export const cspMiddleware = CSPMiddleware.getInstance();

// 初期化関数
export function initializeCSP(): void {
  cspMiddleware.initialize();
}

// ユーティリティ関数
export function getCurrentNonce(): string | null {
  return cspMiddleware.getCurrentNonce();
}

export function executeSecureScript(scriptContent: string): void {
  cspMiddleware.executeSecureScript(scriptContent);
}

export function addSecureStyle(styleContent: string): void {
  cspMiddleware.addSecureStyle(styleContent);
}
