/**
 * MCP Configuration Manager - Cost Optimization and Security
 * Single Responsibility: Manage MCP tool configurations with filtering and approval workflows
 *
 * Key Features:
 * - Cost-optimized tool filtering
 * - Tiered approval workflows
 * - Dynamic tool selection based on task type
 * - Security-first approach with explicit tool whitelisting
 */
export interface MCPToolConfig {
    type: 'mcp';
    server_label: string;
    server_url?: string;
    connector_id?: string;
    authorization?: string;
    require_approval: 'always' | 'never' | MCPApprovalConfig;
    allowed_tools: string[];
    cost_tier?: 'free' | 'low' | 'medium' | 'high';
    security_level?: 'public' | 'internal' | 'sensitive' | 'critical';
}
export interface MCPApprovalConfig {
    always?: {
        tool_names: string[];
    };
    never?: {
        tool_names: string[];
    };
    conditional?: {
        tool_names: string[];
        conditions: (context: any) => boolean;
    };
}
export interface MCPConfigContext {
    taskType: 'basic' | 'premium' | 'critical';
    budgetTier: 'free' | 'standard' | 'premium';
    securityLevel: 'public' | 'internal' | 'sensitive' | 'critical';
    userRole?: string;
    projectId?: string;
}
export declare class MCPConfigManager {
    private toolConfigurations;
    private costThresholds;
    constructor();
    private initializeDefaultConfigurations;
    /**
     * Get optimized MCP tools based on context and constraints
     */
    getOptimizedToolsForContext(context: MCPConfigContext): MCPToolConfig[];
    private getToolPrioritiesForTask;
    private isSecurityLevelAllowed;
    private isToolEnvironmentReady;
    private applyContextualOptimizations;
    /**
     * Calculate estimated cost for tool configuration
     */
    estimateToolCosts(tools: MCPToolConfig[], estimatedCalls?: number): {
        total_cost: number;
        cost_breakdown: Array<{
            tool: string;
            estimated_cost: number;
        }>;
        budget_warning?: string;
    };
    /**
     * Get approval workflow for specific tool operation
     */
    getApprovalRequirement(toolName: string, operation: string, context: MCPConfigContext): 'always' | 'never' | 'conditional';
    /**
     * Update tool configuration dynamically
     */
    updateToolConfiguration(toolName: string, updates: Partial<MCPToolConfig>): void;
    /**
     * Get current configuration status
     */
    getConfigurationStatus(): {
        total_tools: number;
        enabled_tools: string[];
        disabled_tools: string[];
        cost_distribution: Record<string, number>;
    };
}
export declare const mcpConfigManager: MCPConfigManager;
export default mcpConfigManager;
