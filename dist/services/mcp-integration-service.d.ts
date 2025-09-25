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
import { MCPConfigContext } from './mcp-config-manager';
export interface MCPExecutionRequest {
    tools: any[];
    context: MCPConfigContext;
    requestedBy?: string;
    timeout?: number;
    dryRun?: boolean;
}
export interface MCPExecutionResult {
    success: boolean;
    results: any[];
    mcp_calls: any[];
    cost_analysis: {
        estimated_cost: number;
        actual_cost: number;
        tool_breakdown: Array<{
            tool: string;
            calls: number;
            cost: number;
        }>;
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
export declare class MCPIntegrationService {
    private executionHistory;
    /**
     * Execute MCP tools with full enterprise governance
     */
    executeMCPTools(openaiClient: any, request: MCPExecutionRequest): Promise<MCPExecutionResult>;
    private processApprovalWorkflow;
    private simulateApprovalDecision;
    private executeApprovedTools;
    /**
     * Get comprehensive analytics
     */
    getAnalytics(timeWindowMs?: number): {
        execution_stats: {
            total_executions: number;
            success_rate: number;
            average_cost: number;
            average_duration_ms: number;
        };
        tool_usage: Record<string, {
            count: number;
            total_cost: number;
        }>;
        security_events: string[];
        cost_trends: Array<{
            timestamp: number;
            cost: number;
        }>;
        performance_trends: Array<{
            timestamp: number;
            duration_ms: number;
        }>;
    };
    /**
     * Get current system status
     */
    getSystemStatus(): {
        mcp_config_status: any;
        approval_stats: any;
        recent_execution_count: number;
        system_health: 'healthy' | 'warning' | 'critical';
        recommendations: string[];
    };
}
export declare const mcpIntegrationService: MCPIntegrationService;
export default mcpIntegrationService;
