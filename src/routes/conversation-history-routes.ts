/**
 * Conversation History API Routes
 * RESTful endpoints for accessing LLM conversation histories
 */

import { Router, Request, Response } from 'express';
import { getConversationPersistence } from '../services/conversation-history-persistence';
import { logger } from '../utils/logger';
import AuditLogger from '../services/audit-logger';

const router = Router();
const persistence = getConversationPersistence();

/**
 * GET /api/v1/conversations/:conversationId
 * Get conversation history by ID
 */
router.get('/:conversationId', async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { format = 'json' } = req.query;

  try {
    logger.info('📖 GET /conversations/:conversationId', { conversationId, format });

    await AuditLogger.logAction('conversation_history_retrieve', {
      conversationId,
      format,
      ip: req.ip
    });

    const history = await persistence.getConversation(conversationId);

    if (!history) {
      return res.status(404).json({
        error: 'Conversation not found',
        conversationId
      });
    }

    // Export in requested format
    if (format === 'markdown') {
      const markdown = await persistence.exportConversation(conversationId, 'markdown');
      return res.type('text/markdown').send(markdown);
    }

    res.json({
      success: true,
      conversation: history
    });
  } catch (error) {
    logger.error('❌ Failed to retrieve conversation history', {
      conversationId,
      error: error instanceof Error ? error.message : String(error)
    });

    await AuditLogger.logAction('conversation_history_retrieve_error', {
      conversationId,
      error: error instanceof Error ? error.message : String(error)
    }, 'error');

    res.status(500).json({
      error: 'Failed to retrieve conversation history',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/conversations/session/:sessionId
 * List conversations by session ID
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { limit = '50' } = req.query;

  try {
    logger.info('📚 GET /conversations/session/:sessionId', { sessionId, limit });

    await AuditLogger.logAction('conversation_history_list_by_session', {
      sessionId,
      limit: parseInt(limit as string),
      ip: req.ip
    });

    const conversations = await persistence.getConversationsBySession(
      sessionId,
      parseInt(limit as string)
    );

    // Return summaries only (not full histories)
    const summaries = conversations.map(c => ({
      conversationId: c.conversationId,
      sessionId: c.sessionId,
      startTime: c.startTime,
      endTime: c.endTime,
      executionMode: c.executionMode,
      totalRounds: c.rounds.length,
      totalCost: c.performance.totalCost,
      consensusScore: c.finalResult.consensusScore,
      qualityScore: c.finalResult.qualityScore,
      providersUsed: c.finalResult.providersUsed
    }));

    res.json({
      success: true,
      sessionId,
      count: summaries.length,
      conversations: summaries
    });
  } catch (error) {
    logger.error('❌ Failed to list conversations by session', {
      sessionId,
      error: error instanceof Error ? error.message : String(error)
    });

    await AuditLogger.logAction('conversation_history_list_error', {
      sessionId,
      error: error instanceof Error ? error.message : String(error)
    }, 'error');

    res.status(500).json({
      error: 'Failed to list conversations',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/conversations/search
 * Search conversations with filters
 */
router.post('/search', async (req: Request, res: Response) => {
  const query = req.body;

  try {
    logger.info('🔍 POST /conversations/search', { query });

    await AuditLogger.logAction('conversation_history_search', {
      query,
      ip: req.ip
    });

    const result = await persistence.searchConversations(query);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('❌ Failed to search conversations', {
      query,
      error: error instanceof Error ? error.message : String(error)
    });

    await AuditLogger.logAction('conversation_history_search_error', {
      query,
      error: error instanceof Error ? error.message : String(error)
    }, 'error');

    res.status(500).json({
      error: 'Failed to search conversations',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/conversations/stats
 * Get conversation statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  const { sessionId } = req.query;

  try {
    logger.info('📊 GET /conversations/stats', { sessionId });

    await AuditLogger.logAction('conversation_history_stats', {
      sessionId,
      ip: req.ip
    });

    const stats = await persistence.getStatistics(sessionId as string | undefined);

    res.json({
      success: true,
      sessionId: sessionId || 'all',
      statistics: stats
    });
  } catch (error) {
    logger.error('❌ Failed to get conversation statistics', {
      sessionId,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Failed to get statistics',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * DELETE /api/v1/conversations/:conversationId
 * Delete conversation history
 */
router.delete('/:conversationId', async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  try {
    logger.info('🗑️ DELETE /conversations/:conversationId', { conversationId });

    await AuditLogger.logAction('conversation_history_delete', {
      conversationId,
      ip: req.ip
    });

    const deleted = await persistence.deleteConversation(conversationId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Conversation not found',
        conversationId
      });
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
      conversationId
    });
  } catch (error) {
    logger.error('❌ Failed to delete conversation', {
      conversationId,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Failed to delete conversation',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/conversations/:conversationId/export
 * Export conversation in various formats
 */
router.get('/:conversationId/export', async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { format = 'json' } = req.query;

  try {
    logger.info('📤 GET /conversations/:conversationId/export', {
      conversationId,
      format
    });

    await AuditLogger.logAction('conversation_history_export', {
      conversationId,
      format,
      ip: req.ip
    });

    const exported = await persistence.exportConversation(
      conversationId,
      format as 'json' | 'markdown'
    );

    if (!exported) {
      return res.status(404).json({
        error: 'Conversation not found',
        conversationId
      });
    }

    if (format === 'markdown') {
      res.type('text/markdown')
        .attachment(`conversation-${conversationId}.md`)
        .send(exported);
    } else {
      res.type('application/json')
        .attachment(`conversation-${conversationId}.json`)
        .send(exported);
    }
  } catch (error) {
    logger.error('❌ Failed to export conversation', {
      conversationId,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Failed to export conversation',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
