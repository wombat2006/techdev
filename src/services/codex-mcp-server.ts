/**
 * Codex MCP Server - Full OpenAI Codex Integration via Model Context Protocol
 *
 * Implementation based on OpenAI Codex advanced documentation:
 * https://github.com/openai/codex/blob/main/docs/advanced.md
 *
 * Features:
 * - Interactive and non-interactive (CI/headless) execution modes
 * - Session resumption and management
 * - MCP tools: `codex` and `codex-reply` for conversation flow
 * - Advanced logging and tracing with RUST_LOG integration
 * - Configurable approval policies and security controls
 * - Wall-Bounce integration for multi-LLM coordination
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ListPromptsRequestSchema,
  ListPromptsResult,
  GetPromptRequestSchema,
  GetPromptResult,
  ListResourcesRequestSchema,
  ListResourcesResult,
  ReadResourceRequestSchema,
  ReadResourceResult,
  ListToolsRequestSchema,
  ListToolsResult
} from '@modelcontextprotocol/sdk/types.js';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger';
import { getCodexSessionManager, CodexSessionData } from './codex-session-manager';
import { mcpApprovalManager } from './mcp-approval-manager';
import { mcpConfigManager } from './mcp-config-manager';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface CodexMCPConfig {
  // Codex CLI Configuration
  model?: 'gpt-5' | 'gpt-5-codex' | 'o1' | 'o1-mini';
  sandbox?: 'read-only' | 'isolated' | 'full-access';
  base_instructions?: string;
  working_directory?: string;

  // MCP Integration Settings
  approval_policy?: 'auto' | 'manual' | 'risk-based';
  max_concurrent_sessions?: number;
  session_timeout_ms?: number;

  // パフォーマンス最適化設定
  enable_connection_pooling?: boolean;
  enable_response_caching?: boolean;
  cache_ttl_ms?: number;
  enable_request_batching?: boolean;
  batch_size?: number;
  batch_timeout_ms?: number;
  enable_compression?: boolean;
  enable_keep_alive?: boolean;

  // Logging and Monitoring
  rust_log_level?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  enable_tracing?: boolean;
  log_directory?: string;
  enable_performance_metrics?: boolean;

  // Wall-Bounce Integration
  enable_wall_bounce?: boolean;
  min_providers?: number;
  quality_threshold?: number;
}

export interface CodexExecutionContext {
  session_id?: string;
  conversation_id?: string;
  user_id?: string;
  mode: 'interactive' | 'non-interactive' | 'ci';
  resume_session?: boolean;
  full_auto?: boolean;
}

export class CodexMCPServer {
  private server: Server;
  private sessionManager;
  private config: CodexMCPConfig;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private logDirectory: string;

  // パフォーマンス最適化用プロパティ
  private connectionPool: Map<string, ChildProcess> = new Map();
  private responseCache: Map<string, { result: any; timestamp: number }> = new Map();
  private requestBatch: Array<{ id: string; request: any; resolve: Function; reject: Function }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private performanceMetrics: {
    total_requests: number;
    cache_hits: number;
    batch_executions: number;
    avg_response_time: number;
    error_rate: number;
  } = {
    total_requests: 0,
    cache_hits: 0,
    batch_executions: 0,
    avg_response_time: 0,
    error_rate: 0
  };

  constructor(config: CodexMCPConfig = {}) {
    this.config = {
      model: 'gpt-5-codex',
      sandbox: 'read-only',
      approval_policy: 'risk-based',
      max_concurrent_sessions: 15, // 最適化: 並行処理能力向上
      session_timeout_ms: 600000, // 最適化: 10分に延長
      rust_log_level: 'info',
      enable_tracing: true,
      enable_wall_bounce: true,
      min_providers: 2,
      quality_threshold: 0.7,
      // 新しい最適化設定
      enable_connection_pooling: true,
      enable_response_caching: true,
      cache_ttl_ms: 300000, // 5分キャッシュ
      enable_request_batching: true,
      batch_size: 5,
      batch_timeout_ms: 1000, // 1秒バッチタイムアウト
      ...config
    };

    this.sessionManager = getCodexSessionManager();
    this.logDirectory = this.config.log_directory || path.join(os.homedir(), '.codex', 'log');

    this.server = new Server(
      {
        name: 'codex-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {},
          prompts: {
            listChanged: true
          },
          resources: {
            subscribe: true,
            listChanged: true
          }
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Tool Handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'codex',
            description: 'Start a new Codex conversation with advanced GPT-5 capabilities',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The coding task or question for Codex'
                },
                model: {
                  type: 'string',
                  enum: ['gpt-5', 'gpt-5-codex', 'o1', 'o1-mini'],
                  description: 'OpenAI model to use',
                  default: 'gpt-5-codex'
                },
                sandbox: {
                  type: 'string',
                  enum: ['read-only', 'isolated', 'full-access'],
                  description: 'Execution sandbox level',
                  default: 'read-only'
                },
                mode: {
                  type: 'string',
                  enum: ['interactive', 'non-interactive', 'ci'],
                  description: 'Execution mode',
                  default: 'interactive'
                },
                full_auto: {
                  type: 'boolean',
                  description: 'Enable full autonomous execution (CI mode)',
                  default: false
                },
                reasoning_effort: {
                  type: 'string',
                  enum: ['minimal', 'medium', 'high'],
                  description: 'GPT-5 reasoning effort level'
                },
                verbosity: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: 'Response verbosity level'
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'codex-reply',
            description: 'Continue an existing Codex conversation',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Follow-up message or request'
                },
                session_id: {
                  type: 'string',
                  description: 'Session ID to continue'
                },
                conversation_id: {
                  type: 'string',
                  description: 'Conversation ID to continue'
                }
              },
              required: ['prompt'],
              oneOf: [
                { required: ['session_id'] },
                { required: ['conversation_id'] }
              ]
            }
          },
          {
            name: 'codex-session-info',
            description: 'Get information about Codex sessions',
            inputSchema: {
              type: 'object',
              properties: {
                session_id: {
                  type: 'string',
                  description: 'Session ID to query'
                },
                list_active: {
                  type: 'boolean',
                  description: 'List all active sessions',
                  default: false
                }
              }
            }
          },
          {
            name: 'codex-cleanup',
            description: 'Cleanup expired Codex sessions',
            inputSchema: {
              type: 'object',
              properties: {
                force: {
                  type: 'boolean',
                  description: 'Force cleanup all sessions',
                  default: false
                }
              }
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      this.performanceMetrics.total_requests++;

      const { name, arguments: args } = request.params;

      try {
        // キャッシュチェック（読み取り専用操作のみ）
        if (this.config.enable_response_caching && this.isReadOnlyOperation(name, args)) {
          const cacheKey = this.generateCacheKey(name, args);
          const cached = this.getCachedResponse(cacheKey);
          if (cached) {
            this.performanceMetrics.cache_hits++;
            logger.debug('Cache hit for operation:', { name, cacheKey });
            return cached;
          }
        }

        let result: CallToolResult;

        // バッチ処理が有効な場合
        if (this.config.enable_request_batching && this.isBatchableOperation(name)) {
          result = await this.handleBatchedRequest(name, args);
        } else {
          // 通常の処理
          switch (name) {
            case 'codex':
              result = await this.handleCodexTool(args);
              break;
            case 'codex-reply':
              result = await this.handleCodexReplyTool(args);
              break;
            case 'codex-session-info':
              result = await this.handleSessionInfoTool(args);
              break;
            case 'codex-cleanup':
              result = await this.handleCleanupTool(args);
              break;
            case 'codex-metrics':
              result = await this.handleMetricsTool(args);
              break;
            default:
              throw new Error(`Unknown tool: ${name}`);
          }
        }

        // レスポンスキャッシュ（読み取り専用操作）
        if (this.config.enable_response_caching && this.isReadOnlyOperation(name, args)) {
          const cacheKey = this.generateCacheKey(name, args);
          this.cacheResponse(cacheKey, result);
        }

        // パフォーマンスメトリクス更新
        const executionTime = Date.now() - startTime;
        this.updatePerformanceMetrics(executionTime, true);

        return result;
      } catch (error) {
        this.performanceMetrics.error_rate = (this.performanceMetrics.error_rate * this.performanceMetrics.total_requests + 1) / this.performanceMetrics.total_requests;
        const executionTime = Date.now() - startTime;
        this.updatePerformanceMetrics(executionTime, false);

        logger.error('Codex MCP tool execution failed', { tool: name, error });
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });

    // Prompt Handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'code-review',
            title: 'Code Review Assistant',
            description: 'Generate comprehensive code review with suggestions for improvement',
            arguments: [
              {
                name: 'code',
                description: 'Code to review',
                required: true
              },
              {
                name: 'language',
                description: 'Programming language',
                required: false
              }
            ]
          },
          {
            name: 'debug-helper',
            title: 'Debug Assistant',
            description: 'Help debug code issues and provide solutions',
            arguments: [
              {
                name: 'code',
                description: 'Code with issues',
                required: true
              },
              {
                name: 'error_message',
                description: 'Error message or description',
                required: false
              }
            ]
          },
          {
            name: 'refactor-code',
            title: 'Code Refactoring Assistant',
            description: 'Suggest refactoring improvements for better code quality',
            arguments: [
              {
                name: 'code',
                description: 'Code to refactor',
                required: true
              },
              {
                name: 'goal',
                description: 'Refactoring goal (performance, readability, etc.)',
                required: false
              }
            ]
          }
        ]
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'code-review':
          return {
            description: 'Code review prompt for Codex',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Please review the following ${args?.language || 'code'} and provide detailed feedback:\n\n${args?.code}\n\nFocus on:\n- Code quality and best practices\n- Potential bugs or issues\n- Performance improvements\n- Readability and maintainability`
                }
              }
            ]
          };
        case 'debug-helper':
          return {
            description: 'Debug assistance prompt for Codex',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Help me debug this code issue:\n\nCode:\n${args?.code}\n\n${args?.error_message ? `Error: ${args.error_message}\n\n` : ''}Please:\n- Identify the issue\n- Explain why it's happening\n- Provide a corrected version\n- Suggest prevention strategies`
                }
              }
            ]
          };
        case 'refactor-code':
          return {
            description: 'Code refactoring prompt for Codex',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Please refactor this code${args?.goal ? ` with focus on ${args.goal}` : ''}:\n\n${args?.code}\n\nProvide:\n- Refactored version\n- Explanation of changes\n- Benefits of the refactoring\n- Any trade-offs to consider`
                }
              }
            ]
          };
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });

    // Resource Handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const stats = await this.sessionManager.getSessionStats();

      return {
        resources: [
          {
            uri: 'codex://sessions/active',
            name: 'Active Sessions',
            title: 'Active Codex Sessions',
            description: 'List of currently active Codex sessions',
            mimeType: 'application/json'
          },
          {
            uri: 'codex://config/current',
            name: 'Current Configuration',
            title: 'Codex MCP Server Configuration',
            description: 'Current server configuration and settings',
            mimeType: 'application/json'
          },
          {
            uri: 'codex://logs/recent',
            name: 'Recent Logs',
            title: 'Recent Codex Execution Logs',
            description: 'Recent execution logs and tracing information',
            mimeType: 'text/plain'
          },
          {
            uri: 'codex://stats/performance',
            name: 'Performance Statistics',
            title: 'Codex Performance Metrics',
            description: `Performance statistics (${stats.totalActiveSessions} active sessions)`,
            mimeType: 'application/json'
          }
        ]
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'codex://sessions/active':
          const stats = await this.sessionManager.getSessionStats();
          return {
            contents: [
              {
                uri,
                name: 'Active Sessions',
                mimeType: 'application/json',
                text: JSON.stringify(stats, null, 2)
              }
            ]
          };

        case 'codex://config/current':
          return {
            contents: [
              {
                uri,
                name: 'Current Configuration',
                mimeType: 'application/json',
                text: JSON.stringify(this.config, null, 2)
              }
            ]
          };

        case 'codex://logs/recent':
          const logs = await this.getRecentLogs();
          return {
            contents: [
              {
                uri,
                name: 'Recent Logs',
                mimeType: 'text/plain',
                text: logs
              }
            ]
          };

        case 'codex://stats/performance':
          const perfStats = await this.getPerformanceStats();
          return {
            contents: [
              {
                uri,
                name: 'Performance Statistics',
                mimeType: 'application/json',
                text: JSON.stringify(perfStats, null, 2)
              }
            ]
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  /**
   * Handle the primary 'codex' tool - start new conversation
   */
  private async handleCodexTool(args: any): Promise<CallToolResult> {
    const {
      prompt,
      model = this.config.model,
      sandbox = this.config.sandbox,
      mode = 'interactive',
      full_auto = false,
      reasoning_effort,
      verbosity
    } = args;

    logger.info('🤖 Codex MCP: Starting new conversation', {
      model,
      sandbox,
      mode,
      full_auto,
      prompt_length: prompt.length
    });

    // Check approval if required
    if (this.config.approval_policy !== 'auto') {
      const approvalRequest = {
        id: `codex-${Date.now()}`,
        tool_name: 'codex',
        operation: 'start_conversation',
        arguments: { model, sandbox, mode, full_auto },
        context: { task_type: 'premium', cost_tier: 'medium' },
        requested_by: 'mcp-client',
        requested_at: Date.now(),
        risk_level: this.assessRiskLevel(sandbox, full_auto, mode) as any
      };

      const approval = await mcpApprovalManager.requestApproval(
        approvalRequest.tool_name,
        'execute',
        approvalRequest.arguments,
        {
          taskType: approvalRequest.context.task_type,
          budgetTier: approvalRequest.context.cost_tier,
          securityLevel: 'standard'
        } as any,
        approvalRequest.requested_by
      );

      if (!approval.requiresApproval || !approval.autoApproved) {
        const rejectionReason = approval.requestId ?
          `Manual approval required (ID: ${approval.requestId})` :
          'Request denied by policy';

        return {
          content: [
            {
              type: 'text',
              text: `Request denied: ${rejectionReason}`
            }
          ],
          isError: true
        };
      }
    }

    try {
      // Create session
      const sessionData = await this.sessionManager.createSession({
        prompt,
        model,
        sandbox
      });

      // Build execution context
      const context: CodexExecutionContext = {
        session_id: sessionData.sessionId,
        conversation_id: sessionData.conversationId,
        mode: mode as any,
        full_auto
      };

      // Execute Codex
      const result = await this.executeCodex(prompt, model, sandbox, context, {
        reasoning_effort,
        verbosity
      });

      // Store result in session
      if (result.success && result.response) {
        await this.sessionManager.addAssistantResponse(sessionData.sessionId, result.response);
        await this.sessionManager.updateSessionStatus(sessionData.sessionId, 'completed');
      } else {
        await this.sessionManager.updateSessionStatus(sessionData.sessionId, 'failed');
      }

      return {
        content: [
          {
            type: 'text',
            text: result.response || result.error || 'No response received'
          }
        ],
        conversationId: sessionData.conversationId,
        sessionId: sessionData.sessionId,
        isError: !result.success
      };

    } catch (error) {
      logger.error('Codex execution failed', { error });
      return {
        content: [
          {
            type: 'text',
            text: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle 'codex-reply' tool - continue conversation
   */
  private async handleCodexReplyTool(args: any): Promise<CallToolResult> {
    const { prompt, session_id, conversation_id } = args;
    const identifier = session_id || conversation_id;

    if (!identifier) {
      return {
        content: [
          {
            type: 'text',
            text: 'Either session_id or conversation_id must be provided'
          }
        ],
        isError: true
      };
    }

    logger.info('🔄 Codex MCP: Continuing conversation', {
      identifier,
      prompt_length: prompt.length
    });

    try {
      // Continue session
      const sessionData = await this.sessionManager.continueSession({
        sessionId: session_id,
        conversationId: conversation_id,
        prompt
      });

      if (!sessionData) {
        return {
          content: [
            {
              type: 'text',
              text: `Session not found: ${identifier}`
            }
          ],
          isError: true
        };
      }

      // Build context with conversation history
      const history = await this.sessionManager.getConversationHistory(sessionData.sessionId);
      const contextPrompt = this.buildContextPrompt(history, prompt);

      const context: CodexExecutionContext = {
        session_id: sessionData.sessionId,
        conversation_id: sessionData.conversationId,
        mode: 'interactive',
        resume_session: true
      };

      // Execute Codex with context
      const result = await this.executeCodex(
        contextPrompt,
        sessionData.model,
        sessionData.sandbox,
        context
      );

      // Store result
      if (result.success && result.response) {
        await this.sessionManager.addAssistantResponse(sessionData.sessionId, result.response);
        await this.sessionManager.updateSessionStatus(sessionData.sessionId, 'completed');
      } else {
        await this.sessionManager.updateSessionStatus(sessionData.sessionId, 'failed');
      }

      return {
        content: [
          {
            type: 'text',
            text: result.response || result.error || 'No response received'
          }
        ],
        conversationId: sessionData.conversationId,
        sessionId: sessionData.sessionId,
        isError: !result.success
      };

    } catch (error) {
      logger.error('Codex reply failed', { error });
      return {
        content: [
          {
            type: 'text',
            text: `Reply failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle session info tool
   */
  private async handleSessionInfoTool(args: any): Promise<CallToolResult> {
    const { session_id, list_active = false } = args;

    try {
      if (list_active) {
        const stats = await this.sessionManager.getSessionStats();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2)
            }
          ]
        };
      }

      if (session_id) {
        const session = await this.sessionManager.getSession(session_id);
        const history = session ? await this.sessionManager.getConversationHistory(session_id) : null;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ session, history }, null, 2)
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: 'Please provide session_id or set list_active to true'
          }
        ],
        isError: true
      };

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get session info: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle cleanup tool
   */
  private async handleCleanupTool(args: any): Promise<CallToolResult> {
    const { force = false } = args;

    try {
      const result = await this.sessionManager.cleanupExpiredSessions();

      if (force) {
        // Force cleanup all active processes
        for (const [sessionId, process] of this.activeProcesses) {
          process.kill('SIGTERM');
          this.activeProcesses.delete(sessionId);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Cleanup completed. Removed ${result.cleaned} expired sessions.${force ? ' Forced termination of active processes.' : ''}`
          }
        ]
      };

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Execute Codex with proper CLI integration
   */
  private async executeCodex(
    prompt: string,
    model: string,
    sandbox: string,
    context: CodexExecutionContext,
    options?: {
      reasoning_effort?: string;
      verbosity?: string;
    }
  ): Promise<{
    success: boolean;
    response?: string;
    error?: string;
    session_id?: string;
    events?: any[];
  }> {
    return new Promise((resolve) => {
      const sessionId = context.session_id || `session-${Date.now()}`;

      // Prepare environment
      const env = {
        ...process.env,
        RUST_LOG: this.config.rust_log_level || 'info'
      };

      // Build command based on mode
      let args: string[];
      if (context.mode === 'ci' || context.mode === 'non-interactive') {
        args = ['exec', '--model', model, '--json'];
        if (context.full_auto) {
          args.push('--full-auto');
        }
        if (sandbox !== 'read-only') {
          args.push('--sandbox', sandbox);
        }
        args.push('--skip-git-repo-check');
        // Add prompt as final argument for non-interactive mode
        args.push(prompt);
      } else {
        // Interactive mode with MCP
        args = ['mcp', 'serve'];
      }

      logger.info('🚀 Starting Codex process', {
        sessionId,
        mode: context.mode,
        model,
        sandbox,
        args: args.slice(0, -1) // Don't log the full prompt
      });

      const codexProcess = spawn('codex', args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.config.working_directory || process.cwd()
      });

      this.activeProcesses.set(sessionId, codexProcess);

      let stdout = '';
      let stderr = '';
      const events: any[] = [];
      let finalResponse = '';

      // Set timeout
      const timeout = setTimeout(() => {
        codexProcess.kill('SIGTERM');
        this.activeProcesses.delete(sessionId);
        resolve({
          success: false,
          error: 'Execution timeout',
          session_id: sessionId
        });
      }, this.config.session_timeout_ms || 300000);

      // Handle stdout
      codexProcess.stdout?.on('data', (data) => {
        stdout += data.toString();

        if (context.mode === 'interactive') {
          // Parse MCP responses
          this.parseMCPResponses(data.toString(), events, (response) => {
            finalResponse = response;
          });
        } else {
          // Parse JSON output for non-interactive mode
          this.parseJSONOutput(data.toString(), events, (response) => {
            finalResponse = response;
          });
        }
      });

      // Handle stderr
      codexProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        logger.debug('Codex stderr', { sessionId, data: data.toString() });
      });

      // Handle process completion
      codexProcess.on('close', (code) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(sessionId);

        const success = code === 0 && (finalResponse.length > 0 || context.mode === 'ci');

        resolve({
          success,
          response: finalResponse || stdout || undefined,
          error: success ? undefined : (stderr || `Process exited with code ${code}`),
          session_id: sessionId,
          events
        });
      });

      // Handle process error
      codexProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(sessionId);
        resolve({
          success: false,
          error: `Process error: ${error.message}`,
          session_id: sessionId
        });
      });

      // Send input if interactive mode
      if (context.mode === 'interactive') {
        const mcpRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'codex',
            arguments: {
              prompt,
              model,
              sandbox,
              ...options
            }
          }
        };

        codexProcess.stdin?.write(JSON.stringify(mcpRequest) + '\n');
        codexProcess.stdin?.end();
      }
    });
  }

  /**
   * Parse MCP responses from Codex interactive mode
   */
  private parseMCPResponses(
    data: string,
    events: any[],
    onResponse: (response: string) => void
  ): void {
    const lines = data.split('\n');

    for (const line of lines) {
      if (line.trim()) {
        try {
          const jsonResponse = JSON.parse(line);

          if (jsonResponse.method === 'codex/event') {
            events.push(jsonResponse.params);
          } else if (jsonResponse.id && jsonResponse.result) {
            if (jsonResponse.result.content && jsonResponse.result.content[0]) {
              onResponse(jsonResponse.result.content[0].text);
            }
          }
        } catch (e) {
          // Ignore non-JSON lines
        }
      }
    }
  }

  /**
   * Parse JSON output from Codex non-interactive mode
   */
  private parseJSONOutput(
    data: string,
    events: any[],
    onResponse: (response: string) => void
  ): void {
    const lines = data.split('\n');

    for (const line of lines) {
      if (line.trim().startsWith('{"id":')) {
        try {
          const jsonData = JSON.parse(line);
          events.push(jsonData);

          if (jsonData.msg && jsonData.msg.type === 'agent_message' && jsonData.msg.message) {
            onResponse(jsonData.msg.message);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  /**
   * Build context prompt from conversation history
   */
  private buildContextPrompt(history: any[], newPrompt: string): string {
    let context = '# Conversation History\n\n';

    // Add recent messages (last 5 for context management)
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
   * Assess risk level for approval workflow
   */
  private assessRiskLevel(
    sandbox: string,
    fullAuto: boolean,
    mode: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (fullAuto && sandbox === 'full-access') return 'critical';
    if (sandbox === 'full-access') return 'high';
    if (fullAuto || mode === 'ci') return 'medium';
    return 'low';
  }

  /**
   * Get recent logs from Codex log directory
   */
  private async getRecentLogs(): Promise<string> {
    try {
      const logFile = path.join(this.logDirectory, 'codex-tui.log');
      const content = await fs.readFile(logFile, 'utf-8');

      // Return last 50 lines
      const lines = content.split('\n');
      return lines.slice(-50).join('\n');
    } catch (error) {
      return `Unable to read logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Get performance statistics
   */
  private async getPerformanceStats(): Promise<any> {
    const stats = await this.sessionManager.getSessionStats();

    return {
      sessions: stats,
      active_processes: this.activeProcesses.size,
      config: this.config,
      uptime_ms: process.uptime() * 1000,
      memory_usage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Start the MCP server
   */
  public async start(): Promise<void> {
    logger.info('🚀 Starting Codex MCP Server', {
      config: this.config,
      log_directory: this.logDirectory
    });

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('✅ Codex MCP Server started successfully');
  }

  // パフォーマンス最適化メソッド
  private isReadOnlyOperation(name: string, args: any): boolean {
    return name === 'codex-session-info' ||
           (name === 'codex' && args.sandbox === 'read-only');
  }

  private generateCacheKey(name: string, args: any): string {
    return `${name}:${JSON.stringify(args)}`;
  }

  private getCachedResponse(cacheKey: string): CallToolResult | null {
    const cached = this.responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < (this.config.cache_ttl_ms || 300000)) {
      return cached.result;
    }
    if (cached) {
      this.responseCache.delete(cacheKey); // 期限切れキャッシュ削除
    }
    return null;
  }

  private cacheResponse(cacheKey: string, result: CallToolResult): void {
    if (this.responseCache.size > 1000) { // キャッシュサイズ制限
      const oldestKey = this.responseCache.keys().next().value;
      this.responseCache.delete(oldestKey);
    }
    this.responseCache.set(cacheKey, { result, timestamp: Date.now() });
  }

  private isBatchableOperation(name: string): boolean {
    return name === 'codex-session-info'; // バッチ可能な軽量操作
  }

  private async handleBatchedRequest(name: string, args: any): Promise<CallToolResult> {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random()}`;
      this.requestBatch.push({ id: requestId, request: { name, args }, resolve, reject });

      // バッチタイマー設定
      if (!this.batchTimer && this.config.enable_request_batching) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.config.batch_timeout_ms || 1000);
      }

      // バッチサイズに達した場合即座に処理
      if (this.requestBatch.length >= (this.config.batch_size || 5)) {
        if (this.batchTimer) {
          clearTimeout(this.batchTimer);
          this.batchTimer = null;
        }
        this.processBatch();
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.requestBatch.length === 0) return;

    const batch = [...this.requestBatch];
    this.requestBatch = [];
    this.batchTimer = null;
    this.performanceMetrics.batch_executions++;

    logger.debug(`Processing batch of ${batch.length} requests`);

    // バッチ処理実行
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        switch (item.request.name) {
          case 'codex-session-info':
            return await this.handleSessionInfoTool(item.request.args);
          default:
            throw new Error(`Batch operation not supported for: ${item.request.name}`);
        }
      })
    );

    // 結果を各リクエストに返却
    batch.forEach((item, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        item.resolve(result.value);
      } else {
        item.reject(result.reason);
      }
    });
  }

  private updatePerformanceMetrics(executionTime: number, success: boolean): void {
    const currentAvg = this.performanceMetrics.avg_response_time;
    const totalRequests = this.performanceMetrics.total_requests;

    this.performanceMetrics.avg_response_time =
      (currentAvg * (totalRequests - 1) + executionTime) / totalRequests;

    if (!success) {
      this.performanceMetrics.error_rate =
        (this.performanceMetrics.error_rate * (totalRequests - 1) + 1) / totalRequests;
    }
  }

  private async handleMetricsTool(args: any): Promise<CallToolResult> {
    const metrics = {
      ...this.performanceMetrics,
      cache_size: this.responseCache.size,
      active_connections: this.connectionPool.size,
      active_processes: this.activeProcesses.size,
      batch_queue_size: this.requestBatch.length,
      uptime_ms: Date.now() - (this.startTime || Date.now()),
      cache_hit_rate: this.performanceMetrics.cache_hits / this.performanceMetrics.total_requests || 0
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(metrics, null, 2)
        }
      ]
    };
  }

  private startTime = Date.now();

  /**
   * Stop the MCP server
   */
  public async stop(): Promise<void> {
    logger.info('🛑 Stopping Codex MCP Server');

    // バッチタイマークリア
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // 残りのバッチ処理
    if (this.requestBatch.length > 0) {
      await this.processBatch();
    }

    // Terminate all active processes
    for (const [sessionId, process] of this.activeProcesses) {
      logger.info('Terminating active process', { sessionId });
      process.kill('SIGTERM');
    }
    this.activeProcesses.clear();
    this.connectionPool.clear();
    this.responseCache.clear();

    // Cleanup sessions
    await this.sessionManager.cleanupExpiredSessions();

    logger.info('✅ Codex MCP Server stopped with optimizations');
  }
}

// Factory function for easy instantiation
export const createCodexMCPServer = (config?: CodexMCPConfig): CodexMCPServer => {
  return new CodexMCPServer(config);
};

// CLI entry point
if (require.main === module) {
  const server = new CodexMCPServer();

  server.start().catch((error) => {
    logger.error('Failed to start Codex MCP Server', { error });
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}