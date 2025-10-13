#!/usr/bin/env ts-node

/**
 * Claude Internal Provider Test Script
 * Tests the newly implemented Claude internal analysis capabilities
 */

import { WallBounceAnalyzer } from '../src/services/wall-bounce-analyzer';

interface TestCase {
  name: string;
  prompt: string;
  expectedTaskType: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Architecture Design',
    prompt: 'Design a microservices architecture for a high-traffic e-commerce platform. Consider scalability, fault tolerance, and data consistency.',
    expectedTaskType: 'architecture'
  },
  {
    name: 'Code Review',
    prompt: 'Review this TypeScript code for best practices and suggest improvements:\n\nfunction processData(data: any) {\n  return data.map(x => x.value * 2);\n}',
    expectedTaskType: 'code-review'
  },
  {
    name: 'Implementation',
    prompt: 'Implement a rate limiting middleware for Express.js with Redis backend. Include sliding window algorithm and distributed support.',
    expectedTaskType: 'implementation'
  },
  {
    name: 'Security Analysis',
    prompt: 'Analyze the security vulnerabilities in our authentication system. Check for SQL injection, XSS, CSRF, and session management issues.',
    expectedTaskType: 'security'
  },
  {
    name: 'Performance Optimization',
    prompt: 'Our API endpoint is slow. Optimize the database queries and caching strategy to improve latency from 500ms to under 100ms.',
    expectedTaskType: 'optimization'
  },
  {
    name: 'Integration',
    prompt: 'Integrate Stripe payment webhook with our order management system. Handle webhook verification, retry logic, and idempotency.',
    expectedTaskType: 'integration'
  },
  {
    name: 'General Analysis',
    prompt: 'Explain the trade-offs between different state management solutions in React applications.',
    expectedTaskType: 'general'
  }
];

async function testClaudeInternal(): Promise<void> {
  console.log('🧪 Claude Internal Provider Test Suite');
  console.log('━'.repeat(60));
  console.log('');

  const analyzer = new WallBounceAnalyzer();
  let passCount = 0;
  let failCount = 0;

  for (const testCase of TEST_CASES) {
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`   Expected Task Type: ${testCase.expectedTaskType}`);
    console.log('');

    try {
      // Test Sonnet 4.5 (balanced)
      console.log('   🔵 Testing Sonnet 4.5 (balanced mode)...');
      const sonnetStart = Date.now();
      const sonnetResult = await analyzer['invokeClaude'](testCase.prompt, 'sonnet-4.5');
      const sonnetTime = Date.now() - sonnetStart;

      console.log(`      ✓ Response length: ${sonnetResult.content.length} chars`);
      console.log(`      ✓ Confidence: ${sonnetResult.confidence}`);
      console.log(`      ✓ Time: ${sonnetTime}ms`);
      console.log(`      ✓ Cost: ¥${sonnetResult.cost} (internal)`);
      console.log('');

      // Test Opus 4.1 (deep)
      console.log('   🟣 Testing Opus 4.1 (deep mode)...');
      const opusStart = Date.now();
      const opusResult = await analyzer['invokeClaude'](testCase.prompt, 'opus-4.1');
      const opusTime = Date.now() - opusStart;

      console.log(`      ✓ Response length: ${opusResult.content.length} chars`);
      console.log(`      ✓ Confidence: ${opusResult.confidence}`);
      console.log(`      ✓ Time: ${opusTime}ms`);
      console.log(`      ✓ Cost: ¥${opusResult.cost} (internal)`);
      console.log('');

      // Validate differentiation
      const lengthDiff = opusResult.content.length - sonnetResult.content.length;
      const confidenceDiff = opusResult.confidence - sonnetResult.confidence;

      console.log('   📊 Analysis:');
      console.log(`      - Opus is ${lengthDiff > 0 ? lengthDiff : -lengthDiff} chars ${lengthDiff > 0 ? 'longer' : 'shorter'} (expected: longer for deep mode)`);
      console.log(`      - Opus confidence: ${opusResult.confidence} vs Sonnet: ${sonnetResult.confidence} (diff: ${confidenceDiff.toFixed(2)})`);

      // Validation
      const isValid =
        opusResult.confidence === 0.95 &&
        sonnetResult.confidence === 0.92 &&
        opusResult.cost === 0 &&
        sonnetResult.cost === 0 &&
        opusResult.content.length > 100 &&
        sonnetResult.content.length > 100;

      if (isValid) {
        console.log(`      ✅ Test PASSED`);
        passCount++;
      } else {
        console.log(`      ❌ Test FAILED`);
        failCount++;
      }

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      failCount++;
    }

    console.log('');
    console.log('─'.repeat(60));
    console.log('');
  }

  // Summary
  console.log('🎯 Test Summary');
  console.log('━'.repeat(60));
  console.log(`   Total Tests: ${TEST_CASES.length}`);
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   Success Rate: ${((passCount / TEST_CASES.length) * 100).toFixed(1)}%`);
  console.log('');

  if (failCount === 0) {
    console.log('🎉 All tests passed! Claude Internal Provider is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Review the implementation.');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testClaudeInternal().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { testClaudeInternal };
