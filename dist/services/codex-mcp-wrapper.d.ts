import { CodexContinueRequest } from './codex-session-manager';
export interface CodexMCPRequest {
    method: string;
    params: {
        name: string;
        arguments: any;
    };
    id?: number;
}
export interface CodexMCPResponse {
    id: number;
    jsonrpc: string;
    result?: {
        content: Array<{
            text: string;
            type: string;
        }>;
        conversationId?: string;
        sessionId?: string;
        isError?: boolean;
    };
    error?: any;
}
export interface CodexExecutionResult {
    success: boolean;
    sessionId: string;
    conversationId: string;
    response?: string;
    error?: string;
    events?: any[];
}
export declare class CodexMCPWrapper {
    private sessionManager;
    constructor();
    /**
     * Execute Codex request with Redis session management
     */
    executeCodex(args: {
        prompt: string;
        model?: string;
        sandbox?: string;
        userId?: string;
    }): Promise<CodexExecutionResult>;
    /**
     * Continue existing Codex conversation
     */
    continueCodex(request: CodexContinueRequest & {
        userId?: string;
    }): Promise<CodexExecutionResult>;
    /**
     * Get conversation history
     */
    getConversationHistory(identifier: string): Promise<any>;
    /**
     * Execute Codex MCP request
     */
    private executeCodexMCP;
    /**
     * Build context prompt from conversation history
     */
    private buildContextPrompt;
    /**
     * Get session statistics
     */
    getSessionStats(): Promise<any>;
    /**
     * Cleanup expired sessions
     */
    cleanupSessions(): Promise<any>;
}
export declare const getCodexMCPWrapper: () => CodexMCPWrapper;
