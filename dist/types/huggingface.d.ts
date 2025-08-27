export interface HuggingFaceConfig {
    apiKey: string;
    baseUrl: string;
    timeout?: number;
    retryAttempts?: number;
}
export interface EmbeddingRequest {
    text: string | string[];
    model?: string;
    options?: {
        normalize?: boolean;
        truncate?: boolean;
    };
}
export interface EmbeddingResponse {
    embeddings: number[][];
    model: string;
    usage: {
        tokenCount: number;
        processingTime: number;
    };
}
export interface InferenceRequest {
    inputs: string;
    model: string;
    parameters?: {
        max_new_tokens?: number;
        temperature?: number;
        top_p?: number;
        repetition_penalty?: number;
    };
    options?: {
        wait_for_model?: boolean;
        use_cache?: boolean;
    };
}
export interface InferenceAnalysisRequest extends InferenceRequest {
    taskType?: TaskType;
    conversationId?: string;
    context?: string;
    options?: InferenceRequest['options'] & {
        includeSystemContext?: boolean;
        enforceJapanese?: boolean;
        maxContextLength?: number;
    };
}
export interface InferenceResponse {
    generated_text: string;
    model: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
        processingTime: number;
    };
}
export interface ModelInfo {
    id: string;
    name: string;
    description: string;
    pipeline_tag: string;
    language: string[];
    license: string;
    downloads: number;
    likes: number;
    library_name: string;
    tags: string[];
}
export interface CostTracking {
    userId: string;
    sessionId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    timestamp: Date;
}
export interface JapaneseEmbeddingModel {
    id: string;
    name: string;
    description: string;
    modelPath: string;
    maxLength: number;
    dimensions: number;
    language: 'japanese';
    useCase: 'sentence' | 'document' | 'general';
}
export declare const JAPANESE_EMBEDDING_MODELS: JapaneseEmbeddingModel[];
export declare enum TaskType {
    BASIC = "basic",
    PREMIUM = "premium",
    CRITICAL = "critical"
}
export interface HuggingFaceError extends Error {
    error: string;
    statusCode: number;
    details?: any;
    model?: string;
    retryable: boolean;
}
