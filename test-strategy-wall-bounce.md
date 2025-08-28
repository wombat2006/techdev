# 🏓 Wall-Bounce 包括的テスト戦略設計

## 📋 Executive Summary

環境変数保持システム（Vault MCP）を中心とした全システムの包括的テスト戦略を、複数LLMによる壁打ち分析で検証します。Property-based testingとMCPアーキテクチャを組み合わせ、セキュリティ・パフォーマンス・統合性を同時に検証します。

## 🎯 テスト対象システム構成

### Core Systems
- **Vault MCP Server**: AES-256-GCM暗号化、JWT認証、Redis+File hybrid
- **Wall-Bounce Orchestrator**: 複数LLM協調処理エンジン
- **MCP Service Mesh**: Stash, OpenRouter, Context7, Cipher, Monitoring

### LLM Integration Layer
- **Tier 2**: Gemini 2.5 Flash + Claude Haiku 3.5 + cursor-mcp
- **Tier 3**: Claude Sonnet4 + OpenRouter
- **Tier 4**: GPT-5 + Context7/Stash reference layer

### Observability Stack
- **Metrics**: Prometheus + custom MCP server metrics
- **Visualization**: Grafana dashboards
- **Alerting**: AlertManager + quality threshold violations

## 🧪 Property-Based Testing Framework

### 1. Vault Security Properties

```typescript
// src/tests/vault-security.property.test.ts
import fc from 'fast-check';
import { VaultMCPServer } from '../mcp/vault-mcp-server';

describe('Vault Security Properties', () => {
  test.prop([
    fc.string({ minLength: 1, maxLength: 50 }), // key
    fc.string({ minLength: 1, maxLength: 1000 }), // secret
    fc.constantFrom('development', 'staging', 'production') // environment
  ])('should encrypt-decrypt cycle preserve data integrity', async (key, secret, env) => {
    const vault = new VaultMCPServer();
    
    // Property: encryption-decryption is identity function
    await vault.setSecret(key, secret, env);
    const retrieved = await vault.getSecret(key, env);
    
    expect(retrieved).toBe(secret);
    expect(retrieved).not.toContain('plaintext_indicator'); // ensure encryption
  });

  test.prop([
    fc.array(fc.string(), { minLength: 1, maxLength: 100 }), // multiple keys
    fc.constantFrom('development', 'production') // env
  ])('should handle concurrent access without corruption', async (keys, env) => {
    const vault = new VaultMCPServer();
    const secrets = keys.map(key => `secret_for_${key}`);
    
    // Property: concurrent operations maintain consistency  
    const setPromises = keys.map((key, i) => vault.setSecret(key, secrets[i], env));
    await Promise.all(setPromises);
    
    const getPromises = keys.map(key => vault.getSecret(key, env));
    const retrieved = await Promise.all(getPromises);
    
    // Verify all secrets match their keys
    retrieved.forEach((secret, i) => {
      expect(secret).toBe(secrets[i]);
    });
  });

  test.prop([
    fc.string(), // unauthorized key
    fc.constantFrom('development', 'staging', 'production')
  ])('should reject unauthorized access attempts', async (unauthorizedKey, env) => {
    const vault = new VaultMCPServer();
    
    // Property: undefined keys should throw security errors
    await expect(vault.getSecret(unauthorizedKey, env))
      .rejects.toThrow(/unauthorized|not found|access denied/i);
  });
});
```

### 2. Wall-Bounce Quality Properties

