import { spawn, ChildProcess } from 'child_process';
import { getCodexSessionManager, CodexSessionData, CodexContinueRequest } from './codex-session-manager';

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
    content: Array<{ text: string; type: string }>;
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

export class CodexMCPWrapper {
  private sessionManager;

  constructor() {
    this.sessionManager = getCodexSessionManager();
  }

  /**
   * Execute Codex request with Redis session management
   */
  async executeCodex(args: {
    prompt: string;
    model?: string;
    sandbox?: string;
    userId?: string;
  }): Promise<CodexExecutionResult> {
    try {
      // Create session in Redis first
      const sessionData = await this.sessionManager.createSession({
        prompt: args.prompt,
        model: args.model || 'gpt-5-codex',
        sandbox: args.sandbox || 'read-only',
        userId: args.userId
      });

      // Execute Codex via MCP
      const mcpRequest: CodexMCPRequest = {
        method: 'tools/call',
        params: {
          name: 'codex',
          arguments: {
            prompt: args.prompt,
            model: sessionData.model,
            sandbox: sessionData.sandbox
          }
        },
        id: 1
      };

      const result = await this.executeCodexMCP(mcpRequest, sessionData);
      
      if (result.success && result.response) {
        // Store assistant response in Redis
        await this.sessionManager.addAssistantResponse(sessionData.sessionId, result.response);
        await this.sessionManager.updateSessionStatus(sessionData.sessionId, 'completed');
      } else {
        await this.sessionManager.updateSessionStatus(sessionData.sessionId, 'failed');
      }

      return {
        ...result,
        sessionId: sessionData.sessionId,
        conversationId: sessionData.conversationId
      };

    } catch (error) {
      console.error('CodexMCPWrapper executeCodex error:', error);
      return {
        success: false,
        sessionId: '',
        conversationId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Continue existing Codex conversation
   */
  async continueCodex(request: CodexContinueRequest & { userId?: string }): Promise<CodexExecutionResult> {
    try {
      // Continue session in Redis
      const sessionData = await this.sessionManager.continueSession(request);
      if (!sessionData) {
        return {
          success: false,
          sessionId: '',
          conversationId: '',
          error: `Session not found for identifier: ${request.conversationId || request.sessionId}`
        };
      }

      // Build context from conversation history
      const conversationHistory = await this.sessionManager.getConversationHistory(sessionData.sessionId);
      const contextPrompt = this.buildContextPrompt(conversationHistory, request.prompt);

      // Execute Codex-reply via MCP (using regular codex with context)
      const mcpRequest: CodexMCPRequest = {
        method: 'tools/call',
        params: {
          name: 'codex',
          arguments: {
            prompt: contextPrompt,
            model: sessionData.model,
            sandbox: sessionData.sandbox
          }
        },
        id: 2
      };

      const result = await this.executeCodexMCP(mcpRequest, sessionData);
      
      if (result.success && result.response) {
        // Store assistant response in Redis
        await this.sessionManager.addAssistantResponse(sessionData.sessionId, result.response);
        await this.sessionManager.updateSessionStatus(sessionData.sessionId, 'completed');
      } else {
        await this.sessionManager.updateSessionStatus(sessionData.sessionId, 'failed');
      }

      return {
        ...result,
        sessionId: sessionData.sessionId,
        conversationId: sessionData.conversationId
      };

    } catch (error) {
      console.error('CodexMCPWrapper continueCodex error:', error);
      return {
        success: false,
        sessionId: '',
        conversationId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(identifier: string) {
    return await this.sessionManager.getConversationHistory(identifier);
  }

  /**
   * Execute Codex MCP request
   */
  private async executeCodexMCP(request: CodexMCPRequest, sessionData: CodexSessionData): Promise<CodexExecutionResult> {
    return new Promise((resolve) => {
      const codexProcess: ChildProcess = spawn('codex', ['mcp', 'serve'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      const events: any[] = [];
      let finalResponse = '';

      // Set timeout
      const timeout = setTimeout(() => {
        codexProcess.kill();
        resolve({
          success: false,
          sessionId: sessionData.sessionId,
          conversationId: sessionData.conversationId,
          error: 'Codex execution timeout'
        });
      }, 300000); // 5 minute timeout (effectively no timeout for testing)

      // Handle stdout (MCP responses)
      codexProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
        
        // Parse JSON-RPC responses
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const jsonResponse = JSON.parse(line);
              
              if (jsonResponse.method === 'codex/event') {
                events.push(jsonResponse.params);
                
                // Extract session information
                const msg = jsonResponse.params?.msg;
                if (msg?.type === 'session_configured') {
                  console.log('Codex session configured:', msg.session_id);
                }
              } else if (jsonResponse.id === request.id && jsonResponse.result) {
                // Final result
                if (jsonResponse.result.content && jsonResponse.result.content[0]) {
                  finalResponse = jsonResponse.result.content[0].text;
                }
              }
            } catch (e) {
              // Ignore non-JSON lines
            }
          }
        }
      });

      // Handle stderr
      codexProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      codexProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        const success = code === 0 && finalResponse.length > 0;
        
        resolve({
          success,
          sessionId: sessionData.sessionId,
          conversationId: sessionData.conversationId,
          response: finalResponse || undefined,
          error: success ? undefined : (stderr || 'Codex execution failed'),
          events
        });
      });

      // Handle process error
      codexProcess.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          sessionId: sessionData.sessionId,
          conversationId: sessionData.conversationId,
          error: `Process error: ${error.message}`
        });
      });

      // Send MCP request to Codex
      const jsonRequest = JSON.stringify({
        jsonrpc: '2.0',
        ...request
      });

      codexProcess.stdin?.write(jsonRequest + '\n');
      codexProcess.stdin?.end();
    });
  }

  /**
   * Build context prompt from conversation history
   */
  private buildContextPrompt(history: any[], newPrompt: string): string {
    let context = '# Conversation History\n\n';
    
    // Add recent messages (last 5 to keep context manageable)
    const recentHistory = history.slice(-5);
    for (const message of recentHistory) {
      if (message.type === 'user') {
        context += `**User**: ${message.content}\n\n`;
      } else if (message.type === 'assistant') {
        context += `**Assistant**: ${message.content}\n\n`;
      }
    }
    
    context += `# Current Request\n\n${newPrompt}`;
    return context;
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    return await this.sessionManager.getSessionStats();
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupSessions() {
    return await this.sessionManager.cleanupExpiredSessions();
  }
}

// Singleton instance
let codexMCPWrapper: CodexMCPWrapper | null = null;

export const getCodexMCPWrapper = (): CodexMCPWrapper => {
  if (!codexMCPWrapper) {
    codexMCPWrapper = new CodexMCPWrapper();
  }
  return codexMCPWrapper;
};
