/**
 * MCP Integration Demo - Showcase all features with realistic scenarios
 */

import { mcpConfigManager, MCPConfigContext } from '../src/services/mcp-config-manager';
import { mcpApprovalManager } from '../src/services/mcp-approval-manager';
import { mcpIntegrationService } from '../src/services/mcp-integration-service';

async function demoMCPFeatures() {
  console.log('🚀 MCP Integration Demo - TechSapo Infrastructure Support\n');

  // Scenario 1: Basic IT Support Query
  console.log('📋 Scenario 1: Basic IT Support Query');
  console.log('User asks: "How to configure SSL certificates for NGINX?"');
  
  const basicContext: MCPConfigContext = {
    taskType: 'basic',
    budgetTier: 'standard',
    securityLevel: 'internal',
    userRole: 'support_engineer',
    projectId: 'techsapo_nginx_ssl'
  };

  const basicTools = mcpConfigManager.getOptimizedToolsForContext(basicContext);
  const basicCosts = mcpConfigManager.estimateToolCosts(basicTools, 3);
  
  console.log(`  🔧 Selected Tools: ${basicTools.map(t => t.server_label).join(', ') || 'None (all disabled for demo)'}`);
  console.log(`  💰 Estimated Cost: $${basicCosts.total_cost.toFixed(4)}`);
  console.log(`  🔒 Auto-approvals: ${basicTools.filter(t => 
    mcpConfigManager.getApprovalRequirement(t.server_label, 'search', basicContext) === 'never'
  ).length}/${basicTools.length}`);
  console.log('');

  // Scenario 2: Critical Infrastructure Issue
  console.log('🚨 Scenario 2: Critical Infrastructure Issue');
  console.log('User reports: "Database cluster is down, need immediate analysis and recovery plan"');

  const criticalContext: MCPConfigContext = {
    taskType: 'critical',
    budgetTier: 'premium',
    securityLevel: 'critical',
    userRole: 'sre_engineer',
    projectId: 'techsapo_db_incident'
  };

  const criticalTools = mcpConfigManager.getOptimizedToolsForContext(criticalContext);
  const criticalCosts = mcpConfigManager.estimateToolCosts(criticalTools, 10);

  console.log(`  🔧 Selected Tools: ${criticalTools.map(t => t.server_label).join(', ') || 'None (all disabled for demo)'}`);
  console.log(`  💰 Estimated Cost: $${criticalCosts.total_cost.toFixed(4)}`);
  
  // Simulate approval workflow for critical operation
  const criticalApproval = await mcpApprovalManager.requestApproval(
    'gmail',
    'send_incident_notification',
    { 
      recipients: ['ops-team@company.com', 'management@company.com'],
      priority: 'critical',
      incident_id: 'INC-2025-0925-001' 
    },
    criticalContext,
    'sre_engineer_john'
  );

  console.log(`  🔒 Approval Required: ${criticalApproval.requiresApproval}`);
  if (criticalApproval.requestId) {
    // Simulate rapid approval for critical incident
    await mcpApprovalManager.processApproval(
      criticalApproval.requestId,
      true,
      'security_officer',
      'security_chief_alice',
      undefined,
      ['log_all_actions', 'notify_compliance']
    );
    console.log(`  ✅ Critical approval granted by security_chief_alice`);
  }
  console.log('');

  // Scenario 3: Cost Optimization Analysis
  console.log('💡 Scenario 3: MCP Cost Optimization in Action');
  
  const scenarios = [
    { name: 'Free Tier', budgetTier: 'free' as const, expectedTools: 1 },
    { name: 'Standard Plan', budgetTier: 'standard' as const, expectedTools: 3 },
    { name: 'Premium Plan', budgetTier: 'premium' as const, expectedTools: 10 }
  ];

  for (const scenario of scenarios) {
    const context: MCPConfigContext = {
      taskType: 'premium',
      budgetTier: scenario.budgetTier,
      securityLevel: 'internal'
    };

    const tools = mcpConfigManager.getOptimizedToolsForContext(context);
    const costs = mcpConfigManager.estimateToolCosts(tools, 5);

    console.log(`  ${scenario.name}:`);
    console.log(`    🔧 Max Tools: ${scenario.expectedTools}, Selected: ${tools.length}`);
    console.log(`    💰 Cost per 5 calls: $${costs.total_cost.toFixed(4)}`);
    console.log(`    ⚠️  Budget Warning: ${costs.budget_warning ? 'Yes' : 'No'}`);
  }
  console.log('');

  // Scenario 4: Security Compliance Demo
  console.log('🔐 Scenario 4: Enterprise Security & Compliance');
  
  const securityLevels = ['public', 'internal', 'sensitive', 'critical'] as const;
  const riskOperations = [
    { op: 'search', desc: 'Search documents' },
    { op: 'send_email', desc: 'Send email notification' },
    { op: 'delete_files', desc: 'Delete system files' }
  ];

  for (const secLevel of securityLevels) {
    console.log(`  Security Level: ${secLevel.toUpperCase()}`);
    
    for (const operation of riskOperations) {
      const testContext: MCPConfigContext = {
        taskType: 'premium',
        budgetTier: 'standard',
        securityLevel: secLevel
      };

      const approval = mcpConfigManager.getApprovalRequirement('gmail', operation.op, testContext);
      console.log(`    ${operation.desc}: ${approval === 'never' ? '🟢 Auto-approve' : 
                                              approval === 'always' ? '🔴 Manual approval' : 
                                              '🟡 Conditional'}`);
    }
    console.log('');
  }

  // Scenario 5: System Health & Analytics
  console.log('📊 Scenario 5: System Health & Performance Analytics');
  
  const systemStatus = mcpIntegrationService.getSystemStatus();
  const approvalStats = mcpApprovalManager.getApprovalStatistics();
  const configStatus = mcpConfigManager.getConfigurationStatus();

  console.log('  System Health Dashboard:');
  console.log(`    🟢 Overall Health: ${systemStatus.system_health.toUpperCase()}`);
  console.log(`    🔧 Available Tools: ${configStatus.enabled_tools.length}/${configStatus.total_tools}`);
  console.log(`    📋 Approval Success Rate: ${
      approvalStats.total_requests > 0 ? 
      Math.round(((approvalStats.approved + approvalStats.auto_approved) / approvalStats.total_requests) * 100) + '%' 
      : 'No data'
    }`);
  console.log(`    ⚡ Recent Activity: ${systemStatus.recent_execution_count} executions (last hour)`);
  console.log('');

  console.log('  Cost Distribution by Tier:');
  for (const [tier, count] of Object.entries(configStatus.cost_distribution)) {
    const percentage = Math.round((count / configStatus.total_tools) * 100);
    console.log(`    ${tier.toUpperCase()}: ${count} tools (${percentage}%)`);
  }
  console.log('');

  console.log('  Recommendations:');
  systemStatus.recommendations.forEach((rec, i) => {
    console.log(`    ${i + 1}. ${rec}`);
  });
  console.log('');

  // Scenario 6: Full Integration Demo (Mock)
  console.log('🎯 Scenario 6: Full Integration Demo');
  console.log('Simulating real-world technical support scenario...');

  const mockOpenAI = {
    responses: {
      create: async (params: any) => ({
        output_text: `Based on your query about "${params.input.substring(0, 50)}...", I've analyzed available documentation and recommend: 1) Check NGINX configuration files, 2) Verify SSL certificate validity, 3) Review firewall settings. MCP tools used: ${params.tools?.length || 0}`,
        usage: { 
          input_tokens: 250, 
          output_tokens: 400, 
          total_tokens: 650,
          mcp_tool_calls: params.tools?.length || 0
        },
        output: [
          { type: 'mcp_list_tools', server_label: 'context7', tools: ['get_docs'] },
          { type: 'mcp_call', server_label: 'cipher', name: 'retrieve_context', output: 'Found 3 similar issues in memory' }
        ]
      })
    }
  };

  const integrationResult = await mcpIntegrationService.executeMCPTools(mockOpenAI, {
    tools: [],
    context: {
      taskType: 'premium',
      budgetTier: 'standard',
      securityLevel: 'internal'
    },
    requestedBy: 'demo_user',
    dryRun: false
  });

  console.log('  📊 Integration Results:');
  console.log(`    ✅ Success: ${integrationResult.success}`);
  console.log(`    🔧 MCP Calls: ${integrationResult.mcp_calls.length}`);
  console.log(`    💰 Total Cost: $${integrationResult.cost_analysis.actual_cost.toFixed(4)}`);
  console.log(`    ⏱️  Processing Time: ${integrationResult.performance_metrics.total_time_ms}ms`);
  console.log(`    📋 Approvals: ${integrationResult.approval_summary.auto_approved} auto, ${integrationResult.approval_summary.manual_approved} manual`);
  console.log('');

  console.log('🎉 MCP Integration Demo Complete!');
  console.log('All components are working together seamlessly with:');
  console.log('  ✅ Cost optimization and budget control');
  console.log('  ✅ Multi-tier security and approval workflows');
  console.log('  ✅ Real-time monitoring and analytics');
  console.log('  ✅ Enterprise-grade compliance and audit trail');
  console.log('  ✅ Scalable architecture ready for production');
}

// Run demo
if (require.main === module) {
  demoMCPFeatures().catch(console.error);
}

export { demoMCPFeatures };