```typescript
// src/tests/wall-bounce-quality.property.test.ts
import fc from 'fast-check';
import { WallBounceOrchestrator } from '../mcp/wall-bounce-mcp-server';

describe('Wall-Bounce Quality Properties', () => {
  const orchestrator = new WallBounceOrchestrator({
    models: {
      primary: ['gemini-2.5-flash', 'claude-3-haiku', 'cursor-mcp'],
      fallback: ['claude-3-sonnet-20241022', 'gpt-4o-mini', 'openrouter-mcp']
    },
    qualityThresholds: { confidence: 0.7, consensus: 0.6 }
  });

  test.prop([
    fc.string({ minLength: 10, maxLength: 500 }), // query
    fc.record({
      priority: fc.constantFrom('standard', 'high', 'critical'),
      timeout: fc.integer({ min: 5000, max: 60000 })
    }) // context
  ])('should maintain quality scores above thresholds', async (query, context) => {
    const result = await orchestrator.executeWallBounce(query, context);
    
    // Property: quality scores must meet minimum thresholds
    expect(result.qualityScore).toBeGreaterThanOrEqual(0.7);
    expect(result.consensus).toBeGreaterThanOrEqual(0.6);
    expect(result.recommendedAction).toMatch(/^(accept|escalate|retry)$/);
    
    // Property: execution time should be reasonable
    expect(result.executionTime).toBeLessThan(context.timeout || 30000);
  });

  test.prop([
    fc.array(fc.string({ minLength: 5 }), { minLength: 1, maxLength: 10 }) // batch queries
  ])('should handle batch processing consistently', async (queries) => {
    const results = await Promise.all(
      queries.map(query => orchestrator.executeWallBounce(query))
    );
    
    // Property: batch processing maintains individual quality
    results.forEach((result, index) => {
      expect(result.query).toBe(queries[index]);
      expect(result.responses.length).toBeGreaterThan(0);
      expect(result.qualityScore).toBeGreaterThan(0);
    });
  });
});
```

### 3. MCP Service Integration Properties

```typescript
// src/tests/mcp-integration.property.test.ts
import fc from 'fast-check';
import { StashMCPServer } from '../mcp/stash-mcp-server';
import { OpenRouterMCPServer } from '../mcp/openrouter-mcp-server';
import { Context7MCPServer } from '../mcp/context7-mcp-server';

describe('MCP Service Integration Properties', () => {
  test.prop([
    fc.string({ minLength: 1, maxLength: 100 }), // search term
    fc.constantFrom('typescript', 'javascript', 'python', 'rust') // language
  ])('should provide consistent cross-service results', async (searchTerm, language) => {
    const stash = new StashMCPServer();
    const context7 = new Context7MCPServer();
    
    // Property: services should provide complementary information
    const [stashResults, context7Results] = await Promise.all([
      stash.searchCodeContext(searchTerm, { language }),
      context7.searchLibraryDocs(searchTerm, { language })
    ]);
    
    // Both services should return meaningful results
    expect(stashResults.length + context7Results.length).toBeGreaterThan(0);
    
    // Results should be relevant to search term
    const allContent = [...stashResults, ...context7Results]
      .map(r => r.content.toLowerCase())
      .join(' ');
    expect(allContent).toContain(searchTerm.toLowerCase());
  });

  test.prop([
    fc.record({
      model: fc.constantFrom('gemini-2.5-flash', 'claude-3-sonnet', 'gpt-4o'),
      prompt: fc.string({ minLength: 10, maxLength: 1000 }),
      maxTokens: fc.integer({ min: 100, max: 4000 })
    })
  ])('should maintain cost optimization across OpenRouter', async (config) => {
    const openRouter = new OpenRouterMCPServer();
    
    const result = await openRouter.generateContent({
      model: config.model,
      prompt: config.prompt,
      maxTokens: config.maxTokens
    });
    
    // Property: cost tracking should be accurate
    expect(result.cost).toBeGreaterThan(0);
    expect(result.cost).toBeLessThan(10.0); // reasonable upper bound
    expect(result.tokensUsed).toBeLessThanOrEqual(config.maxTokens);
  });
});
```

### 4. Performance & ReDOS Detection

