#!/usr/bin/env ts-node

/**
 * Claude Internal Aggregator Verification
 * Verifies that Claude (Sonnet/Opus) is actually being used as aggregator
 */

import { WallBounceAnalyzer } from '../src/services/wall-bounce-analyzer';

async function verifyClaudeAggregator(): Promise<void> {
  console.log('🔍 Claude Internal Aggregator Verification');
  console.log('━'.repeat(70));
  console.log('');

  const analyzer = new WallBounceAnalyzer();

  // Test 1: Premium task should use Sonnet 4.5
  console.log('📋 Test 1: Premium Task (Sonnet 4.5 Aggregator)');
  const premiumResult = await analyzer.executeWallBounce(
    'Analyze the architecture of a microservices system.',
    {
      taskType: 'premium',
      domain: 'coding',
      minProviders: 2,
      maxProviders: 3
    }
  );

  console.log('   Results:');
  console.log(`   - Primary Providers: ${premiumResult.providers_used.join(', ')}`);
  console.log(`   - Debug Providers (includes aggregator): ${premiumResult.debug.providers_used.join(', ')}`);
  console.log(`   - LLM Votes Count: ${premiumResult.llm_votes.length}`);
  console.log(`   - Quality Score (aggregator confidence): ${premiumResult.quality_score}`);
  console.log('');

  console.log('   LLM Votes:');
  premiumResult.llm_votes.forEach((vote, i) => {
    console.log(`   ${i + 1}. ${vote.provider} - confidence: ${vote.agreement_score}, cost: ¥${vote.response.cost}`);
  });
  console.log('');

  const sonnetVote = premiumResult.llm_votes.find(v => v.provider.includes('sonnet-4.5'));
  if (sonnetVote) {
    console.log('   ✅ Sonnet 4.5 found in llm_votes');
    console.log(`      - Confidence: ${sonnetVote.agreement_score}`);
    console.log(`      - Cost: ¥${sonnetVote.response.cost}`);
    console.log(`      - Response length: ${sonnetVote.response.content?.length || 0} chars`);
  } else {
    console.log('   ❌ Sonnet 4.5 NOT found in llm_votes');
  }
  console.log('');

  // Test 2: Critical task should use Opus 4.1
  console.log('📋 Test 2: Critical Task (Opus 4.1 Aggregator)');
  const criticalResult = await analyzer.executeWallBounce(
    'Review this security-critical code for vulnerabilities.',
    {
      taskType: 'critical',
      domain: 'coding',
      minProviders: 2,
      maxProviders: 3
    }
  );

  console.log('   Results:');
  console.log(`   - Primary Providers: ${criticalResult.providers_used.join(', ')}`);
  console.log(`   - Debug Providers (includes aggregator): ${criticalResult.debug.providers_used.join(', ')}`);
  console.log(`   - LLM Votes Count: ${criticalResult.llm_votes.length}`);
  console.log(`   - Quality Score (aggregator confidence): ${criticalResult.quality_score}`);
  console.log('');

  console.log('   LLM Votes:');
  criticalResult.llm_votes.forEach((vote, i) => {
    console.log(`   ${i + 1}. ${vote.provider} - confidence: ${vote.agreement_score}, cost: ¥${vote.response.cost}`);
  });
  console.log('');

  const opusVote = criticalResult.llm_votes.find(v => v.provider.includes('opus-4.1'));
  if (opusVote) {
    console.log('   ✅ Opus 4.1 found in llm_votes');
    console.log(`      - Confidence: ${opusVote.agreement_score}`);
    console.log(`      - Cost: ¥${opusVote.response.cost}`);
    console.log(`      - Response length: ${opusVote.response.content?.length || 0} chars`);
  } else {
    console.log('   ❌ Opus 4.1 NOT found in llm_votes');
  }
  console.log('');

  // Verification summary
  console.log('━'.repeat(70));
  console.log('🎯 Verification Summary');
  console.log('━'.repeat(70));

  const checks = [
    {
      name: 'Sonnet 4.5 in llm_votes (premium)',
      passed: !!sonnetVote
    },
    {
      name: 'Sonnet 4.5 zero cost',
      passed: sonnetVote?.response.cost === 0
    },
    {
      name: 'Sonnet 4.5 confidence = 0.92',
      passed: sonnetVote?.agreement_score === 0.92
    },
    {
      name: 'Opus 4.1 in llm_votes (critical)',
      passed: !!opusVote
    },
    {
      name: 'Opus 4.1 zero cost',
      passed: opusVote?.response.cost === 0
    },
    {
      name: 'Opus 4.1 confidence = 0.95',
      passed: opusVote?.agreement_score === 0.95
    },
    {
      name: 'Aggregator in debug.providers_used (premium)',
      passed: premiumResult.debug.providers_used.includes('sonnet-4.5')
    },
    {
      name: 'Aggregator in debug.providers_used (critical)',
      passed: criticalResult.debug.providers_used.includes('opus-4.1')
    }
  ];

  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;

  console.log('');
  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
  });

  console.log('');
  console.log(`Result: ${passedChecks}/${totalChecks} checks passed`);
  console.log('');

  if (passedChecks === totalChecks) {
    console.log('🎉 ✅ Claude Internal Provider is correctly implemented!');
    console.log('   - Sonnet 4.5 used for premium tasks (balanced analysis)');
    console.log('   - Opus 4.1 used for critical tasks (deep analysis)');
    console.log('   - Zero cost confirmed for both');
    console.log('   - Confidence scores calibrated correctly');
  } else {
    console.log('⚠️  ❌ Claude Internal Provider has issues');
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  verifyClaudeAggregator().catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
}

export { verifyClaudeAggregator };
