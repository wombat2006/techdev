"use strict";
/**
 * Conversation History API Routes
 * RESTful endpoints for accessing LLM conversation histories
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversation_history_persistence_1 = require("../services/conversation-history-persistence");
const logger_1 = require("../utils/logger");
const audit_logger_1 = __importDefault(require("../services/audit-logger"));
const router = (0, express_1.Router)();
const persistence = (0, conversation_history_persistence_1.getConversationPersistence)();
/**
 * GET /api/v1/conversations/:conversationId
 * Get conversation history by ID
 */
router.get('/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    const { format = 'json' } = req.query;
    try {
        logger_1.logger.info('📖 GET /conversations/:conversationId', { conversationId, format });
        await audit_logger_1.default.logAction('conversation_history_retrieve', {
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
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to retrieve conversation history', {
            conversationId,
            error: error instanceof Error ? error.message : String(error)
        });
        await audit_logger_1.default.logAction('conversation_history_retrieve_error', {
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
router.get('/session/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { limit = '50' } = req.query;
    try {
        logger_1.logger.info('📚 GET /conversations/session/:sessionId', { sessionId, limit });
        await audit_logger_1.default.logAction('conversation_history_list_by_session', {
            sessionId,
            limit: parseInt(limit),
            ip: req.ip
        });
        const conversations = await persistence.getConversationsBySession(sessionId, parseInt(limit));
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
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to list conversations by session', {
            sessionId,
            error: error instanceof Error ? error.message : String(error)
        });
        await audit_logger_1.default.logAction('conversation_history_list_error', {
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
router.post('/search', async (req, res) => {
    const query = req.body;
    try {
        logger_1.logger.info('🔍 POST /conversations/search', { query });
        await audit_logger_1.default.logAction('conversation_history_search', {
            query,
            ip: req.ip
        });
        const result = await persistence.searchConversations(query);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to search conversations', {
            query,
            error: error instanceof Error ? error.message : String(error)
        });
        await audit_logger_1.default.logAction('conversation_history_search_error', {
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
router.get('/stats', async (req, res) => {
    const { sessionId } = req.query;
    try {
        logger_1.logger.info('📊 GET /conversations/stats', { sessionId });
        await audit_logger_1.default.logAction('conversation_history_stats', {
            sessionId,
            ip: req.ip
        });
        const stats = await persistence.getStatistics(sessionId);
        res.json({
            success: true,
            sessionId: sessionId || 'all',
            statistics: stats
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to get conversation statistics', {
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
router.delete('/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    try {
        logger_1.logger.info('🗑️ DELETE /conversations/:conversationId', { conversationId });
        await audit_logger_1.default.logAction('conversation_history_delete', {
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
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to delete conversation', {
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
router.get('/:conversationId/export', async (req, res) => {
    const { conversationId } = req.params;
    const { format = 'json' } = req.query;
    try {
        logger_1.logger.info('📤 GET /conversations/:conversationId/export', {
            conversationId,
            format
        });
        await audit_logger_1.default.logAction('conversation_history_export', {
            conversationId,
            format,
            ip: req.ip
        });
        const exported = await persistence.exportConversation(conversationId, format);
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
        }
        else {
            res.type('application/json')
                .attachment(`conversation-${conversationId}.json`)
                .send(exported);
        }
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to export conversation', {
            conversationId,
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            error: 'Failed to export conversation',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.default = router;
//# sourceMappingURL=conversation-history-routes.js.map