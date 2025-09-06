import { getEffectiveBlockedTlds, getTldRiskLevel, checkForTldUpdates } from '../config/blocked-tlds';

// URL サニタイズとバリデーション
interface URLValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
  warnings?: string[];
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

interface URLSecurityConfig {
  allowedProtocols: string[];
  allowedHosts: string[];
  blockedHosts: string[];
  allowedPorts: number[];
  maxUrlLength: number;
  allowDataUrls: boolean;
  allowLocalhost: boolean;
}

const URL_SECURITY_CONFIG: URLSecurityConfig = {
  allowedProtocols: ['https:', 'http:'],
  allowedHosts: [
    'api.github.com',
    'github.com',
    'raw.githubusercontent.com',
    'avatars.githubusercontent.com',
  ],
  blockedHosts: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254', // AWS メタデータサービス
    '10.0.0.0/8',      // プライベートIP範囲
    '172.16.0.0/12',
    '192.168.0.0/16',
  ],
  allowedPorts: [80, 443],
  maxUrlLength: 2048,
  allowDataUrls: true,
  allowLocalhost: false, // 本番環境では false
};

// 危険なURLパターンの検出
const DANGEROUS_PATTERNS = [
  /javascript:/i,
  /data:text\/html/i,
  /vbscript:/i,
  /file:/i,
  /ftp:/i,
  /<script/i,
  /onload=/i,
  /onerror=/i,
  /onclick=/i,
  /\.\.\/\.\.\//,  // パストラバーサル
  /%2e%2e%2f/i,    // エンコードされたパストラバーサル
  /%00/,           // ヌルバイト
];

// IPアドレスの検証
function isPrivateIP(hostname: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fe80:/i,
    /^fc00:/i,
    /^fd00:/i,
  ];

  return privateRanges.some(pattern => pattern.test(hostname));
}

// ホスト名の検証
function validateHostname(hostname: string): { isValid: boolean; error?: string } {
  // 基本的な形式チェック
  if (!hostname || hostname.length === 0) {
    return { isValid: false, error: 'Empty hostname' };
  }

  // 長さ制限
  if (hostname.length > 253) {
    return { isValid: false, error: 'Hostname too long' };
  }

  // 危険な文字の検証
  const dangerousChars = /[<>'"&\s]/;
  if (dangerousChars.test(hostname)) {
    return { isValid: false, error: 'Hostname contains dangerous characters' };
  }

  // 制御文字の検証
  for (let i = 0; i < hostname.length; i++) {
    const charCode = hostname.charCodeAt(i);
    if ((charCode >= 0 && charCode <= 31) || (charCode >= 127 && charCode <= 159)) {
      return { isValid: false, error: 'Hostname contains control characters' };
    }
  }

  // IPアドレスの場合
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIP(hostname)) {
      return { isValid: false, error: 'Private IP address not allowed' };
    }
  }

  // ドメイン名の場合
  if (hostname.includes('.')) {
    const parts = hostname.split('.');
    for (const part of parts) {
      if (part.length === 0 || part.length > 63) {
        return { isValid: false, error: 'Invalid domain part length' };
      }
      
      if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(part)) {
        return { isValid: false, error: 'Invalid domain part format' };
      }
    }
  }

  return { isValid: true };
}

// URLパスの検証
function validatePath(pathname: string): { isValid: boolean; error?: string } {
  // パストラバーサル攻撃の検出
  if (pathname.includes('../') || pathname.includes('..\\')) {
    return { isValid: false, error: 'Path traversal detected' };
  }

  // エンコードされたパストラバーサル
  if (/%2e%2e%2f/i.test(pathname) || /%2e%2e%5c/i.test(pathname)) {
    return { isValid: false, error: 'Encoded path traversal detected' };
  }

  // ヌルバイト攻撃
  if (pathname.includes('\x00') || /%00/.test(pathname)) {
    return { isValid: false, error: 'Null byte detected' };
  }

  // 制御文字の検証
  for (let i = 0; i < pathname.length; i++) {
    const charCode = pathname.charCodeAt(i);
    if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
      return { isValid: false, error: 'Control character in path' };
    }
  }

  return { isValid: true };
}

// クエリパラメータの検証
function validateQuery(search: string): { isValid: boolean; error?: string; warnings?: string[] } {
  const warnings: string[] = [];

  if (!search) return { isValid: true };

  // 危険なパラメータの検出
  const dangerousParams = ['callback', 'jsonp', 'eval', 'script'];
  const params = new URLSearchParams(search);

  for (const [key, value] of params) {
    // 危険なパラメータ名
    if (dangerousParams.some(dangerous => key.toLowerCase().includes(dangerous))) {
      warnings.push(`Potentially dangerous parameter: ${key}`);
    }

    // 危険な値の検出
    if (/<script/i.test(value) || /javascript:/i.test(value)) {
      return { isValid: false, error: 'Dangerous script content in query parameter' };
    }

    // 長すぎる値
    if (value.length > 1000) {
      warnings.push(`Long parameter value: ${key}`);
    }
  }

  return { isValid: true, warnings };
}

