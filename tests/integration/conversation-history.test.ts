/**
 * Integration Tests - Conversation History System
 * Tests conversation history builder, persistence, and API endpoints
 */

// Set up environment before imports
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-key';
process.env.HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || 'test-key';
process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'test-token';

import { ConversationHistoryPersistence, getConversationPersistence } from '../../src/services/conversation-history-persistence';
import { createConversationHistoryBuilder } from '../../src/utils/conversation-history-builder';
import { ConversationHistory } from '../../src/types/llm-conversation-schemas';
import { LLMResponse } from '../../src/services/wall-bounce/types';

describe('Conversation History Integration Tests', () => {
  let persistence: ConversationHistoryPersistence;

  beforeAll(async () => {
    persistence = getConversationPersistence();
  });

  afterAll(async () => {
    // Cleanup test conversations
    await cleanupTestConversations();
  });

  describe('Conversation History Builder', () => {
    it('should build conversation history for parallel mode', () => {
      const builder = createConversationHistoryBuilder('parallel', 'test-session-1');

      // Start round
      const round = builder.startRound(1, 'What is the capital of France?');
      expect(round.roundNumber).toBe(1);
      expect(round.mode).toBe('parallel');
      expect(round.status).toBe('running');

      // Add provider responses
      const response1: LLMResponse = {
        content: 'Paris is the capital of France.',
        confidence: 0.95,
        reasoning: 'Well-known geographical fact',
        cost: 0.001,
        tokens: { input: 10, output: 15, total: 25 },
        provider: 'gemini-2.5-pro'
      };

      builder.addProviderResponse(
        'gemini-2.5-pro',
        'Gemini 2.5 Pro',
        1,
        response1,
        150
      );

      const response2: LLMResponse = {
        content: 'The capital of France is Paris.',
        confidence: 0.92,
        reasoning: 'Standard geography knowledge',
        cost: 0.0008,
        tokens: { input: 10, output: 12, total: 22 },
        provider: 'gpt-5-codex'
      };

      builder.addProviderResponse(
        'gpt-5-codex',
        'GPT-5 Codex',
        2,
        response2,
        120
      );

      // Complete round
      builder.completeRound(0.93, 0.94, 0.0018, 47);

      // Build final history
      const history = builder.build(
        'Paris is the capital of France.',
        0.93,
        0.94,
        ['gemini-2.5-pro', 'gpt-5-codex']
      );

      expect(history.conversationId).toBeDefined();
      expect(history.sessionId).toBe('test-session-1');
      expect(history.executionMode).toBe('parallel');
      expect(history.rounds).toHaveLength(1);
      expect(history.rounds[0].providerResponses).toHaveLength(2);
      expect(history.finalResult.consensusScore).toBe(0.93);
      expect(history.performance.totalCost).toBe(0.0018);
    });

    it('should build conversation history for deep-sequential mode', () => {
      const builder = createConversationHistoryBuilder('deep-sequential', 'test-session-2');

      // Round 1
      builder.startRound(1, 'Explain quantum computing');
      const response1: LLMResponse = {
        content: 'Quantum computing uses quantum bits (qubits)...',
        confidence: 0.88,
        reasoning: 'Initial explanation',
        cost: 0.002,
        tokens: { input: 20, output: 100, total: 120 },
        provider: 'gemini-2.5-pro'
      };
      builder.addProviderResponse('gemini-2.5-pro', 'Gemini 2.5 Pro', 1, response1, 200);
      builder.completeRound(0.88, 0.85, 0.002, 120);

      // Round 2 with context
      builder.startRound(
        2,
        'Explain quantum computing',
        undefined,
        'Previous response mentioned qubits...'
      );
      const response2: LLMResponse = {
        content: 'Building on qubits, quantum computing leverages superposition...',
        confidence: 0.91,
        reasoning: 'Enriched with context',
        cost: 0.0025,
        tokens: { input: 50, output: 120, total: 170 },
        provider: 'gpt-5-codex'
      };
      builder.addProviderResponse('gpt-5-codex', 'GPT-5 Codex', 2, response2, 250);
      builder.completeRound(0.91, 0.88, 0.0045, 290);

      const history = builder.build(
        'Quantum computing uses qubits and superposition...',
        0.90,
        0.87,
        ['gemini-2.5-pro', 'gpt-5-codex']
      );

      expect(history.rounds).toHaveLength(2);
      expect(history.rounds[1].prompt.context).toBeDefined();
      expect(history.executionMode).toBe('deep-sequential');
    });

    it('should handle errors in conversation rounds', () => {
      const builder = createConversationHistoryBuilder('parallel', 'test-session-3');

      builder.startRound(1, 'Test prompt');

      // Add successful response
      const response: LLMResponse = {
        content: 'Success',
        confidence: 0.9,
        reasoning: 'OK',
        cost: 0.001,
        tokens: { input: 5, output: 10, total: 15 },
        provider: 'gemini-2.5-pro'
      };
      builder.addProviderResponse('gemini-2.5-pro', 'Gemini 2.5 Pro', 1, response, 100);

      // Add error
      builder.addRoundError('gpt-5-codex', 'Timeout error', true, 'claude-sonnet-4.5');

      builder.completeRound(0.9, 0.85, 0.001, 15);

      const history = builder.build('Success', 0.9, 0.85, ['gemini-2.5-pro']);

      expect(history.rounds[0].errors).toHaveLength(1);
      expect(history.rounds[0].errors![0].providerId).toBe('gpt-5-codex');
      expect(history.rounds[0].errors![0].fallbackUsed).toBe('claude-sonnet-4.5');
    });
  });

  // Note: Persistence tests require real Redis connection
  // Use manual testing with actual Redis instance
  describe.skip('Conversation History Persistence', () => {
    // Skipped - requires real Redis connection (ioredis-mock has limitations)
    // Manual testing steps documented below
    const testConversationId = 'test-conv-' + Date.now();

    it.skip('should save and retrieve conversation history', async () => {
      const builder = createConversationHistoryBuilder('parallel', 'persist-test-1');
      builder.startRound(1, 'Test prompt');

      const response: LLMResponse = {
        content: 'Test response',
        confidence: 0.9,
        reasoning: 'Test',
        cost: 0.001,
        tokens: { input: 5, output: 10, total: 15 },
        provider: 'gemini-2.5-pro'
      };
      builder.addProviderResponse('gemini-2.5-pro', 'Gemini 2.5 Pro', 1, response, 100);
      builder.completeRound(0.9, 0.85, 0.001, 15);

      const history = builder.build('Test response', 0.9, 0.85, ['gemini-2.5-pro']);

      // Override conversationId for testing
      (history as any).conversationId = testConversationId;

      // Save
      await persistence.saveConversation(history, 3600); // 1 hour TTL for test

      // Retrieve
      const retrieved = await persistence.getConversation(testConversationId);

      expect(retrieved).toBeDefined();
      expect(retrieved!.conversationId).toBe(testConversationId);
      expect(retrieved!.rounds).toHaveLength(1);
      expect(retrieved!.finalResult.consensusScore).toBe(0.9);
    });

    it('should retrieve conversations by session', async () => {
      const sessionId = 'persist-session-' + Date.now();

      // Create 2 conversations in same session
      for (let i = 1; i <= 2; i++) {
        const builder = createConversationHistoryBuilder('parallel', sessionId);
        builder.startRound(1, `Test prompt ${i}`);

        const response: LLMResponse = {
          content: `Response ${i}`,
          confidence: 0.9,
          reasoning: 'Test',
          cost: 0.001,
          tokens: { input: 5, output: 10, total: 15 },
          provider: 'gemini-2.5-pro'
        };
        builder.addProviderResponse('gemini-2.5-pro', 'Gemini 2.5 Pro', 1, response, 100);
        builder.completeRound(0.9, 0.85, 0.001, 15);

        const history = builder.build(`Response ${i}`, 0.9, 0.85, ['gemini-2.5-pro']);
        await persistence.saveConversation(history, 3600);
      }

      // Retrieve by session
      const conversations = await persistence.getConversationsBySession(sessionId, 10);

      expect(conversations.length).toBeGreaterThanOrEqual(2);
      expect(conversations.every(c => c.sessionId === sessionId)).toBe(true);
    });

    it('should delete conversation', async () => {
      const deleteTestId = 'delete-test-' + Date.now();

      const builder = createConversationHistoryBuilder('parallel', 'delete-session');
      builder.startRound(1, 'Delete test');
      const response: LLMResponse = {
        content: 'Will be deleted',
        confidence: 0.9,
        reasoning: 'Test',
        cost: 0.001,
        tokens: { input: 5, output: 10, total: 15 },
        provider: 'gemini-2.5-pro'
      };
      builder.addProviderResponse('gemini-2.5-pro', 'Gemini 2.5 Pro', 1, response, 100);
      builder.completeRound(0.9, 0.85, 0.001, 15);

      const history = builder.build('Will be deleted', 0.9, 0.85, ['gemini-2.5-pro']);
      (history as any).conversationId = deleteTestId;

      await persistence.saveConversation(history, 3600);

      // Verify it exists
      const exists = await persistence.getConversation(deleteTestId);
      expect(exists).toBeDefined();

      // Delete
      const deleted = await persistence.deleteConversation(deleteTestId);
      expect(deleted).toBe(true);

      // Verify it's gone
      const notExists = await persistence.getConversation(deleteTestId);
      expect(notExists).toBeNull();
    });

    it('should search conversations with filters', async () => {
      const searchSessionId = 'search-session-' + Date.now();

      // Create conversation with specific cost
      const builder = createConversationHistoryBuilder('parallel', searchSessionId);
      builder.startRound(1, 'Search test');
      const response: LLMResponse = {
        content: 'Searchable',
        confidence: 0.9,
        reasoning: 'Test',
        cost: 0.005,
        tokens: { input: 50, output: 100, total: 150 },
        provider: 'gemini-2.5-pro'
      };
      builder.addProviderResponse('gemini-2.5-pro', 'Gemini 2.5 Pro', 1, response, 200);
      builder.completeRound(0.9, 0.85, 0.005, 150);

      const history = builder.build('Searchable', 0.9, 0.85, ['gemini-2.5-pro']);
      await persistence.saveConversation(history, 3600);

      // Search with cost filter
      const result = await persistence.searchConversations({
        sessionId: searchSessionId,
        minCost: 0.003,
        maxCost: 0.01,
        limit: 10
      });

      expect(result.conversations.length).toBeGreaterThanOrEqual(1);
      expect(result.conversations.every(c => c.totalCost >= 0.003 && c.totalCost <= 0.01)).toBe(true);
    });
  });

  // Note: API endpoint tests require full server setup
  // They are tested manually via curl/Postman due to complex dependencies
  describe.skip('Conversation History API Endpoints', () => {
    // Skipped - requires full server initialization
    // Manual testing recommended:
    // curl http://localhost:8443/api/v1/conversations/{id}
    // curl http://localhost:8443/api/v1/conversations/session/{sessionId}
    // curl -X POST http://localhost:8443/api/v1/conversations/search -H "Content-Type: application/json" -d '{"limit":10}'
  });

  describe.skip('Export Formats', () => {
    // Skipped - requires real Redis connection
    it.skip('should export conversation as JSON', async () => {
      const builder = createConversationHistoryBuilder('parallel', 'export-json-test');
      builder.startRound(1, 'Export test');
      const response: LLMResponse = {
        content: 'Export response',
        confidence: 0.9,
        reasoning: 'Test',
        cost: 0.001,
        tokens: { input: 5, output: 10, total: 15 },
        provider: 'gemini-2.5-pro'
      };
      builder.addProviderResponse('gemini-2.5-pro', 'Gemini 2.5 Pro', 1, response, 100);
      builder.completeRound(0.9, 0.85, 0.001, 15);

      const history = builder.build('Export response', 0.9, 0.85, ['gemini-2.5-pro']);
      await persistence.saveConversation(history, 3600);

      const exported = await persistence.exportConversation(history.conversationId, 'json');

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported!);
      expect(parsed.conversationId).toBe(history.conversationId);
      expect(parsed.rounds).toHaveLength(1);
    });

    it('should export conversation as Markdown', async () => {
      const builder = createConversationHistoryBuilder('parallel', 'export-md-test');
      builder.startRound(1, 'Markdown export test');
      const response: LLMResponse = {
        content: 'Markdown response',
        confidence: 0.92,
        reasoning: 'Markdown test',
        cost: 0.002,
        tokens: { input: 10, output: 15, total: 25 },
        provider: 'gemini-2.5-pro'
      };
      builder.addProviderResponse('gemini-2.5-pro', 'Gemini 2.5 Pro', 1, response, 120);
      builder.completeRound(0.92, 0.88, 0.002, 25);

      const history = builder.build('Markdown response', 0.92, 0.88, ['gemini-2.5-pro']);
      await persistence.saveConversation(history, 3600);

      const exported = await persistence.exportConversation(history.conversationId, 'markdown');

      expect(exported).toBeDefined();
      expect(exported).toContain('# Conversation History');
      expect(exported).toContain(history.conversationId);
      expect(exported).toContain('Markdown response');
      expect(exported).toContain('Round 1');
    });
  });
});

/**
 * Cleanup helper function
 */
async function cleanupTestConversations(): Promise<void> {
  // This would be implemented to clean up test conversations
  // For now, relying on TTL-based expiration
  console.log('Test conversations will expire based on TTL');
}
