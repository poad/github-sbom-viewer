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

interface DomainValidationConfig {
  allowSubdomains: boolean;
  maxSubdomainDepth: number;
  blockedTlds: string[];
  allowedPatterns: RegExp[];
}

const DOMAIN_VALIDATION_CONFIG: DomainValidationConfig = {
  allowSubdomains: true,
  maxSubdomainDepth: 3, // 最大3レベルのサブドメイン
  blockedTlds: [
    'tk', 'ml', 'ga', 'cf', // 無料ドメイン
    'bit', 'onion', // 特殊ドメイン
  ],
  allowedPatterns: [
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/, // 有効なドメイン名パターン
  ],
};

function validateDomainStructure(domain: string): { isValid: boolean; error?: string } {
  // 基本的な文字列検証
  if (!domain || typeof domain !== 'string' || domain.length === 0) {
    return { isValid: false, error: 'Domain is empty or invalid type' };
  }

  // 長さ制限（RFC準拠）
  if (domain.length > 253) {
    return { isValid: false, error: 'Domain exceeds maximum length (253 characters)' };
  }

  // 危険な文字の検証（より厳密）
  const dangerousChars = /[<>'"&\s]/;
  if (dangerousChars.test(domain)) {
    return { isValid: false, error: 'Domain contains dangerous characters' };
  }

  // 制御文字の検証
  for (let i = 0; i < domain.length; i++) {
    const charCode = domain.charCodeAt(i);
    if ((charCode >= 0 && charCode <= 31) || (charCode >= 127 && charCode <= 159)) {
      return { isValid: false, error: 'Domain contains control characters' };
    }
  }

  // 連続するドットやハイフンの検証
  if (/\.{2,}|--/.test(domain)) {
    return { isValid: false, error: 'Domain contains consecutive dots or hyphens' };
  }

  // 先頭・末尾の無効文字
  if (/^[-.]|[-.]$/.test(domain)) {
    return { isValid: false, error: 'Domain starts or ends with invalid character' };
  }

  return { isValid: true };
}

function validateDomainParts(domain: string): { isValid: boolean; error?: string } {
  const parts = domain.split('.');
  
  // 最小構成の検証（少なくともドメイン名.TLD）
  if (parts.length < 2) {
    return { isValid: false, error: 'Domain must have at least two parts (domain.tld)' };
  }

  // サブドメインの深度制限
  if (parts.length - 2 > DOMAIN_VALIDATION_CONFIG.maxSubdomainDepth) {
    return { isValid: false, error: `Subdomain depth exceeds limit (${DOMAIN_VALIDATION_CONFIG.maxSubdomainDepth})` };
  }

  // 各パートの検証
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // 空のパート
    if (part.length === 0) {
      return { isValid: false, error: 'Domain contains empty part' };
    }

    // パートの長さ制限
    if (part.length > 63) {
      return { isValid: false, error: 'Domain part exceeds maximum length (63 characters)' };
    }

    // パートのパターン検証
    const isValidPart = DOMAIN_VALIDATION_CONFIG.allowedPatterns.some(pattern => 
      pattern.test(part),
    );
    
    if (!isValidPart) {
      return { isValid: false, error: `Invalid domain part: ${part}` };
    }

    // TLD（最後のパート）の特別検証
    if (i === parts.length - 1) {
      // 数字のみのTLDは無効
      if (/^\d+$/.test(part)) {
        return { isValid: false, error: 'TLD cannot be numeric only' };
      }

      // ブロックされたTLD
      if (DOMAIN_VALIDATION_CONFIG.blockedTlds.includes(part.toLowerCase())) {
        return { isValid: false, error: `Blocked TLD: ${part}` };
      }

      // TLDの最小長
      if (part.length < 2) {
        return { isValid: false, error: 'TLD must be at least 2 characters' };
      }
    }
  }

  return { isValid: true };
}

function validateSubdomainPolicy(domain: string, currentHostname: string): { isValid: boolean; error?: string } {
  const hostnameParts = currentHostname.split('.');
  
  // ドット付きドメイン（.example.com）の場合
  if (domain.startsWith('.')) {
    const cleanDomain = domain.substring(1);
    const cleanParts = cleanDomain.split('.');
    
    // サブドメインが許可されていない場合
    if (!DOMAIN_VALIDATION_CONFIG.allowSubdomains) {
      return { isValid: false, error: 'Subdomain cookies are not allowed' };
    }

    // 親ドメインの検証
    if (cleanParts.length > hostnameParts.length) {
      return { isValid: false, error: 'Cookie domain is not a parent of current hostname' };
    }

    // 末尾一致の検証
    const hostnameSuffix = hostnameParts.slice(-cleanParts.length).join('.');
    if (hostnameSuffix !== cleanDomain) {
      return { isValid: false, error: 'Cookie domain does not match hostname suffix' };
    }

    // パブリックサフィックスの検証（簡易版）
    if (cleanParts.length < 2) {
      return { isValid: false, error: 'Cannot set cookie on public suffix' };
    }
  } else {
    // 完全一致ドメインの場合
    if (domain !== currentHostname) {
      // サブドメインの場合の検証
      if (domain.endsWith(`.${currentHostname}`)) {
        if (!DOMAIN_VALIDATION_CONFIG.allowSubdomains) {
          return { isValid: false, error: 'Subdomain cookies are not allowed' };
        }
      } else {
        return { isValid: false, error: 'Domain does not match current hostname' };
      }
    }
  }

  return { isValid: true };
}

function isSecureContext(): boolean {
  return window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

function validateAndSanitizeDomain(domain: string): DomainValidationResult {
  try {
    const currentHostname = window.location.hostname;
    
    // 基本構造の検証
    const structureResult = validateDomainStructure(domain);
    if (!structureResult.isValid) {
      return { isValid: false, error: structureResult.error };
    }

    // ドメインパーツの検証
    const partsResult = validateDomainParts(domain);
    if (!partsResult.isValid) {
      return { isValid: false, error: partsResult.error };
    }

    // サブドメインポリシーの検証
    const subdomainResult = validateSubdomainPolicy(domain, currentHostname);
    if (!subdomainResult.isValid) {
      return { isValid: false, error: subdomainResult.error };
    }

    // 許可リストとの照合（既存の設定との互換性）
    const allowedDomains = [
      currentHostname,
      `.${currentHostname}`,
      ...COOKIE_SECURITY_CONFIG.ALLOWED_DOMAINS,
      ...COOKIE_SECURITY_CONFIG.ALLOWED_DOMAINS.map(d => `.${d}`),
    ];

    if (!allowedDomains.includes(domain)) {
      return { isValid: false, error: 'Domain not in allowed list' };
    }

    // 正規化（小文字化、Punycode対応）
    let sanitizedDomain = domain.toLowerCase();
    
    // 国際化ドメイン名の処理
    try {
      // 非ASCII文字が含まれているかチェック
      let hasNonAscii = false;
      for (let i = 0; i < sanitizedDomain.length; i++) {
        if (sanitizedDomain.charCodeAt(i) > 127) {
          hasNonAscii = true;
          break;
        }
      }
      
      if (hasNonAscii) {
        // 非ASCII文字が含まれている場合はPunycodeに変換
        const url = new URL(`http://${sanitizedDomain}`);
        sanitizedDomain = url.hostname;
      }
    } catch {
      return { isValid: false, error: 'Invalid internationalized domain name' };
    }

    return { isValid: true, sanitizedDomain };
  } catch (error) {
    return { 
      isValid: false, 
      error: `Domain validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
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