```typescript
// src/tests/performance-redos.property.test.ts
import fc from 'fast-check';

describe('Performance & ReDOS Properties', () => {
  const TIME_LIMIT_MS = 1000;
  
  test.prop([
    fc.string({ minLength: 1, maxLength: 10000 }), // potentially malicious input
    fc.constantFrom('email', 'url', 'json', 'xml') // validation type
  ])('should prevent ReDOS attacks in validation', (input, validationType) => {
    const startTime = performance.now();
    
    try {
      // Test various validation patterns that might be vulnerable
      switch (validationType) {
        case 'email':
          validateEmail(input);
          break;
        case 'url':
          validateURL(input);
          break;
        case 'json':
          JSON.parse(input);
          break;
        case 'xml':
          parseXML(input);
          break;
      }
    } catch (error) {
      // Expected errors are fine
    }
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Property: no operation should exceed time limit (ReDOS protection)
    expect(executionTime).toBeLessThan(TIME_LIMIT_MS);
  });

  test.prop([
    fc.integer({ min: 1, max: 1000 }), // concurrent requests
    fc.string({ minLength: 10, maxLength: 100 }) // base query
  ])('should handle load without performance degradation', async (concurrency, baseQuery) => {
    const startTime = performance.now();
    
    const promises = Array.from({ length: concurrency }, (_, i) => 
      orchestrator.executeWallBounce(`${baseQuery}_${i}`)
    );
    
    const results = await Promise.all(promises);
    const endTime = performance.now();
    
    // Property: concurrent processing should scale reasonably
    const avgTimePerRequest = (endTime - startTime) / concurrency;
    expect(avgTimePerRequest).toBeLessThan(5000); // 5s per request max
    
    // All requests should complete successfully
    results.forEach(result => {
      expect(result.qualityScore).toBeGreaterThan(0);
    });
  });
});
```

## 🔧 壁打ち分析テスト実装

### Wall-Bounce Test Orchestrator

```typescript
// src/tests/wall-bounce-test-orchestrator.ts
import { WallBounceOrchestrator } from '../mcp/wall-bounce-mcp-server';

export class WallBounceTestOrchestrator {
  private orchestrator: WallBounceOrchestrator;
  
  constructor() {
    this.orchestrator = new WallBounceOrchestrator({
      models: {
        primary: ['test-gemini', 'test-claude-haiku', 'test-cursor-mcp'],
        fallback: ['test-claude-sonnet', 'test-openrouter']
      },
      qualityThresholds: { confidence: 0.8, consensus: 0.7 },
      parallelism: { maxConcurrent: 3, timeout: 15000 }
    });
  }

  async analyzeTestStrategy(testCategory: string, testInputs: any[]): Promise<{
    strategy: string;
    qualityAssessment: number;
    recommendations: string[];
    riskAreas: string[];
  }> {
    const query = `Analyze comprehensive testing strategy for ${testCategory} with inputs: ${JSON.stringify(testInputs)}`;
    
    const result = await this.orchestrator.executeWallBounce(query, {
      testCategory,
      analysisDepth: 'comprehensive',
      focus: ['security', 'performance', 'integration']
    });

    return {
      strategy: result.synthesized,
      qualityAssessment: result.qualityScore,
      recommendations: this.extractRecommendations(result.responses),
      riskAreas: this.identifyRisks(result.responses)
    };
  }

  private extractRecommendations(responses: any[]): string[] {
    return responses
      .flatMap(r => r.response.match(/(?:recommend|suggest|should).*?[.!]/gi) || [])
      .slice(0, 10);
  }

  private identifyRisks(responses: any[]): string[] {
    return responses
      .flatMap(r => r.response.match(/(?:risk|vulnerability|concern|issue).*?[.!]/gi) || [])
      .slice(0, 5);
  }
}
```

### End-to-End Integration Tests

```typescript
// src/tests/e2e-integration.test.ts
import { test, expect } from '@jest/globals';
import fc from 'fast-check';
import { WallBounceTestOrchestrator } from './wall-bounce-test-orchestrator';

describe('E2E Integration Tests with Wall-Bounce Analysis', () => {
  const testOrchestrator = new WallBounceTestOrchestrator();

  test('complete system workflow with multiple MCP services', async () => {
    // Property-based E2E test
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          vaultKey: fc.string({ minLength: 1, maxLength: 30 }),
          vaultSecret: fc.string({ minLength: 1, maxLength: 100 }),
          searchQuery: fc.string({ minLength: 3, maxLength: 50 }),
          analysisDepth: fc.constantFrom('basic', 'detailed', 'comprehensive')
        }),
        async ({ vaultKey, vaultSecret, searchQuery, analysisDepth }) => {
          // 1. Store secret in Vault
          const vault = await getVaultService();
          await vault.setSecret(vaultKey, vaultSecret, 'test');

          // 2. Search for relevant context
          const stash = await getStashService();
          const contextResults = await stash.searchCodeContext(searchQuery);

          // 3. Perform wall-bounce analysis
          const analysis = await testOrchestrator.analyzeTestStrategy(
            'e2e-workflow', 
            [{ vaultKey, searchQuery, analysisDepth }]
          );

          // 4. Verify complete workflow
          const retrievedSecret = await vault.getSecret(vaultKey, 'test');
          
          // Assertions
          expect(retrievedSecret).toBe(vaultSecret);
          expect(contextResults.length).toBeGreaterThan(0);
          expect(analysis.qualityAssessment).toBeGreaterThan(0.7);
          expect(analysis.recommendations.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});
```

