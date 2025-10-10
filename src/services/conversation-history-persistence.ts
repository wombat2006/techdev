/**
 * Conversation History Persistence Service
 * Redis-based storage for LLM conversation histories
 */

import { getRedisService } from './redis-service';
import { ConversationHistory, ConversationValidation } from '../types/llm-conversation-schemas';
import { logger } from '../utils/logger';

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

export class ConversationHistoryPersistence {
  private redis = getRedisService();
  private readonly KEY_PREFIX = 'conversation:';
  private readonly INDEX_PREFIX = 'conversation:index:';
  private readonly SESSION_INDEX_PREFIX = 'conversation:session:';
  private readonly DEFAULT_TTL = 86400 * 30; // 30 days

  /**
   * Save conversation history to Redis
   */
  async saveConversation(
    history: ConversationHistory,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const key = this.buildKey(history.conversationId);

      // Save main conversation data
      await this.redis.setCache(key, history as any, ttl);

      // Build indexes
      await this.buildIndexes(history, ttl);

      logger.info('💾 Conversation history saved to Redis', {
        conversationId: history.conversationId,
        sessionId: history.sessionId,
        rounds: history.rounds.length,
        cost: history.performance.totalCost,
        ttl
      });
    } catch (error) {
      logger.error('❌ Failed to save conversation history', {
        conversationId: history.conversationId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get conversation history by ID
   */
  async getConversation(conversationId: string): Promise<ConversationHistory | null> {
    try {
      const key = this.buildKey(conversationId);
      const history = await this.redis.getCache<any>(key) as ConversationHistory | null;

      if (history) {
        logger.info('📖 Conversation history retrieved from Redis', {
          conversationId,
          rounds: history.rounds?.length || 0
        });
      }

      return history;
    } catch (error) {
      logger.error('❌ Failed to retrieve conversation history', {
        conversationId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * List conversations by session ID
   */
  async getConversationsBySession(
    sessionId: string,
    limit: number = 50
  ): Promise<ConversationHistory[]> {
    try {
      const indexKey = `${this.SESSION_INDEX_PREFIX}${sessionId}`;
      const conversationIds = await this.redis.smembers(indexKey);

      const conversations: ConversationHistory[] = [];

      // Fetch conversations (up to limit)
      const idsToFetch = conversationIds.slice(0, limit);
      for (const id of idsToFetch) {
        const conversation = await this.getConversation(id);
        if (conversation) {
          conversations.push(conversation);
        }
      }

      // Sort by start time (most recent first)
      conversations.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      logger.info('📚 Retrieved conversations by session', {
        sessionId,
        count: conversations.length,
        totalIndexed: conversationIds.length
      });

      return conversations;
    } catch (error) {
      logger.error('❌ Failed to retrieve conversations by session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Search conversations with filters
   */
  async searchConversations(query: ConversationSearchQuery): Promise<ConversationListResult> {
    try {
      let conversationIds: string[] = [];

      // Get by session if specified
      if (query.sessionId) {
        const indexKey = `${this.SESSION_INDEX_PREFIX}${query.sessionId}`;
        conversationIds = await this.redis.smembers(indexKey);
      } else {
        // Get all conversation IDs from main index
        const pattern = `${this.KEY_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        conversationIds = keys.map(key => key.replace(this.KEY_PREFIX, ''));
      }

      // Fetch and filter conversations
      const conversations: ConversationHistory[] = [];
      for (const id of conversationIds) {
        const conversation = await this.getConversation(id);
        if (conversation && this.matchesQuery(conversation, query)) {
          conversations.push(conversation);
        }

        // Respect limit early to avoid excessive reads
        if (conversations.length >= (query.limit || 50)) {
          break;
        }
      }

      // Sort by start time (most recent first)
      conversations.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      const limit = query.limit || 50;
      const hasMore = conversations.length > limit;
      const results = conversations.slice(0, limit);

      const summaries: ConversationSummary[] = results.map(c => ({
        conversationId: c.conversationId,
        sessionId: c.sessionId,
        startTime: c.startTime,
        endTime: c.endTime,
        executionMode: c.executionMode,
        totalRounds: c.rounds.length,
        totalCost: c.performance.totalCost,
        consensusScore: c.finalResult.consensusScore,
        qualityScore: c.finalResult.qualityScore
      }));

      logger.info('🔍 Conversation search completed', {
        query,
        resultCount: summaries.length,
        hasMore
      });

      return {
        conversations: summaries,
        total: conversationIds.length,
        hasMore
      };
    } catch (error) {
      logger.error('❌ Failed to search conversations', {
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        conversations: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * Delete conversation history
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const history = await this.getConversation(conversationId);
      if (!history) {
        return false;
      }

      // Delete main data
      const key = this.buildKey(conversationId);
      await this.redis.deleteCache(key);

      // Remove from session index
      if (history.sessionId) {
        const sessionIndexKey = `${this.SESSION_INDEX_PREFIX}${history.sessionId}`;
        await this.redis.srem(sessionIndexKey, conversationId);
      }

      logger.info('🗑️ Conversation history deleted', {
        conversationId
      });

      return true;
    } catch (error) {
      logger.error('❌ Failed to delete conversation history', {
        conversationId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get conversation statistics
   */
  async getStatistics(sessionId?: string): Promise<{
    totalConversations: number;
    totalCost: number;
    averageCost: number;
    totalRounds: number;
    averageRounds: number;
    executionModes: Record<string, number>;
    averageConsensusScore: number;
    averageQualityScore: number;
  }> {
    try {
      let conversations: ConversationHistory[] = [];

      if (sessionId) {
        conversations = await this.getConversationsBySession(sessionId, 1000);
      } else {
        // Get all conversations (up to 1000)
        const pattern = `${this.KEY_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        for (const key of keys.slice(0, 1000)) {
          const id = key.replace(this.KEY_PREFIX, '');
          const conversation = await this.getConversation(id);
          if (conversation) {
            conversations.push(conversation);
          }
        }
      }

      if (conversations.length === 0) {
        return {
          totalConversations: 0,
          totalCost: 0,
          averageCost: 0,
          totalRounds: 0,
          averageRounds: 0,
          executionModes: {},
          averageConsensusScore: 0,
          averageQualityScore: 0
        };
      }

      const totalCost = conversations.reduce((sum, c) => sum + c.performance.totalCost, 0);
      const totalRounds = conversations.reduce((sum, c) => sum + c.rounds.length, 0);
      const totalConsensus = conversations.reduce((sum, c) => sum + c.finalResult.consensusScore, 0);
      const totalQuality = conversations.reduce((sum, c) => sum + c.finalResult.qualityScore, 0);

      const executionModes: Record<string, number> = {};
      for (const c of conversations) {
        executionModes[c.executionMode] = (executionModes[c.executionMode] || 0) + 1;
      }

      return {
        totalConversations: conversations.length,
        totalCost,
        averageCost: totalCost / conversations.length,
        totalRounds,
        averageRounds: totalRounds / conversations.length,
        executionModes,
        averageConsensusScore: totalConsensus / conversations.length,
        averageQualityScore: totalQuality / conversations.length
      };
    } catch (error) {
      logger.error('❌ Failed to get conversation statistics', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Export conversation to different formats
   */
  async exportConversation(
    conversationId: string,
    format: 'json' | 'markdown' = 'json'
  ): Promise<string | null> {
    try {
      const history = await this.getConversation(conversationId);
      if (!history) {
        return null;
      }

      if (format === 'json') {
        return JSON.stringify(history, null, 2);
      } else {
        // Markdown format
        return this.formatAsMarkdown(history);
      }
    } catch (error) {
      logger.error('❌ Failed to export conversation', {
        conversationId,
        format,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Cleanup old conversations (maintenance task)
   */
  async cleanupOldConversations(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffTimestamp = cutoffDate.toISOString();

      const pattern = `${this.KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);

      let deletedCount = 0;

      for (const key of keys) {
        const id = key.replace(this.KEY_PREFIX, '');
        const conversation = await this.getConversation(id);

        if (conversation && conversation.startTime < cutoffTimestamp) {
          await this.deleteConversation(id);
          deletedCount++;
        }
      }

      logger.info('🧹 Old conversations cleaned up', {
        olderThanDays,
        deletedCount
      });

      return deletedCount;
    } catch (error) {
      logger.error('❌ Failed to cleanup old conversations', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  // Private helper methods

  private buildKey(conversationId: string): string {
    return `${this.KEY_PREFIX}${conversationId}`;
  }

  private async buildIndexes(history: ConversationHistory, ttl: number): Promise<void> {
    // Session index
    if (history.sessionId) {
      const sessionIndexKey = `${this.SESSION_INDEX_PREFIX}${history.sessionId}`;
      await this.redis.sadd(sessionIndexKey, history.conversationId);
      await this.redis.expire(sessionIndexKey, ttl);
    }
  }

  private matchesQuery(history: ConversationHistory, query: ConversationSearchQuery): boolean {
    // Date range
    if (query.startDate && history.startTime < query.startDate) {
      return false;
    }
    if (query.endDate && history.startTime > query.endDate) {
      return false;
    }

    // Cost range
    if (query.minCost !== undefined && history.performance.totalCost < query.minCost) {
      return false;
    }
    if (query.maxCost !== undefined && history.performance.totalCost > query.maxCost) {
      return false;
    }

    // Execution mode
    if (query.executionMode && history.executionMode !== query.executionMode) {
      return false;
    }

    return true;
  }

  private formatAsMarkdown(history: ConversationHistory): string {
    const lines: string[] = [];

    lines.push(`# Conversation History`);
    lines.push(`\n**ID**: ${history.conversationId}`);
    lines.push(`**Session**: ${history.sessionId || 'N/A'}`);
    lines.push(`**Mode**: ${history.executionMode}`);
    lines.push(`**Started**: ${history.startTime}`);
    lines.push(`**Ended**: ${history.endTime || 'In progress'}`);
    lines.push(`**Total Cost**: $${history.performance.totalCost.toFixed(4)}`);
    lines.push(`\n---\n`);

    // Rounds
    for (const round of history.rounds) {
      lines.push(`\n## Round ${round.roundNumber} (${round.status})`);
      lines.push(`\n**Prompt**: ${round.prompt.original}`);

      if (round.providerResponses.length > 0) {
        lines.push(`\n### Responses:\n`);
        for (const response of round.providerResponses) {
          lines.push(`\n#### ${response.providerName} (Tier ${response.tier})`);
          lines.push(`- **Confidence**: ${response.message.metadata.confidence?.toFixed(3)}`);
          lines.push(`- **Cost**: $${response.message.metadata.cost?.toFixed(4)}`);
          lines.push(`- **Latency**: ${response.executionTime}ms`);
          lines.push(`\n${response.message.content}\n`);
        }
      }
    }

    lines.push(`\n---\n`);
    lines.push(`\n## Final Result`);
    lines.push(`\n**Answer**: ${history.finalResult.answer}`);
    lines.push(`\n**Consensus**: ${history.finalResult.consensusScore.toFixed(3)}`);
    lines.push(`**Quality**: ${history.finalResult.qualityScore.toFixed(3)}`);

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
let conversationPersistence: ConversationHistoryPersistence | null = null;

export const getConversationPersistence = (): ConversationHistoryPersistence => {
  if (!conversationPersistence) {
    conversationPersistence = new ConversationHistoryPersistence();
  }
  return conversationPersistence;
};
