// CSP違反レポート処理
interface CSPViolationReport {
  'document-uri': string;
  referrer: string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  disposition: string;
  'blocked-uri': string;
  'line-number': number;
  'column-number': number;
  'source-file': string;
  'status-code': number;
  'script-sample': string;
}

interface CSPReportWrapper {
  'csp-report': CSPViolationReport;
}

// CSP違反の分類
type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ProcessedViolation {
  severity: ViolationSeverity;
  category: string;
  description: string;
  recommendation: string;
  timestamp: number;
  userAgent: string;
  url: string;
}

// CSP違反の処理
export class CSPReporter {
  private static instance: CSPReporter;
  private violations: ProcessedViolation[] = [];
  private readonly MAX_VIOLATIONS = 100;

  private constructor() {
    this.initializeReporting();
  }

  static getInstance(): CSPReporter {
    if (!CSPReporter.instance) {
      CSPReporter.instance = new CSPReporter();
    }
    return CSPReporter.instance;
  }

  private initializeReporting(): void {
    // SecurityPolicyViolation イベントリスナー
    document.addEventListener('securitypolicyviolation', (event) => {
      this.handleViolation({
        'csp-report': {
          'document-uri': event.documentURI,
          referrer: document.referrer,
          'violated-directive': event.violatedDirective,
          'effective-directive': event.effectiveDirective,
          'original-policy': event.originalPolicy,
          disposition: event.disposition,
          'blocked-uri': event.blockedURI,
          'line-number': event.lineNumber,
          'column-number': event.columnNumber,
          'source-file': event.sourceFile,
          'status-code': event.statusCode,
          'script-sample': event.sample,
        },
      });
    });
  }

  private categorizeViolation(report: CSPViolationReport): {
    severity: ViolationSeverity;
    category: string;
    description: string;
    recommendation: string;
  } {
    const directive = report['violated-directive'];
    const blockedUri = report['blocked-uri'];

    // スクリプト関連の違反
    if (directive.startsWith('script-src')) {
      if (blockedUri.startsWith('inline')) {
        return {
          severity: 'high',
          category: 'Inline Script',
          description: 'Inline script execution blocked',
          recommendation: 'Use nonce or hash for inline scripts, or move to external files',
        };
      }
      if (blockedUri.startsWith('eval')) {
        return {
          severity: 'critical',
          category: 'Eval Usage',
          description: 'eval() or similar dynamic code execution blocked',
          recommendation: 'Remove eval() usage and use safer alternatives',
        };
      }
      return {
        severity: 'medium',
        category: 'External Script',
        description: `External script from ${blockedUri} blocked`,
        recommendation: 'Add the domain to script-src allowlist if legitimate',
      };
    }

    // スタイル関連の違反
    if (directive.startsWith('style-src')) {
      if (blockedUri.startsWith('inline')) {
        return {
          severity: 'medium',
          category: 'Inline Style',
          description: 'Inline style blocked',
          recommendation: 'Use nonce for inline styles or move to external CSS',
        };
      }
      return {
        severity: 'low',
        category: 'External Style',
        description: `External stylesheet from ${blockedUri} blocked`,
        recommendation: 'Add the domain to style-src allowlist if legitimate',
      };
    }

    // 画像関連の違反
    if (directive.startsWith('img-src')) {
      return {
        severity: 'low',
        category: 'Image Resource',
        description: `Image from ${blockedUri} blocked`,
        recommendation: 'Add the domain to img-src allowlist if legitimate',
      };
    }

    // 接続関連の違反
    if (directive.startsWith('connect-src')) {
      return {
        severity: 'medium',
        category: 'Network Request',
        description: `Network request to ${blockedUri} blocked`,
        recommendation: 'Add the domain to connect-src allowlist if legitimate',
      };
    }

    // フレーム関連の違反
    if (directive.startsWith('frame-src') || directive.startsWith('frame-ancestors')) {
      return {
        severity: 'high',
        category: 'Frame Violation',
        description: `Frame loading from ${blockedUri} blocked`,
        recommendation: 'Review frame-src policy and add legitimate domains',
      };
    }

    // その他の違反
    return {
      severity: 'medium',
      category: 'Other Violation',
      description: `${directive} violation for ${blockedUri}`,
      recommendation: 'Review CSP policy and adjust if necessary',
    };
  }

  private handleViolation(reportWrapper: CSPReportWrapper): void {
    const report = reportWrapper['csp-report'];
    const categorization = this.categorizeViolation(report);

    const processedViolation: ProcessedViolation = {
      ...categorization,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: report['document-uri'],
    };

    // 違反を記録
    this.violations.unshift(processedViolation);
    
    // 最大数を超えた場合は古いものを削除
    if (this.violations.length > this.MAX_VIOLATIONS) {
      this.violations = this.violations.slice(0, this.MAX_VIOLATIONS);
    }

    // 開発環境でのログ出力
    if (process.env.NODE_ENV === 'development') {
      this.logViolation(processedViolation, report);
    }

    // 重要度の高い違反は即座に通知
    if (categorization.severity === 'critical' || categorization.severity === 'high') {
      this.notifyHighSeverityViolation(processedViolation);
    }

    // ローカルストレージに保存（デバッグ用）
    this.saveViolationToStorage(processedViolation);
  }

  private logViolation(violation: ProcessedViolation, report: CSPViolationReport): void {
    const logLevel = violation.severity === 'critical' ? 'error' : 
      violation.severity === 'high' ? 'warn' : 'info';
    
    console[logLevel]('CSP Violation:', {
      severity: violation.severity,
      category: violation.category,
      description: violation.description,
      recommendation: violation.recommendation,
      blockedUri: report['blocked-uri'],
      violatedDirective: report['violated-directive'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
    });
  }

  private notifyHighSeverityViolation(violation: ProcessedViolation): void {
    // 高重要度違反の通知（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.error(`🚨 High Severity CSP Violation: ${violation.description}`);
      console.error(`Recommendation: ${violation.recommendation}`);
    }
  }

  private saveViolationToStorage(violation: ProcessedViolation): void {
    try {
      const key = 'csp-violations';
      const stored = localStorage.getItem(key);
      const violations = stored ? JSON.parse(stored) as ProcessedViolation[] : [];
      
      violations.unshift(violation);
      
      // 最大50件まで保存
      const trimmed = violations.slice(0, 50);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('Failed to save CSP violation to storage:', error);
    }
  }

  // 違反レポートの取得
  getViolations(): ProcessedViolation[] {
    return [...this.violations];
  }

  // 重要度別の違反数取得
  getViolationStats(): Record<ViolationSeverity, number> {
    const stats: Record<ViolationSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    this.violations.forEach(violation => {
      stats[violation.severity]++;
    });

    return stats;
  }

  // 違反履歴のクリア
  clearViolations(): void {
    this.violations = [];
    localStorage.removeItem('csp-violations');
  }
}

// シングルトンインスタンス
const cspReporter = CSPReporter.getInstance();

// エクスポート関数
export function initializeCSPReporting(): void {
  // インスタンス作成により自動的に初期化される
  CSPReporter.getInstance();
}

export function getCSPViolations(): ProcessedViolation[] {
  return cspReporter.getViolations();
}

export function getCSPViolationStats(): Record<ViolationSeverity, number> {
  return cspReporter.getViolationStats();
}

export function clearCSPViolations(): void {
  cspReporter.clearViolations();
}
