import { EmbeddingRequest, EmbeddingResponse, InferenceRequest, InferenceResponse, ModelInfo } from '../types/huggingface';
export declare class HuggingFaceMockClient {
    private config;
    constructor(config: any);
    generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;
    generateInference(request: InferenceRequest): Promise<InferenceResponse>;
    getModelInfo(modelId: string): Promise<ModelInfo>;
    getAvailableEmbeddingModels(): import("../types/huggingface").JapaneseEmbeddingModel[];
    testConnection(): Promise<boolean>;
    retryWithBackoff<T>(operation: () => Promise<T>, maxRetries?: number, initialDelay?: number): Promise<T>;
    private generateMockEmbedding;
    private hashString;
    private estimateTokenCount;
}
export default HuggingFaceMockClient;
