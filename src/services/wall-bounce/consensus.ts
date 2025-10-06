/**
 * Wall-Bounce Consensus Calculator
 * コンセンサススコアの決定論的計算
 */

import type { IWallBounceConsensus, LLMResponse } from './types';
import { logger } from '../../utils/logger';

export class WallBounceConsensus implements IWallBounceConsensus {
  /**
   * コンセンサススコアを計算（決定論的アルゴリズム）
   *
   * アルゴリズム:
   * 1. Provider数による基礎スコア (0.0-0.5)
   * 2. Confidence平均による品質スコア (0.0-0.3)
   * 3. レスポンス長の一貫性スコア (0.0-0.2)
   *
   * @param responses LLM応答の配列
   * @returns コンセンサススコア (0.0-1.0)
   */
  calculateConsensusScore(responses: LLMResponse[]): number {
    if (responses.length === 0) {
      logger.warn('⚠️ No responses provided for consensus calculation');
      return 0.0;
    }

    if (responses.length === 1) {
      // 単一プロバイダー: confidenceをそのまま返す
      return Math.min(responses[0].confidence, 0.5);
    }

    // 1. Provider数スコア (2-6 providers → 0.2-0.5)
    const providerScore = this.calculateProviderScore(responses.length);

    // 2. Confidence品質スコア (平均confidence → 0.0-0.3)
    const qualityScore = this.calculateQualityScore(responses);

    // 3. レスポンス一貫性スコア (長さのバラツキ → 0.0-0.2)
    const consistencyScore = this.calculateConsistencyScore(responses);

    const totalScore = providerScore + qualityScore + consistencyScore;

    logger.debug('📊 Consensus score calculated (deterministic)', {
      providerCount: responses.length,
      providerScore: providerScore.toFixed(3),
      qualityScore: qualityScore.toFixed(3),
      consistencyScore: consistencyScore.toFixed(3),
      totalScore: totalScore.toFixed(3)
    });

    // 最大1.0にクリップ
    return Math.min(totalScore, 1.0);
  }

  /**
   * Provider数に基づくスコア
   * 2 providers: 0.2
   * 3 providers: 0.3
   * 4 providers: 0.4
   * 5 providers: 0.45
   * 6+ providers: 0.5
   */
  private calculateProviderScore(providerCount: number): number {
    if (providerCount <= 1) return 0.0;
    if (providerCount === 2) return 0.2;
    if (providerCount === 3) return 0.3;
    if (providerCount === 4) return 0.4;
    if (providerCount === 5) return 0.45;
    return 0.5;  // 6+ providers
  }

  /**
   * Confidence平均による品質スコア
   * 平均confidence × 0.3 (最大0.3)
   */
  private calculateQualityScore(responses: LLMResponse[]): number {
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    return Math.min(avgConfidence * 0.3, 0.3);
  }

  /**
   * レスポンス長の一貫性スコア
   * 標準偏差が小さいほど高スコア (最大0.2)
   */
  private calculateConsistencyScore(responses: LLMResponse[]): number {
    const lengths = responses.map(r => r.content.length);
    const mean = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;

    // 標準偏差を計算
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    // 変動係数 (CV = stdDev / mean)
    const cv = mean > 0 ? stdDev / mean : 1.0;

    // CV が小さいほど一貫性が高い
    // CV 0.0 → score 0.2
    // CV 0.5 → score 0.1
    // CV 1.0+ → score 0.0
    const score = Math.max(0, 0.2 - (cv * 0.2));

    return score;
  }
}
