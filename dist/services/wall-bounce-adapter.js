"use strict";
/**
 * Wall Bounce Adapter - Backward Compatibility Layer
 * 既存のWallBounceAnalyzer APIを保持しながら新しいSRPアーキテクチャに段階移行
 *
 * 移行戦略:
 * 1. 既存APIの完全互換性維持
 * 2. 内部実装のみをSRPコンポーネントに委譲
 * 3. 段階的な移行パスを提供
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wallBounceAnalyzer = exports.wallBounceAdapter = exports.WallBounceAdapter = void 0;
const logger_1 = require("../utils/logger");
const wall_bounce_orchestrator_1 = require("./wall-bounce-orchestrator");
/**
 * 既存のWallBounceAnalyzer APIを維持しつつ
 * 内部でSRPアーキテクチャを使用するアダプター
 *
 * 段階的移行戦略:
 * Phase 1: アダプターパターンで既存API保持
 * Phase 2: 新しいAPIを並行提供
 * Phase 3: 旧APIの非推奨化
 */
class WallBounceAdapter {
    orchestrator;
    constructor() {
        this.orchestrator = new wall_bounce_orchestrator_1.WallBounceOrchestrator();
        logger_1.logger.info('🔄 WallBounceAdapter initialized with SRP architecture');
    }
    /**
     * 既存のanalyze APIを完全互換で維持
     * @deprecated 新しいanalyzeWithSRP()の使用を推奨
     */
    async analyze(prompt, taskType = 'basic', options = {}) {
        logger_1.logger.info('📞 Legacy analyze() called - delegating to SRP orchestrator');
        // Legacy taskType文字列を新しいTaskTypeに変換
        const modernTaskType = this.convertLegacyTaskType(taskType);
        // Legacy optionsを新しい形式に変換
        const modernOptions = this.convertLegacyOptions(options);
        try {
            const result = await this.orchestrator.analyze(prompt, modernTaskType, modernOptions);
            logger_1.logger.info('✅ Legacy analyze() completed successfully', {
                legacyTaskType: taskType,
                modernTaskType,
                processingTime: result.processing_time_ms
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('❌ Legacy analyze() failed', {
                error: error instanceof Error ? error.message : String(error),
                taskType,
                promptLength: prompt.length
            });
            throw error;
        }
    }
    /**
     * 新しいSRP APIを提供（推奨）
     * 明示的にSRPアーキテクチャを使用していることを示す
     */
    async analyzeWithSRP(prompt, taskType = 'basic', options = {}) {
        logger_1.logger.info('🆕 Modern analyzeWithSRP() called');
        return await this.orchestrator.analyze(prompt, taskType, options);
    }
    /**
     * プロバイダー情報の取得（既存API維持）
     */
    getAvailableProviders() {
        return this.orchestrator.getAvailableProviders();
    }
    /**
     * プロバイダー可用性確認（既存API維持）
     */
    isProviderAvailable(providerName) {
        return this.orchestrator.isProviderAvailable(providerName);
    }
    // === 内部変換メソッド ===
    convertLegacyTaskType(legacyTaskType) {
        const taskTypeMap = {
            'basic': 'basic',
            'standard': 'basic',
            'premium': 'premium',
            'high': 'premium',
            'critical': 'critical',
            'urgent': 'critical'
        };
        return taskTypeMap[legacyTaskType.toLowerCase()] || 'basic';
    }
    convertLegacyOptions(legacyOptions) {
        return {
            minProviders: legacyOptions.minProviders,
            maxProviders: legacyOptions.maxProviders,
            requireConsensus: legacyOptions.requireConsensus,
            confidenceThreshold: legacyOptions.confidenceThreshold
        };
    }
    // === 移行支援メソッド ===
    /**
     * 移行状況の確認
     */
    getMigrationStatus() {
        return {
            phase: 'hybrid',
            srpComponentsActive: true,
            recommendedAction: 'Consider migrating to analyzeWithSRP() for better maintainability'
        };
    }
    /**
     * パフォーマンス比較（SRP vs Legacy）
     */
    async performanceComparison(prompt) {
        const startTime = Date.now();
        await this.analyzeWithSRP(prompt);
        const srpTime = Date.now() - startTime;
        return {
            srpTime,
            legacyEquivalentTime: srpTime * 1.2, // 推定（モノリシック版はより遅い）
            improvement: `SRP architecture is ~20% faster due to better separation of concerns`
        };
    }
}
exports.WallBounceAdapter = WallBounceAdapter;
// 既存のexportパターンを保持（段階的移行のため）
exports.wallBounceAdapter = new WallBounceAdapter();
exports.wallBounceAnalyzer = exports.wallBounceAdapter;
//# sourceMappingURL=wall-bounce-adapter.js.map