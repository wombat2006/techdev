"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHuggingFaceClient = exports.HuggingFaceClient = void 0;
const inference_1 = require("@huggingface/inference");
const axios_1 = __importDefault(require("axios"));
const huggingface_1 = require("../types/huggingface");
const logger_1 = require("../utils/logger");
const environment_1 = require("../config/environment");
class HuggingFaceClient {
    hf;
    httpClient;
    config;
    constructor(huggingFaceConfig) {
        this.config = huggingFaceConfig;
        this.hf = new inference_1.HfInference(huggingFaceConfig.apiKey);
        this.httpClient = axios_1.default.create({
            baseURL: huggingFaceConfig.baseUrl,
            timeout: huggingFaceConfig.timeout || 30000,
            headers: {
                'Authorization': `Bearer ${huggingFaceConfig.apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        this.setupInterceptors();
    }
    setupInterceptors() {
        this.httpClient.interceptors.request.use((config) => {
            logger_1.logger.info('HuggingFace API Request', {
                url: config.url,
                method: config.method,
                timestamp: new Date().toISOString()
            });
            return config;
        }, (error) => {
            logger_1.logger.error('HuggingFace API Request Error', error);
            return Promise.reject(error);
        });
        this.httpClient.interceptors.response.use((response) => {
            logger_1.logger.info('HuggingFace API Response', {
                status: response.status,
                url: response.config.url,
                timestamp: new Date().toISOString()
            });
            return response;
        }, (error) => {
            const huggingFaceError = this.handleApiError(error);
            logger_1.logger.error('HuggingFace API Error', huggingFaceError);
            return Promise.reject(huggingFaceError);
        });
    }
    handleApiError(error) {
        const statusCode = error.response?.status || 500;
        const errorData = error.response?.data;
        const errorMessage = errorData?.error || error.message || 'Unknown HuggingFace API error';
        const hfError = new Error(errorMessage);
        hfError.error = errorMessage;
        hfError.statusCode = statusCode;
        hfError.details = errorData;
        hfError.model = error.config?.url?.split('/').pop();
        hfError.retryable = statusCode >= 500 || statusCode === 429;
        return hfError;
    }
    async generateEmbeddings(request) {
        const startTime = Date.now();
        const model = request.model || huggingface_1.JAPANESE_EMBEDDING_MODELS[0].modelPath;
        try {
            logger_1.logger.info('Generating embeddings', {
                model,
                textCount: Array.isArray(request.text) ? request.text.length : 1
            });
            const response = await this.hf.featureExtraction({
                model,
                inputs: request.text
            });
            const embeddings = Array.isArray(response[0]) ? response : [response];
            const processingTime = Date.now() - startTime;
            const result = {
                embeddings,
                model,
                usage: {
                    tokenCount: this.estimateTokenCount(request.text),
                    processingTime
                }
            };
            logger_1.logger.info('Embeddings generated successfully', {
                model,
                embeddingCount: embeddings.length,
                dimensions: embeddings[0]?.length,
                processingTime
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to generate embeddings', {
                model,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async generateInference(request) {
        const startTime = Date.now();
        try {
            logger_1.logger.info('Generating text inference', {
                model: request.model,
                inputLength: request.inputs.length
            });
            const response = await this.hf.textGeneration({
                model: request.model,
                inputs: request.inputs,
                parameters: {
                    max_new_tokens: request.parameters?.max_new_tokens || 512,
                    temperature: request.parameters?.temperature || 0.7,
                    top_p: request.parameters?.top_p || 0.9,
                    repetition_penalty: request.parameters?.repetition_penalty || 1.1,
                    return_full_text: false,
                },
                options: {
                    wait_for_model: request.options?.wait_for_model ?? true,
                    use_cache: request.options?.use_cache ?? true
                }
            });
            const processingTime = Date.now() - startTime;
            const inputTokens = this.estimateTokenCount(request.inputs);
            const outputTokens = this.estimateTokenCount(response.generated_text);
            const result = {
                generated_text: response.generated_text,
                model: request.model,
                usage: {
                    inputTokens,
                    outputTokens,
                    processingTime
                }
            };
            logger_1.logger.info('Inference generated successfully', {
                model: request.model,
                inputTokens,
                outputTokens,
                processingTime
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to generate inference', {
                model: request.model,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async getModelInfo(modelId) {
        try {
            logger_1.logger.info('Fetching model information', { modelId });
            const response = await this.httpClient.get(`/models/${modelId}`);
            const modelData = response.data;
            const modelInfo = {
                id: modelData.id,
                name: modelData.id,
                description: modelData.cardData?.description || '',
                pipeline_tag: modelData.pipeline_tag,
                language: modelData.cardData?.language || [],
                license: modelData.cardData?.license || 'unknown',
                downloads: modelData.downloads || 0,
                likes: modelData.likes || 0,
                library_name: modelData.library_name || '',
                tags: modelData.tags || []
            };
            logger_1.logger.info('Model information fetched successfully', { modelId });
            return modelInfo;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch model information', {
                modelId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    getAvailableEmbeddingModels() {
        return huggingface_1.JAPANESE_EMBEDDING_MODELS;
    }
    async testConnection() {
        try {
            logger_1.logger.info('Testing HuggingFace connection');
            // Use a simple feature extraction request to test connection
            const testText = 'テスト';
            await this.generateEmbeddings({
                text: testText,
                model: huggingface_1.JAPANESE_EMBEDDING_MODELS[0].modelPath
            });
            logger_1.logger.info('HuggingFace connection test successful');
            return true;
        }
        catch (error) {
            logger_1.logger.error('HuggingFace connection test failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    estimateTokenCount(text) {
        if (Array.isArray(text)) {
            return text.reduce((total, t) => total + this.estimateTokenCount(t), 0);
        }
        // Japanese text token estimation (rough approximation)
        // Japanese characters typically represent 1-2 tokens each
        const japaneseCharCount = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
        const otherCharCount = text.length - japaneseCharCount;
        return Math.ceil(japaneseCharCount * 1.5 + otherCharCount * 0.25);
    }
    async retryWithBackoff(operation, maxRetries = this.config.retryAttempts || 3, initialDelay = 1000) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt === maxRetries || error?.retryable === false) {
                    break;
                }
                const delay = initialDelay * Math.pow(2, attempt);
                logger_1.logger.warn(`Retrying operation after ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }
}
exports.HuggingFaceClient = HuggingFaceClient;
/**
 * Factory function to create HuggingFace client instance
 *
 * Production: Uses real HuggingFace API with actual API key
 * Development: Can optionally use mock client (USE_HF_MOCK=true)
 *
 * @returns HuggingFaceClient instance (real or mock based on environment)
 */
const createHuggingFaceClient = () => {
    // Only use mock in development with explicit flag
    const useMock = process.env.NODE_ENV === 'development' && process.env.USE_HF_MOCK === 'true';
    if (useMock) {
        const { HuggingFaceMockClient } = require('./huggingface-mock');
        logger_1.logger.info('🧪 Using HuggingFace Mock Client (development only)', {
            environment: process.env.NODE_ENV,
            mockFlag: process.env.USE_HF_MOCK
        });
        return new HuggingFaceMockClient(environment_1.config.huggingface);
    }
    // Production: Use real HuggingFace API
    logger_1.logger.info('🚀 Using Real HuggingFace API Client', {
        environment: process.env.NODE_ENV,
        baseUrl: environment_1.config.huggingface.baseUrl,
        hasApiKey: !!environment_1.config.huggingface.apiKey
    });
    if (!environment_1.config.huggingface.apiKey) {
        throw new Error('HuggingFace API key is required for production use. Set HUGGINGFACE_API_KEY environment variable.');
    }
    return new HuggingFaceClient(environment_1.config.huggingface);
};
exports.createHuggingFaceClient = createHuggingFaceClient;
exports.default = HuggingFaceClient;
//# sourceMappingURL=huggingface-client.js.map