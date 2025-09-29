/**
 * Codex MCP Integration Service
 *
 * Integrates the Codex MCP Server with TechSapo's Wall-Bounce Analysis System
 * Provides seamless access to OpenAI Codex capabilities through MCP protocol
 *
 * Features:
 * - Wall-Bounce integration for multi-LLM coordination
 * - Session management with Redis persistence
 * - Cost tracking and monitoring
 * - Enterprise approval workflows
 * - Performance metrics collection
 */

import { logger } from '../utils/logger';
import { CodexMCPServer, CodexMCPConfig } from './codex-mcp-server';
import { mcpIntegrationService } from './mcp-integration-service';
import { getRedisService } from './redis-service';
import fs from 'fs/promises';
import path from 'path';

export interface CodexWallBounceRequest {
  prompt: string;
  context: {
    task_type: 'basic' | 'premium' | 'critical';
    cost_tier: 'low' | 'medium' | 'high';
    user_id?: string;
    session_context?: any;
  };
  options?: {
    model?: string;
    sandbox?: string;
    reasoning_effort?: 'minimal' | 'medium' | 'high';
    verbosity?: 'low' | 'medium' | 'high';
    enable_wall_bounce?: boolean;
  };
}

export interface CodexIntegrationResult {
  success: boolean;
  response?: string;
  session_id?: string;
  conversation_id?: string;
  wall_bounce_analysis?: {
    providers_used: string[];
    consensus_score: number;
    confidence_score: number;
    quality_metrics: any;
  };
  cost_analysis: {
    estimated_cost: number;
    actual_cost: number;
    provider_breakdown: Record<string, number>;
  };
  performance_metrics: {
    total_time_ms: number;
    codex_time_ms: number;
    wall_bounce_time_ms?: number;
  };
  error?: string;
}

export class CodexMCPIntegration {
  private server: CodexMCPServer | null = null;
  private config: CodexMCPConfig = {};
  private redis;
  private isStarted = false;

  constructor() {
    this.redis = getRedisService();
  }

