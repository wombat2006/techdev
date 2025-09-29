/**
 * Node.js Deprecation Warning Suppressor
 * Node.js廃止警告の制御とサプレッサー
 * 
 * 特にpunycode廃止警告の対処
 */

/**
 * Punycode廃止警告を抑制
 * Node.js v21.0.0以降のランタイム廃止警告への対処
 */
export function suppressPunycodeDeprecationWarnings(): void {
  // 環境変数を使用してpunycode警告を抑制
  if (!process.env.NODE_NO_WARNINGS) {
    process.env.NODE_NO_WARNINGS = 'deprecation';
  } else if (!process.env.NODE_NO_WARNINGS.includes('deprecation')) {
    process.env.NODE_NO_WARNINGS += ',deprecation';
  }
}

/**
 * 全般的な廃止警告制御
 * 環境変数に基づく柔軟な制御
 */
export function setupDeprecationWarningControl(): void {
  const suppressWarnings = process.env.SUPPRESS_NODE_WARNINGS?.split(',') || [];
  
  if (suppressWarnings.includes('punycode') || suppressWarnings.includes('all')) {
    suppressPunycodeDeprecationWarnings();
  }
  
  // NODE_NO_WARNINGSの値をチェック
  if (process.env.NODE_NO_WARNINGS?.includes('punycode')) {
    suppressPunycodeDeprecationWarnings();
  }
}

/**
 * プロセス起動時の自動初期化
 * このモジュールがインポートされた時点で実行
 */
if (process.env.NODE_ENV !== 'test') {
  setupDeprecationWarningControl();
}

export default {
  suppressPunycodeDeprecationWarnings,
  setupDeprecationWarningControl
};