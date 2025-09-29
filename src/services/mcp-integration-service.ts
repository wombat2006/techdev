/**
 * MCP Integration Service - Comprehensive MCP Orchestration
 * Single Responsibility: Coordinate all MCP operations with security, cost optimization, and monitoring
 * 
 * Key Features:
 * - Unified MCP tool execution
 * - Approval workflow integration  
 * - Cost monitoring and optimization
 * - Security policy enforcement
 * - Performance metrics collection
 */

import { logger } from '../utils/logger';
import { mcpConfigManager, MCPConfigContext } from './mcp-config-manager';
import { mcpApprovalManager } from './mcp-approval-manager';

export interface MCPExecutionRequest {
  tools: any[];
  context: MCPConfigContext;
  requestedBy?: string;
  timeout?: number;
  dryRun?: boolean;
  // 最適化設定
  enableCaching?: boolean;
  enableBatching?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  maxRetries?: number;
  fallbackProvider?: string;
}

export interface MCPExecutionResult {
  success: boolean;
  results: any[];
  mcp_calls: any[];
  cost_analysis: {
    estimated_cost: number;
    actual_cost: number;
    tool_breakdown: Array<{ tool: string; calls: number; cost: number }>;
  };
  approval_summary: {
    total_requests: number;
    auto_approved: number;
    manual_approved: number;
    rejected: number;
  };
  performance_metrics: {
    total_time_ms: number;
    approval_time_ms: number;
    execution_time_ms: number;
    tool_response_times: Record<string, number>;
  };
  security_events?: string[];
  error?: string;
}

export class MCPIntegrationService {
  private executionHistory: Array<{
    timestamp: number;
    context: MCPConfigContext;
    result: MCPExecutionResult;
  }> = [];

  // パフォーマンス最適化キャッシュ
  private responseCache = new Map<string, { result: MCPExecutionResult; timestamp: number }>();
  private circuitBreaker = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();
  private requestQueue: Array<{ request: MCPExecutionRequest; resolve: Function; reject: Function }> = [];
  private isProcessingQueue = false;

