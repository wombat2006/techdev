import { HuggingFaceClient } from './huggingface-client';
import { EmbeddingRequest, EmbeddingResponse, JapaneseEmbeddingModel, TaskType } from '../types/huggingface';
export interface EmbeddingServiceConfig {
    maxBatchSize: number;
    defaultModel: string;
    fallbackModels: string[];
    cacheEnabled: boolean;
    cacheTTL: number;
}
export interface EmbeddingAnalysisRequest {
    text: string | string[];
    models?: string[];
    options?: {
        compareModels?: boolean;
        normalizeResults?: boolean;
        includeMetadata?: boolean;
    };
}
export interface EmbeddingAnalysisResponse {
    results: Array<{
        model: string;
        embeddings: number[][];
        dimensions: number;
        similarity?: number;
        metadata: {
            modelInfo: JapaneseEmbeddingModel;
            processingTime: number;
            tokenCount: number;
        };
    }>;
    comparison?: {
        bestModel: string;
        averageSimilarity: number;
        recommendation: string;
    };
}
export declare class EmbeddingService {
    private huggingFaceClient;
    private config;
    private embeddingCache;
    constructor(huggingFaceClient: HuggingFaceClient, config?: Partial<EmbeddingServiceConfig>);
    generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;
    analyzeWithMultipleModels(request: EmbeddingAnalysisRequest): Promise<EmbeddingAnalysisResponse>;
    getRecommendedModel(text: string, taskType?: TaskType): Promise<JapaneseEmbeddingModel>;
    private tryFallbackModels;
    private createBatches;
    private getCacheKey;
    private getModelInfo;
    private compareEmbeddingResults;
    private calculateCosineSimilarity;
    private generateRecommendation;
    private detectSpecializedTerms;
    private estimateTokenCount;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        keys: string[];
    };
}
export default EmbeddingService;
