import express from 'express';
import { getCodexMCPWrapper } from '../services/codex-mcp-wrapper';
import { getMultiLLMSessionHandler } from '../services/multi-llm-session-handler';
import { getCodexSessionManager } from '../services/codex-session-manager';

const router = express.Router();
const codexWrapper = getCodexMCPWrapper();
const multiLLMHandler = getMultiLLMSessionHandler();
const sessionManager = getCodexSessionManager();

/**
 * POST /api/codex/session
 * Start new Codex session
 */
router.post('/session', async (req, res) => {
  try {
    const { prompt, model, sandbox, userId } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required'
      });
    }

    console.log('🚀 Starting new Codex session:', {
      prompt: prompt.substring(0, 100) + '...',
      model: model || 'gpt-5-codex',
      sandbox: sandbox || 'read-only'
    });

    const result = await codexWrapper.executeCodex({
      prompt,
      model,
      sandbox,
      userId
    });

    res.json({
      success: result.success,
      sessionId: result.sessionId,
      conversationId: result.conversationId,
      response: result.response,
      error: result.error,
      metadata: {
        model: model || 'gpt-5-codex',
        sandbox: sandbox || 'read-only',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Codex session creation error:', error);
    res.status(500).json({
      error: 'Failed to create Codex session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/codex/continue
 * Continue existing Codex conversation
 */
router.post('/continue', async (req, res) => {
  try {
    const { prompt, conversationId, sessionId, userId } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required'
      });
    }

    if (!conversationId && !sessionId) {
      return res.status(400).json({
        error: 'Either conversationId or sessionId is required'
      });
    }

    console.log('🔄 Continuing Codex conversation with Multi-LLM routing:', {
      conversationId: conversationId || 'N/A',
      sessionId: sessionId || 'N/A',
      prompt: prompt.substring(0, 100) + '...'
    });

    // Multi-LLM Wall-Bounce routing for turn 2+
    const result = await multiLLMHandler.continueSessionWithWallBounce({
      sessionId: sessionId || conversationId, // Use sessionId or fallback to conversationId
      prompt,
      userId
    });

    res.json({
      success: result.success,
      sessionId: result.sessionId,
      conversationId: result.conversationId,
      response: result.response,
      error: result.error,
      metadata: {
        continued: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Codex conversation continuation error:', error);
    res.status(500).json({
      error: 'Failed to continue Codex conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/codex/history/:identifier
 * Get conversation history for session or conversation ID
 */
router.get('/history/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    console.log('📜 Fetching conversation history for:', identifier);

    const history = await codexWrapper.getConversationHistory(identifier);

    res.json({
      success: true,
      identifier,
      messageCount: history.length,
      messages: history,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Conversation history fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/codex/session/:identifier
 * Get session details by session or conversation ID
 */
router.get('/session/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    console.log('🔍 Fetching session details for:', identifier);

    const sessionData = await sessionManager.getSession(identifier);

    if (!sessionData) {
      return res.status(404).json({
        error: 'Session not found',
        identifier
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: sessionData.sessionId,
        conversationId: sessionData.conversationId,
        status: sessionData.status,
        createdAt: sessionData.createdAt,
        lastUsedAt: sessionData.lastUsedAt,
        model: sessionData.model,
        sandbox: sessionData.sandbox,
        messageCount: sessionData.messages.length,
        initialPrompt: sessionData.prompt
      }
    });

  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch session details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/codex/session/:sessionId
 * Delete session and cleanup
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log('🗑️ Deleting Codex session:', sessionId);

    await sessionManager.deleteSession(sessionId);

    res.json({
      success: true,
      sessionId,
      deleted: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/codex/stats
 * Get session statistics and health info
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching Codex session statistics');

    const stats = await codexWrapper.getSessionStats();

    res.json({
      success: true,
      stats: {
        ...stats,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    });

  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch session statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/codex/cleanup
 * Manual cleanup of expired sessions
 */
router.post('/cleanup', async (req, res) => {
  try {
    console.log('🧹 Running manual session cleanup');

    const result = await codexWrapper.cleanupSessions();

    res.json({
      success: true,
      cleaned: result.cleaned,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session cleanup error:', error);
    res.status(500).json({
      error: 'Failed to cleanup sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/codex/multi-llm-stats/:sessionId
 * Get Multi-LLM session statistics
 */
router.get('/multi-llm-stats/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log('🏓 Fetching Multi-LLM session statistics:', sessionId);

    const stats = await multiLLMHandler.getSessionStats(sessionId);

    res.json({
      success: true,
      sessionId,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Multi-LLM stats error:', error);
    res.status(500).json({
      error: 'Failed to get Multi-LLM stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/codex/test
 * Test endpoint for Codex MCP integration
 */
router.get('/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Codex MCP Session API is running',
      endpoints: [
        'POST /api/codex/session - Start new session',
        'POST /api/codex/continue - Continue conversation (Multi-LLM Wall-Bounce)',
        'GET /api/codex/history/:id - Get conversation history',
        'GET /api/codex/session/:id - Get session details',
        'DELETE /api/codex/session/:id - Delete session',
        'GET /api/codex/stats - Get statistics',
        'GET /api/codex/multi-llm-stats/:sessionId - Get Multi-LLM statistics',
        'POST /api/codex/cleanup - Cleanup expired sessions'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
