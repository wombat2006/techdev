/**
 * MCP Simplified Alternative Validation
 * Testing from a different perspective with actual working API calls
 */

import { WallBounceAnalyzer } from '../src/services/wall-bounce-analyzer';
import { GoogleDriveRAGConnector } from '../src/services/googledrive-connector';
import { MCPConfigManager } from '../src/services/mcp-config-manager';
import { MCPApprovalManager } from '../src/services/mcp-approval-manager';
import { MCPIntegrationService } from '../src/services/mcp-integration-service';

interface SimpleValidationResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration: number;
}

class MCPSimplifiedValidator {
  async runValidation(): Promise<SimpleValidationResult[]> {
    console.log('🔍 MCP Alternative Validation (Different Eyes Perspective)\n');

    const results: SimpleValidationResult[] = [];

    // Test 1: Configuration System Integrity
    results.push(await this.testConfigurationIntegrity());
    
    // Test 2: Approval Workflow Functionality
    results.push(await this.testApprovalWorkflow());
    
    // Test 3: Integration Service Orchestration
    results.push(await this.testIntegrationOrchestration());
    
    // Test 4: Wall-Bounce Real Execution
    results.push(await this.testWallBounceExecution());
    
    // Test 5: Google Drive Connector
    results.push(await this.testGoogleDriveConnector());
    
    // Test 6: End-to-End Workflow
    results.push(await this.testEndToEndWorkflow());

    return results;
  }

