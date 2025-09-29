import { getRedisService } from './redis-service';
import { v4 as uuidv4 } from 'uuid';

export interface CodexSessionData {
  sessionId: string;
  conversationId: string;
  createdAt: string;
  lastUsedAt: string;
  prompt: string;
  model: string;
  sandbox: string;
  context: any[];
  messages: CodexMessage[];
  status: 'active' | 'completed' | 'failed';
}

export interface CodexMessage {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface CodexContinueRequest {
  sessionId?: string;
  conversationId?: string;
  prompt: string;
  model?: string;
  sandbox?: string;
}

export class CodexSessionManager {
  private redis;
  private readonly SESSION_PREFIX = 'codex:session';
  private readonly CONVERSATION_PREFIX = 'codex:conversation';
  private readonly DEFAULT_EXPIRE_SECONDS = 3600; // 1 hour
  private readonly MAX_SESSIONS_PER_USER = 10;

  constructor() {
    this.redis = getRedisService();
  }

  /**
   * Create new Codex session and store in Redis
   */
  async createSession(data: {
    prompt: string;
    model?: string;
    sandbox?: string;
    userId?: string;
  }): Promise<CodexSessionData> {
    const sessionId = uuidv4();
    const conversationId = uuidv4();
    const now = new Date().toISOString();
    
    const sessionData: CodexSessionData = {
      sessionId,
      conversationId,
      createdAt: now,
      lastUsedAt: now,
      prompt: data.prompt,
      model: data.model || 'gpt-5-codex',
      sandbox: data.sandbox || 'read-only',
      context: [],
      messages: [{
        type: 'user',
        content: data.prompt,
        timestamp: now
      }],
      status: 'active'
    };

    // Store session data with expiration
    await this.redis.setSession(
      `${this.SESSION_PREFIX}:${sessionId}`, 
      sessionData,
      this.DEFAULT_EXPIRE_SECONDS
    );

    // Store conversation mapping (conversationId -> sessionId)
    await this.redis.set(
      `${this.CONVERSATION_PREFIX}:${conversationId}`,
      sessionId,
      { ex: this.DEFAULT_EXPIRE_SECONDS }
    );

    // Track user sessions (if userId provided)
    if (data.userId) {
      await this.trackUserSession(data.userId, sessionId);
    }

    return sessionData;
  }

  /**
   * Get session by sessionId or conversationId
   */
  async getSession(identifier: string): Promise<CodexSessionData | null> {
    // Try direct session lookup first
    let sessionData = await this.redis.getSession(
      `${this.SESSION_PREFIX}:${identifier}`
    );

    if (!sessionData) {
      // Try conversation ID lookup
      const sessionId = await this.redis.get(
        `${this.CONVERSATION_PREFIX}:${identifier}`
      );
      
      if (sessionId) {
        sessionData = await this.redis.getSession(
          `${this.SESSION_PREFIX}:${sessionId}`
        );
      }
    }

    return sessionData;
  }

  /**
   * Continue existing session with new prompt
   */
  async continueSession(request: CodexContinueRequest): Promise<CodexSessionData | null> {
    const identifier = request.conversationId || request.sessionId;
    if (!identifier) {
      throw new Error('Either sessionId or conversationId must be provided');
    }

    const sessionData = await this.getSession(identifier);
    if (!sessionData) {
      return null;
    }

    // Update session with new message
    const now = new Date().toISOString();
    sessionData.lastUsedAt = now;
    sessionData.messages.push({
      type: 'user',
      content: request.prompt,
      timestamp: now
    });

    // Update model/sandbox if provided
    if (request.model) sessionData.model = request.model;
    if (request.sandbox) sessionData.sandbox = request.sandbox;

    // Save updated session
    await this.redis.setSession(
      `${this.SESSION_PREFIX}:${sessionData.sessionId}`,
      sessionData,
      this.DEFAULT_EXPIRE_SECONDS
    );

    // Extend conversation mapping expiration
    await this.redis.expire(
      `${this.CONVERSATION_PREFIX}:${sessionData.conversationId}`,
      this.DEFAULT_EXPIRE_SECONDS
    );

    return sessionData;
  }

