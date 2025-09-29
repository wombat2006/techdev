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

import { logger } from '../utils/logger';

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
  always?: { tool_names: string[] };
  never?: { tool_names: string[] };
  conditional?: {
    tool_names: string[];
    conditions: (context: any) => boolean; // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  };
}

export interface MCPConfigContext {
  taskType: 'basic' | 'premium' | 'critical';
  budgetTier: 'free' | 'standard' | 'premium';
  securityLevel: 'public' | 'internal' | 'sensitive' | 'critical';
  userRole?: string;
  projectId?: string;
}

export class MCPConfigManager {
  private toolConfigurations: Map<string, MCPToolConfig> = new Map();
  private costThresholds = {
    free: { maxTools: 1, maxCalls: 10 },
    standard: { maxTools: 3, maxCalls: 50 },
    premium: { maxTools: 10, maxCalls: 200 }
  };

  constructor() {
    this.initializeDefaultConfigurations();
  }

  private initializeDefaultConfigurations() {
    // Cipher MCP - Memory and Learning
    this.toolConfigurations.set('cipher', {
      type: 'mcp',
      server_label: 'cipher_memory',
      server_url: 'https://cipher.byterover.dev/mcp',
      require_approval: {
        never: { tool_names: ['retrieve_context', 'search_similar'] },
        always: { tool_names: ['delete_memory', 'bulk_update'] }
      },
      allowed_tools: ['store_analysis', 'retrieve_context', 'search_similar_prompts'],
      cost_tier: 'low',
      security_level: 'internal'
    });

    // Context7 MCP - Technical Documentation  
    this.toolConfigurations.set('context7', {
      type: 'mcp',
      server_label: 'context7_docs',
      server_url: 'https://api.context7.com/mcp',
      authorization: process.env.CONTEXT7_API_KEY,
      require_approval: 'never',
      allowed_tools: ['get_library_docs', 'resolve_library_id', 'search_technical_patterns'],
      cost_tier: 'free',
      security_level: 'public'
    });

    // Google Drive MCP Connector
    this.toolConfigurations.set('google_drive', {
      type: 'mcp',
      server_label: 'google_drive',
      connector_id: 'connector_googledrive',
      authorization: process.env.GOOGLE_OAUTH_TOKEN,
      require_approval: {
        never: { tool_names: ['search', 'recent_documents', 'fetch'] },
        always: { tool_names: ['delete', 'share', 'move'] }
      },
      allowed_tools: ['search', 'recent_documents', 'fetch', 'get_profile'],
      cost_tier: 'medium',
      security_level: 'internal'
    });

    // Gmail MCP Connector - IT Ticket Management
    this.toolConfigurations.set('gmail', {
      type: 'mcp',
      server_label: 'gmail_tickets',
      connector_id: 'connector_gmail',
      authorization: process.env.GMAIL_OAUTH_TOKEN,
      require_approval: {
        never: { tool_names: ['search_emails', 'read_email'] },
        always: { tool_names: ['send_email', 'delete_email'] }
      },
      allowed_tools: ['search_emails', 'read_email', 'get_profile'],
      cost_tier: 'high',
      security_level: 'sensitive'
    });

    // SharePoint MCP Connector - Knowledge Base
    this.toolConfigurations.set('sharepoint', {
      type: 'mcp',
      server_label: 'sharepoint_kb',
      connector_id: 'connector_sharepoint',
      authorization: process.env.SHAREPOINT_OAUTH_TOKEN,
      require_approval: {
        never: { tool_names: ['search', 'fetch', 'list_recent_documents'] },
        conditional: {
          tool_names: ['get_site'],
          conditions: (ctx) => ctx.taskType === 'critical'
        }
      },
      allowed_tools: ['search', 'fetch', 'list_recent_documents', 'get_site'],
      cost_tier: 'medium',
      security_level: 'internal'
    });

    logger.info('🔧 MCP Configuration Manager initialized', {
      configured_tools: this.toolConfigurations.size,
      available_tools: Array.from(this.toolConfigurations.keys())
    });
  }

