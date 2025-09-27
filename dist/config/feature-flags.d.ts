/**
 * Feature Flags Configuration
 * 本番環境でのSRP移行を安全に制御するためのフィーチャーフラグ
 */
export interface FeatureFlags {
    useSRPWallBounceArchitecture: boolean;
    srpMigrationPhase: 'disabled' | 'pilot' | 'partial' | 'full';
    srpTrafficPercentage: number;
    enableSRPRollback: boolean;
    monitorSRPPerformance: boolean;
    enableSRPDebugLogs: boolean;
    allowSRPDirectAccess: boolean;
}
/**
 * 最終的なフィーチャーフラグ設定
 */
export declare const featureFlags: FeatureFlags;
/**
 * フィーチャーフラグの安全性チェック
 */
export declare function validateFeatureFlags(): {
    valid: boolean;
    warnings: string[];
};
/**
 * SRP使用判定関数
 */
export declare function shouldUseSRPArchitecture(): boolean;
/**
 * SRP移行フェーズの確認
 */
export declare function getSRPMigrationPhase(): FeatureFlags['srpMigrationPhase'];
/**
 * フィーチャーフラグのログ出力
 */
export declare function logFeatureFlags(logger: any): void;
/**
 * 緊急時のSRP無効化
 */
export declare function emergencyDisableSRP(): void;
