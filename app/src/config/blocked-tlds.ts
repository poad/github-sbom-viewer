// 包括的なTLDブラックリスト
export const BLOCKED_TLDS = {
  // 無料ドメインサービス
  FREE_DOMAINS: [
    'tk', 'ml', 'ga', 'cf', 'gq', // Freenom
    '000webhostapp', 'blogspot', 'wordpress', 'wixsite',
    'weebly', 'github.io', 'netlify.app', 'vercel.app',
    'herokuapp.com', 'firebaseapp.com', 'appspot.com',
  ],

  // 匿名・プライバシー重視TLD
  ANONYMOUS: [
    'onion', 'i2p', 'bit', 'exit', 'tor',
  ],

  // 一時的・使い捨てドメイン
  TEMPORARY: [
    'temp', 'tmp', 'test', 'example', 'invalid',
    'localhost', 'local', 'internal',
  ],

  // 地理的制限・高リスク地域
  HIGH_RISK_GEOGRAPHIC: [
    'tk', 'ml', 'ga', 'cf', 'gq', // 太平洋諸島
    'ly', 'sy', 'af', 'iq', 'ir', // 中東・アフリカ
  ],

  // 新gTLD（Generic Top-Level Domain）の高リスクカテゴリ
  HIGH_RISK_GTLD: [
    'click', 'download', 'loan', 'win', 'review',
    'work', 'date', 'racing', 'cricket', 'science',
    'party', 'gdn', 'men', 'accountant', 'faith',
  ],

  // フィッシング・詐欺で頻繁に使用されるTLD
  PHISHING_PRONE: [
    'tk', 'ml', 'ga', 'cf', 'gq', 'pw', 'top',
    'click', 'download', 'stream', 'loan', 'win',
  ],

  // 最終更新日
  LAST_UPDATED: '2025-01-06',
  VERSION: '1.0.0',
} as const;

// 全ブロック対象TLDの統合リスト
export function getAllBlockedTlds(): string[] {
  const allBlocked = new Set<string>();
  
  Object.entries(BLOCKED_TLDS).forEach(([key, value]) => {
    if (key !== 'LAST_UPDATED' && key !== 'VERSION' && Array.isArray(value)) {
      (value as string[]).forEach(tld => allBlocked.add(tld.toLowerCase()));
    }
  });
  
  return Array.from(allBlocked).sort();
}

// TLD更新チェック
interface TldUpdateInfo {
  needsUpdate: boolean;
  daysSinceUpdate: number;
  currentVersion: string;
}

export function checkTldUpdateStatus(): TldUpdateInfo {
  const lastUpdated = new Date(BLOCKED_TLDS.LAST_UPDATED);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    needsUpdate: daysSinceUpdate > 30, // 30日以上経過で更新推奨
    daysSinceUpdate,
    currentVersion: BLOCKED_TLDS.VERSION,
  };
}

// 動的TLD更新（開発・テスト用）
const dynamicBlockedTlds: string[] = [];

export function addDynamicBlockedTld(tld: string): void {
  const normalizedTld = tld.toLowerCase().replace(/^\./, '');
  if (!dynamicBlockedTlds.includes(normalizedTld)) {
    dynamicBlockedTlds.push(normalizedTld);
    console.info(`Added dynamic blocked TLD: ${normalizedTld}`);
  }
}

export function removeDynamicBlockedTld(tld: string): void {
  const normalizedTld = tld.toLowerCase().replace(/^\./, '');
  const index = dynamicBlockedTlds.indexOf(normalizedTld);
  if (index > -1) {
    dynamicBlockedTlds.splice(index, 1);
    console.info(`Removed dynamic blocked TLD: ${normalizedTld}`);
  }
}

export function getDynamicBlockedTlds(): string[] {
  return [...dynamicBlockedTlds];
}

// 統合されたブロック対象TLD取得
export function getEffectiveBlockedTlds(): string[] {
  const staticTlds = getAllBlockedTlds();
  const combined = new Set([...staticTlds, ...dynamicBlockedTlds]);
  return Array.from(combined).sort();
}

// TLD危険度評価
export function getTldRiskLevel(tld: string): 'low' | 'medium' | 'high' | 'critical' {
  const normalizedTld = tld.toLowerCase().replace(/^\./, '');
  
  if (BLOCKED_TLDS.ANONYMOUS.includes(normalizedTld) || 
      BLOCKED_TLDS.TEMPORARY.includes(normalizedTld)) {
    return 'critical';
  }
  
  if (BLOCKED_TLDS.PHISHING_PRONE.includes(normalizedTld)) {
    return 'high';
  }
  
  if (BLOCKED_TLDS.FREE_DOMAINS.includes(normalizedTld) ||
      BLOCKED_TLDS.HIGH_RISK_GTLD.includes(normalizedTld)) {
    return 'medium';
  }
  
  return 'low';
}

// 自動更新チェック（将来の拡張用）
export async function checkForTldUpdates(): Promise<{
  hasUpdates: boolean;
  message: string;
}> {
  try {
    // 実際の実装では外部APIから最新のTLDブラックリストを取得
    // 現在はローカルチェックのみ
    const updateInfo = checkTldUpdateStatus();
    
    if (updateInfo.needsUpdate) {
      return {
        hasUpdates: true,
        message: `TLD blacklist is ${updateInfo.daysSinceUpdate} days old. Consider updating.`,
      };
    }
    
    return {
      hasUpdates: false,
      message: 'TLD blacklist is up to date.',
    };
  } catch (error) {
    console.warn('Failed to check for TLD updates:', error);
    return {
      hasUpdates: false,
      message: 'Unable to check for updates.',
    };
  }
}