  /**
   * Get optimized MCP tools based on context and constraints
   */
  getOptimizedToolsForContext(context: MCPConfigContext): MCPToolConfig[] {
    const availableTools: MCPToolConfig[] = [];
    const budgetLimits = this.costThresholds[context.budgetTier];

    logger.info('🎯 Selecting optimized MCP tools', {
      taskType: context.taskType,
      budgetTier: context.budgetTier,
      securityLevel: context.securityLevel,
      maxTools: budgetLimits.maxTools
    });

    // Priority-based tool selection
    const toolPriorities = this.getToolPrioritiesForTask(context.taskType);

    for (const [toolName, priority] of toolPriorities) {
      if (availableTools.length >= budgetLimits.maxTools) break;

      const toolConfig = this.toolConfigurations.get(toolName);
      if (!toolConfig) continue;

      // Security level check
      if (!this.isSecurityLevelAllowed(toolConfig.security_level!, context.securityLevel)) {
        logger.debug('🚫 Tool filtered out by security level', {
          tool: toolName,
          tool_security: toolConfig.security_level,
          context_security: context.securityLevel
        });
        continue;
      }

      // Environment availability check
      if (!this.isToolEnvironmentReady(toolName)) {
        logger.debug('⚠️ Tool skipped - environment not ready', { tool: toolName });
        continue;
      }

      // Apply context-specific configurations
      const optimizedConfig = this.applyContextualOptimizations(toolConfig, context);
      availableTools.push(optimizedConfig);

      logger.debug('✅ Tool selected', {
        tool: toolName,
        priority,
        cost_tier: toolConfig.cost_tier,
        allowed_tools_count: optimizedConfig.allowed_tools.length
      });
    }

    logger.info('🎯 Tool selection completed', {
      selected_tools: availableTools.map(t => t.server_label),
      total_count: availableTools.length,
      budget_utilization: `${availableTools.length}/${budgetLimits.maxTools}`
    });

    return availableTools;
  }

  private getToolPrioritiesForTask(taskType: string): [string, number][] {
    const priorities: Record<string, Record<string, number>> = {
      basic: {
        'context7': 10,      // Free tier, high value
        'cipher': 8,         // Low cost, learning capability
        'google_drive': 6    // Medium cost but useful
      },
      premium: {
        'cipher': 10,        // Enhanced memory for complex tasks
        'context7': 9,       // Technical documentation critical
        'google_drive': 8,   // Document access important
        'sharepoint': 6      // Knowledge base access
      },
      critical: {
        'cipher': 10,        // Full memory capabilities
        'context7': 9,       // Complete technical reference
        'google_drive': 8,   // Full document access
        'gmail': 7,          // Incident management
        'sharepoint': 6      // Complete knowledge base
      }
    };

    const taskPriorities = priorities[taskType] || priorities.basic;
    return Object.entries(taskPriorities).sort(([,a], [,b]) => b - a);
  }

  private isSecurityLevelAllowed(toolLevel: string, contextLevel: string): boolean {
    const levels = ['public', 'internal', 'sensitive', 'critical'];
    const toolLevelIndex = levels.indexOf(toolLevel);
    const contextLevelIndex = levels.indexOf(contextLevel);
    
    // Tool security level must be <= context security level
    return toolLevelIndex <= contextLevelIndex;
  }

  private isToolEnvironmentReady(toolName: string): boolean {
    const envChecks: Record<string, () => boolean> = {
      cipher: () => process.env.CIPHER_MCP_ENABLED === 'true',
      context7: () => process.env.CONTEXT7_MCP_ENABLED === 'true' && !!process.env.CONTEXT7_API_KEY,
      google_drive: () => process.env.GOOGLE_DRIVE_MCP_ENABLED === 'true' && !!process.env.GOOGLE_OAUTH_TOKEN,
      gmail: () => process.env.GMAIL_MCP_ENABLED === 'true' && !!process.env.GMAIL_OAUTH_TOKEN,
      sharepoint: () => process.env.SHAREPOINT_MCP_ENABLED === 'true' && !!process.env.SHAREPOINT_OAUTH_TOKEN
    };

    return envChecks[toolName]?.() || false;
  }

