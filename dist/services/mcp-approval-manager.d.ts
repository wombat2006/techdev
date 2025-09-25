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
import { MCPConfigContext } from './mcp-config-manager';
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
        condition: (request: ApprovalRequest) => boolean;
        description: string;
    }>;
    escalation_timeout_ms: number;
}
export declare class MCPApprovalManager {
    private pendingRequests;
    private approvalResponses;
    private approvalPolicies;
    private auditLog;
    constructor();
    private initializeApprovalPolicies;
    /**
     * Request approval for MCP tool operation
     */
    requestApproval(toolName: string, operation: string, operationArgs: any, context: MCPConfigContext, requestedBy?: string): Promise<{
        requiresApproval: boolean;
        requestId?: string;
        autoApproved?: boolean;
    }>;
    /**
     * Process approval response
     */
    processApproval(requestId: string, approved: boolean, approverRole: string, approverIdentity: string, rejectionReason?: string, conditions?: string[]): Promise<boolean>;
    /**
     * Check if operation is approved and ready to execute
     */
    isOperationApproved(requestId: string): Promise<{
        approved: boolean;
        response?: ApprovalResponse;
        expired?: boolean;
    }>;
    private assessRiskLevel;
    private detectSensitiveData;
    private recordApprovalDecision;
    private handleApprovalTimeout;
    private generateRequestId;
    /**
     * Get approval statistics for monitoring
     */
    getApprovalStatistics(timeWindow?: number): {
        total_requests: number;
        approved: number;
        rejected: number;
        auto_approved: number;
        pending: number;
        by_risk_level: Record<string, number>;
        by_tool: Record<string, number>;
    };
    /**
     * Export audit log for compliance
     */
    exportAuditLog(startTime?: number, endTime?: number): Array<any>;
}
export declare const mcpApprovalManager: MCPApprovalManager;
export default mcpApprovalManager;