  /**
   * Initialize Codex MCP Integration
   */
  async initialize(configPath?: string): Promise<void> {
    try {
      // Load configuration
      await this.loadConfiguration(configPath);

      // Create MCP server
      this.server = new CodexMCPServer(this.config);

      logger.info('✅ Codex MCP Integration initialized', {
        config: this.config,
        wall_bounce_enabled: this.config.enable_wall_bounce
      });

    } catch (error) {
      logger.error('❌ Failed to initialize Codex MCP Integration', { error });
      throw error;
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (!this.server) {
      throw new Error('Codex MCP Integration not initialized');
    }

    if (this.isStarted) {
      logger.warn('Codex MCP Server already started');
      return;
    }

    try {
      await this.server.start();
      this.isStarted = true;

      // Register metrics
      this.registerMetrics();

      // Start monitoring
      this.startHealthCheck();

      logger.info('🚀 Codex MCP Integration started successfully');

    } catch (error) {
      logger.error('❌ Failed to start Codex MCP Integration', { error });
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.server || !this.isStarted) {
      return;
    }

    try {
      await this.server.stop();
      this.isStarted = false;

      logger.info('🛑 Codex MCP Integration stopped');

    } catch (error) {
      logger.error('❌ Error stopping Codex MCP Integration', { error });
      throw error;
    }
  }

  /**
   * Execute Codex request with Wall-Bounce integration
   */
  async executeCodexWithWallBounce(request: CodexWallBounceRequest): Promise<CodexIntegrationResult> {
    const startTime = Date.now();

    logger.info('🏓 Codex Wall-Bounce execution started', {
      task_type: request.context.task_type,
      enable_wall_bounce: request.options?.enable_wall_bounce ?? this.config.enable_wall_bounce,
      prompt_length: request.prompt.length
    });

    const result: CodexIntegrationResult = {
      success: false,
      cost_analysis: {
        estimated_cost: 0,
        actual_cost: 0,
        provider_breakdown: {}
      },
      performance_metrics: {
        total_time_ms: 0,
        codex_time_ms: 0
      }
    };

    try {
      if (request.options?.enable_wall_bounce ?? this.config.enable_wall_bounce) {
        // Execute with Wall-Bounce coordination
        const wallBounceResult = await this.executeWithWallBounce(request, startTime);
        Object.assign(result, wallBounceResult);
      } else {
        // Direct Codex execution
        const directResult = await this.executeDirectCodex(request, startTime);
        Object.assign(result, directResult);
      }

      // Record metrics
      this.recordExecutionMetrics(result, request.context.task_type);

      // Store execution history
      await this.storeExecutionHistory(request, result);

      result.performance_metrics.total_time_ms = Date.now() - startTime;

      logger.info('✅ Codex Wall-Bounce execution completed', {
        success: result.success,
        total_time_ms: result.performance_metrics.total_time_ms,
        cost: result.cost_analysis.actual_cost
      });

      return result;

    } catch (error) {
      logger.error('❌ Codex Wall-Bounce execution failed', { error });

      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.performance_metrics.total_time_ms = Date.now() - startTime;

      return result;
    }
  }

  /**
   * Execute with Wall-Bounce coordination
   */
  private async executeWithWallBounce(
    request: CodexWallBounceRequest,
    startTime: number
  ): Promise<Partial<CodexIntegrationResult>> {
    const wallBounceStart = Date.now();

    // Prepare MCP tools for Wall-Bounce
    const mcpTools = [
      {
        name: 'codex',
        arguments: {
          prompt: request.prompt,
          model: request.options?.model || this.config.model,
          sandbox: request.options?.sandbox || this.config.sandbox,
          reasoning_effort: request.options?.reasoning_effort,
          verbosity: request.options?.verbosity,
          mode: 'non-interactive'
        }
      }
    ];

    // Execute through MCP Integration Service
    const mcpResult = await mcpIntegrationService.executeMCPTools(
      null, // OpenAI client not needed for Codex MCP
      {
        tools: mcpTools,
        context: {
          taskType: request.context.task_type,
          budgetTier: request.context.cost_tier,
          securityLevel: request.context.cost_tier === 'high' ? 'strict' : 'standard',
          userId: request.context.user_id,
          sessionContext: request.context.session_context
        } as any,
        requestedBy: request.context.user_id || 'system'
      }
    );

    const wallBounceTime = Date.now() - wallBounceStart;
    const codexTime = mcpResult.performance_metrics.execution_time_ms;

    // Extract Codex response
    let response = '';
    let sessionId = '';
    let conversationId = '';

    if (mcpResult.success && mcpResult.results.length > 0) {
      const codexResult = mcpResult.results[0];
      response = codexResult.content?.[0]?.text || '';
      sessionId = codexResult.sessionId || '';
      conversationId = codexResult.conversationId || '';
    }

    return {
      success: mcpResult.success,
      response,
      session_id: sessionId,
      conversation_id: conversationId,
      wall_bounce_analysis: {
        providers_used: ['codex-mcp'] as any,
        consensus_score: 1.0, // Single provider
        confidence_score: mcpResult.success ? 0.9 : 0.1,
        quality_metrics: mcpResult.performance_metrics
      },
      cost_analysis: {
        estimated_cost: mcpResult.cost_analysis.estimated_cost,
        actual_cost: mcpResult.cost_analysis.actual_cost,
        provider_breakdown: {
          'codex-mcp': mcpResult.cost_analysis.actual_cost
        }
      },
      performance_metrics: {
        total_time_ms: Date.now() - startTime,
        codex_time_ms: codexTime,
        wall_bounce_time_ms: wallBounceTime
      },
      error: mcpResult.error
    };
  }

  /**
   * Execute direct Codex without Wall-Bounce
   */
  private async executeDirectCodex(
    request: CodexWallBounceRequest,
    startTime: number
  ): Promise<Partial<CodexIntegrationResult>> {
    if (!this.server) {
      throw new Error('Codex MCP Server not initialized');
    }

    const codexStart = Date.now();

    // Execute via MCP server directly
    const args = {
      prompt: request.prompt,
      model: request.options?.model || this.config.model,
      sandbox: request.options?.sandbox || this.config.sandbox,
      reasoning_effort: request.options?.reasoning_effort,
      verbosity: request.options?.verbosity,
      mode: 'non-interactive'
    };

    const codexResult = await (this.server as any).handleCodexTool(args);
    const codexTime = Date.now() - codexStart;

    // Estimate cost (simplified)
    const estimatedCost = this.estimateCodexCost(request.prompt, codexResult.content?.[0]?.text || '');

    return {
      success: !codexResult.isError,
      response: codexResult.content?.[0]?.text || '',
      session_id: codexResult.sessionId,
      conversation_id: codexResult.conversationId,
      cost_analysis: {
        estimated_cost: estimatedCost,
        actual_cost: estimatedCost,
        provider_breakdown: {
          'codex-direct': estimatedCost
        }
      },
      performance_metrics: {
        total_time_ms: Date.now() - startTime,
        codex_time_ms: codexTime
      },
      error: codexResult.isError ? codexResult.content?.[0]?.text : undefined
    };
  }

  /**
   * 簡易TOML解析
   */
  private parseSimpleToml(content: string): any {
    const result: any = {};
    let currentSection = '';

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentSection = trimmed.slice(1, -1);
        if (!result[currentSection]) result[currentSection] = {};
      } else if (trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim().replace(/"/g, '');

        if (currentSection) {
          result[currentSection][key.trim()] = this.parseValue(value);
        } else {
          result[key.trim()] = this.parseValue(value);
        }
      }
    }
    return result;
  }

  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value))) return Number(value);
    return value;
  }

  /**
   * Load configuration from TOML file
   */
  private async loadConfiguration(configPath?: string): Promise<void> {
    const defaultPath = path.join(__dirname, '../../config/codex-mcp.toml');
    const filePath = configPath || defaultPath;

    try {
      const configContent = await fs.readFile(filePath, 'utf-8');
      // 簡易的な設定読み込み（TOML依存回避）
      const parsedConfig = this.parseSimpleToml(configContent);

      // Map TOML config to CodexMCPConfig
      this.config = {
        model: parsedConfig.codex?.model || 'gpt-5-codex',
        sandbox: parsedConfig.codex?.sandbox || 'read-only',
        base_instructions: parsedConfig.codex?.base_instructions,
        working_directory: parsedConfig.codex?.working_directory,
        approval_policy: parsedConfig.mcp?.approval_policy || 'risk-based',
        max_concurrent_sessions: parsedConfig.mcp?.max_concurrent_sessions || 10,
        session_timeout_ms: parsedConfig.mcp?.session_timeout_ms || 300000,
        rust_log_level: parsedConfig.logging?.rust_log_level || 'info',
        enable_tracing: parsedConfig.logging?.enable_tracing ?? true,
        log_directory: parsedConfig.logging?.log_directory,
        enable_wall_bounce: parsedConfig.mcp?.enable_wall_bounce ?? true,
        min_providers: parsedConfig.mcp?.min_providers || 2,
        quality_threshold: parsedConfig.mcp?.quality_threshold || 0.7
      };

    } catch (error) {
      logger.warn('Could not load config file, using defaults', {
        path: filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Use default configuration
      this.config = {
        model: 'gpt-5-codex',
        sandbox: 'read-only',
        approval_policy: 'risk-based',
        max_concurrent_sessions: 10,
        session_timeout_ms: 300000,
        rust_log_level: 'info',
        enable_tracing: true,
        enable_wall_bounce: true,
        min_providers: 2,
        quality_threshold: 0.7
      };
    }
  }

  /**
   * Register Prometheus metrics
   */
  private registerMetrics(): void {
    // Implementation would register Codex-specific metrics
    logger.info('📊 Codex MCP metrics registered');
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        // Simple health check - could be enhanced
        const healthy = this.isStarted && this.server !== null;

        if (!healthy) {
          logger.warn('🔥 Codex MCP health check failed');
        }
      } catch (error) {
        logger.error('❌ Codex MCP health check error', { error });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Record execution metrics
   */
  private recordExecutionMetrics(result: CodexIntegrationResult, taskType: string): void {
    try {
      // Record metrics using prometheusClient
      // Implementation would record specific metrics
      logger.debug('📈 Codex execution metrics recorded', {
        task_type: taskType,
        success: result.success,
        time_ms: result.performance_metrics.total_time_ms
      });
    } catch (error) {
      logger.warn('Could not record metrics', { error });
    }
  }

  /**
   * Store execution history
   */
  private async storeExecutionHistory(
    request: CodexWallBounceRequest,
    result: CodexIntegrationResult
  ): Promise<void> {
    try {
      const historyKey = `codex:history:${Date.now()}`;
      const historyData = {
        request: {
          prompt_hash: this.hashString(request.prompt),
          context: request.context,
          options: request.options
        },
        result: {
          success: result.success,
          session_id: result.session_id,
          conversation_id: result.conversation_id,
          cost: result.cost_analysis.actual_cost,
          time_ms: result.performance_metrics.total_time_ms,
          error: result.error
        },
        timestamp: new Date().toISOString()
      };

      await this.redis.setSession(historyKey, historyData, 86400); // 24 hours

    } catch (error) {
      logger.warn('Could not store execution history', { error });
    }
  }

  /**
   * Estimate Codex cost (simplified)
   */
  private estimateCodexCost(prompt: string, response: string): number {
    // GPT-5 pricing estimate: $0.03/1K input + $0.06/1K output
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(response.length / 4);

    return (inputTokens / 1000) * 0.03 + (outputTokens / 1000) * 0.06;
  }

  /**
   * Simple string hashing for privacy
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Get current status
   */
  getStatus(): {
    initialized: boolean;
    started: boolean;
    config: CodexMCPConfig;
  } {
    return {
      initialized: this.server !== null,
      started: this.isStarted,
      config: this.config
    };
  }
}

// Singleton instance
let codexMCPIntegration: CodexMCPIntegration | null = null;

export const getCodexMCPIntegration = (): CodexMCPIntegration => {
  if (!codexMCPIntegration) {
    codexMCPIntegration = new CodexMCPIntegration();
  }
  return codexMCPIntegration;
};

// Auto-initialize if this module is imported
const autoInit = async () => {
  try {
    const integration = getCodexMCPIntegration();
    await integration.initialize();
    logger.info('🚀 Codex MCP Integration auto-initialized');
  } catch (error) {
    logger.warn('Could not auto-initialize Codex MCP Integration', { error });
  }
};

// Only auto-init in production, not during testing
if (process.env.NODE_ENV !== 'test') {
  autoInit();
}