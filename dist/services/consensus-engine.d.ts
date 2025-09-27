/**
 * Consensus Engine - Single Responsibility: Agreement Calculation & Consensus Building
 * 合意形成とスコア計算のみを責任とする
 */
import { LLMResponse } from './llm-provider-registry';
export interface VoteWithScore {
    provider: string;
    model: string;
    response: LLMResponse;
    agreement_score: number;
}
export interface ConsensusResult {
    content: string;
    confidence: number;
    reasoning: string;
}
/**
 * LLM投票結果からの合意形成エンジン
 * 単一責任: 合意スコア計算とコンセンサス構築
 */
export declare class ConsensusEngine {
    private readonly DEFAULT_CONFIDENCE_THRESHOLD;
    /**
     * 投票結果から合意スコアを計算
     */
    calculateAgreementScores(votes: VoteWithScore[]): void;
    /**
     * テキスト類似度計算（Jaccard係数）
     */
    private calculateTextSimilarity;
    /**
     * 投票結果からコンセンサスを構築
     */
    buildConsensus(votes: VoteWithScore[], requireConsensus?: boolean, confidenceThreshold?: number): Promise<ConsensusResult>;
    /**
     * コンセンサス推論の構築
     */
    private buildConsensusReasoning;
    /**
     * 合意品質の評価
     */
    evaluateConsensusQuality(votes: VoteWithScore[]): {
        quality: 'high' | 'medium' | 'low';
        metrics: {
            averageConfidence: number;
            agreementVariance: number;
            unanimity: boolean;
        };
    };
    private calculateVariance;
}
