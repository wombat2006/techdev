"use strict";
/**
 * Wall-Bounce API Routes
 * SSE Streaming endpoint for multi-LLM Wall-Bounce analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wall_bounce_analyzer_1 = require("../services/wall-bounce-analyzer");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/wall-bounce/analyze
 * SSE streaming endpoint for real-time Wall-Bounce analysis
 */
router.get('/analyze', async (req, res) => {
    const startTime = Date.now();
    const { query, mode = 'parallel', session_id } = req.query;
    // Validate query parameter
    if (!query || typeof query !== 'string') {
        res.status(400).json({
            success: false,
            error: 'Missing or invalid query parameter',
            message: 'クエリパラメータが必要です'
        });
        return;
    }
    // Validate mode parameter
    if (mode !== 'parallel' && mode !== 'sequential') {
        res.status(400).json({
            success: false,
            error: 'Invalid mode parameter',
            message: 'モードは "parallel" または "sequential" である必要があります'
        });
        return;
    }
    logger_1.logger.info('🔄 Wall-Bounce analysis request', {
        query: query.substring(0, 100),
        mode,
        session_id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    // Flush headers immediately
    res.flushHeaders();
    // Send initial connection message
    sendSSEEvent(res, 'message', {
        type: 'connected',
        message: 'Wall-Bounce analysis stream connected',
        session_id,
        mode
    });
    try {
        // Execute Wall-Bounce analysis with streaming
        const result = await wall_bounce_analyzer_1.wallBounceAnalyzer.executeWallBounce(query, {
            mode: mode,
            onThinking: (provider, step, content) => {
                sendSSEEvent(res, 'thinking', {
                    provider,
                    step,
                    content,
                    timestamp: new Date().toISOString()
                });
            },
            onProviderResponse: (provider, response) => {
                sendSSEEvent(res, 'provider_response', {
                    provider,
                    response: response.substring(0, 500), // Truncate for streaming
                    timestamp: new Date().toISOString()
                });
            },
            onConsensusUpdate: (score) => {
                sendSSEEvent(res, 'consensus', {
                    score,
                    timestamp: new Date().toISOString()
                });
            }
        });
        const processingTime = Date.now() - startTime;
        logger_1.logger.info('✅ Wall-Bounce analysis completed', {
            mode,
            session_id,
            processingTimeMs: processingTime,
            consensusScore: result.consensus_score,
            providersUsed: result.providers_used.length
        });
        // Send final answer
        sendSSEEvent(res, 'final_answer', {
            answer: result.final_answer,
            metadata: {
                mode,
                session_id,
                processing_time_ms: processingTime,
                providers_used: result.providers_used.join(', '),
                consensus_score: result.consensus_score,
                quality_score: result.quality_score,
                timestamp: new Date().toISOString()
            }
        });
        // Close connection
        res.write('event: close\ndata: {}\n\n');
        res.end();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.logger.error('❌ Wall-Bounce analysis failed', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            query: query.substring(0, 100),
            mode,
            session_id
        });
        // Send error event
        sendSSEEvent(res, 'error', {
            message: 'Wall-Bounce分析中にエラーが発生しました',
            details: errorMessage,
            timestamp: new Date().toISOString()
        });
        // Close connection
        res.write('event: close\ndata: {}\n\n');
        res.end();
    }
});
/**
 * POST /api/v1/wall-bounce/analyze-simple
 * Simple JSON endpoint for Wall-Bounce analysis (non-streaming)
 */
router.post('/analyze-simple', async (req, res) => {
    const startTime = Date.now();
    const { query, mode = 'parallel', session_id } = req.body;
    // Validate query
    if (!query || typeof query !== 'string') {
        res.status(400).json({
            success: false,
            error: 'Missing or invalid query parameter',
            message: 'クエリが必要です'
        });
        return;
    }
    // Validate mode
    if (mode !== 'parallel' && mode !== 'sequential') {
        res.status(400).json({
            success: false,
            error: 'Invalid mode parameter',
            message: 'モードは "parallel" または "sequential" である必要があります'
        });
        return;
    }
    logger_1.logger.info('🔄 Wall-Bounce simple analysis request', {
        query: query.substring(0, 100),
        mode,
        session_id
    });
    try {
        // Execute Wall-Bounce analysis
        const result = await wall_bounce_analyzer_1.wallBounceAnalyzer.executeWallBounce(query, {
            mode: mode
        });
        const processingTime = Date.now() - startTime;
        logger_1.logger.info('✅ Wall-Bounce simple analysis completed', {
            mode,
            session_id,
            processingTimeMs: processingTime,
            consensusScore: result.consensus_score
        });
        // Return JSON response
        res.json({
            success: true,
            result: {
                final_answer: result.final_answer,
                consensus_score: result.consensus_score,
                quality_score: result.quality_score,
                providers_used: result.providers_used,
                individual_responses: result.responses
            },
            metadata: {
                mode,
                session_id: session_id || `session_${Date.now()}`,
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString(),
                service: 'techsapo-wall-bounce',
                version: '1.0.0'
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.logger.error('❌ Wall-Bounce simple analysis failed', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            query: query.substring(0, 100),
            mode
        });
        res.status(500).json({
            success: false,
            error: 'Wall-Bounce analysis failed',
            message: 'Wall-Bounce分析中にエラーが発生しました',
            details: errorMessage,
            metadata: {
                timestamp: new Date().toISOString(),
                service: 'techsapo-wall-bounce',
                version: '1.0.0'
            }
        });
    }
});
/**
 * GET /api/v1/wall-bounce/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'techsapo-wall-bounce-api',
        status: 'operational',
        endpoints: {
            analyze: 'GET /api/v1/wall-bounce/analyze - SSE streaming Wall-Bounce分析',
            analyze_simple: 'POST /api/v1/wall-bounce/analyze-simple - JSON Wall-Bounce分析'
        },
        supported_modes: ['parallel', 'sequential'],
        timestamp: new Date().toISOString()
    });
});
/**
 * Helper: Send SSE event
 */
function sendSSEEvent(res, eventType, data) {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}
exports.default = router;
//# sourceMappingURL=wall-bounce-api.js.map