  private applyContextualOptimizations(
    config: MCPToolConfig, 
    context: MCPConfigContext
  ): MCPToolConfig {
    const optimized = { ...config };

    // Context-specific tool filtering
    if (context.taskType === 'basic') {
      // Reduce tool set for basic tasks to save costs
      optimized.allowed_tools = config.allowed_tools.slice(0, 3);
    } else if (context.taskType === 'critical') {
      // Enable additional security measures for critical tasks
      if (typeof optimized.require_approval === 'string' && optimized.require_approval === 'never') {
        optimized.require_approval = {
          never: { tool_names: config.allowed_tools.slice(0, 2) },
          always: { tool_names: config.allowed_tools.slice(2) }
        };
      }
    }

    return optimized;
  }

  /**
   * Calculate estimated cost for tool configuration
   */
  estimateToolCosts(tools: MCPToolConfig[], estimatedCalls: number = 10): {
    total_cost: number;
    cost_breakdown: Array<{ tool: string; estimated_cost: number }>;
    budget_warning?: string;
  } {
    const costPerCall = {
      free: 0,
      low: 0.0001,
      medium: 0.001,
      high: 0.01
    };

    let totalCost = 0;
    const breakdown = tools.map(tool => {
      const toolCost = (costPerCall[tool.cost_tier || 'medium']) * estimatedCalls;
      totalCost += toolCost;
      
      return {
        tool: tool.server_label,
        estimated_cost: toolCost
      };
    });

    const result: any = {
      total_cost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
      cost_breakdown: breakdown
    };

    // Budget warnings
    if (totalCost > 0.1) {
      result.budget_warning = `High cost estimated: $${totalCost.toFixed(4)}. Consider reducing tool usage or switching to lower-cost alternatives.`;
    }

    return result;
  }

  /**
   * Get approval workflow for specific tool operation
   */
  getApprovalRequirement(
    toolName: string, 
    operation: string, 
    context: MCPConfigContext
  ): 'always' | 'never' | 'conditional' {
    const config = this.toolConfigurations.get(toolName);
    if (!config) return 'always'; // Safe default

    const approval = config.require_approval;
    
    if (typeof approval === 'string') {
      return approval;
    }

    // Check explicit never requirements
    if (approval.never?.tool_names.includes(operation)) {
      return 'never';
    }

    // Check explicit always requirements
    if (approval.always?.tool_names.includes(operation)) {
      return 'always';
    }

    // Check conditional requirements
    if (approval.conditional?.tool_names.includes(operation)) {
      return approval.conditional.conditions(context) ? 'always' : 'never';
    }

    return 'always'; // Safe default
  }

  /**
   * Update tool configuration dynamically
   */
  updateToolConfiguration(toolName: string, updates: Partial<MCPToolConfig>): void {
    const existing = this.toolConfigurations.get(toolName);
    if (!existing) {
      throw new Error(`Tool configuration not found: ${toolName}`);
    }

    const updated = { ...existing, ...updates };
    this.toolConfigurations.set(toolName, updated);

    logger.info('🔄 Tool configuration updated', {
      tool: toolName,
      updates: Object.keys(updates)
    });
  }

  /**
   * Get current configuration status
   */
  getConfigurationStatus(): {
    total_tools: number;
    enabled_tools: string[];
    disabled_tools: string[];
    cost_distribution: Record<string, number>;
  } {
    const allTools = Array.from(this.toolConfigurations.keys());
    const enabledTools = allTools.filter(tool => 
      this.isToolEnvironmentReady(tool)
    );
    const disabledTools = allTools.filter(tool => !enabledTools.includes(tool));

    const costDistribution: Record<string, number> = {};
    for (const [, config] of this.toolConfigurations) {
      const tier = config.cost_tier || 'medium';
      costDistribution[tier] = (costDistribution[tier] || 0) + 1;
    }

    return {
      total_tools: allTools.length,
      enabled_tools: enabledTools,
      disabled_tools: disabledTools,
      cost_distribution: costDistribution
    };
  }
}

// Singleton instance
export const mcpConfigManager = new MCPConfigManager();

export default mcpConfigManager;
