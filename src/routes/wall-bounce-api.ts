/**
 * Wall-Bounce Analysis API Routes
 * Provides streaming SSE endpoint for real-time analysis
 */

import express, { Request, Response } from 'express';
import { WallBounceAnalyzer } from '../services/wall-bounce-analyzer';
import { logger } from '../utils/logger';

const router = express.Router();

logger.info('🟢 Wall-Bounce router initialized');

// Debug: Log all route registrations
router.use((req, res, next) => {
  logger.info('🟡 Wall-Bounce router middleware hit', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });
  next();
});

interface AnalyzeRequest {
  question: string;
  taskType?: 'basic' | 'premium' | 'critical';
  executionMode?: 'parallel' | 'sequential';
  depth?: number;
}

/**
 * POST /api/v1/wall-bounce/analyze-simple
 * Simple JSON endpoint for debugging
 */
router.post('/analyze-simple', async (req: Request, res: Response) => {
  try {
    const { question } = req.body as AnalyzeRequest;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const analyzer = new WallBounceAnalyzer();
    const result = await analyzer.executeWallBounce(question, {
      taskType: 'basic',
      mode: 'parallel',
      depth: 3
    });

    res.json({
      success: true,
      steps: result.llm_votes.map(vote => ({
        provider: vote.provider,
        response: vote.response.content.substring(0, 300)
      })),
      consensus: result.consensus
    });

  } catch (error) {
    logger.error('Wall-Bounce Simple API error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/wall-bounce/analyze
 * Streaming SSE endpoint for Wall-Bounce analysis (query parameters)
 */
router.get('/analyze', async (req: Request, res: Response) => {
  logger.info('🔵 Wall-Bounce /analyze endpoint hit', { query: req.query });

  try {
    const { query, mode = 'parallel', session_id } = req.query;
    const question = query as string;
    const executionMode = mode as 'parallel' | 'sequential';
    const taskType: 'basic' | 'premium' | 'critical' = 'basic';
    const depth = 3;

    logger.info('🔵 Parsed params', { question, executionMode, session_id });

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      logger.warn('🔴 Invalid question parameter');
      res.status(400).json({ error: 'Question is required and must be a non-empty string' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    const analyzer = new WallBounceAnalyzer();

    // Send initial thinking event
    res.write(`event: thinking\ndata: ${JSON.stringify({
      provider: 'Claude Code (Orchestrator)',
      step: 'Analyzing User Request',
      content: `User inquiry: "${question}". Parsing intent and extracting key technical requirements.`,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Helper function to send SSE events
    const sendSSEEvent = (eventName: string, data: any) => {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Execute Wall-Bounce analysis with callbacks
    const executeOptions = {
      taskType,
      mode: executionMode,
      depth,
      onThinking: (provider: string, step: string, content: string) => {
        sendSSEEvent('thinking', {
          provider,
          step,
          content,
          timestamp: new Date().toISOString()
        });
      },
      onProviderResponse: (provider: string, response: string) => {
        sendSSEEvent('provider_response', {
          provider,
          response: response.substring(0, 500),
          timestamp: new Date().toISOString()
        });
      },
      onConsensusUpdate: (score: number) => {
        sendSSEEvent('consensus', {
          score,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Execute Wall-Bounce analysis (events will stream in real-time)
    const result = await analyzer.executeWallBounce(question, executeOptions);

    // Send final thinking step
    sendSSEEvent('thinking', {
      provider: 'Claude Code (Orchestrator)',
      step: 'Final Response Generation',
      content: 'Synthesizing multi-LLM analysis into coherent, actionable response for user.',
      timestamp: new Date().toISOString()
    });

    // Send final consensus
    sendSSEEvent('consensus', {
      score: result.consensus?.confidence || 0,
      timestamp: new Date().toISOString()
    });

    // Send final answer
    sendSSEEvent('final_answer', {
      answer: result.consensus?.content || 'Analysis complete',
      metadata: {
        mode: executionMode,
        session_id,
        processing_time_ms: result.processing_time_ms,
        consensus_score: result.consensus?.confidence || 0,
        providers_used: result.llm_votes?.map(v => v.provider) || [],
        timestamp: new Date().toISOString()
      }
    });

    res.end();

    logger.info('Wall-Bounce analysis completed', {
      question: question.substring(0, 100),
      taskType,
      executionMode,
      depth,
      consensus: result.consensus.confidence,
      confidence: result.consensus.confidence,
      providerCount: result.llm_votes.length
    });

  } catch (error) {
    logger.error('Wall-Bounce API error', { error });

    // Send error via SSE
    res.write(`event: error\ndata: ${JSON.stringify({
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    })}\n\n`);

    res.end();
  }
});

/**
 * GET /api/v1/wall-bounce/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'wall-bounce-api',
    timestamp: new Date().toISOString()
  });
});

export default router;