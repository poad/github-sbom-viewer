// Content Security Policy設定
export const CSP_CONFIG = {
  // 基本ディレクティブ
  DEFAULT_SRC: '\'none\'', // 最も厳格な設定
  
  // スクリプト関連（nonce/hashベースの厳密な制御）
  SCRIPT_SRC: '\'self\'', // 同一オリジンのスクリプトのみ
  
  // スタイル関連
  STYLE_SRC: '\'self\'', // 同一オリジンのスタイルのみ
  
  // 画像関連
  IMG_SRC: '\'self\' data: https:', // 同一オリジン、data URI、HTTPS画像
  
  // 接続関連
  CONNECT_SRC: '\'self\' https://api.github.com https://github.com', // GitHub APIのみ許可
  
  // フォント関連
  FONT_SRC: '\'self\'', // 同一オリジンのフォントのみ
  
  // マニフェスト関連
  MANIFEST_SRC: '\'self\'', // 同一オリジンのマニフェストのみ
  
  // フレーム関連（より具体的な制限）
  FRAME_ANCESTORS: '\'none\'', // フレーム埋め込みを完全禁止
  FRAME_SRC: '\'none\'', // iframe読み込みを完全禁止
  
  // オブジェクト関連
  OBJECT_SRC: '\'none\'', // プラグイン実行を完全禁止
  
  // ベースURI関連
  BASE_URI: '\'self\'', // ベースURIを同一オリジンに制限
  
  // フォーム関連
  FORM_ACTION: '\'self\'', // フォーム送信を同一オリジンに制限
  
  // セキュリティ強化ディレクティブ
  UPGRADE_INSECURE_REQUESTS: true, // HTTP→HTTPS自動アップグレード
  BLOCK_ALL_MIXED_CONTENT: true, // 混在コンテンツを完全ブロック
  REQUIRE_TRUSTED_TYPES: '\'script\'', // Trusted Types APIを要求
  
  // 開発環境用の設定
  DEVELOPMENT_OVERRIDES: {
    // 開発時のみ必要な場合の設定（本番では使用しない）
    SCRIPT_SRC_DEV: '\'self\' \'unsafe-eval\'', // HMR用（開発時のみ）
  },
} as const;

// セキュアなnonce生成
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, (match) => {
    switch (match) {
      case '+': return '-';
      case '/': return '_';
      case '=': return '';
      default: return match;
    }
  });
}

// スクリプトハッシュ生成
export async function generateScriptHash(script: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(script);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  return `'sha256-${hashBase64}'`;
}

// CSP文字列を生成する関数（nonce/hash対応）
export function generateCSPString(options: {
  isDevelopment?: boolean;
  nonce?: string;
  scriptHashes?: string[];
  styleHashes?: string[];
} = {}): string {
  const { isDevelopment = false, nonce, scriptHashes = [], styleHashes = [] } = options;
  
  // script-srcの構築
  let scriptSrc = isDevelopment ? CSP_CONFIG.DEVELOPMENT_OVERRIDES.SCRIPT_SRC_DEV : CSP_CONFIG.SCRIPT_SRC;
  
  if (nonce) {
    scriptSrc += ` 'nonce-${nonce}'`;
  }
  
  if (scriptHashes.length > 0) {
    scriptSrc += ` ${scriptHashes.join(' ')}`;
  }
  
  // style-srcの構築
  let styleSrc = CSP_CONFIG.STYLE_SRC;
  
  if (nonce) {
    styleSrc += ` 'nonce-${nonce}'`;
  }
  
  if (styleHashes.length > 0) {
    styleSrc += ` ${styleHashes.join(' ')}`;
  }

  const directives = [
    `default-src ${CSP_CONFIG.DEFAULT_SRC}`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${CSP_CONFIG.IMG_SRC}`,
    `connect-src ${CSP_CONFIG.CONNECT_SRC}`,
    `font-src ${CSP_CONFIG.FONT_SRC}`,
    `manifest-src ${CSP_CONFIG.MANIFEST_SRC}`,
    `frame-ancestors ${CSP_CONFIG.FRAME_ANCESTORS}`,
    `frame-src ${CSP_CONFIG.FRAME_SRC}`,
    `object-src ${CSP_CONFIG.OBJECT_SRC}`,
    `base-uri ${CSP_CONFIG.BASE_URI}`,
    `form-action ${CSP_CONFIG.FORM_ACTION}`,
  ];

  // セキュリティ強化ディレクティブを追加
  if (CSP_CONFIG.UPGRADE_INSECURE_REQUESTS) {
    directives.push('upgrade-insecure-requests');
  }
  
  if (CSP_CONFIG.BLOCK_ALL_MIXED_CONTENT) {
    directives.push('block-all-mixed-content');
  }
  
  if (CSP_CONFIG.REQUIRE_TRUSTED_TYPES) {
    directives.push(`require-trusted-types-for ${CSP_CONFIG.REQUIRE_TRUSTED_TYPES}`);
  }

  return directives.join('; ') + ';';
}

// CSPの検証関数
export function validateCSP(): {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // unsafe-inlineとunsafe-evalの使用をチェック
  if (CSP_CONFIG.SCRIPT_SRC.includes('unsafe-inline')) {
    warnings.push('script-src contains unsafe-inline which increases XSS risk');
  }
  
  if (CSP_CONFIG.SCRIPT_SRC.includes('unsafe-eval')) {
    warnings.push('script-src contains unsafe-eval which increases code injection risk');
  }

  // 推奨事項
  if (!CSP_CONFIG.UPGRADE_INSECURE_REQUESTS) {
    recommendations.push('Consider enabling upgrade-insecure-requests');
  }
  
  if (!CSP_CONFIG.BLOCK_ALL_MIXED_CONTENT) {
    recommendations.push('Consider enabling block-all-mixed-content');
  }

  // nonce/hashの使用推奨
  recommendations.push('Consider using nonce or hash values for inline scripts/styles');

  return {
    isValid: warnings.length === 0,
    warnings,
    recommendations,
  };
}
