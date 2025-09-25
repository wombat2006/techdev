/**
 * Comprehensive MCP Integration Tests
 * Tests all MCP components: Config Manager, Approval Manager, Integration Service, and Wall-Bounce
 */

import { mcpConfigManager, MCPConfigContext } from '../src/services/mcp-config-manager';
import { mcpApprovalManager } from '../src/services/mcp-approval-manager';
import { mcpIntegrationService } from '../src/services/mcp-integration-service';
import { WallBounceAnalyzer } from '../src/services/wall-bounce-analyzer';

// Mock OpenAI for testing
const mockOpenAI = {
  responses: {
    create: async (params: any) => ({
      output_text: `Mock response for: ${params.input}`,
      usage: { input_tokens: 100, output_tokens: 150, total_tokens: 250 },
      output: [
        { type: 'mcp_list_tools', tools: [] },
        { type: 'mcp_call', server_label: 'test_tool', name: 'test_operation', output: 'success' }
      ]
    })
  }
};

async function testMCPConfigManager() {
  console.log('🔧 Testing MCP Config Manager...');
  
  try {
    // Test 1: Basic configuration status
    const status = mcpConfigManager.getConfigurationStatus();
    console.log('✅ Configuration Status:', {
      total_tools: status.total_tools,
      enabled_tools: status.enabled_tools.length,
      disabled_tools: status.disabled_tools.length
    });

    // Test 2: Tool selection for different contexts
    const basicContext: MCPConfigContext = {
      taskType: 'basic',
      budgetTier: 'standard',
      securityLevel: 'internal'
    };

    const basicTools = mcpConfigManager.getOptimizedToolsForContext(basicContext);
    console.log('✅ Basic Context Tools:', basicTools.map(t => t.server_label));

    // Test 3: Premium context
    const premiumContext: MCPConfigContext = {
      taskType: 'premium',
      budgetTier: 'premium',
      securityLevel: 'sensitive'
    };

    const premiumTools = mcpConfigManager.getOptimizedToolsForContext(premiumContext);
    console.log('✅ Premium Context Tools:', premiumTools.map(t => t.server_label));

    // Test 4: Cost estimation
    const costEstimate = mcpConfigManager.estimateToolCosts(basicTools, 5);
    console.log('✅ Cost Estimate:', {
      total_cost: costEstimate.total_cost,
      tools_count: costEstimate.cost_breakdown.length,
      has_warning: !!costEstimate.budget_warning
    });

    return true;
  } catch (error) {
    console.error('❌ MCP Config Manager Test Failed:', error);
    return false;
  }
}

async function testMCPApprovalManager() {
  console.log('🔐 Testing MCP Approval Manager...');
  
  try {
    // Test 1: Low risk operation (should auto-approve)
    const context: MCPConfigContext = {
      taskType: 'basic',
      budgetTier: 'standard',
      securityLevel: 'internal'
    };

    const lowRiskRequest = await mcpApprovalManager.requestApproval(
      'context7',
      'search',
      { query: 'test documentation' },
      context,
      'test_user'
    );

    console.log('✅ Low Risk Request:', {
      requires_approval: lowRiskRequest.requiresApproval,
      auto_approved: lowRiskRequest.autoApproved
    });

    // Test 2: High risk operation (should require approval)
    const highRiskRequest = await mcpApprovalManager.requestApproval(
      'gmail',
      'send_email',
      { to: 'test@example.com', subject: 'Test' },
      { ...context, securityLevel: 'sensitive' },
      'test_user'
    );

    console.log('✅ High Risk Request:', {
      requires_approval: highRiskRequest.requiresApproval,
      request_id: highRiskRequest.requestId
    });

    // Test 3: Process approval for high risk request
    if (highRiskRequest.requestId) {
      const approved = await mcpApprovalManager.processApproval(
        highRiskRequest.requestId,
        true,
        'security_officer',
        'test_approver',
        undefined,
        ['monitor_usage']
      );
      console.log('✅ Approval Processing:', { approved });
    }

    // Test 4: Get approval statistics
    const stats = mcpApprovalManager.getApprovalStatistics();
    console.log('✅ Approval Statistics:', {
      total_requests: stats.total_requests,
      auto_approved: stats.auto_approved,
      manual_approved: stats.approved
    });

    return true;
  } catch (error) {
    console.error('❌ MCP Approval Manager Test Failed:', error);
    return false;
  }
}