// メインのURL検証関数
export function validateAndSanitizeURL(url: string, config?: Partial<URLSecurityConfig>): URLValidationResult {
  const effectiveConfig = { ...URL_SECURITY_CONFIG, ...config };
  const warnings: string[] = [];

  try {
    // 基本的な文字列検証
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'Invalid URL type' };
    }

    // 長さ制限
    if (url.length > effectiveConfig.maxUrlLength) {
      return { isValid: false, error: `URL exceeds maximum length (${effectiveConfig.maxUrlLength})` };
    }

    // 危険なパターンの検出
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(url)) {
        return { isValid: false, error: 'Dangerous URL pattern detected' };
      }
    }

    // data: URLの特別処理
    if (url.startsWith('data:')) {
      if (!effectiveConfig.allowDataUrls) {
        return { isValid: false, error: 'Data URLs not allowed' };
      }

      // 危険なdata URLの検出
      if (/data:text\/html/i.test(url) || /data:.*script/i.test(url)) {
        return { isValid: false, error: 'Dangerous data URL detected' };
      }

      return { isValid: true, sanitizedUrl: url };
    }

    // URL オブジェクトの作成と検証
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }

    // プロトコルの検証
    if (!effectiveConfig.allowedProtocols.includes(urlObj.protocol)) {
      return { isValid: false, error: `Protocol not allowed: ${urlObj.protocol}` };
    }

    // ホスト名の検証
    const hostnameValidation = validateHostname(urlObj.hostname);
    if (!hostnameValidation.isValid) {
      return { isValid: false, error: hostnameValidation.error };
    }

    // localhost の検証
    if (!effectiveConfig.allowLocalhost && 
        (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
      return { isValid: false, error: 'Localhost not allowed' };
    }

    // ホワイトリストの検証
    if (effectiveConfig.allowedHosts.length > 0) {
      const isAllowed = effectiveConfig.allowedHosts.some(allowedHost => {
        return urlObj.hostname === allowedHost || 
               urlObj.hostname.endsWith(`.${allowedHost}`);
      });

      if (!isAllowed) {
        return { isValid: false, error: `Host not in allowlist: ${urlObj.hostname}` };
      }
    }

    // ブラックリストの検証
    if (effectiveConfig.blockedHosts.some(blocked => 
      urlObj.hostname === blocked || urlObj.hostname.includes(blocked))) {
      return { isValid: false, error: `Host is blocked: ${urlObj.hostname}` };
    }

    // ポートの検証
    if (urlObj.port) {
      const port = parseInt(urlObj.port, 10);
      if (!effectiveConfig.allowedPorts.includes(port)) {
        return { isValid: false, error: `Port not allowed: ${port}` };
      }
    }

    // パスの検証
    const pathValidation = validatePath(urlObj.pathname);
    if (!pathValidation.isValid) {
      return { isValid: false, error: pathValidation.error };
    }

    // クエリパラメータの検証
    const queryValidation = validateQuery(urlObj.search);
    if (!queryValidation.isValid) {
      return { isValid: false, error: queryValidation.error };
    }
    if (queryValidation.warnings) {
      warnings.push(...queryValidation.warnings);
    }

    // URLの正規化
    const sanitizedUrl = urlObj.toString();

    // TLD リスク評価
    const tld = urlObj.hostname.split('.').pop() || '';
    const riskLevel = getTldRiskLevel(tld);
    
    // 高リスクTLDの警告
    if (riskLevel === 'high' || riskLevel === 'critical') {
      warnings.push(`High-risk TLD detected: ${tld} (${riskLevel})`);
    }

    // TLD ブラックリスト チェック
    const blockedTlds = getEffectiveBlockedTlds();
    if (blockedTlds.includes(tld.toLowerCase())) {
      return { isValid: false, error: `Blocked TLD: ${tld}`, riskLevel };
    }

    return {
      isValid: true,
      sanitizedUrl,
      warnings: warnings.length > 0 ? warnings : undefined,
      riskLevel,
    };

  } catch (error) {
    return {
      isValid: false,
      error: `URL validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// 開発環境用の設定
export function getDevConfig(): Partial<URLSecurityConfig> {
  return {
    allowLocalhost: true,
    allowedHosts: [
      ...URL_SECURITY_CONFIG.allowedHosts,
      'localhost',
      '127.0.0.1',
    ],
    allowedPorts: [...URL_SECURITY_CONFIG.allowedPorts, 3000, 5173, 8080],
  };
}

// 本番環境用の厳格な設定
export function getProdConfig(): Partial<URLSecurityConfig> {
  return {
    allowLocalhost: false,
    allowDataUrls: false,
    allowedProtocols: ['https:'], // HTTPSのみ
  };
}

// TLD更新チェックの初期化
let updateCheckInterval: number | null = null;

export function initializeTldUpdateCheck(): void {
  // 初回チェック
  checkForTldUpdates().then(result => {
    if (result.hasUpdates) {
      console.warn('TLD Update Check:', result.message);
    }
    return result;
  }).catch(error => {
    console.error('Initial TLD update check failed:', error);
  });

  // 24時間ごとの定期チェック
  if (typeof window !== 'undefined' && !updateCheckInterval) {
    updateCheckInterval = window.setInterval(async () => {
      try {
        const result = await checkForTldUpdates();
        if (result.hasUpdates) {
          console.warn('TLD Update Check:', result.message);
          
          // 開発環境でのみ詳細ログ
          if (process.env.NODE_ENV === 'development') {
            console.info('Consider updating the TLD blacklist in blocked-tlds.ts');
          }
        }
      } catch (error) {
        console.error('TLD update check failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24時間
  }
}

export function stopTldUpdateCheck(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}
