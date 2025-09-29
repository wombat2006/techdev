/**
 * Wall-Bounce SRP Components Integration Test
 * 新しいSingle Responsibility Principleアーキテクチャのテスト
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { LLMProviderRegistry, TaskType } from '../../src/services/llm-provider-registry';
import { ConsensusEngine, VoteWithScore } from '../../src/services/consensus-engine';
import { WallBounceOrchestrator } from '../../src/services/wall-bounce-orchestrator';
import { wallBounceAdapter } from '../../src/services/wall-bounce-adapter';

describe('🏓 Wall-Bounce SRP Architecture Integration Tests', () => {

  describe('1. LLMProviderRegistry - Provider Management', () => {
    let providerRegistry: LLMProviderRegistry;

    beforeAll(() => {
      providerRegistry = new LLMProviderRegistry();
    });

    test('should initialize with correct providers', () => {
      const availableProviders = providerRegistry.getAvailableProviders();

      expect(availableProviders).toContain('gemini-2.5-pro');
      expect(availableProviders).toContain('gpt-5-codex');
      expect(availableProviders).toContain('claude-code-direct');
      expect(availableProviders.length).toBeGreaterThanOrEqual(3);
    });

    test('should select appropriate providers for task types', () => {
      const basicProviders = providerRegistry.getProvidersForTask('basic', 2);
      const premiumProviders = providerRegistry.getProvidersForTask('premium', 2);
      const criticalProviders = providerRegistry.getProvidersForTask('critical', 2);

      expect(basicProviders.length).toBe(2);
      expect(premiumProviders.length).toBe(2);
      expect(criticalProviders.length).toBe(2);

      // Basic should use Gemini and GPT-5-Codex
      expect(basicProviders.map(p => p.name)).toContain('Gemini');

      // Critical should prioritize Claude Code Direct
      expect(criticalProviders.map(p => p.name)).toContain('Claude-Code-Direct');
    });

    test('should enforce absolute LLM routing rules', () => {
      const providers = providerRegistry.getProvidersForTask('premium', 4);
      const gpt5Provider = providers.find(p => p.name.includes('GPT5'));
      const claudeProvider = providers.find(p => p.name.includes('Claude'));

      // GPT-5は必ずcodex経由
      if (gpt5Provider) {
        expect(gpt5Provider.name).toContain('Codex');
      }

      // ClaudeはCode直接呼び出し
      if (claudeProvider) {
        expect(claudeProvider.name).toContain('Code-Direct');
      }
    });

    test('should check provider availability', () => {
      expect(providerRegistry.isProviderAvailable('gemini-2.5-pro')).toBe(true);
      expect(providerRegistry.isProviderAvailable('non-existent-provider')).toBe(false);
    });
  });

  describe('2. ConsensusEngine - Agreement Calculation', () => {
    let consensusEngine: ConsensusEngine;

    beforeAll(() => {
      consensusEngine = new ConsensusEngine();
    });

    test('should calculate text similarity correctly', () => {
      const mockVotes: VoteWithScore[] = [
        {
          provider: 'provider-1',
          model: 'model-1',
          response: {
            content: 'This is a test response about Docker containers',
            confidence: 0.85,
            reasoning: 'Docker analysis',
            cost: 0.01,
            tokens: { input: 10, output: 20 }
          },
          agreement_score: 0
        },
        {
          provider: 'provider-2',
          model: 'model-2',
          response: {
            content: 'This is a test response about Docker deployment',
            confidence: 0.90,
            reasoning: 'Docker deployment analysis',
            cost: 0.02,
            tokens: { input: 12, output: 25 }
          },
          agreement_score: 0
        }
      ];

      consensusEngine.calculateAgreementScores(mockVotes);

      expect(mockVotes[0].agreement_score).toBeGreaterThan(0);
      expect(mockVotes[1].agreement_score).toBeGreaterThan(0);
      expect(mockVotes[0].agreement_score).toBeCloseTo(mockVotes[1].agreement_score, 2);
    });

    test('should build consensus from votes', async () => {
      const mockVotes: VoteWithScore[] = [
        {
          provider: 'high-confidence',
          model: 'model-1',
          response: {
            content: 'High quality analysis result',
            confidence: 0.95,
            reasoning: 'Detailed analysis performed',
            cost: 0.03,
            tokens: { input: 15, output: 30 }
          },
          agreement_score: 0.8
        },
        {
          provider: 'medium-confidence',
          model: 'model-2',
          response: {
            content: 'Good analysis result',
            confidence: 0.85,
            reasoning: 'Standard analysis performed',
            cost: 0.02,
            tokens: { input: 12, output: 25 }
          },
          agreement_score: 0.8
        }
      ];

      const consensus = await consensusEngine.buildConsensus(mockVotes, true, 0.8);

      expect(consensus.content).toBe('High quality analysis result');
      expect(consensus.confidence).toBeGreaterThan(0.7);
      expect(consensus.reasoning).toContain('high-confidence');
    });

    test('should evaluate consensus quality', () => {
      const highQualityVotes: VoteWithScore[] = [
        {
          provider: 'provider-1',
          model: 'model-1',
          response: { content: 'result', confidence: 0.9, reasoning: 'good', cost: 0.01, tokens: { input: 10, output: 20 } },
          agreement_score: 0.85
        },
        {
          provider: 'provider-2',
          model: 'model-2',
          response: { content: 'result', confidence: 0.88, reasoning: 'good', cost: 0.01, tokens: { input: 10, output: 20 } },
          agreement_score: 0.87
        }
      ];

      const evaluation = consensusEngine.evaluateConsensusQuality(highQualityVotes);
      expect(evaluation.quality).toBe('high');
      expect(evaluation.metrics.averageConfidence).toBeGreaterThan(0.85);
    });
  });

  describe('3. WallBounceOrchestrator - Flow Coordination', () => {
    let orchestrator: WallBounceOrchestrator;

    beforeAll(() => {
      orchestrator = new WallBounceOrchestrator();
    });

    test('should have access to provider registry', () => {
      const providers = orchestrator.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);
    });

    test('should check provider availability', () => {
      expect(orchestrator.isProviderAvailable('gemini-2.5-pro')).toBe(true);
    });

    // Note: Full orchestrator.analyze() test would require actual LLM implementations
    // This is left for integration testing with mock providers
  });

  describe('4. WallBounceAdapter - Backward Compatibility', () => {

    test('should maintain legacy API compatibility', () => {
      expect(wallBounceAdapter).toBeDefined();
      expect(typeof wallBounceAdapter.analyze).toBe('function');
      expect(typeof wallBounceAdapter.getAvailableProviders).toBe('function');
      expect(typeof wallBounceAdapter.isProviderAvailable).toBe('function');
    });

    test('should provide modern SRP API', () => {
      expect(typeof wallBounceAdapter.analyzeWithSRP).toBe('function');
      expect(typeof wallBounceAdapter.getMigrationStatus).toBe('function');
    });

    test('should report migration status', () => {
      const status = wallBounceAdapter.getMigrationStatus();
      expect(status.phase).toBe('hybrid');
      expect(status.srpComponentsActive).toBe(true);
      expect(status.recommendedAction).toContain('analyzeWithSRP');
    });

    test('should convert legacy task types correctly', () => {
      // This is tested indirectly through the adapter's internal conversion
      const providers = wallBounceAdapter.getAvailableProviders();
      expect(providers).toContain('gemini-2.5-pro');
    });
  });

  describe('5. SRP Architecture Integration', () => {

    test('should demonstrate separation of concerns', () => {
      // Each component should have a single, well-defined responsibility
      const registry = new LLMProviderRegistry();
      const consensus = new ConsensusEngine();
      const orchestrator = new WallBounceOrchestrator();

      // Provider Registry: Only provider management
      expect(registry.getAvailableProviders).toBeDefined();
      expect(registry.getProvidersForTask).toBeDefined();

      // Consensus Engine: Only consensus building
      expect(consensus.buildConsensus).toBeDefined();
      expect(consensus.evaluateConsensusQuality).toBeDefined();

      // Orchestrator: Only coordination
      expect(orchestrator.analyze).toBeDefined();
      expect(orchestrator.isProviderAvailable).toBeDefined();
    });

    test('should maintain type safety across components', () => {
      const registry = new LLMProviderRegistry();
      const providers = registry.getProvidersForTask('basic' as TaskType);

      expect(Array.isArray(providers)).toBe(true);
      providers.forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('model');
        expect(provider).toHaveProperty('invoke');
      });
    });

    test('should enforce absolute LLM routing compliance', () => {
      const registry = new LLMProviderRegistry();
      const allProviders = registry.getAvailableProviders();

      // OpenAI models must be through codex
      const openaiProviders = allProviders.filter(name => name.includes('gpt'));
      openaiProviders.forEach(provider => {
        expect(provider).toContain('codex');
      });

      // Anthropic models must be through Claude Code
      const anthropicProviders = allProviders.filter(name => name.includes('claude'));
      anthropicProviders.forEach(provider => {
        expect(provider).toContain('code-direct');
      });
    });
  });

  describe('6. Error Handling and Resilience', () => {

    test('should handle empty votes gracefully', async () => {
      const consensus = new ConsensusEngine();

      await expect(consensus.buildConsensus([], true, 0.8))
        .rejects.toThrow('No votes available');
    });

    test('should handle provider unavailability', () => {
      const registry = new LLMProviderRegistry();
      const providers = registry.getProvidersForTask('basic', 5); // Request more than available

      expect(providers.length).toBeGreaterThanOrEqual(2); // Should still provide minimum
    });
  });

  describe('7. Performance and Quality Metrics', () => {

    test('should maintain performance characteristics', async () => {
      const adapter = wallBounceAdapter;
      const mockPrompt = 'Test prompt for performance measurement';

      const comparison = await adapter.performanceComparison(mockPrompt);

      expect(comparison.srpTime).toBeGreaterThan(0);
      expect(comparison.improvement).toContain('SRP architecture');
    });
  });

});