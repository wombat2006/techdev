"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuggingFaceMockClient = void 0;
const huggingface_1 = require("../types/huggingface");
const logger_1 = require("../utils/logger");
class HuggingFaceMockClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async generateEmbeddings(request) {
        const startTime = Date.now();
        const model = request.model || huggingface_1.JAPANESE_EMBEDDING_MODELS[0].modelPath;
        logger_1.logger.info('Mock: Generating embeddings', {
            model,
            textCount: Array.isArray(request.text) ? request.text.length : 1
        });
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        const texts = Array.isArray(request.text) ? request.text : [request.text];
        const dimensions = 768; // Standard BERT dimensions
        // Generate mock embeddings (random but consistent for same input)
        const embeddings = texts.map(text => {
            const seed = this.hashString(text + model);
            return this.generateMockEmbedding(dimensions, seed);
        });
        const processingTime = Date.now() - startTime;
        const tokenCount = this.estimateTokenCount(texts);
        const result = {
            embeddings,
            model,
            usage: {
                tokenCount,
                processingTime
            }
        };
        logger_1.logger.info('Mock: Embeddings generated successfully', {
            model,
            embeddingCount: embeddings.length,
            dimensions,
            processingTime
        });
        return result;
    }
    async generateInference(request) {
        const startTime = Date.now();
        logger_1.logger.info('Mock: Generating text inference', {
            model: request.model,
            inputLength: request.inputs.length
        });
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));
        // Generate mock response based on input
        const responses = [
            'システムエラーの解決方法を説明します。まず、ログファイルを確認してください。',
            'この問題は設定ファイルの不備が原因と考えられます。以下の手順で修正できます。',
            'データベース接続エラーが発生しています。接続設定を見直してください。',
            'サーバーの再起動が必要です。メンテナンス時間を設定してください。',
            'セキュリティパッチの適用をお勧めします。システムを最新状態に保ってください。'
        ];
        const seed = this.hashString(request.inputs + request.model);
        const generated_text = responses[seed % responses.length];
        const processingTime = Date.now() - startTime;
        const inputTokens = this.estimateTokenCount([request.inputs]);
        const outputTokens = this.estimateTokenCount([generated_text]);
        const result = {
            generated_text,
            model: request.model,
            usage: {
                inputTokens,
                outputTokens,
                processingTime
            }
        };
        logger_1.logger.info('Mock: Inference generated successfully', {
            model: request.model,
            inputTokens,
            outputTokens,
            processingTime
        });
        return result;
    }
    async getModelInfo(modelId) {
        logger_1.logger.info('Mock: Fetching model information', { modelId });
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
            id: modelId,
            name: modelId,
            description: `Mock description for ${modelId}`,
            pipeline_tag: 'feature-extraction',
            language: ['japanese', 'english'],
            license: 'apache-2.0',
            downloads: Math.floor(Math.random() * 10000),
            likes: Math.floor(Math.random() * 1000),
            library_name: 'transformers',
            tags: ['pytorch', 'bert', 'feature-extraction']
        };
    }
    getAvailableEmbeddingModels() {
        return huggingface_1.JAPANESE_EMBEDDING_MODELS;
    }
    async testConnection() {
        logger_1.logger.info('Mock: Testing connection (always returns true)');
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
    }
    async retryWithBackoff(operation, maxRetries = 3, initialDelay = 1000) {
        logger_1.logger.debug('Mock retryWithBackoff invoked', {
            maxRetries,
            initialDelay
        });
        // Mock implementation - just execute once
        return await operation();
    }
    generateMockEmbedding(dimensions, seed) {
        const embedding = [];
        let currentSeed = seed;
        for (let i = 0; i < dimensions; i++) {
            // Simple linear congruential generator for consistent random numbers
            currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
            const random = currentSeed / 0x7fffffff;
            embedding.push((random - 0.5) * 2); // Range [-1, 1]
        }
        // Normalize the embedding
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / magnitude);
    }
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    estimateTokenCount(texts) {
        return texts.reduce((total, text) => {
            const japaneseCharCount = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
            const otherCharCount = text.length - japaneseCharCount;
            return total + Math.ceil(japaneseCharCount * 1.5 + otherCharCount * 0.25);
        }, 0);
    }
}
exports.HuggingFaceMockClient = HuggingFaceMockClient;
exports.default = HuggingFaceMockClient;
//# sourceMappingURL=huggingface-mock.js.map