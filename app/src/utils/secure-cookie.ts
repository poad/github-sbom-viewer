import { COOKIE_SECURITY_CONFIG } from '../config/security';

interface SecureCookieOptions {
  maxAge?: number;
  path?: string;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

interface DomainValidationResult {
  isValid: boolean;
  sanitizedDomain?: string;
  error?: string;
}

function isSecureContext(): boolean {
  return window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

function validateAndSanitizeDomain(domain: string): DomainValidationResult {
  try {
    const currentHostname = window.location.hostname;
    
    // 基本的な文字列検証
    if (!domain || typeof domain !== 'string') {
      return { isValid: false, error: 'Invalid domain format' };
    }

    // 危険な文字の検証
    const dangerousChars = /[<>'"&\s]/;
    if (dangerousChars.test(domain)) {
      return { isValid: false, error: 'Domain contains dangerous characters' };
    }

    // ドメイン形式の検証
    const domainRegex = /^[a-zA-Z0-9.-]+$/;
    if (!domainRegex.test(domain)) {
      return { isValid: false, error: 'Invalid domain format' };
    }

    // 許可されたドメインかチェック
    const allowedDomains = [
      currentHostname,
      `.${currentHostname}`,
      ...COOKIE_SECURITY_CONFIG.ALLOWED_DOMAINS,
      ...COOKIE_SECURITY_CONFIG.ALLOWED_DOMAINS.map(d => `.${d}`),
    ];

    if (!allowedDomains.includes(domain)) {
      return { isValid: false, error: 'Domain not in allowed list' };
    }

    // サニタイズされたドメインを返す
    return { isValid: true, sanitizedDomain: domain.toLowerCase() };
  } catch (error) {
    return { isValid: false, error: `Domain validation failed: ${error}` };
  }
}

function enforceHttpsForSecureCookies(): boolean {
  if (!isSecureContext()) {
    console.error('Secure cookies can only be set in HTTPS context');
    return false;
  }
  return true;
}

export const SecureCookieManager = {
  set(name: string, value: string, options: SecureCookieOptions = {}): boolean {
    try {
      const {
        maxAge = COOKIE_SECURITY_CONFIG.DEFAULT_MAX_AGE,
        path = '/',
        domain,
        httpOnly = COOKIE_SECURITY_CONFIG.HTTP_ONLY,
        secure = COOKIE_SECURITY_CONFIG.REQUIRE_SECURE,
        sameSite = COOKIE_SECURITY_CONFIG.SAME_SITE,
      } = options;

      // セキュリティ検証
      if (secure && !enforceHttpsForSecureCookies()) {
        return false;
      }

      // ドメイン検証
      if (domain) {
        const validation = validateAndSanitizeDomain(domain);
        if (!validation.isValid) {
          console.error(`Domain validation failed for ${name}:`, validation.error);
          return false;
        }
      }

      // クッキー文字列の構築
      const encodedValue = encodeURIComponent(value);
      let cookieString = `${name}=${encodedValue}; Max-Age=${maxAge}; path=${path}`;

      if (domain) {
        const validation = validateAndSanitizeDomain(domain);
        if (validation.isValid && validation.sanitizedDomain) {
          cookieString += `; domain=${validation.sanitizedDomain}`;
        }
      }

      if (secure && isSecureContext()) {
        cookieString += '; Secure';
      }

      cookieString += `; SameSite=${sameSite}`;

      if (httpOnly) {
        cookieString += '; HttpOnly';
      }

      document.cookie = cookieString;
      return true;
    } catch (error) {
      console.error(`Failed to set secure cookie ${name}:`, error);
      return false;
    }
  },

  get(name: string): string | null {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift();
        return cookieValue ? decodeURIComponent(cookieValue) : null;
      }
      return null;
    } catch (error) {
      console.error(`Failed to get cookie ${name}:`, error);
      return null;
    }
  },

  delete(name: string, path = '/', domain?: string): boolean {
    try {
      // HTTPS必須の削除保証
      if (!enforceHttpsForSecureCookies()) {
        console.warn(`Attempting to delete cookie ${name} in non-secure context`);
        // 非セキュア環境でも削除を試行（開発環境対応）
      }

      // ドメイン検証
      if (domain) {
        const validation = validateAndSanitizeDomain(domain);
        if (!validation.isValid) {
          console.error(`Domain validation failed for cookie deletion ${name}:`, validation.error);
          return false;
        }
        domain = validation.sanitizedDomain;
      }

      const expires = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
      let cookieString = `${name}=; ${expires}; path=${path}`;

      if (domain) {
        cookieString += `; domain=${domain}`;
      }

      // セキュアコンテキストでのみSecureフラグを追加
      if (isSecureContext()) {
        cookieString += '; Secure';
      }

      cookieString += `; SameSite=${COOKIE_SECURITY_CONFIG.SAME_SITE}`;

      document.cookie = cookieString;
      
      // 削除の検証
      const stillExists = this.exists(name);
      if (stillExists) {
        console.warn(`Cookie ${name} may not have been fully deleted`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete cookie ${name}:`, error);
      return false;
    }
  },

  setSession(name: string, value: string, path = '/'): boolean {
    return this.set(name, value, {
      path,
      maxAge: undefined,
      secure: true,
      sameSite: 'Strict',
      httpOnly: false,
    });
  },

  setSecureSession(name: string, value: string, maxAge = COOKIE_SECURITY_CONFIG.SESSION_MAX_AGE): boolean {
    return this.set(name, value, {
      maxAge,
      secure: true,
      sameSite: 'Strict',
      httpOnly: true,
    });
  },

  setCsrfToken(name: string, value: string): boolean {
    return this.set(name, value, {
      maxAge: COOKIE_SECURITY_CONFIG.CSRF_MAX_AGE,
      secure: true,
      sameSite: 'Strict',
      httpOnly: false,
    });
  },

  exists(name: string): boolean {
    return this.get(name) !== null;
  },

  clear(names: string[], paths = ['/'], domains?: string[]): void {
    const results: { name: string; path: string; domain?: string; success: boolean; error?: string }[] = [];
    
    names.forEach(name => {
      paths.forEach(path => {
        // ドメイン指定なしで削除
        try {
          const success = this.delete(name, path);
          results.push({ name, path, success });
        } catch (error) {
          results.push({ 
            name, 
            path, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        
        // 指定されたドメインで削除
        if (domains) {
          domains.forEach(domain => {
            try {
              const validation = validateAndSanitizeDomain(domain);
              if (validation.isValid && validation.sanitizedDomain) {
                const success = this.delete(name, path, validation.sanitizedDomain);
                results.push({ name, path, domain: validation.sanitizedDomain, success });
              } else {
                results.push({ 
                  name, 
                  path, 
                  domain, 
                  success: false, 
                  error: validation.error,
                });
              }
            } catch (error) {
              results.push({ 
                name, 
                path, 
                domain, 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          });
        }
      });
    });

    // 削除結果のログ出力
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.warn('Some cookie deletions failed:', failures);
    }

    const successes = results.filter(r => r.success);
    if (successes.length > 0) {
      console.info(`Successfully deleted ${successes.length} cookies`);
    }
  },

  // セキュリティ監査用の情報取得
  getSecurityInfo(): {
    isSecureContext: boolean;
    allowedDomains: string[];
    currentDomain: string;
  } {
    return {
      isSecureContext: isSecureContext(),
      allowedDomains: COOKIE_SECURITY_CONFIG.ALLOWED_DOMAINS,
      currentDomain: window.location.hostname,
    };
  },
};