  /**
   * Add assistant response to session
   */
  async addAssistantResponse(sessionId: string, content: string): Promise<void> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    sessionData.messages.push({
      type: 'assistant',
      content,
      timestamp: new Date().toISOString()
    });

    await this.redis.setSession(
      `${this.SESSION_PREFIX}:${sessionId}`,
      sessionData,
      this.DEFAULT_EXPIRE_SECONDS
    );
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: 'active' | 'completed' | 'failed'): Promise<void> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    sessionData.status = status;
    sessionData.lastUsedAt = new Date().toISOString();

    await this.redis.setSession(
      `${this.SESSION_PREFIX}:${sessionId}`,
      sessionData,
      this.DEFAULT_EXPIRE_SECONDS
    );
  }

  /**
   * Get conversation history for session
   */
  async getConversationHistory(identifier: string): Promise<CodexMessage[]> {
    const sessionData = await this.getSession(identifier);
    return sessionData?.messages || [];
  }

  /**
   * Delete session and cleanup
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      // Delete conversation mapping
      await this.redis.del(`${this.CONVERSATION_PREFIX}:${sessionData.conversationId}`);
    }
    
    // Delete session data
    await this.redis.deleteSession(`${this.SESSION_PREFIX}:${sessionId}`);
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    return await this.redis.smembers(`user:sessions:${userId}`);
  }

  /**
   * Track user session for cleanup
   */
  private async trackUserSession(userId: string, sessionId: string): Promise<void> {
    const userSessionsKey = `user:sessions:${userId}`;
    
    // Add to user sessions set
    await this.redis.sadd(userSessionsKey, sessionId);
    
    // Get current sessions count
    const sessions = await this.redis.smembers(userSessionsKey);
    
    // Clean old sessions if limit exceeded
    if (sessions.length > this.MAX_SESSIONS_PER_USER) {
      const sessionsToRemove = sessions.slice(0, sessions.length - this.MAX_SESSIONS_PER_USER);
      for (const oldSessionId of sessionsToRemove) {
        await this.deleteSession(oldSessionId);
        await this.redis.srem(userSessionsKey, oldSessionId);
      }
    }
    
    // Set expiration on user sessions set
    await this.redis.expire(userSessionsKey, this.DEFAULT_EXPIRE_SECONDS);
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalActiveSessions: number;
    totalConversations: number;
    oldestSession: string | null;
  }> {
    const sessionKeys = await this.redis.keys(`${this.SESSION_PREFIX}:*`);
    const conversationKeys = await this.redis.keys(`${this.CONVERSATION_PREFIX}:*`);
    
    let oldestSession: string | null = null;
    let oldestTimestamp = Date.now();
    
    for (const key of sessionKeys) {
      const sessionData = await this.redis.getSession(key);
      if (sessionData) {
        const createdAt = new Date(sessionData.createdAt).getTime();
        if (createdAt < oldestTimestamp) {
          oldestTimestamp = createdAt;
          oldestSession = sessionData.sessionId;
        }
      }
    }
    
    return {
      totalActiveSessions: sessionKeys.length,
      totalConversations: conversationKeys.length,
      oldestSession
    };
  }

  /**
   * Cleanup expired sessions (manual cleanup if needed)
   */
  async cleanupExpiredSessions(): Promise<{ cleaned: number }> {
    const sessionKeys = await this.redis.keys(`${this.SESSION_PREFIX}:*`);
    let cleaned = 0;
    
    for (const key of sessionKeys) {
      const ttl = await this.redis.ttl(key);
      if (ttl <= 0) {
        const sessionId = key.replace(`${this.SESSION_PREFIX}:`, '');
        await this.deleteSession(sessionId);
        cleaned++;
      }
    }
    
    return { cleaned };
  }
}

// Singleton instance
let codexSessionManager: CodexSessionManager | null = null;

export const getCodexSessionManager = (): CodexSessionManager => {
  if (!codexSessionManager) {
    codexSessionManager = new CodexSessionManager();
  }
  return codexSessionManager;
};