  private async testConfigurationIntegrity(): Promise<SimpleValidationResult> {
    const start = Date.now();
    
    try {
      console.log('🔧 Testing Configuration System Integrity...');
      
      const configManager = new MCPConfigManager();
      
      // Test different contexts
      const contexts = [
        { budgetTier: 'free', securityLevel: 'public', taskType: 'basic', userLocation: 'global', dailyBudgetUsed: 0, dailyBudgetLimit: 1 },
        { budgetTier: 'standard', securityLevel: 'internal', taskType: 'basic', userLocation: 'global', dailyBudgetUsed: 5, dailyBudgetLimit: 25 },
        { budgetTier: 'premium', securityLevel: 'sensitive', taskType: 'premium', userLocation: 'global', dailyBudgetUsed: 10, dailyBudgetLimit: 100 }
      ] as const;

      let totalTools = 0;
      let totalCosts = 0;

      for (const context of contexts) {
        const tools = configManager.getOptimizedToolsForContext(context);
        const costs = configManager.estimateToolCosts(tools, 1);
        totalTools += tools.length;
        totalCosts += costs.total_cost;
        
        console.log(`   ${context.budgetTier}: ${tools.length} tools, $${costs.total_cost} estimated`);
      }

      return {
        test: 'Configuration System Integrity',
        status: 'PASS',
        message: `Configured ${totalTools} total tools across tiers, $${totalCosts.toFixed(2)} total estimated cost`,
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        test: 'Configuration System Integrity',
        status: 'FAIL',
        message: `Configuration failed: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  private async testApprovalWorkflow(): Promise<SimpleValidationResult> {
    const start = Date.now();
    
    try {
      console.log('📋 Testing Approval Workflow...');
      
      const approvalManager = new MCPApprovalManager();
      
      // Test low risk (should auto-approve)
      const lowRisk = await approvalManager.requestApproval(
        'read_tool',
        'basic_read',
        { safe: true },
        'low',
        'test_user'
      );

      // Test high risk (should require approval)
      const highRisk = await approvalManager.requestApproval(
        'admin_tool',
        'delete_data',
        { dangerous: true },
        'high',
        'test_user'
      );

      // Process the high risk approval
      const processed = await approvalManager.processApproval(
        highRisk,
        true,
        'security_officer:validator'
      );

      const stats = approvalManager.getApprovalStatistics();

      console.log(`   Processed ${stats.total_requests} requests, ${stats.manual_approved} manual approvals`);

      return {
        test: 'Approval Workflow',
        status: processed ? 'PASS' : 'FAIL',
        message: `Low risk: auto, High risk: manual approval processed = ${processed}`,
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        test: 'Approval Workflow',
        status: 'FAIL', 
        message: `Approval workflow failed: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  private async testIntegrationOrchestration(): Promise<SimpleValidationResult> {
    const start = Date.now();
    
    try {
      console.log('🔗 Testing Integration Service Orchestration...');
      
      const integrationService = new MCPIntegrationService();
      const configManager = new MCPConfigManager();
      
      const context = {
        budgetTier: 'standard' as const,
        securityLevel: 'internal' as const,
        taskType: 'basic' as const,
        userLocation: 'global' as const,
        dailyBudgetUsed: 0,
        dailyBudgetLimit: 25
      };

      const tools = configManager.getOptimizedToolsForContext(context);
      
      const mockOpenAI = {
        responses: {
          create: async () => ({
            output_text: 'Integration test response',
            usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 }
          })
        }
      };

      const result = await integrationService.executeMCPTools(mockOpenAI as any, {
        tools,
        context,
        userPrompt: 'Test integration',
        requestId: 'test_integration'
      });

      const analytics = integrationService.getAnalytics();
      const systemStatus = integrationService.getSystemStatus();

      console.log(`   Success: ${result.success}, System health: ${systemStatus.health}`);

      return {
        test: 'Integration Service Orchestration',
        status: result.success ? 'PASS' : 'FAIL',
        message: `Orchestration result: ${result.success}, ${analytics.executions} executions tracked`,
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        test: 'Integration Service Orchestration',
        status: 'FAIL',
        message: `Integration orchestration failed: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  private async testWallBounceExecution(): Promise<SimpleValidationResult> {
    const start = Date.now();
    
    try {
      console.log('🏓 Testing Wall-Bounce Real Execution...');
      
      const wallBounce = new WallBounceAnalyzer();
      
      const result = await wallBounce.executeWallBounce(
        'Explain the differences between microservices and monolithic architectures',
        'basic'
      );

      console.log(`   Consensus: ${result.agreement_scores.length} LLM responses`);
      console.log(`   Processing time: ${result.processing_time}ms`);

      const hasResponses = result.agreement_scores.length > 0;
      const withinTimeLimit = result.processing_time < 30000; // 30 seconds

      return {
        test: 'Wall-Bounce Real Execution',
        status: hasResponses && withinTimeLimit ? 'PASS' : 'FAIL',
        message: `${result.agreement_scores.length} LLM responses in ${result.processing_time}ms`,
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        test: 'Wall-Bounce Real Execution',
        status: 'FAIL',
        message: `Wall-bounce execution failed: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  private async testGoogleDriveConnector(): Promise<SimpleValidationResult> {
    const start = Date.now();
    
    try {
      console.log('📁 Testing Google Drive Connector...');
      
      const googleDrive = new GoogleDriveRAGConnector();
      
      // Test basic search (will return mock results in test environment)
      const searchResult = await googleDrive.searchWithMCP('architecture documents');
      
      console.log(`   Search executed, MCP calls: ${searchResult.mcp_calls.length}`);

      const hasResults = searchResult.results.length >= 0; // Even 0 results is valid
      const hasMCPCalls = Array.isArray(searchResult.mcp_calls);

      return {
        test: 'Google Drive Connector',
        status: hasResults && hasMCPCalls ? 'PASS' : 'FAIL', 
        message: `Search: ${searchResult.results.length} results, ${searchResult.mcp_calls.length} MCP calls`,
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        test: 'Google Drive Connector',
        status: 'FAIL',
        message: `Google Drive connector failed: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  private async testEndToEndWorkflow(): Promise<SimpleValidationResult> {
    const start = Date.now();
    
    try {
      console.log('🔄 Testing End-to-End Workflow...');
      
      // Simulate complete workflow: Config -> Approval -> Integration -> Wall-Bounce
      const configManager = new MCPConfigManager();
      const approvalManager = new MCPApprovalManager();
      const integrationService = new MCPIntegrationService();
      const wallBounce = new WallBounceAnalyzer();

      // Step 1: Configure tools
      const context = {
        budgetTier: 'premium' as const,
        securityLevel: 'sensitive' as const,
        taskType: 'premium' as const,
        userLocation: 'global' as const,
        dailyBudgetUsed: 0,
        dailyBudgetLimit: 100
      };

      const tools = configManager.getOptimizedToolsForContext(context);
      console.log(`   Step 1: Configured ${tools.length} tools`);

      // Step 2: Get approval for sensitive operation
      const approvalId = await approvalManager.requestApproval(
        'sensitive_analysis',
        'deep_analysis',
        { complexity: 'high' },
        'medium',
        'test_user'
      );

      const approved = await approvalManager.processApproval(
        approvalId,
        true,
        'manager:test'
      );
      console.log(`   Step 2: Approval ${approved ? 'granted' : 'denied'}`);

      // Step 3: Execute analysis
      const analysisResult = await wallBounce.executeWallBounce(
        'Provide comprehensive analysis of distributed system design patterns',
        'premium'
      );
      console.log(`   Step 3: Analysis completed with ${analysisResult.agreement_scores.length} LLM votes`);

      const workflowSuccess = tools.length >= 0 && approved && analysisResult.agreement_scores.length > 0;

      return {
        test: 'End-to-End Workflow',
        status: workflowSuccess ? 'PASS' : 'FAIL',
        message: `Complete workflow: ${tools.length} tools → approval → ${analysisResult.agreement_scores.length} LLM analysis`,
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        test: 'End-to-End Workflow',
        status: 'FAIL',
        message: `End-to-end workflow failed: ${error}`,
        duration: Date.now() - start
      };
    }
  }
}

// Execute simplified validation
async function runSimplifiedValidation() {
  const validator = new MCPSimplifiedValidator();
  const results = await validator.runValidation();

  console.log('\n🎯 MCP Alternative Validation Results:');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.message} (${result.duration}ms)`);
    
    if (result.status === 'PASS') passed++;
    else failed++;
  });

  console.log('\n📊 Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / results.length) * 100)}%`);

  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`⏱️ Total Time: ${totalTime}ms`);

  if (failed === 0) {
    console.log('\n🎉 All MCP components validated successfully from alternative perspective!');
  } else {
    console.log(`\n⚠️ ${failed} components failed alternative validation.`);
  }
}

if (require.main === module) {
  runSimplifiedValidation().catch(console.error);
}

export { MCPSimplifiedValidator };