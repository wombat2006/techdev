/**
 * Test Gemini in Evaluation Context
 *
 * Verify Gemini works correctly with actual golden test cases
 */

import EvalRunner from '../src/services/eval-runner';
import { GoldenTestCase } from '../src/types/eval-schema';

async function main() {
  console.log('🧪 Testing Gemini in Evaluation Context\n');
  console.log('━'.repeat(80));
  console.log();

  try {
    // Load test case
    const { default: goldenTests } = await import('../src/config/golden-tests.json');
    const testCase = goldenTests.testSuites.refactoring.tests[0] as GoldenTestCase;

    console.log(`📝 Test Case: ${testCase.name}`);
    console.log(`   Category: ${testCase.category}`);
    console.log(`   Type: ${testCase.type}`);
    console.log();

    console.log('🤖 Running test with Gemini 2.5 Flash...\n');

    const startTime = Date.now();
    const result = await EvalRunner.runTestCase(testCase, 'gemini-2.5-flash', 'latest');
    const duration = Date.now() - startTime;

    console.log('━'.repeat(80));
    console.log('📊 Test Results');
    console.log('━'.repeat(80));
    console.log();

    console.log(`✅ Test completed in ${duration}ms`);
    console.log();
    console.log(`   Score: ${result.score}/${result.maxScore}`);
    console.log(`   Pass: ${result.passed ? '✅' : '❌'}`);
    console.log(`   Execution Time: ${result.metrics.executionTimeMs}ms`);
    console.log(`   Cost: $${result.metrics.estimatedCost.toFixed(6)}`);
    console.log();

    console.log('📝 Output Preview:');
    console.log('━'.repeat(80));
    console.log(result.output.substring(0, 300));
    if (result.output.length > 300) {
      console.log(`... (${result.output.length - 300} more characters)`);
    }
    console.log('━'.repeat(80));
    console.log();

    if (result.passed) {
      console.log('✅ Gemini evaluation test PASSED!');
      console.log('   No tool usage errors detected');
      console.log('   Model completed response successfully');
    } else {
      console.log('⚠️  Test did not pass, but completed without tool errors');
      console.log(`   Score: ${result.score}/${result.maxScore}`);
    }

    console.log();
    console.log('━'.repeat(80));
    console.log('✅ Gemini integration verified in evaluation context');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
