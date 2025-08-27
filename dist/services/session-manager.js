"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionManager = exports.SessionManager = void 0;
const redis_service_1 = require("./redis-service");
class SessionManager {
    redis = (0, redis_service_1.getRedisService)();
    async createSession(userId, metadata) {
        const sessionId = this.generateSessionId();
        const sessionData = {
            userId,
            sessionId,
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            metadata: metadata || {},
            conversationHistory: []
        };
        await this.redis.setSession(sessionId, sessionData, 86400); // 24 hours
        return sessionId;
    }
    async getSession(sessionId) {
        const session = await this.redis.getSession(sessionId);
        if (session) {
            // Update last accessed time
            session.lastAccessedAt = new Date();
            await this.redis.setSession(sessionId, session, 86400);
        }
        return session;
    }
    async updateSession(sessionId, updates) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const updatedSession = { ...session, ...updates, lastAccessedAt: new Date() };
        await this.redis.setSession(sessionId, updatedSession, 86400);
    }
    async deleteSession(sessionId) {
        await this.redis.deleteSession(sessionId);
    }
    async addConversationEntry(sessionId, entry) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const conversationEntry = {
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
    async getConversationHistory(sessionId, limit = 50) {
        const session = await this.getSession(sessionId);
        if (!session?.conversationHistory) {
            return [];
        }
        return session.conversationHistory.slice(-limit);
    }
    async getUserSessions(userId) {
        // Redis doesn't have efficient secondary indexing, so we maintain a user sessions set
        const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
        const sessions = [];
        for (const sessionId of sessionIds) {
            const session = await this.redis.getSession(sessionId);
            if (session) {
                sessions.push(session);
            }
        }
        return sessions.sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime());
    }
    async cleanupExpiredSessions() {
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
    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    generateEntryId() {
        return `entry_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }
    // Helper method to track session in user index
    async trackUserSession(userId, sessionId) {
        if (userId) {
            await this.redis.sadd(`user_sessions:${userId}`, sessionId);
        }
    }
}
exports.SessionManager = SessionManager;
// Singleton instance
let sessionManager = null;
const getSessionManager = () => {
    if (!sessionManager) {
        sessionManager = new SessionManager();
    }
    return sessionManager;
};
exports.getSessionManager = getSessionManager;
//# sourceMappingURL=session-manager.js.map