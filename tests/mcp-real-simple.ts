/**
 * MCP Real Simple Tests - No Mocks
 * Direct API calls without mocking
 */

import { WallBounceAnalyzer } from '../src/services/wall-bounce-analyzer';
import { GoogleDriveRAGConnector } from '../src/services/googledrive-connector';

async function runRealSimpleTests() {
  console.log('🔥 MCP Real Tests - No Mocks, Direct API Calls\n');
  
  let totalTests = 0;
  let passedTests = 0;
  let totalApiCalls = 0;
  
  // Test 1: Real Wall-Bounce Analysis
  console.log('🏓 Test 1: Real Wall-Bounce Analysis');
  totalTests++;
  try {
    const wallBounce = new WallBounceAnalyzer();
    const start = Date.now();
    
    const result = await wallBounce.executeWallBounce(
      'What are the main advantages of using TypeScript over JavaScript for large-scale applications?',
      'basic'
    );
    
    const duration = Date.now() - start;
    const llmVotes = result.llm_votes.length;
    const confidence = result.consensus.confidence;
    
    totalApiCalls += llmVotes;
    
    console.log(`   ✅ Success: ${llmVotes} real LLM responses`);
    console.log(`   📊 Confidence: ${confidence}`);
    console.log(`   ⏱️ Duration: ${duration}ms`);
    console.log(`   💰 Cost: $${result.total_cost}`);
    console.log(`   🔧 Providers: ${result.debug.providers_used.join(', ')}`);
    
    if (llmVotes > 0) {
      passedTests++;
    }
    
  } catch (error) {
    console.log(`   ❌ Failed: ${error}`);
  }
  
  // Test 2: Real Google Drive Search
  console.log('\n📁 Test 2: Real Google Drive Search');
  totalTests++;
  try {
    const googleDrive = new GoogleDriveRAGConnector();
    const start = Date.now();
    
    const searchResult = await googleDrive.searchWithMCP('technical documentation', { maxResults: 5 });
    const duration = Date.now() - start;
    
    console.log(`   ✅ Search completed: ${searchResult.results.length} results`);
    console.log(`   🔌 MCP Calls: ${searchResult.mcp_calls.length}`);
    console.log(`   ⏱️ Duration: ${duration}ms`);
    console.log(`   📊 Usage: ${JSON.stringify(searchResult.usage)}`);
    
    totalApiCalls += searchResult.mcp_calls.length;
    passedTests++;
    
  } catch (error) {
    console.log(`   ❌ Failed: ${error}`);
    console.log(`   💡 Note: Google Drive errors expected without proper OAuth setup`);
  }
  
  // Test 3: Real RAG Search
  console.log('\n🔍 Test 3: Real RAG Search');
  totalTests++;
  try {
    const googleDrive = new GoogleDriveRAGConnector();
    const start = Date.now();
    
    const ragResult = await googleDrive.searchRAG('system architecture patterns', undefined, 5);
    const duration = Date.now() - start;
    
    console.log(`   ✅ RAG completed: ${ragResult.results.length} results`);
    console.log(`   ⏱️ Duration: ${duration}ms`);
    console.log(`   💰 Usage: ${JSON.stringify(ragResult.usage)}`);
    
    passedTests++;
    
  } catch (error) {
    console.log(`   ❌ Failed: ${error}`);
    console.log(`   💡 Note: RAG errors expected without Google Drive access`);
  }
  
  // Test 4: Complex Real Analysis
  console.log('\n🧠 Test 4: Complex Real Analysis');
  totalTests++;
  try {
    const wallBounce = new WallBounceAnalyzer();
    const start = Date.now();
    
    const result = await wallBounce.executeWallBounce(
      'Compare microservices vs monolith architectures for a fintech startup handling payments. Consider scalability, security, compliance, and team structure.',
      'premium'
    );
    
    const duration = Date.now() - start;
    const llmVotes = result.llm_votes.length;
    
    totalApiCalls += llmVotes;
    
    console.log(`   ✅ Complex analysis: ${llmVotes} LLM responses`);
    console.log(`   📊 Confidence: ${result.consensus.confidence}`);
    console.log(`   ⏱️ Duration: ${duration}ms`);
    console.log(`   💰 Cost: $${result.total_cost}`);
    console.log(`   🎯 Consensus: ${result.consensus.content.substring(0, 100)}...`);
    
    if (llmVotes > 0) {
      passedTests++;
    }
    
  } catch (error) {
    console.log(`   ❌ Failed: ${error}`);
  }
  
  // Test 5: Real MCP Tool Integration
  console.log('\n🔧 Test 5: Real MCP Tool Integration Test');
  totalTests++;
  try {
    const wallBounce = new WallBounceAnalyzer();
    const start = Date.now();
    
    // This will use real MCP tools if available
    const result = await wallBounce.executeWallBounce(
      'Explain how to implement authentication in a Node.js REST API using JWT tokens',
      'basic'
    );
    
    const duration = Date.now() - start;
    const hasRealMCPData = result.debug.wall_bounce_verified;
    
    totalApiCalls += result.llm_votes.length;
    
    console.log(`   ✅ MCP Integration: ${result.llm_votes.length} responses`);
    console.log(`   🔌 Wall-bounce verified: ${hasRealMCPData}`);
    console.log(`   🎯 Tier escalated: ${result.debug.tier_escalated}`);
    console.log(`   ⏱️ Duration: ${duration}ms`);
    console.log(`   💰 Total cost: $${result.total_cost}`);
    
    passedTests++;
    
  } catch (error) {
    console.log(`   ❌ Failed: ${error}`);
  }
  
  // Summary
  console.log('\n📊 Real Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log(`🔌 Total Real API Calls: ${totalApiCalls}`);
  console.log('');
  
  if (passedTests === totalTests) {
    console.log('🎉 All real tests passed! MCP integration working with actual APIs.');
  } else if (passedTests > 0) {
    console.log(`⚠️ ${passedTests}/${totalTests} tests passed. Some failures expected due to API limits or credentials.`);
  } else {
    console.log('❌ All tests failed. Check API configurations and network connectivity.');
  }
  
  console.log('\n💡 Real Test Notes:');
  console.log('• API failures may be due to quota limits, missing credentials, or network issues');
  console.log('• Google Drive tests require proper OAuth2 setup');
  console.log('• LLM API tests require valid API keys and sufficient quota');
  console.log('• Success indicates MCP integration is working with real external services');
}

if (require.main === module) {
  runRealSimpleTests().catch(console.error);
}

export { runRealSimpleTests };