## 📊 監視・メトリクス収集

### Custom Metrics for Testing

```typescript
// src/metrics/test-metrics.ts
import client from 'prom-client';

export const testMetrics = {
  wallBounceQuality: new client.Histogram({
    name: 'test_wall_bounce_quality_score',
    help: 'Wall-bounce analysis quality scores in tests',
    buckets: [0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 1.0]
  }),

  propertyTestRuns: new client.Counter({
    name: 'property_test_runs_total',
    help: 'Total property-based test executions',
    labelNames: ['test_category', 'outcome']
  }),

  vaultOperationLatency: new client.Histogram({
    name: 'vault_operation_duration_seconds',
    help: 'Vault operation latency in tests',
    labelNames: ['operation', 'environment'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
  }),

  mcpServiceHealth: new client.Gauge({
    name: 'mcp_service_health_score',
    help: 'Health score of MCP services',
    labelNames: ['service_name']
  })
};
```

## 🚀 実行計画・CI/CD統合

### Test Execution Strategy

```bash
#!/bin/bash
# scripts/run-comprehensive-tests.sh

set -euo pipefail

echo "🏓 Starting Wall-Bounce Comprehensive Testing..."

# Phase 1: Property-based unit tests
echo "📋 Phase 1: Property-based Testing"
npm run test:properties -- --verbose --coverage

# Phase 2: Wall-bounce analysis tests  
echo "🔄 Phase 2: Wall-Bounce Analysis"
npm run test:wall-bounce -- --timeout 60000

# Phase 3: E2E integration with MCP services
echo "🔗 Phase 3: E2E Integration Testing"
npm run test:e2e-mcp -- --forceExit

# Phase 4: Performance & ReDOS detection
echo "⚡ Phase 4: Performance & Security Testing"
npm run test:performance -- --detectRedos

# Phase 5: Generate comprehensive report
echo "📊 Phase 5: Test Report Generation"
npm run test:report -- --wall-bounce-analysis

echo "✅ Comprehensive testing completed!"
```

### GitHub Actions Integration

```yaml
# .github/workflows/comprehensive-testing.yml
name: 🏓 Wall-Bounce Comprehensive Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  comprehensive-testing:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    services:
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
          
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: |
          npm ci
          npm install -g fast-check @fast-check/jest
          
      - name: Setup test environment
        run: |
          cp .env.test.example .env.test
          npm run setup:test-env
          
      - name: Run Property-Based Tests
        run: npm run test:properties
        env:
          FAST_CHECK_NUM_RUNS: 1000
          WALL_BOUNCE_TEST_MODE: 'comprehensive'
          
      - name: Run Wall-Bounce Analysis
        run: npm run test:wall-bounce
        timeout-minutes: 15
        
      - name: Run E2E Integration Tests
        run: npm run test:e2e-mcp
        env:
          MCP_TEST_TIMEOUT: 30000
          
      - name: Generate Test Coverage Report
        run: npm run coverage:wall-bounce
        
      - name: Upload Test Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            coverage/
            test-reports/
            wall-bounce-analysis/
```

## 🎯 期待される効果・メリット

1. **品質保証の向上**: 複数LLM壁打ちによる多角的品質評価
2. **セキュリティ強化**: Property-based testingによる脆弱性の体系的検出
3. **パフォーマンス最適化**: ReDOS検出と負荷耐性の検証
4. **統合性検証**: MCP サービス間の相互作用テスト
5. **運用安定性**: 包括的監視とアラート機能

この戦略により、環境変数保持システムを中心とした全システムが高い信頼性とセキュリティを維持できます。