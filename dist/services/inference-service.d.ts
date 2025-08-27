import { HuggingFaceClient } from './huggingface-client';
import { InferenceRequest, InferenceResponse, TaskType } from '../types/huggingface';
export interface InferenceServiceConfig {
    defaultModel: string;
    fallbackModels: string[];
    maxRetries: number;
    timeoutMs: number;
    rateLimitPerMinute: number;
}
export interface ModelTierConfig {
    [TaskType.BASIC]: string[];
    [TaskType.PREMIUM]: string[];
    [TaskType.CRITICAL]: string[];
}
export interface ConversationContext {
    conversationId: string;
    history: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
    }>;
    metadata: {
        model: string;
        taskType: TaskType;
        totalTokens: number;
        cost: number;
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
export interface InferenceAnalysisResponse extends InferenceResponse {
    analysis: {
        confidence: number;
        relevance: number;
        completeness: number;
        recommendedFollowUp?: string[];
    };
    conversation?: {
        conversationId: string;
        continuationAvailable: boolean;
    };
    cost: {
        inputCost: number;
        outputCost: number;
        totalCost: number;
        budgetUsed: number;
    };
}
export declare class InferenceService {
    private huggingFaceClient;
    private config;
    private modelTiers;
    private conversationHistory;
    private requestCounts;
    constructor(huggingFaceClient: HuggingFaceClient, config?: Partial<InferenceServiceConfig>);
    generateInference(request: InferenceAnalysisRequest): Promise<InferenceAnalysisResponse>;
    generateMultiModelInference(request: InferenceAnalysisRequest, models?: string[]): Promise<Array<InferenceAnalysisResponse & {
        model: string;
    }>>;
    continueConversation(conversationId: string, userInput: string, options?: Partial<InferenceAnalysisRequest>): Promise<InferenceAnalysisResponse>;
    private selectModel;
    private prepareContextualInput;
    private buildSystemContext;
    private buildConversationContext;
    private postProcessResponse;
    private analyzeResponse;
    private calculateConfidence;
    private calculateRelevance;
    private calculateCompleteness;
    private generateFollowUpSuggestions;
    private tryFallbackInference;
    private updateConversationHistory;
    private checkRateLimit;
    private getDefaultMaxTokens;
    private getExpectedMinLength;
    private calculateCost;
    getConversationHistory(conversationId: string): ConversationContext | undefined;
    clearConversationHistory(conversationId: string): boolean;
    getActiveConversations(): string[];
}
export default InferenceService;
