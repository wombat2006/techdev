/**
 * MCP Approval Manager - Enterprise Security Workflows
 * Single Responsibility: Handle MCP tool call approvals with enterprise security policies
 * 
 * Key Features:
 * - Multi-tier approval workflows
 * - Risk-based approval routing
 * - Audit logging for compliance
 * - Real-time approval processing
 * - Integration with enterprise identity systems
 */

import { logger } from '../utils/logger';
import { mcpConfigManager, MCPConfigContext } from './mcp-config-manager';

export interface ApprovalRequest {
  id: string;
  tool_name: string;
  operation: string;
  arguments: any;
  context: MCPConfigContext;
  requested_by: string;
  requested_at: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  sensitive_data?: string[];
  business_justification?: string;
}

export interface ApprovalResponse {
  request_id: string;
  approved: boolean;
  approved_by?: string;
  approved_at?: number;
  rejection_reason?: string;
  conditions?: string[];
  expires_at?: number;
}

export interface ApprovalPolicy {
  risk_level: string;
  required_approvers: number;
  approver_roles: string[];
  auto_approve_conditions?: Array<{
    condition: (request: ApprovalRequest) => boolean; // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
    description: string;
  }>;
  escalation_timeout_ms: number;
}

export class MCPApprovalManager {
  private pendingRequests = new Map<string, ApprovalRequest>();
  private approvalResponses = new Map<string, ApprovalResponse>();
  private approvalPolicies = new Map<string, ApprovalPolicy>();
  private auditLog: Array<{
    timestamp: number;
    action: string;
    request_id: string;
    details: any;
  }> = [];

  constructor() {
    this.initializeApprovalPolicies();
  }

  private initializeApprovalPolicies() {
    // Low Risk - Automated approval for read-only operations
    this.approvalPolicies.set('low', {
      risk_level: 'low',
      required_approvers: 0, // Auto-approve
      approver_roles: [],
      auto_approve_conditions: [
        {
          condition: (req) => ['search', 'read', 'get', 'fetch'].some(op => req.operation.toLowerCase().includes(op)),
          description: 'Read-only operations are auto-approved'
        },
        {
          condition: (req) => req.context.taskType === 'basic' && req.tool_name === 'context7',
          description: 'Context7 documentation access for basic tasks'
        }
      ],
      escalation_timeout_ms: 0 // No timeout for auto-approval
    });

    // Medium Risk - Single approver required
    this.approvalPolicies.set('medium', {
      risk_level: 'medium',
      required_approvers: 1,
      approver_roles: ['tech_lead', 'senior_engineer', 'system_admin'],
      auto_approve_conditions: [
        {
          condition: (req) => req.context.taskType === 'basic' && req.requested_by.includes('system'),
          description: 'System-initiated basic tasks with medium risk'
        }
      ],
      escalation_timeout_ms: 5 * 60 * 1000 // 5 minutes
    });

    // High Risk - Multiple approvers or senior approval
    this.approvalPolicies.set('high', {
      risk_level: 'high',
      required_approvers: 1,
      approver_roles: ['security_officer', 'engineering_manager', 'cto'],
      escalation_timeout_ms: 15 * 60 * 1000 // 15 minutes
    });

    // Critical Risk - Multiple senior approvers required
    this.approvalPolicies.set('critical', {
      risk_level: 'critical',
      required_approvers: 2,
      approver_roles: ['security_officer', 'cto', 'compliance_officer'],
      escalation_timeout_ms: 30 * 60 * 1000 // 30 minutes
    });

    logger.info('🔐 MCP Approval Manager initialized', {
      policies_loaded: this.approvalPolicies.size,
      risk_levels: Array.from(this.approvalPolicies.keys())
    });
  }