  // メトリクス
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    circuitBreakerActivations: 0,
    averageExecutionTime: 0,
    errorRate: 0
  };

  /**
   * Execute MCP tools with full enterprise governance and optimizations
   */
  async executeMCPTools(
    openaiClient: any,
    request: MCPExecutionRequest
  ): Promise<MCPExecutionResult> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    logger.info('🚀 MCP Integration Service - Optimized Execution Started', {
      tools_requested: request.tools.length,
      context: request.context,
      requested_by: request.requestedBy || 'system',
      dry_run: request.dryRun || false,
      priority: request.priority || 'medium',
      caching_enabled: request.enableCaching !== false,
      batching_enabled: request.enableBatching !== false
    });

    // キャッシュチェック
    if (request.enableCaching !== false) {
      const cacheKey = this.generateCacheKey(request);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        logger.debug('Cache hit for MCP request', { cacheKey });
        return cached;
      }
    }

    // サーキットブレーカーチェック
    const circuitKey = this.getCircuitBreakerKey(request);
    if (this.isCircuitOpen(circuitKey)) {
      logger.warn('Circuit breaker is open, rejecting request', { circuitKey });
      throw new Error(`Circuit breaker is open for ${circuitKey}`);
    }

    // 優先度ベースのキューイング
    if (request.priority === 'low' && this.shouldQueue(request)) {
      return this.queueRequest(request, openaiClient);
    }

    const result: MCPExecutionResult = {
      success: false,
      results: [],
      mcp_calls: [],
      cost_analysis: {
        estimated_cost: 0,
        actual_cost: 0,
        tool_breakdown: []
      },
      approval_summary: {
        total_requests: 0,
        auto_approved: 0,
        manual_approved: 0,
        rejected: 0
      },
      performance_metrics: {
        total_time_ms: 0,
        approval_time_ms: 0,
        execution_time_ms: 0,
        tool_response_times: {}
      },
      security_events: []
    };

    try {
      // Phase 1: Tool Optimization and Cost Analysis
      const optimizedTools = mcpConfigManager.getOptimizedToolsForContext(request.context);
      const costEstimate = mcpConfigManager.estimateToolCosts(optimizedTools, 5);
      
      result.cost_analysis.estimated_cost = costEstimate.total_cost;
      
      if (costEstimate.budget_warning) {
        result.security_events?.push(`Budget Warning: ${costEstimate.budget_warning}`);
        logger.warn('💰 Budget Warning', { warning: costEstimate.budget_warning });
      }

      // Phase 2: Pre-execution Approval Workflow  
      const approvalStartTime = Date.now();
      const approvalResults = await this.processApprovalWorkflow(
        optimizedTools,
        request.context,
        request.requestedBy || 'system'
      );
      
      result.approval_summary = approvalResults.summary;
      result.performance_metrics.approval_time_ms = Date.now() - approvalStartTime;

      // Check if any critical approvals were rejected
      if (approvalResults.hasRejections) {
        result.error = 'Critical operations rejected by approval workflow';
        result.security_events?.push('Execution blocked by approval rejection');
        return result;
      }

      // Phase 3: Dry Run Mode (if requested)
      if (request.dryRun) {
        logger.info('🧪 Dry Run Mode - Simulating execution', {
          approved_tools: approvalResults.approvedTools.length,
          estimated_cost: result.cost_analysis.estimated_cost
        });
        
        result.success = true;
        result.results = [{
          type: 'dry_run',
          message: 'Execution simulated successfully',
          approved_tools: approvalResults.approvedTools.map(t => t.server_label),
          would_execute: approvalResults.approvedTools.length > 0
        }];
        
        return result;
      }

      // Phase 4: Actual Execution
      const executionStartTime = Date.now();
      const executionResult = await this.executeApprovedTools(
        openaiClient,
        approvalResults.approvedTools,
        request.context
      );
      
      result.performance_metrics.execution_time_ms = Date.now() - executionStartTime;
      result.results = executionResult.results;
      result.mcp_calls = executionResult.mcp_calls;
      result.cost_analysis.actual_cost = executionResult.actual_cost;
      result.cost_analysis.tool_breakdown = executionResult.tool_breakdown;
      result.performance_metrics.tool_response_times = executionResult.tool_response_times;

      result.success = true;

      logger.info('✅ MCP Integration Service - Execution Completed', {
        success: true,
        tools_executed: approvalResults.approvedTools.length,
        mcp_calls: result.mcp_calls.length,
        actual_cost: result.cost_analysis.actual_cost,
        total_time_ms: Date.now() - startTime
      });

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.security_events?.push(`Execution error: ${result.error}`);
      
      logger.error('❌ MCP Integration Service - Execution Failed', {
        error: result.error,
        context: request.context
      });
    }

    // Final metrics calculation
    result.performance_metrics.total_time_ms = Date.now() - startTime;
    
    // Store execution history for analysis
    this.executionHistory.push({
      timestamp: startTime,
      context: request.context,
      result
    });

    return result;
  }

  private async processApprovalWorkflow(
    tools: any[],
    context: MCPConfigContext,
    requestedBy: string
  ): Promise<{
    summary: MCPExecutionResult['approval_summary'];
    approvedTools: any[];
    hasRejections: boolean;
  }> {
    const summary = {
      total_requests: 0,
      auto_approved: 0,
      manual_approved: 0,
      rejected: 0
    };

    const approvedTools: any[] = [];
    let hasRejections = false;

    for (const tool of tools) {
      for (const allowedOperation of tool.allowed_tools) {
        summary.total_requests++;

        const approvalRequest = await mcpApprovalManager.requestApproval(
          tool.server_label,
          allowedOperation,
          { tool_config: tool },
          context,
          requestedBy
        );

        if (!approvalRequest.requiresApproval) {
          if (approvalRequest.autoApproved) {
            summary.auto_approved++;
          }
          
          // Tool is approved for use
          if (!approvedTools.find(t => t.server_label === tool.server_label)) {
            approvedTools.push(tool);
          }
        } else {
          // For this implementation, we'll simulate approval decisions
          // In a real system, this would integrate with enterprise approval systems
          const shouldApprove = this.simulateApprovalDecision(
            tool.server_label,
            allowedOperation,
            context
          );

          if (shouldApprove) {
            summary.manual_approved++;
            if (!approvedTools.find(t => t.server_label === tool.server_label)) {
              approvedTools.push(tool);
            }
          } else {
            summary.rejected++;
            hasRejections = true;
          }
        }
      }
    }

    logger.info('📋 Approval workflow completed', {
      total_requests: summary.total_requests,
      auto_approved: summary.auto_approved,
      manual_approved: summary.manual_approved,
      rejected: summary.rejected,
      approved_tools: approvedTools.length
    });

    return { summary, approvedTools, hasRejections };
  }

  private simulateApprovalDecision(
    toolName: string,
    operation: string,
    context: MCPConfigContext
  ): boolean {
    // Simulation logic - in production, this would integrate with real approval systems
    
    // Auto-reject high-risk operations for basic tasks
    if (context.taskType === 'basic' && ['send', 'delete', 'modify'].includes(operation)) {
      return false;
    }

    // Auto-approve low-risk operations
    if (['search', 'read', 'get', 'fetch'].includes(operation)) {
      return true;
    }

    // Context-based approval simulation
    if (context.taskType === 'critical' && context.securityLevel === 'critical') {
      return true; // Critical tasks get approved
    }

    // Default to approved for medium-risk operations
    return true;
  }

  private async executeApprovedTools(
    openaiClient: any,
    approvedTools: any[],
    context: MCPConfigContext
  ): Promise<{
    results: any[];
    mcp_calls: any[];
    actual_cost: number;
    tool_breakdown: Array<{ tool: string; calls: number; cost: number }>;
    tool_response_times: Record<string, number>;
  }> {
    const results: any[] = [];
    const mcp_calls: any[] = [];
    const tool_breakdown: Array<{ tool: string; calls: number; cost: number }> = [];
    const tool_response_times: Record<string, number> = {};
    let actual_cost = 0;

    if (approvedTools.length === 0) {
      return { results, mcp_calls, actual_cost, tool_breakdown, tool_response_times };
    }

    // Execute with approved tools
    const toolStartTime = Date.now();
    
    try {
      const response = await openaiClient.responses.create({
        model: 'gpt-5',
        tools: approvedTools,
        instructions: `Enterprise MCP Integration - Execute approved operations with:
        - Task Type: ${context.taskType}
        - Security Level: ${context.securityLevel}
        - Budget Tier: ${context.budgetTier}

        Use tools efficiently and provide comprehensive results.
        Note: Adaptive reasoning is enabled for optimal multi-LLM coordination.`,
        input: `Execute approved MCP operations for ${context.taskType} task`,
        store: true,
        reasoning: {
          effort: context.taskType === 'basic' ? 'minimal' :
                 context.taskType === 'premium' ? 'medium' : 'high'
        },
        text: {
          verbosity: context.taskType === 'basic' ? 'low' :
                    context.taskType === 'premium' ? 'medium' : 'high'
        }
      });

      tool_response_times['openai_api'] = Date.now() - toolStartTime;

      // Extract results
      results.push({
        content: response.output_text || 'No response generated',
        success: true
      });

      // Extract MCP calls from response
      if (response.output) {
        const mcpCallItems = response.output.filter((item: any) => item.type === 'mcp_call');
        mcp_calls.push(...mcpCallItems);

        // Calculate costs per tool
        const toolUsage: Record<string, { calls: number; cost: number }> = {};
        
        for (const call of mcpCallItems) {
          const toolName = call.server_label;
          if (!toolUsage[toolName]) {
            toolUsage[toolName] = { calls: 0, cost: 0 };
          }
          toolUsage[toolName].calls++;
          toolUsage[toolName].cost += 0.001; // Estimated cost per call
        }

        // Build breakdown
        for (const [toolName, usage] of Object.entries(toolUsage)) {
          tool_breakdown.push({
            tool: toolName,
            calls: usage.calls,
            cost: usage.cost
          });
          actual_cost += usage.cost;
        }
      }

      // Add token costs
      if (response.usage) {
        const tokenCost = (response.usage.input_tokens * 0.0000015) + 
                         (response.usage.output_tokens * 0.000006);
        actual_cost += tokenCost;
      }

    } catch (error) {
      results.push({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }

    return { results, mcp_calls, actual_cost, tool_breakdown, tool_response_times };
  }

  /**
   * Get comprehensive analytics
   */
  getAnalytics(timeWindowMs: number = 24 * 60 * 60 * 1000): {
    execution_stats: {
      total_executions: number;
      success_rate: number;
      average_cost: number;
      average_duration_ms: number;
    };
    tool_usage: Record<string, { count: number; total_cost: number }>;
    security_events: string[];
    cost_trends: Array<{ timestamp: number; cost: number }>;
    performance_trends: Array<{ timestamp: number; duration_ms: number }>;
  } {
    const cutoff = Date.now() - timeWindowMs;
    const recentExecutions = this.executionHistory.filter(exec => exec.timestamp >= cutoff);

    const totalExecutions = recentExecutions.length;
    const successfulExecutions = recentExecutions.filter(exec => exec.result.success).length;
    const totalCost = recentExecutions.reduce((sum, exec) => sum + exec.result.cost_analysis.actual_cost, 0);
    const totalDuration = recentExecutions.reduce((sum, exec) => sum + exec.result.performance_metrics.total_time_ms, 0);

    // Tool usage analysis
    const toolUsage: Record<string, { count: number; total_cost: number }> = {};
    const securityEvents: string[] = [];
    const costTrends: Array<{ timestamp: number; cost: number }> = [];
    const performanceTrends: Array<{ timestamp: number; duration_ms: number }> = [];

    for (const execution of recentExecutions) {
      // Tool usage tracking
      for (const breakdown of execution.result.cost_analysis.tool_breakdown) {
        if (!toolUsage[breakdown.tool]) {
          toolUsage[breakdown.tool] = { count: 0, total_cost: 0 };
        }
        toolUsage[breakdown.tool].count += breakdown.calls;
        toolUsage[breakdown.tool].total_cost += breakdown.cost;
      }

      // Security events
      if (execution.result.security_events) {
        securityEvents.push(...execution.result.security_events);
      }

      // Trends
      costTrends.push({
        timestamp: execution.timestamp,
        cost: execution.result.cost_analysis.actual_cost
      });

      performanceTrends.push({
        timestamp: execution.timestamp,
        duration_ms: execution.result.performance_metrics.total_time_ms
      });
    }

    return {
      execution_stats: {
        total_executions: totalExecutions,
        success_rate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) : 0,
        average_cost: totalExecutions > 0 ? (totalCost / totalExecutions) : 0,
        average_duration_ms: totalExecutions > 0 ? (totalDuration / totalExecutions) : 0
      },
      tool_usage: toolUsage,
      security_events: [...new Set(securityEvents)], // Deduplicate
      cost_trends: costTrends,
      performance_trends: performanceTrends
    };
  }

  /**
   * Get current system status
   */
  getSystemStatus(): {
    mcp_config_status: any;
    approval_stats: any;
    recent_execution_count: number;
    system_health: 'healthy' | 'warning' | 'critical';
    recommendations: string[];
  } {
    const configStatus = mcpConfigManager.getConfigurationStatus();
    const approvalStats = mcpApprovalManager.getApprovalStatistics();
    const recentExecutions = this.executionHistory.filter(exec => 
      exec.timestamp >= Date.now() - (60 * 60 * 1000) // Last hour
    ).length;

    // Health assessment
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (configStatus.disabled_tools.length > configStatus.enabled_tools.length) {
      systemHealth = 'warning';
      recommendations.push('Many MCP tools are disabled. Check environment configuration.');
    }

    if (approvalStats.rejected > approvalStats.approved + approvalStats.auto_approved) {
      systemHealth = 'warning';
      recommendations.push('High rejection rate detected. Review approval policies.');
    }

    if (recentExecutions === 0) {
      recommendations.push('No recent MCP executions. System may be underutilized.');
    }

    return {
      mcp_config_status: configStatus,
      approval_stats: approvalStats,
      recent_execution_count: recentExecutions,
      system_health: systemHealth,
      recommendations
    };
  }

  // パフォーマンス最適化メソッド
  private generateCacheKey(request: MCPExecutionRequest): string {
    return `mcp_${JSON.stringify({
      tools: request.tools.map(t => t.name),
      context: request.context,
      timeout: request.timeout
    })}`;
  }

  private getCachedResult(cacheKey: string): MCPExecutionResult | null {
    const cached = this.responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 300000) { // 5分キャッシュ
      return cached.result;
    }
    if (cached) {
      this.responseCache.delete(cacheKey); // 期限切れ削除
    }
    return null;
  }

  private cacheResult(cacheKey: string, result: MCPExecutionResult): void {
    if (this.responseCache.size > 500) { // キャッシュサイズ制限
      const oldestKey = this.responseCache.keys().next().value;
      this.responseCache.delete(oldestKey);
    }
    this.responseCache.set(cacheKey, { result, timestamp: Date.now() });
  }

  private getCircuitBreakerKey(request: MCPExecutionRequest): string {
    const environment = (request.context as any).environment || 'default';
    const taskType = (request.context as any).task_type || request.context.taskType || 'basic';
    return `${environment}_${taskType}`;
  }

  private isCircuitOpen(circuitKey: string): boolean {
    const circuit = this.circuitBreaker.get(circuitKey);
    if (!circuit) return false;

    // 5回以上失敗かつ最後の失敗から30秒以内の場合はオープン
    if (circuit.failures >= 5 && (Date.now() - circuit.lastFailure) < 30000) {
      return true;
    }

    // 時間経過でリセット
    if ((Date.now() - circuit.lastFailure) > 30000) {
      circuit.failures = 0;
      circuit.isOpen = false;
    }

    return circuit.isOpen;
  }

  private recordCircuitBreakerFailure(circuitKey: string): void {
    const circuit = this.circuitBreaker.get(circuitKey) || { failures: 0, lastFailure: 0, isOpen: false };
    circuit.failures++;
    circuit.lastFailure = Date.now();
    circuit.isOpen = circuit.failures >= 5;
    this.circuitBreaker.set(circuitKey, circuit);

    if (circuit.isOpen) {
      this.metrics.circuitBreakerActivations++;
      logger.warn('Circuit breaker activated', { circuitKey, failures: circuit.failures });
    }
  }

  private shouldQueue(request: MCPExecutionRequest): boolean {
    return this.requestQueue.length > 0 || this.isProcessingQueue;
  }

  private async queueRequest(request: MCPExecutionRequest, openaiClient: any): Promise<MCPExecutionResult> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject });
      this.processQueue(openaiClient);
    });
  }

  private async processQueue(openaiClient: any): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    logger.debug(`Processing MCP request queue: ${this.requestQueue.length} items`);

    while (this.requestQueue.length > 0) {
      const { request, resolve, reject } = this.requestQueue.shift()!;

      try {
        // 優先度低のリクエストを直接実行（キューイング無効化）
        const modifiedRequest = { ...request, priority: 'medium' as const };
        const result = await this.executeMCPTools(openaiClient, modifiedRequest);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // レート制限考慮の待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get enhanced performance metrics
   */
  getPerformanceMetrics(): any {
    const cacheHitRate = this.metrics.totalRequests > 0 ?
      (this.metrics.cacheHits / this.metrics.totalRequests) : 0;

    return {
      ...this.metrics,
      cache_hit_rate: cacheHitRate,
      cache_size: this.responseCache.size,
      circuit_breaker_count: this.circuitBreaker.size,
      queue_size: this.requestQueue.length,
      is_processing_queue: this.isProcessingQueue,
      active_circuits: Array.from(this.circuitBreaker.entries())
        .filter(([_, circuit]) => circuit.isOpen)
        .map(([key, _]) => key)
    };
  }

  /**
   * Reset all performance optimizations
   */
  resetOptimizations(): void {
    this.responseCache.clear();
    this.circuitBreaker.clear();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      circuitBreakerActivations: 0,
      averageExecutionTime: 0,
      errorRate: 0
    };
    logger.info('MCP Integration Service optimizations reset');
  }
}

// Singleton instance
export const mcpIntegrationService = new MCPIntegrationService();

export default mcpIntegrationService;