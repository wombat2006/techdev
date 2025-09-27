import { getRedisService } from './redis-service';

export interface SessionData {
  userId?: string;
  sessionId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  metadata?: Record<string, any>;
  conversationHistory?: ConversationEntry[];
}

export interface ConversationEntry {
  id: string;
  timestamp: Date;
  userMessage: string;
  assistantResponse: string;
  tokens?: {
    input: number;
    output: number;
  };
  cost?: number;
}

export class SessionManager {
  private redis = getRedisService();

  async createSession(userId?: string, metadata?: Record<string, any>): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionData: SessionData = {
      userId,
      sessionId,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      metadata: metadata || {},
      conversationHistory: []
    };

    await this.redis.setSession(sessionId, sessionData, 86400); // 24 hours

    if (userId) {
      await this.trackUserSession(userId, sessionId);
    }

    return sessionId;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.redis.getSession<SessionData>(sessionId);
    if (session) {
      // Update last accessed time
      session.lastAccessedAt = new Date();
      await this.redis.setSession(sessionId, session, 86400);
    }
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updatedSession = { ...session, ...updates, lastAccessedAt: new Date() };
    await this.redis.setSession(sessionId, updatedSession, 86400);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.deleteSession(sessionId);
  }

  async addConversationEntry(sessionId: string, entry: Omit<ConversationEntry, 'id' | 'timestamp'>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const conversationEntry: ConversationEntry = {
      id: this.generateEntryId(),
      timestamp: new Date(),
      ...entry
    };

    session.conversationHistory = session.conversationHistory || [];
    session.conversationHistory.push(conversationEntry);

    // Keep only last 100 entries to prevent unbounded growth
    if (session.conversationHistory.length > 100) {
      session.conversationHistory = session.conversationHistory.slice(-100);
    }

    await this.updateSession(sessionId, { conversationHistory: session.conversationHistory });
  }

  async getConversationHistory(sessionId: string, limit = 50): Promise<ConversationEntry[]> {
    const session = await this.getSession(sessionId);
    if (!session?.conversationHistory) {
      return [];
    }

    return session.conversationHistory.slice(-limit);
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    // Redis doesn't have efficient secondary indexing, so we maintain a user sessions set
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
    const sessions: SessionData[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.redis.getSession<SessionData>(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => 
      new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
    );
  }

  async cleanupExpiredSessions(): Promise<number> {
    // This would typically be run by a background job
    // For Upstash Redis, we rely on TTL for cleanup
    // But we can clean up our user session indexes
    const userKeys = await this.redis.keys('user_sessions:*');
    let cleanedCount = 0;

    for (const userKey of userKeys) {
      const sessionIds = await this.redis.smembers(userKey);
      for (const sessionId of sessionIds) {
        const exists = await this.redis.exists(`session:${sessionId}`);
        if (!exists) {
          await this.redis.srem(userKey, sessionId);
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateEntryId(): string {
    return `entry_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  // Helper method to track session in user index
  private async trackUserSession(userId: string, sessionId: string): Promise<void> {
    if (userId) {
      await this.redis.sadd(`user_sessions:${userId}`, sessionId);
    }
  }
}

// Singleton instance
let sessionManager: SessionManager | null = null;

export const getSessionManager = (): SessionManager => {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
};