  /**
   * Request approval for MCP tool operation
   */
  async requestApproval(
    toolName: string,
    operation: string,
    operationArgs: any,
    context: MCPConfigContext,
    requestedBy: string = 'system'
  ): Promise<{ requiresApproval: boolean; requestId?: string; autoApproved?: boolean }> {
    
    // Check if approval is needed based on configuration
    const approvalRequirement = mcpConfigManager.getApprovalRequirement(toolName, operation, context);
    
    if (approvalRequirement === 'never') {
      logger.debug('✅ Auto-approved: No approval required', { toolName, operation });
      return { requiresApproval: false };
    }

    // Generate approval request
    const requestId = this.generateRequestId();
    const riskLevel = this.assessRiskLevel(toolName, operation, operationArgs, context);
    
    const request: ApprovalRequest = {
      id: requestId,
      tool_name: toolName,
      operation,
      arguments: operationArgs,
      context,
      requested_by: requestedBy,
      requested_at: Date.now(),
      risk_level: riskLevel,
      sensitive_data: this.detectSensitiveData(operationArgs),
      business_justification: `${context.taskType} task requiring ${toolName}:${operation}`
    };

    // Check for auto-approval conditions
    const policy = this.approvalPolicies.get(riskLevel);
    if (policy?.auto_approve_conditions) {
      for (const condition of policy.auto_approve_conditions) {
        if (condition.condition(request)) {
          logger.info('✅ Auto-approved by policy', {
            requestId,
            toolName,
            operation,
            condition: condition.description,
            riskLevel
          });

          this.recordApprovalDecision(requestId, {
            request_id: requestId,
            approved: true,
            approved_by: 'system_policy',
            approved_at: Date.now()
          });

          return { requiresApproval: false, requestId, autoApproved: true };
        }
      }
    }

    // Store pending request
    this.pendingRequests.set(requestId, request);
    
    // Log approval request
    this.auditLog.push({
      timestamp: Date.now(),
      action: 'approval_requested',
      request_id: requestId,
      details: {
        tool: toolName,
        operation,
        risk_level: riskLevel,
        requested_by: requestedBy,
        context: context.taskType
      }
    });

    logger.info('📋 Approval request created', {
      requestId,
      toolName,
      operation,
      riskLevel,
      requiredApprovers: policy?.required_approvers || 1,
      approverRoles: policy?.approver_roles || []
    });

    // Set up auto-escalation timeout
    if (policy?.escalation_timeout_ms) {
      setTimeout(() => {
        this.handleApprovalTimeout(requestId);
      }, policy.escalation_timeout_ms);
    }

    return { requiresApproval: true, requestId };
  }

  /**
   * Process approval response
   */
  async processApproval(
    requestId: string,
    approved: boolean,
    approverRole: string,
    approverIdentity: string,
    rejectionReason?: string,
    conditions?: string[]
  ): Promise<boolean> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    const policy = this.approvalPolicies.get(request.risk_level);
    if (!policy) {
      throw new Error(`No policy found for risk level: ${request.risk_level}`);
    }

    // Validate approver role
    if (!policy.approver_roles.includes(approverRole)) {
      throw new Error(`Insufficient permissions. Required roles: ${policy.approver_roles.join(', ')}`);
    }

    const response: ApprovalResponse = {
      request_id: requestId,
      approved,
      approved_by: `${approverRole}:${approverIdentity}`,
      approved_at: Date.now(),
      rejection_reason: rejectionReason,
      conditions,
      expires_at: approved ? Date.now() + (24 * 60 * 60 * 1000) : undefined // 24h expiry for approvals
    };

    this.recordApprovalDecision(requestId, response);

    // Remove from pending
    this.pendingRequests.delete(requestId);

    logger.info(approved ? '✅ Request approved' : '❌ Request rejected', {
      requestId,
      approver: response.approved_by,
      tool: request.tool_name,
      operation: request.operation,
      reason: rejectionReason,
      conditions: conditions?.length || 0
    });

