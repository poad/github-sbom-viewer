// セッションセキュリティ管理
interface SessionFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  hash: string;
}

interface SessionToken {
  token: string;
  createdAt: number;
  expiresAt: number;
  rotationCount: number;
}

class SessionSecurityManager {
  private static instance: SessionSecurityManager;
  private currentToken: SessionToken | null = null;
  private fingerprint: SessionFingerprint | null = null;
  private rotationInterval: number | null = null;

  private readonly TOKEN_ROTATION_INTERVAL = 15 * 60 * 1000; // 15分
  private readonly TOKEN_LIFETIME = 30 * 60 * 1000; // 30分
  private readonly MAX_ROTATION_COUNT = 10; // 最大ローテーション回数

  private constructor() {
    // シングルトンパターンのためのプライベートコンストラクタ
  }

  static getInstance(): SessionSecurityManager {
    if (!SessionSecurityManager.instance) {
      SessionSecurityManager.instance = new SessionSecurityManager();
    }
    return SessionSecurityManager.instance;
  }

  // セッションフィンガープリント生成
  private async generateFingerprint(): Promise<SessionFingerprint> {
    const userAgent = navigator.userAgent;
    const screenResolution = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const platform = navigator.platform;

    // フィンガープリントのハッシュ化
    const fingerprintData = `${userAgent}|${screenResolution}|${timezone}|${language}|${platform}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      userAgent,
      screenResolution,
      timezone,
      language,
      platform,
      hash,
    };
  }

  // セキュアなトークン生成
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // セッション初期化
  async initializeSession(): Promise<void> {
    try {
      // フィンガープリント生成
      this.fingerprint = await this.generateFingerprint();
      localStorage.setItem('session-fingerprint', JSON.stringify(this.fingerprint));

      // 初期トークン生成
      await this.rotateToken();

      // 定期的なトークンローテーション開始
      this.startTokenRotation();

      console.info('Session security initialized');
    } catch (error) {
      console.error('Failed to initialize session security:', error);
      throw new Error('Session initialization failed');
    }
  }

  // トークンローテーション
  async rotateToken(): Promise<string> {
    const now = Date.now();
    const newToken = this.generateSecureToken();
    const rotationCount = this.currentToken ? this.currentToken.rotationCount + 1 : 0;

    // 最大ローテーション回数チェック
    if (rotationCount > this.MAX_ROTATION_COUNT) {
      console.warn('Maximum token rotation count exceeded, forcing logout');
      await this.destroySession();
      throw new Error('Session expired due to excessive rotations');
    }

    this.currentToken = {
      token: newToken,
      createdAt: now,
      expiresAt: now + this.TOKEN_LIFETIME,
      rotationCount,
    };

    // セキュアストレージに保存
    localStorage.setItem('session-token', JSON.stringify(this.currentToken));

    console.info(`Token rotated (count: ${rotationCount})`);
    return newToken;
  }

  // フィンガープリント検証
  async validateFingerprint(): Promise<boolean> {
    try {
      const storedFingerprint = localStorage.getItem('session-fingerprint');
      if (!storedFingerprint) {
        console.warn('No stored fingerprint found');
        return false;
      }

      const stored = JSON.parse(storedFingerprint) as SessionFingerprint;
      const current = await this.generateFingerprint();

      // 重要な属性の変更をチェック
      const criticalMismatch = 
        stored.userAgent !== current.userAgent ||
        stored.platform !== current.platform ||
        stored.timezone !== current.timezone;

      if (criticalMismatch) {
        console.warn('Critical fingerprint mismatch detected');
        return false;
      }

      // 軽微な変更は許容（画面解像度、言語設定）
      const minorChanges = 
        stored.screenResolution !== current.screenResolution ||
        stored.language !== current.language;

      if (minorChanges) {
        console.info('Minor fingerprint changes detected, updating');
        this.fingerprint = current;
        localStorage.setItem('session-fingerprint', JSON.stringify(current));
      }

      return true;
    } catch (error) {
      console.error('Fingerprint validation failed:', error);
      return false;
    }
  }

  // トークン検証
  validateToken(): boolean {
    if (!this.currentToken) {
      const storedToken = localStorage.getItem('session-token');
      if (!storedToken) return false;

      try {
        this.currentToken = JSON.parse(storedToken) as SessionToken;
      } catch {
        return false;
      }
    }

    const now = Date.now();
    return this.currentToken.expiresAt > now;
  }

  // 現在のトークンを取得
  getCurrentToken(): string | null {
    if (!this.validateToken()) return null;
    return this.currentToken?.token || null;
  }

  // セッション検証（フィンガープリント + トークン）
  async validateSession(): Promise<boolean> {
    const tokenValid = this.validateToken();
    const fingerprintValid = await this.validateFingerprint();

    if (!tokenValid || !fingerprintValid) {
      console.warn('Session validation failed', { tokenValid, fingerprintValid });
      await this.destroySession();
      return false;
    }

    return true;
  }

  // 定期的なトークンローテーション開始
  private startTokenRotation(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }

    this.rotationInterval = window.setInterval(async () => {
      try {
        if (document.visibilityState === 'visible') {
          await this.rotateToken();
        }
      } catch (error) {
        console.error('Token rotation failed:', error);
        await this.destroySession();
      }
    }, this.TOKEN_ROTATION_INTERVAL);
  }

  // セッション破棄
  async destroySession(): Promise<void> {
    try {
      // ローテーション停止
      if (this.rotationInterval) {
        clearInterval(this.rotationInterval);
        this.rotationInterval = null;
      }

      // データクリア
      this.currentToken = null;
      this.fingerprint = null;

      // ストレージクリア
      localStorage.removeItem('session-token');
      localStorage.removeItem('session-fingerprint');

      console.info('Session destroyed');
    } catch (error) {
      console.error('Failed to destroy session:', error);
    }
  }

  // セッション情報取得（デバッグ用）
  getSessionInfo(): {
    hasToken: boolean;
    tokenExpiry: number | null;
    rotationCount: number | null;
    fingerprintHash: string | null;
  } {
    return {
      hasToken: !!this.currentToken,
      tokenExpiry: this.currentToken?.expiresAt || null,
      rotationCount: this.currentToken?.rotationCount || null,
      fingerprintHash: this.fingerprint?.hash || null,
    };
  }
}

// シングルトンインスタンス
const sessionSecurity = SessionSecurityManager.getInstance();

// エクスポート関数
export async function initializeSessionSecurity(): Promise<void> {
  await sessionSecurity.initializeSession();
}

export async function validateSession(): Promise<boolean> {
  return await sessionSecurity.validateSession();
}

export function getCurrentSessionToken(): string | null {
  return sessionSecurity.getCurrentToken();
}

export async function rotateSessionToken(): Promise<string> {
  return await sessionSecurity.rotateToken();
}

export async function destroySession(): Promise<void> {
  await sessionSecurity.destroySession();
}

export function getSessionInfo(): ReturnType<SessionSecurityManager['getSessionInfo']> {
  return sessionSecurity.getSessionInfo();
}
