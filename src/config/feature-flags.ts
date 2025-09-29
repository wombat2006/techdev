/**
 * Feature Flags Configuration
 * 本番環境でのSRP移行を安全に制御するためのフィーチャーフラグ
 */

export interface FeatureFlags {
  // SRP Architecture Migration
  useSRPWallBounceArchitecture: boolean;
  srpMigrationPhase: 'disabled' | 'pilot' | 'partial' | 'full';
  srpTrafficPercentage: number;

  // Safety Controls
  enableSRPRollback: boolean;
  monitorSRPPerformance: boolean;

  // Development & Testing
  enableSRPDebugLogs: boolean;
  allowSRPDirectAccess: boolean;
}

/**
 * デフォルトのフィーチャーフラグ設定
 * 本番環境では慎重にSRP機能を無効化からスタート
 */
const defaultFlags: FeatureFlags = {
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
function loadFeatureFlagsFromEnv(): Partial<FeatureFlags> {
  const flags: Partial<FeatureFlags> = {};

  // SRP Architecture flags
  if (process.env.USE_SRP_WALL_BOUNCE !== undefined) {
    flags.useSRPWallBounceArchitecture = process.env.USE_SRP_WALL_BOUNCE === 'true';
  }

  if (process.env.SRP_MIGRATION_PHASE) {
    const phase = process.env.SRP_MIGRATION_PHASE as FeatureFlags['srpMigrationPhase'];
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
export const featureFlags: FeatureFlags = {
  ...defaultFlags,
  ...loadFeatureFlagsFromEnv()
};

/**
 * フィーチャーフラグの安全性チェック
 */
export function validateFeatureFlags(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // 本番環境での安全性チェック
  if (process.env.NODE_ENV === 'production') {
    if (featureFlags.useSRPWallBounceArchitecture && featureFlags.srpMigrationPhase === 'disabled') {
      warnings.push('SRP architecture enabled but migration phase is disabled');
    }

    if (featureFlags.srpTrafficPercentage > 50 && featureFlags.srpMigrationPhase !== 'full') {
      warnings.push('High traffic percentage without full migration phase');
    }

    if (!featureFlags.enableSRPRollback) {
      warnings.push('SRP rollback disabled in production - not recommended');
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * SRP使用判定関数
 */
export function shouldUseSRPArchitecture(): boolean {
  if (!featureFlags.useSRPWallBounceArchitecture) {
    return false;
  }

  // 段階的ロールアウト制御
  if (featureFlags.srpTrafficPercentage === 0) {
    return false;
  }

  if (featureFlags.srpTrafficPercentage === 100) {
    return true;
  }

  // パーセンテージベースのランダム選択
  const random = Math.random() * 100;
  return random < featureFlags.srpTrafficPercentage;
}

/**
 * SRP移行フェーズの確認
 */
export function getSRPMigrationPhase(): FeatureFlags['srpMigrationPhase'] {
  return featureFlags.srpMigrationPhase;
}

/**
 * フィーチャーフラグのログ出力
 */
export function logFeatureFlags(logger: any): void {
  logger.info('🏁 Feature Flags Configuration', {
    srpArchitecture: featureFlags.useSRPWallBounceArchitecture,
    migrationPhase: featureFlags.srpMigrationPhase,
    trafficPercentage: featureFlags.srpTrafficPercentage,
    rollbackEnabled: featureFlags.enableSRPRollback,
    performanceMonitoring: featureFlags.monitorSRPPerformance,
    environment: process.env.NODE_ENV
  });

  const validation = validateFeatureFlags();
  if (!validation.valid) {
    logger.warn('⚠️ Feature Flag Warnings', { warnings: validation.warnings });
  }
}

/**
 * 緊急時のSRP無効化
 */
export function emergencyDisableSRP(): void {
  featureFlags.useSRPWallBounceArchitecture = false;
  featureFlags.srpMigrationPhase = 'disabled';
  featureFlags.srpTrafficPercentage = 0;

  console.warn('🚨 EMERGENCY: SRP Architecture has been disabled');
}