    return approved;
  }

  /**
   * Check if operation is approved and ready to execute
   */
  async isOperationApproved(requestId: string): Promise<{
    approved: boolean;
    response?: ApprovalResponse;
    expired?: boolean;
  }> {
    const response = this.approvalResponses.get(requestId);
    
    if (!response) {
      return { approved: false };
    }

    // Check expiry
    if (response.expires_at && Date.now() > response.expires_at) {
      logger.warn('⏰ Approval expired', { requestId });
      return { approved: false, expired: true };
    }

    return { approved: response.approved, response };
  }

  private assessRiskLevel(
    toolName: string,
    operation: string,
    args: any,
    context: MCPConfigContext
  ): 'low' | 'medium' | 'high' | 'critical' {
    
    // Critical operations
    if (['delete', 'remove', 'drop', 'destroy'].some(op => operation.toLowerCase().includes(op))) {
      return 'critical';
    }

    // High risk operations
    if (['send', 'create', 'update', 'modify', 'share', 'publish'].some(op => operation.toLowerCase().includes(op))) {
      return 'high';
    }

    // Context-based risk assessment
    if (context.securityLevel === 'critical' || context.taskType === 'critical') {
      return 'high';
    }

    // Sensitive tools
    const sensitiveTools = ['gmail', 'sharepoint', 'teams'];
    if (sensitiveTools.includes(toolName.toLowerCase())) {
      return 'medium';
    }

    // Data volume risk
    if (args && typeof args === 'object') {
      const argString = JSON.stringify(args);
      if (argString.length > 1000) {
        return 'medium';
      }
    }

    return 'low';
  }

  private detectSensitiveData(args: any): string[] {
    const sensitive: string[] = [];
    const argString = JSON.stringify(args || {}).toLowerCase();
    
    const patterns = [
      { pattern: /password|secret|key|token/i, type: 'credentials' },
      { pattern: /ssn|social.*security|tax.*id/i, type: 'pii' },
      { pattern: /credit.*card|bank.*account|routing/i, type: 'financial' },
      { pattern: /confidential|proprietary|internal.*only/i, type: 'business_sensitive' }
    ];

    for (const { pattern, type } of patterns) {
      if (pattern.test(argString)) {
        sensitive.push(type);
      }
    }

    return sensitive;
  }

  private recordApprovalDecision(requestId: string, response: ApprovalResponse) {
    this.approvalResponses.set(requestId, response);
    
    this.auditLog.push({
      timestamp: Date.now(),
      action: response.approved ? 'approval_granted' : 'approval_denied',
      request_id: requestId,
      details: {
        approved_by: response.approved_by,
        conditions: response.conditions,
        reason: response.rejection_reason
      }
    });
  }

  private handleApprovalTimeout(requestId: string) {
    const request = this.pendingRequests.get(requestId);
    if (!request) return; // Already processed

    logger.warn('⏰ Approval request timed out', {
      requestId,
      tool: request.tool_name,
      operation: request.operation,
      age_minutes: Math.floor((Date.now() - request.requested_at) / 60000)
    });

    // Auto-reject on timeout
    this.recordApprovalDecision(requestId, {
      request_id: requestId,
      approved: false,
      rejection_reason: 'Request timed out - no approval received within allowed timeframe',
      approved_at: Date.now()
    });

    this.pendingRequests.delete(requestId);
  }

  private generateRequestId(): string {
    return `mcpap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get approval statistics for monitoring
   */
  getApprovalStatistics(timeWindow: number = 24 * 60 * 60 * 1000): {
    total_requests: number;
    approved: number;
    rejected: number;
    auto_approved: number;
    pending: number;
    by_risk_level: Record<string, number>;
    by_tool: Record<string, number>;
  } {
    const cutoff = Date.now() - timeWindow;
    const recentLogs = this.auditLog.filter(log => log.timestamp >= cutoff);

    const stats = {
      total_requests: 0,
      approved: 0,
      rejected: 0,
      auto_approved: 0,
      pending: this.pendingRequests.size,
      by_risk_level: {} as Record<string, number>,
      by_tool: {} as Record<string, number>
    };

    for (const log of recentLogs) {
      if (log.action === 'approval_requested') {
        stats.total_requests++;
        
        // Track by risk level
        const riskLevel = log.details.risk_level;
        stats.by_risk_level[riskLevel] = (stats.by_risk_level[riskLevel] || 0) + 1;
        
        // Track by tool
        const tool = log.details.tool;
        stats.by_tool[tool] = (stats.by_tool[tool] || 0) + 1;
      } else if (log.action === 'approval_granted') {
        if (log.details.approved_by === 'system_policy') {
          stats.auto_approved++;
        } else {
          stats.approved++;
        }
      } else if (log.action === 'approval_denied') {
        stats.rejected++;
      }
    }

    return stats;
  }

  /**
   * Export audit log for compliance
   */
  exportAuditLog(startTime?: number, endTime?: number): Array<any> {
    const start = startTime || 0;
    const end = endTime || Date.now();
    
    return this.auditLog
      .filter(log => log.timestamp >= start && log.timestamp <= end)
      .map(log => ({
        ...log,
        timestamp_iso: new Date(log.timestamp).toISOString()
      }));
  }
}

// Singleton instance
export const mcpApprovalManager = new MCPApprovalManager();

export default mcpApprovalManager;
