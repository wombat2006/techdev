#!/usr/bin/env ts-node

/**
 * Wall-Bounce Integration Test
 * Tests Claude Internal Provider in a real wall-bounce scenario
 */

import { WallBounceAnalyzer } from '../src/services/wall-bounce-analyzer';
import { logger } from '../src/utils/logger';

interface WallBounceTestCase {
  name: string;
  prompt: string;
  taskType: 'basic' | 'premium' | 'critical';
  domain: 'coding' | 'analysis' | 'creative' | 'general';
  minProviders: number;
  maxProviders: number;
}

const TEST_CASES: WallBounceTestCase[] = [
  {
    name: 'Architecture Analysis with Claude Aggregation',
    prompt: 'Design a scalable microservices architecture for a real-time notification system. Consider: message queue, WebSocket connections, Redis pub/sub, horizontal scaling, and fault tolerance.',
    taskType: 'premium',
    domain: 'coding',
    minProviders: 3,
    maxProviders: 5
  },
  {
    name: 'Code Quality Review with Claude Synthesis',
    prompt: `Review this TypeScript code and provide comprehensive feedback:

async function handleUserRequest(req: any, res: any) {
  const userId = req.params.id;
  const user = await db.query('SELECT * FROM users WHERE id = ' + userId);
  if (!user) {
    res.status(404).send('Not found');
    return;
  }
  res.json(user);
}

Focus on: SQL injection, type safety, error handling, performance, and best practices.`,
    taskType: 'critical',
    domain: 'coding',
    minProviders: 4,
    maxProviders: 6
  }
];

async function testWallBounceIntegration(): Promise<void> {
  console.log('🔄 Wall-Bounce Integration Test');
  console.log('━'.repeat(70));
  console.log('Testing Claude Internal Provider with Multi-LLM Orchestration');
  console.log('');

  const analyzer = new WallBounceAnalyzer();
  let passCount = 0;
  let failCount = 0;

  for (const testCase of TEST_CASES) {
    console.log(`\n📋 Test Case: ${testCase.name}`);
    console.log(`   Task Type: ${testCase.taskType}`);
    console.log(`   Domain: ${testCase.domain}`);
    console.log(`   Providers: ${testCase.minProviders}-${testCase.maxProviders}`);
    console.log('');

    try {
      const startTime = Date.now();

      const result = await analyzer.executeWallBounce(testCase.prompt, {
        taskType: testCase.taskType,
        domain: testCase.domain,
        minProviders: testCase.minProviders,
        maxProviders: testCase.maxProviders,
        mode: 'parallel'
      });

      const executionTime = Date.now() - startTime;

      console.log('   📊 Results:');
      console.log(`      ✓ Execution Time: ${executionTime}ms`);
      console.log(`      ✓ Providers Used: ${result.providers_used.length}`);
      console.log(`      ✓ Consensus Score: ${result.consensus_score?.toFixed(3)}`);
      console.log(`      ✓ Quality Score: ${result.quality_score?.toFixed(3)}`);
      console.log(`      ✓ Total Cost: ¥${result.total_cost?.toFixed(2)}`);
      console.log('');

      console.log('   🔍 Provider Breakdown:');
      result.providers_used.forEach((provider: string, index: number) => {
        const response = result.responses[index];
        console.log(`      ${index + 1}. ${provider}:`);
        console.log(`         - Confidence: ${response.confidence?.toFixed(3)}`);
        console.log(`         - Length: ${response.content?.length || 0} chars`);
      });
      console.log('');

      // Validate Claude providers were used for aggregation
      const hasClaudeAggregator = result.providers_used.some(
        (p: string) => p.includes('sonnet-4.5') || p.includes('opus-4.1')
      );

      if (hasClaudeAggregator) {
        console.log('   ✅ Claude Internal Provider used as aggregator');
      } else {
        console.log('   ⚠️  Claude Internal Provider not detected in aggregation');
      }

      // Validate quality thresholds
      const meetsConsensus = (result.consensus_score || 0) >= 0.6;
      const meetsQuality = (result.quality_score || 0) >= 0.7;
      const hasResponses = result.responses.length >= testCase.minProviders;

      if (meetsConsensus && meetsQuality && hasResponses) {
        console.log('   ✅ Test PASSED - Quality thresholds met');
        passCount++;
      } else {
        console.log('   ❌ Test FAILED - Quality thresholds not met');
        console.log(`      Consensus: ${meetsConsensus ? '✓' : '✗'} (${result.consensus_score?.toFixed(3)} >= 0.6)`);
        console.log(`      Quality: ${meetsQuality ? '✓' : '✗'} (${result.quality_score?.toFixed(3)} >= 0.7)`);
        console.log(`      Responses: ${hasResponses ? '✓' : '✗'} (${result.responses.length} >= ${testCase.minProviders})`);
        failCount++;
      }

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      failCount++;
    }

    console.log('');
    console.log('─'.repeat(70));
  }

  // Summary
  console.log('');
  console.log('🎯 Integration Test Summary');
  console.log('━'.repeat(70));
  console.log(`   Total Tests: ${TEST_CASES.length}`);
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   Success Rate: ${((passCount / TEST_CASES.length) * 100).toFixed(1)}%`);
  console.log('');

  if (failCount === 0) {
    console.log('🎉 All integration tests passed!');
    console.log('   Claude Internal Provider successfully integrated with wall-bounce system.');
  } else {
    console.log('⚠️  Some integration tests failed.');
    process.exit(1);
  }
}

// Run integration tests
if (require.main === module) {
  testWallBounceIntegration().catch(error => {
    console.error('❌ Integration test suite failed:', error);
    process.exit(1);
  });
}

export { testWallBounceIntegration };
