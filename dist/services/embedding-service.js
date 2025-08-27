"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const huggingface_1 = require("../types/huggingface");
const logger_1 = require("../utils/logger");
class EmbeddingService {
    huggingFaceClient;
    config;
    embeddingCache;
    constructor(huggingFaceClient, config) {
        this.huggingFaceClient = huggingFaceClient;
        this.config = {
            maxBatchSize: 50,
            defaultModel: huggingface_1.JAPANESE_EMBEDDING_MODELS[0].modelPath,
            fallbackModels: huggingface_1.JAPANESE_EMBEDDING_MODELS.slice(1, 3).map(m => m.modelPath),
            cacheEnabled: true,
            cacheTTL: 3600000, // 1 hour in milliseconds
            ...config
        };
        this.embeddingCache = new Map();
    }
    async generateEmbeddings(request) {
        const model = request.model || this.config.defaultModel;
        const texts = Array.isArray(request.text) ? request.text : [request.text];
        // Check cache if enabled
        if (this.config.cacheEnabled) {
            const cacheKey = this.getCacheKey(texts, model);
            const cached = this.embeddingCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
                logger_1.logger.info('Using cached embeddings', { model, textCount: texts.length });
                return {
                    embeddings: cached.embeddings,
                    model,
                    usage: {
                        tokenCount: this.estimateTokenCount(texts),
                        processingTime: 0
                    }
                };
            }
        }
        // Batch processing for large requests
        const batches = this.createBatches(texts, this.config.maxBatchSize);
        const allEmbeddings = [];
        let totalProcessingTime = 0;
        let totalTokenCount = 0;
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            logger_1.logger.info(`Processing embedding batch ${i + 1}/${batches.length}`, {
                model,
                batchSize: batch.length
            });
            try {
                const batchResponse = await this.huggingFaceClient.retryWithBackoff(async () => {
                    return await this.huggingFaceClient.generateEmbeddings({
                        text: batch,
                        model,
                        options: request.options
                    });
                });
                allEmbeddings.push(...batchResponse.embeddings);
                totalProcessingTime += batchResponse.usage.processingTime;
                totalTokenCount += batchResponse.usage.tokenCount;
            }
            catch (error) {
                logger_1.logger.error(`Failed to process embedding batch ${i + 1}`, {
                    model,
                    batchSize: batch.length,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                // Try fallback models
                const fallbackResult = await this.tryFallbackModels(batch, request.options);
                if (fallbackResult) {
                    allEmbeddings.push(...fallbackResult.embeddings);
                    totalProcessingTime += fallbackResult.usage.processingTime;
                    totalTokenCount += fallbackResult.usage.tokenCount;
                }
                else {
                    throw error;
                }
            }
        }
        const response = {
            embeddings: allEmbeddings,
            model,
            usage: {
                tokenCount: totalTokenCount,
                processingTime: totalProcessingTime
            }
        };
        // Cache results if enabled
        if (this.config.cacheEnabled) {
            const cacheKey = this.getCacheKey(texts, model);
            this.embeddingCache.set(cacheKey, {
                embeddings: allEmbeddings,
                timestamp: Date.now()
            });
        }
        return response;
    }
    async analyzeWithMultipleModels(request) {
        const models = request.models || huggingface_1.JAPANESE_EMBEDDING_MODELS.slice(0, 3).map(m => m.modelPath);
        const texts = Array.isArray(request.text) ? request.text : [request.text];
        logger_1.logger.info('Starting multi-model embedding analysis', {
            modelCount: models.length,
            textCount: texts.length
        });
        const results = await Promise.allSettled(models.map(async (modelPath) => {
            const modelInfo = this.getModelInfo(modelPath);
            const startTime = Date.now();
            try {
                const response = await this.generateEmbeddings({
                    text: request.text,
                    model: modelPath,
                    options: {
                        normalize: request.options?.normalizeResults,
                    }
                });
                return {
                    model: modelPath,
                    embeddings: response.embeddings,
                    dimensions: response.embeddings[0]?.length || 0,
                    metadata: {
                        modelInfo,
                        processingTime: Date.now() - startTime,
                        tokenCount: response.usage.tokenCount
                    }
                };
            }
            catch (error) {
                logger_1.logger.warn(`Model ${modelPath} failed during analysis`, {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                throw error;
            }
        }));
        const successfulResults = results
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value);
        if (successfulResults.length === 0) {
            throw new Error('All embedding models failed during analysis');
        }
        let comparison;
        if (request.options?.compareModels && successfulResults.length > 1) {
            comparison = this.compareEmbeddingResults(successfulResults, texts) || undefined;
        }
        const analysisResponse = {
            results: successfulResults,
            comparison
        };
        logger_1.logger.info('Multi-model embedding analysis completed', {
            successfulModels: successfulResults.length,
            totalModels: models.length,
            bestModel: comparison?.bestModel
        });
        return analysisResponse;
    }
    async getRecommendedModel(text, taskType) {
        const textLength = text.length;
        const hasSpecializedTerms = this.detectSpecializedTerms(text);
        // Rule-based model selection
        if (taskType === huggingface_1.TaskType.CRITICAL || hasSpecializedTerms) {
            return huggingface_1.JAPANESE_EMBEDDING_MODELS.find(m => m.id === 'tohoku-bert-v3') || huggingface_1.JAPANESE_EMBEDDING_MODELS[0];
        }
        if (textLength < 100) {
            // Short text - use sentence-optimized model
            return huggingface_1.JAPANESE_EMBEDDING_MODELS.find(m => m.useCase === 'sentence') || huggingface_1.JAPANESE_EMBEDDING_MODELS[1];
        }
        if (textLength > 1000) {
            // Long text - use document-optimized model
            return huggingface_1.JAPANESE_EMBEDDING_MODELS.find(m => m.useCase === 'document') || huggingface_1.JAPANESE_EMBEDDING_MODELS[0];
        }
        // Default: general purpose model
        return huggingface_1.JAPANESE_EMBEDDING_MODELS.find(m => m.useCase === 'general') || huggingface_1.JAPANESE_EMBEDDING_MODELS[0];
    }
    async tryFallbackModels(texts, options) {
        for (const fallbackModel of this.config.fallbackModels) {
            try {
                logger_1.logger.info(`Trying fallback model: ${fallbackModel}`);
                const response = await this.huggingFaceClient.generateEmbeddings({
                    text: texts,
                    model: fallbackModel,
                    options
                });
                logger_1.logger.info(`Fallback model ${fallbackModel} succeeded`);
                return response;
            }
            catch (error) {
                logger_1.logger.warn(`Fallback model ${fallbackModel} also failed`, {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return null;
    }
    createBatches(texts, batchSize) {
        const batches = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            batches.push(texts.slice(i, i + batchSize));
        }
        return batches;
    }
    getCacheKey(texts, model) {
        const textHash = texts.join('|');
        return `${model}:${Buffer.from(textHash).toString('base64')}`;
    }
    getModelInfo(modelPath) {
        return huggingface_1.JAPANESE_EMBEDDING_MODELS.find(m => m.modelPath === modelPath) || huggingface_1.JAPANESE_EMBEDDING_MODELS[0];
    }
    compareEmbeddingResults(results, texts) {
        if (results.length < 2)
            return null;
        // Calculate average cosine similarity between different models
        const similarities = [];
        for (let i = 0; i < results.length - 1; i++) {
            for (let j = i + 1; j < results.length; j++) {
                const sim = this.calculateCosineSimilarity(results[i].embeddings[0], results[j].embeddings[0]);
                similarities.push(sim);
            }
        }
        const averageSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
        // Select best model based on processing time and dimensions
        const bestModel = results.reduce((best, current) => {
            const bestScore = (best.dimensions * 1000) / best.metadata.processingTime;
            const currentScore = (current.dimensions * 1000) / current.metadata.processingTime;
            return currentScore > bestScore ? current : best;
        });
        return {
            bestModel: bestModel.model,
            averageSimilarity,
            recommendation: this.generateRecommendation(bestModel, averageSimilarity, texts)
        };
    }
    calculateCosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    generateRecommendation(bestModel, averageSimilarity, texts) {
        const textLength = texts.join(' ').length;
        const modelInfo = this.getModelInfo(bestModel.model);
        if (averageSimilarity > 0.8) {
            return `高い一貫性（${(averageSimilarity * 100).toFixed(1)}%）。${modelInfo.name} を推奨します。`;
        }
        else if (averageSimilarity > 0.6) {
            return `中程度の一貫性（${(averageSimilarity * 100).toFixed(1)}%）。用途に応じてモデルを選択してください。`;
        }
        else {
            return `低い一貫性（${(averageSimilarity * 100).toFixed(1)}%）。テキストの性質を考慮したモデル選択が重要です。`;
        }
    }
    detectSpecializedTerms(text) {
        const specializedPatterns = [
            /システム|サーバ|データベース|ネットワーク/,
            /エラー|障害|異常|復旧/,
            /設定|構成|パラメータ|環境/,
            /ログ|監視|メトリクス|アラート/
        ];
        return specializedPatterns.some(pattern => pattern.test(text));
    }
    estimateTokenCount(texts) {
        return texts.reduce((total, text) => {
            const japaneseCharCount = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
            const otherCharCount = text.length - japaneseCharCount;
            return total + Math.ceil(japaneseCharCount * 1.5 + otherCharCount * 0.25);
        }, 0);
    }
    clearCache() {
        this.embeddingCache.clear();
        logger_1.logger.info('Embedding cache cleared');
    }
    getCacheStats() {
        return {
            size: this.embeddingCache.size,
            keys: Array.from(this.embeddingCache.keys())
        };
    }
}
exports.EmbeddingService = EmbeddingService;
exports.default = EmbeddingService;
//# sourceMappingURL=embedding-service.js.map