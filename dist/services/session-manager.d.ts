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
export declare class SessionManager {
    private redis;
    createSession(userId?: string, metadata?: Record<string, any>): Promise<string>;
    getSession(sessionId: string): Promise<SessionData | null>;
    updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    addConversationEntry(sessionId: string, entry: Omit<ConversationEntry, 'id' | 'timestamp'>): Promise<void>;
    getConversationHistory(sessionId: string, limit?: number): Promise<ConversationEntry[]>;
    getUserSessions(userId: string): Promise<SessionData[]>;
    cleanupExpiredSessions(): Promise<number>;
    private generateSessionId;
    private generateEntryId;
    private trackUserSession;
}
export declare const getSessionManager: () => SessionManager;
