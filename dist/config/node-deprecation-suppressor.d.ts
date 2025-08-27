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
export declare function suppressPunycodeDeprecationWarnings(): void;
/**
 * 全般的な廃止警告制御
 * 環境変数に基づく柔軟な制御
 */
export declare function setupDeprecationWarningControl(): void;
declare const _default: {
    suppressPunycodeDeprecationWarnings: typeof suppressPunycodeDeprecationWarnings;
    setupDeprecationWarningControl: typeof setupDeprecationWarningControl;
};
export default _default;
