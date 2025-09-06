import { COOKIE_SECURITY_CONFIG } from '../config/security';

interface SecureCookieOptions {
  maxAge?: number;
  path?: string;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

function isSecureContext(): boolean {
  return window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

function validateDomain(domain: string): boolean {
  const currentHostname = window.location.hostname;
  return COOKIE_SECURITY_CONFIG.ALLOWED_DOMAINS.includes(currentHostname) ||
         domain === currentHostname ||
         domain === `.${currentHostname}`;
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
      if (secure && !isSecureContext()) {
        console.warn(`Cannot set secure cookie ${name} in non-secure context`);
        return false;
      }

      if (domain && !validateDomain(domain)) {
        console.warn(`Invalid domain ${domain} for cookie ${name}`);
        return false;
      }

      // クッキー文字列の構築
      const encodedValue = encodeURIComponent(value);
      let cookieString = `${name}=${encodedValue}; Max-Age=${maxAge}; path=${path}`;

      if (domain) {
        cookieString += `; domain=${domain}`;
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
      const expires = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
      let cookieString = `${name}=; ${expires}; path=${path}`;

      if (domain) {
        cookieString += `; domain=${domain}`;
      }

      if (isSecureContext()) {
        cookieString += '; Secure';
      }

      cookieString += `; SameSite=${COOKIE_SECURITY_CONFIG.SAME_SITE}`;

      document.cookie = cookieString;
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
    names.forEach(name => {
      paths.forEach(path => {
        this.delete(name, path);
        
        if (domains) {
          domains.forEach(domain => {
            this.delete(name, path, domain);
          });
        }
      });
    });
  },
};