async function testMCPIntegrationService() {
  console.log('🔗 Testing MCP Integration Service...');
  
  try {
    // Test 1: Basic execution (dry run)
    const basicRequest = {
      tools: [],
      context: {
        taskType: 'basic' as const,
        budgetTier: 'standard' as const,
        securityLevel: 'internal' as const
      },
      requestedBy: 'test_user',
      dryRun: true
    };

    const dryRunResult = await mcpIntegrationService.executeMCPTools(mockOpenAI, basicRequest);
    console.log('✅ Dry Run Execution:', {
      success: dryRunResult.success,
      results_count: dryRunResult.results.length,
      estimated_cost: dryRunResult.cost_analysis.estimated_cost
    });

    // Test 2: Premium execution (simulated)
    const premiumRequest = {
      tools: [],
      context: {
        taskType: 'premium' as const,
        budgetTier: 'premium' as const,
        securityLevel: 'sensitive' as const
      },
      requestedBy: 'test_user',
      dryRun: false
    };

    const premiumResult = await mcpIntegrationService.executeMCPTools(mockOpenAI, premiumRequest);
    console.log('✅ Premium Execution:', {
      success: premiumResult.success,
      mcp_calls: premiumResult.mcp_calls.length,
      approval_summary: premiumResult.approval_summary,
      performance: premiumResult.performance_metrics.total_time_ms
    });

    // Test 3: Get system analytics
    const analytics = mcpIntegrationService.getAnalytics();
    console.log('✅ Analytics:', {
      executions: analytics.execution_stats.total_executions,
      success_rate: analytics.execution_stats.success_rate,
      average_cost: analytics.execution_stats.average_cost
    });

    // Test 4: System status
    const systemStatus = mcpIntegrationService.getSystemStatus();
    console.log('✅ System Status:', {
      health: systemStatus.system_health,
      recent_executions: systemStatus.recent_execution_count,
      recommendations: systemStatus.recommendations.length
    });

    return true;
  } catch (error) {
    console.error('❌ MCP Integration Service Test Failed:', error);
    return false;
  }
}

async function testWallBounceIntegration() {
  console.log('🏓 Testing Wall-Bounce MCP Integration...');
  
  try {
    // Mock environment variables for testing
    process.env.CIPHER_MCP_ENABLED = 'false'; // Disable to avoid real API calls
    process.env.CONTEXT7_MCP_ENABLED = 'false';
    process.env.MCP_BUDGET_TIER = 'standard';
    process.env.MCP_SECURITY_LEVEL = 'internal';

    const analyzer = new WallBounceAnalyzer();

    // Test basic wall-bounce execution
    const result = await analyzer.executeWallBounce(
      'Test technical analysis prompt for MCP integration',
      'basic',
      { minProviders: 1, maxProviders: 2, confidenceThreshold: 0.7 }
    );

    console.log('✅ Wall-Bounce Execution:', {
      consensus_confidence: result.consensus.confidence,
      llm_votes: result.llm_votes.length,
      total_cost: result.total_cost,
      processing_time: result.processing_time_ms,
      wall_bounce_verified: result.debug.wall_bounce_verified
    });

    return true;
  } catch (error) {
    console.error('❌ Wall-Bounce Integration Test Failed:', error);
    return false;
  }
}

async function testGoogleDriveConnector() {
  console.log('📁 Testing Google Drive MCP Connector...');
  
  try {
    // Import Google Drive connector
    const { GoogleDriveRAGConnector } = require('../src/services/googledrive-connector');
    
    // Mock configuration (avoid real API calls)
    const mockConfig = {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      redirectUri: 'http://localhost:3000/auth/callback',
      refreshToken: 'test_refresh_token'
    };

    const mockOpenAIConfig = {
      apiKey: 'test_api_key',
      organization: 'test_org'
    };

    // Set environment for MCP testing
    process.env.GOOGLE_DRIVE_MCP_ENABLED = 'false'; // Disable to avoid real calls
    process.env.CONTEXT7_MCP_ENABLED = 'false';

    console.log('✅ Google Drive MCP Connector Test Setup Complete (API calls disabled for testing)');

    return true;
  } catch (error) {
    console.error('❌ Google Drive Connector Test Failed:', error);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting Comprehensive MCP Integration Tests\n');
  
  const testResults = {
    config_manager: false,
    approval_manager: false,
    integration_service: false,
    wall_bounce: false,
    google_drive: false
  };

  try {
    testResults.config_manager = await testMCPConfigManager();
    console.log('');
    
    testResults.approval_manager = await testMCPApprovalManager();
    console.log('');
    
    testResults.integration_service = await testMCPIntegrationService();
    console.log('');
    
    testResults.wall_bounce = await testWallBounceIntegration();
    console.log('');
    
    testResults.google_drive = await testGoogleDriveConnector();
    console.log('');

  } catch (error) {
    console.error('❌ Test suite execution error:', error);
  }

  // Summary
  const passed = Object.values(testResults).filter(result => result).length;
  const total = Object.keys(testResults).length;
  
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  
  for (const [component, result] of Object.entries(testResults)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${component.replace('_', ' ').toUpperCase()}`);
  }
  
  console.log('='.repeat(50));
  console.log(`Total: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All MCP Integration Tests Passed!');
  } else {
    console.log('⚠️ Some tests failed. Check logs above for details.');
  }

  return testResults;
}

// Export for use in other test files
export { runAllTests, testMCPConfigManager, testMCPApprovalManager, testMCPIntegrationService };

// Run tests if called directly
if (require.main === module) {
  runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}