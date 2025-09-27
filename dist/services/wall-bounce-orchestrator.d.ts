/**
 * Wall Bounce Orchestrator - Single Responsibility: Coordination & Flow Control
 * 壁打ち分析の調整と実行フロー制御のみを責任とする
 */
import { TaskType } from './llm-provider-registry';
import { VoteWithScore, ConsensusResult } from './consensus-engine';
export interface WallBounceOptions {
    minProviders?: number;
    maxProviders?: number;
    requireConsensus?: boolean;
    confidenceThreshold?: number;
}
export interface WallBounceResult {
    consensus: ConsensusResult;
    llm_votes: VoteWithScore[];
    total_cost: number;
    processing_time_ms: number;
    debug: {
        wall_bounce_verified: boolean;
        providers_used: string[];
        tier_escalated: boolean;
    };
}
/**
 * 壁打ち分析の実行調整のみを責任とする
 * プロバイダー管理はLLMProviderRegistry、合意形成はConsensusEngineに委譲
 */
export declare class WallBounceOrchestrator {
    private providerRegistry;
    private consensusEngine;
    constructor();
    /**
     * 壁打ち分析のメイン実行フロー
     */
    analyze(prompt: string, taskType?: TaskType, options?: WallBounceOptions): Promise<WallBounceResult>;
    /**
     * 並列LLM呼び出しの実行
     */
    private executeLLMCalls;
    /**
     * ティアエスカレーション判定
     */
    private checkTierEscalation;
    /**
     * 結果オブジェクトの構築
     */
    private buildResult;
    /**
     * メトリクス記録
     */
    private recordMetrics;
    /**
     * 利用可能なプロバイダー確認
     */
    getAvailableProviders(): string[];
    /**
     * プロバイダー可用性確認
     */
    isProviderAvailable(providerName: string): boolean;
}
