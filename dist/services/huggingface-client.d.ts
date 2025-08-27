import { HuggingFaceConfig, EmbeddingRequest, EmbeddingResponse, InferenceRequest, InferenceResponse, ModelInfo, JapaneseEmbeddingModel } from '../types/huggingface';
export declare class HuggingFaceClient {
    private hf;
    private httpClient;
    private config;
    constructor(huggingFaceConfig: HuggingFaceConfig);
    private setupInterceptors;
    private handleApiError;
    generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;
    generateInference(request: InferenceRequest): Promise<InferenceResponse>;
    getModelInfo(modelId: string): Promise<ModelInfo>;
    getAvailableEmbeddingModels(): JapaneseEmbeddingModel[];
    testConnection(): Promise<boolean>;
    private estimateTokenCount;
    retryWithBackoff<T>(operation: () => Promise<T>, maxRetries?: number, initialDelay?: number): Promise<T>;
}
export declare const createHuggingFaceClient: () => HuggingFaceClient;
export default HuggingFaceClient;
