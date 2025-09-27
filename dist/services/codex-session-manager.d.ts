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
export declare class CodexSessionManager {
    private redis;
    private readonly SESSION_PREFIX;
    private readonly CONVERSATION_PREFIX;
    private readonly DEFAULT_EXPIRE_SECONDS;
    private readonly MAX_SESSIONS_PER_USER;
    constructor();
    /**
     * Create new Codex session and store in Redis
     */
    createSession(data: {
        prompt: string;
        model?: string;
        sandbox?: string;
        userId?: string;
    }): Promise<CodexSessionData>;
    /**
     * Get session by sessionId or conversationId
     */
    getSession(identifier: string): Promise<CodexSessionData | null>;
    /**
     * Continue existing session with new prompt
     */
    continueSession(request: CodexContinueRequest): Promise<CodexSessionData | null>;
    /**
     * Add assistant response to session
     */
    addAssistantResponse(sessionId: string, content: string): Promise<void>;
    /**
     * Update session status
     */
    updateSessionStatus(sessionId: string, status: 'active' | 'completed' | 'failed'): Promise<void>;
    /**
     * Get conversation history for session
     */
    getConversationHistory(identifier: string): Promise<CodexMessage[]>;
    /**
     * Delete session and cleanup
     */
    deleteSession(sessionId: string): Promise<void>;
    /**
     * Get active sessions for user
     */
    getUserSessions(userId: string): Promise<string[]>;
    /**
     * Track user session for cleanup
     */
    private trackUserSession;
    /**
     * Get session statistics
     */
    getSessionStats(): Promise<{
        totalActiveSessions: number;
        totalConversations: number;
        oldestSession: string | null;
    }>;
    /**
     * Cleanup expired sessions (manual cleanup if needed)
     */
    cleanupExpiredSessions(): Promise<{
        cleaned: number;
    }>;
}
export declare const getCodexSessionManager: () => CodexSessionManager;
