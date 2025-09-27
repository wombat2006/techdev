"use strict";
/**
 * Consensus Engine - Single Responsibility: Agreement Calculation & Consensus Building
 * 合意形成とスコア計算のみを責任とする
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsensusEngine = void 0;
const logger_1 = require("../utils/logger");
/**
 * LLM投票結果からの合意形成エンジン
 * 単一責任: 合意スコア計算とコンセンサス構築
 */
class ConsensusEngine {
    DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
    /**
     * 投票結果から合意スコアを計算
     */
    calculateAgreementScores(votes) {
        for (let i = 0; i < votes.length; i++) {
            let totalSimilarity = 0;
            let comparisons = 0;
            for (let j = 0; j < votes.length; j++) {
                if (i !== j) {
                    const similarity = this.calculateTextSimilarity(votes[i].response.content, votes[j].response.content);
                    totalSimilarity += similarity;
                    comparisons++;
                }
            }
            votes[i].agreement_score = comparisons > 0 ? totalSimilarity / comparisons : 0;
        }
        logger_1.logger.debug('Agreement scores calculated', {
            voteCount: votes.length,
            averageAgreement: votes.reduce((sum, v) => sum + v.agreement_score, 0) / votes.length
        });
    }
    /**
     * テキスト類似度計算（Jaccard係数）
     */
    calculateTextSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    }
    /**
     * 投票結果からコンセンサスを構築
     */
    async buildConsensus(votes, requireConsensus = true, confidenceThreshold = this.DEFAULT_CONFIDENCE_THRESHOLD) {
        if (votes.length === 0) {
            throw new Error('No votes available for consensus building');
        }
        // 合意スコアを計算
        this.calculateAgreementScores(votes);
        // 最高信頼度の投票を選択
        const bestVote = votes.reduce((best, current) => current.response.confidence > best.response.confidence ? current : best);
        // 合意レベルの計算
        const averageAgreement = votes.reduce((sum, v) => sum + v.agreement_score, 0) / votes.length;
        const consensusConfidence = (bestVote.response.confidence + averageAgreement) / 2;
        // コンセンサス要件チェック
        if (requireConsensus && consensusConfidence < confidenceThreshold) {
            logger_1.logger.warn('Consensus threshold not met', {
                consensusConfidence,
                threshold: confidenceThreshold,
                averageAgreement
            });
        }
        const result = {
            content: bestVote.response.content,
            confidence: consensusConfidence,
            reasoning: this.buildConsensusReasoning(votes, bestVote, averageAgreement)
        };
        logger_1.logger.info('Consensus built successfully', {
            finalConfidence: result.confidence,
            voterCount: votes.length,
            selectedProvider: bestVote.provider
        });
        return result;
    }
    /**
     * コンセンサス推論の構築
     */
    buildConsensusReasoning(votes, bestVote, averageAgreement) {
        const providerNames = votes.map(v => v.provider).join(', ');
        const confidenceRange = {
            min: Math.min(...votes.map(v => v.response.confidence)),
            max: Math.max(...votes.map(v => v.response.confidence))
        };
        return `Wall-bounce analysis completed with ${votes.length} LLM providers (${providerNames}). ` +
            `Selected response from ${bestVote.provider} with confidence ${bestVote.response.confidence.toFixed(3)}. ` +
            `Average agreement score: ${averageAgreement.toFixed(3)}. ` +
            `Confidence range: ${confidenceRange.min.toFixed(3)} - ${confidenceRange.max.toFixed(3)}. ` +
            `Original reasoning: ${bestVote.response.reasoning}`;
    }
    /**
     * 合意品質の評価
     */
    evaluateConsensusQuality(votes) {
        if (votes.length === 0) {
            return {
                quality: 'low',
                metrics: { averageConfidence: 0, agreementVariance: 1, unanimity: false }
            };
        }
        const confidences = votes.map(v => v.response.confidence);
        const agreements = votes.map(v => v.agreement_score);
        const averageConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
        const agreementVariance = this.calculateVariance(agreements);
        const unanimity = agreementVariance < 0.1; // 低分散は全員一致を示す
        let quality;
        if (averageConfidence > 0.8 && agreementVariance < 0.2) {
            quality = 'high';
        }
        else if (averageConfidence > 0.6 && agreementVariance < 0.4) {
            quality = 'medium';
        }
        else {
            quality = 'low';
        }
        return {
            quality,
            metrics: { averageConfidence, agreementVariance, unanimity }
        };
    }
    calculateVariance(numbers) {
        const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
        const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
        return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
    }
}
exports.ConsensusEngine = ConsensusEngine;
//# sourceMappingURL=consensus-engine.js.map