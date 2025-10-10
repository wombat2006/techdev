/**
 * Conversation History Persistence Service
 * Redis-based storage for LLM conversation histories
 */
import { ConversationHistory } from '../types/llm-conversation-schemas';
export interface ConversationSearchQuery {
    sessionId?: string;
    startDate?: string;
    endDate?: string;
    minCost?: number;
    maxCost?: number;
    executionMode?: 'parallel' | 'sequential' | 'deep-sequential';
    limit?: number;
}
export interface ConversationListResult {
    conversations: ConversationSummary[];
    total: number;
    hasMore: boolean;
}
export interface ConversationSummary {
    conversationId: string;
    sessionId?: string;
    startTime: string;
    endTime?: string;
    executionMode: string;
    totalRounds: number;
    totalCost: number;
    consensusScore: number;
    qualityScore: number;
}
export declare class ConversationHistoryPersistence {
    private redis;
    private readonly KEY_PREFIX;
    private readonly INDEX_PREFIX;
    private readonly SESSION_INDEX_PREFIX;
    private readonly DEFAULT_TTL;
    /**
     * Save conversation history to Redis
     */
    saveConversation(history: ConversationHistory, ttl?: number): Promise<void>;
    /**
     * Get conversation history by ID
     */
    getConversation(conversationId: string): Promise<ConversationHistory | null>;
    /**
     * List conversations by session ID
     */
    getConversationsBySession(sessionId: string, limit?: number): Promise<ConversationHistory[]>;
    /**
     * Search conversations with filters
     */
    searchConversations(query: ConversationSearchQuery): Promise<ConversationListResult>;
    /**
     * Delete conversation history
     */
    deleteConversation(conversationId: string): Promise<boolean>;
    /**
     * Get conversation statistics
     */
    getStatistics(sessionId?: string): Promise<{
        totalConversations: number;
        totalCost: number;
        averageCost: number;
        totalRounds: number;
        averageRounds: number;
        executionModes: Record<string, number>;
        averageConsensusScore: number;
        averageQualityScore: number;
    }>;
    /**
     * Export conversation to different formats
     */
    exportConversation(conversationId: string, format?: 'json' | 'markdown'): Promise<string | null>;
    /**
     * Cleanup old conversations (maintenance task)
     */
    cleanupOldConversations(olderThanDays?: number): Promise<number>;
    private buildKey;
    private buildIndexes;
    private matchesQuery;
    private formatAsMarkdown;
}
export declare const getConversationPersistence: () => ConversationHistoryPersistence;
