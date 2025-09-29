"use strict";
/**
 * Feature Flags Configuration
 * 本番環境でのSRP移行を安全に制御するためのフィーチャーフラグ
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emergencyDisableSRP = exports.logFeatureFlags = exports.getSRPMigrationPhase = exports.shouldUseSRPArchitecture = exports.validateFeatureFlags = exports.featureFlags = void 0;
/**
 * デフォルトのフィーチャーフラグ設定
 * 本番環境では慎重にSRP機能を無効化からスタート
 */
const defaultFlags = {
    // SRP Architecture - 初期は無効
    useSRPWallBounceArchitecture: false,
    srpMigrationPhase: 'disabled',
    srpTrafficPercentage: 0,
    // Safety Controls - 常に有効
    enableSRPRollback: true,
    monitorSRPPerformance: true,
    // Development - 環境に応じて
    enableSRPDebugLogs: process.env.NODE_ENV === 'development',
    allowSRPDirectAccess: process.env.NODE_ENV !== 'production'
};
/**
 * 環境変数からフィーチャーフラグを読み込み
 */
function loadFeatureFlagsFromEnv() {
    const flags = {};
    // SRP Architecture flags
    if (process.env.USE_SRP_WALL_BOUNCE !== undefined) {
        flags.useSRPWallBounceArchitecture = process.env.USE_SRP_WALL_BOUNCE === 'true';
    }
    if (process.env.SRP_MIGRATION_PHASE) {
        const phase = process.env.SRP_MIGRATION_PHASE;
        if (['disabled', 'pilot', 'partial', 'full'].includes(phase)) {
            flags.srpMigrationPhase = phase;
        }
    }
    if (process.env.SRP_TRAFFIC_PERCENTAGE) {
        const percentage = parseInt(process.env.SRP_TRAFFIC_PERCENTAGE, 10);
        if (percentage >= 0 && percentage <= 100) {
            flags.srpTrafficPercentage = percentage;
        }
    }
    // Safety flags
    if (process.env.ENABLE_SRP_ROLLBACK !== undefined) {
        flags.enableSRPRollback = process.env.ENABLE_SRP_ROLLBACK === 'true';
    }
    if (process.env.MONITOR_SRP_PERFORMANCE !== undefined) {
        flags.monitorSRPPerformance = process.env.MONITOR_SRP_PERFORMANCE === 'true';
    }
    // Debug flags
    if (process.env.ENABLE_SRP_DEBUG_LOGS !== undefined) {
        flags.enableSRPDebugLogs = process.env.ENABLE_SRP_DEBUG_LOGS === 'true';
    }
    return flags;
}
/**
 * 最終的なフィーチャーフラグ設定
 */
exports.featureFlags = {
    ...defaultFlags,
    ...loadFeatureFlagsFromEnv()
};
/**
 * フィーチャーフラグの安全性チェック
 */
function validateFeatureFlags() {
    const warnings = [];
    // 本番環境での安全性チェック
    if (process.env.NODE_ENV === 'production') {
        if (exports.featureFlags.useSRPWallBounceArchitecture && exports.featureFlags.srpMigrationPhase === 'disabled') {
            warnings.push('SRP architecture enabled but migration phase is disabled');
        }
        if (exports.featureFlags.srpTrafficPercentage > 50 && exports.featureFlags.srpMigrationPhase !== 'full') {
            warnings.push('High traffic percentage without full migration phase');
        }
        if (!exports.featureFlags.enableSRPRollback) {
            warnings.push('SRP rollback disabled in production - not recommended');
        }
    }
    return {
        valid: warnings.length === 0,
        warnings
    };
}
exports.validateFeatureFlags = validateFeatureFlags;
/**
 * SRP使用判定関数
 */
function shouldUseSRPArchitecture() {
    if (!exports.featureFlags.useSRPWallBounceArchitecture) {
        return false;
    }
    // 段階的ロールアウト制御
    if (exports.featureFlags.srpTrafficPercentage === 0) {
        return false;
    }
    if (exports.featureFlags.srpTrafficPercentage === 100) {
        return true;
    }
    // パーセンテージベースのランダム選択
    const random = Math.random() * 100;
    return random < exports.featureFlags.srpTrafficPercentage;
}
exports.shouldUseSRPArchitecture = shouldUseSRPArchitecture;
/**
 * SRP移行フェーズの確認
 */
function getSRPMigrationPhase() {
    return exports.featureFlags.srpMigrationPhase;
}
exports.getSRPMigrationPhase = getSRPMigrationPhase;
/**
 * フィーチャーフラグのログ出力
 */
function logFeatureFlags(logger) {
    logger.info('🏁 Feature Flags Configuration', {
        srpArchitecture: exports.featureFlags.useSRPWallBounceArchitecture,
        migrationPhase: exports.featureFlags.srpMigrationPhase,
        trafficPercentage: exports.featureFlags.srpTrafficPercentage,
        rollbackEnabled: exports.featureFlags.enableSRPRollback,
        performanceMonitoring: exports.featureFlags.monitorSRPPerformance,
        environment: process.env.NODE_ENV
    });
    const validation = validateFeatureFlags();
    if (!validation.valid) {
        logger.warn('⚠️ Feature Flag Warnings', { warnings: validation.warnings });
    }
}
exports.logFeatureFlags = logFeatureFlags;
/**
 * 緊急時のSRP無効化
 */
function emergencyDisableSRP() {
    exports.featureFlags.useSRPWallBounceArchitecture = false;
    exports.featureFlags.srpMigrationPhase = 'disabled';
    exports.featureFlags.srpTrafficPercentage = 0;
    console.warn('🚨 EMERGENCY: SRP Architecture has been disabled');
}
exports.emergencyDisableSRP = emergencyDisableSRP;
//# sourceMappingURL=feature-flags.js.map