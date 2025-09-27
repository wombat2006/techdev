/**
 * Wall Bounce Adapter - Backward Compatibility Layer
 * 既存のWallBounceAnalyzer APIを保持しながら新しいSRPアーキテクチャに段階移行
 *
 * 移行戦略:
 * 1. 既存APIの完全互換性維持
 * 2. 内部実装のみをSRPコンポーネントに委譲
 * 3. 段階的な移行パスを提供
 */
import { WallBounceOptions, WallBounceResult } from './wall-bounce-orchestrator';
import { TaskType } from './llm-provider-registry';
export { WallBounceResult } from './wall-bounce-orchestrator';
export interface LegacyWallBounceOptions {
    minProviders?: number;
    maxProviders?: number;
    requireConsensus?: boolean;
    confidenceThreshold?: number;
    taskType?: string;
}
/**
 * 既存のWallBounceAnalyzer APIを維持しつつ
 * 内部でSRPアーキテクチャを使用するアダプター
 *
 * 段階的移行戦略:
 * Phase 1: アダプターパターンで既存API保持
 * Phase 2: 新しいAPIを並行提供
 * Phase 3: 旧APIの非推奨化
 */
export declare class WallBounceAdapter {
    private orchestrator;
    constructor();
    /**
     * 既存のanalyze APIを完全互換で維持
     * @deprecated 新しいanalyzeWithSRP()の使用を推奨
     */
    analyze(prompt: string, taskType?: string, options?: LegacyWallBounceOptions): Promise<WallBounceResult>;
    /**
     * 新しいSRP APIを提供（推奨）
     * 明示的にSRPアーキテクチャを使用していることを示す
     */
    analyzeWithSRP(prompt: string, taskType?: TaskType, options?: WallBounceOptions): Promise<WallBounceResult>;
    /**
     * プロバイダー情報の取得（既存API維持）
     */
    getAvailableProviders(): string[];
    /**
     * プロバイダー可用性確認（既存API維持）
     */
    isProviderAvailable(providerName: string): boolean;
    private convertLegacyTaskType;
    private convertLegacyOptions;
    /**
     * 移行状況の確認
     */
    getMigrationStatus(): {
        phase: 'legacy' | 'hybrid' | 'modern';
        srpComponentsActive: boolean;
        recommendedAction: string;
    };
    /**
     * パフォーマンス比較（SRP vs Legacy）
     */
    performanceComparison(prompt: string): Promise<{
        srpTime: number;
        legacyEquivalentTime: number;
        improvement: string;
    }>;
}
export declare const wallBounceAdapter: WallBounceAdapter;
export { wallBounceAdapter as wallBounceAnalyzer };
