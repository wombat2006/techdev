/**
 * Wall-Bounce Analysis API Routes
 * Provides streaming SSE endpoint for real-time analysis
 */

import express, { Request, Response } from 'express';
import { WallBounceAnalyzer } from '../services/wall-bounce-analyzer';
import { logger } from '../utils/logger';

const router = express.Router();

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
 * POST /api/v1/wall-bounce/analyze
 * Streaming SSE endpoint for Wall-Bounce analysis
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { question, taskType = 'basic', executionMode = 'parallel', depth = 3 } = req.body as AnalyzeRequest;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({ error: 'Question is required and must be a non-empty string' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const analyzer = new WallBounceAnalyzer();

    // Send initial step
    res.write(`data: ${JSON.stringify({
      type: 'step',
      provider: 'Claude Code (Orchestrator)',
      label: 'Analyzing User Request',
      text: `User inquiry: "${question}". Parsing intent and extracting key technical requirements.`,
      timestamp: Date.now()
    })}\n\n`);

    // Execute Wall-Bounce analysis
    const result = await analyzer.executeWallBounce(question, {
      taskType,
      mode: executionMode,
      depth
    });

    // Send provider responses as steps
    for (const vote of result.llm_votes) {
      res.write(`data: ${JSON.stringify({
        type: 'step',
        provider: vote.provider,
        label: `${vote.provider} Analysis`,
        text: vote.response.content.substring(0, 500) + (vote.response.content.length > 500 ? '...' : ''),
        timestamp: Date.now()
      })}\n\n`);

      // Simulate progressive consensus building
      res.write(`data: ${JSON.stringify({
        type: 'consensus',
        score: vote.agreement_score
      })}\n\n`);
    }

    // Send final aggregated result
    res.write(`data: ${JSON.stringify({
      type: 'step',
      provider: 'Claude Code (Orchestrator)',
      label: 'Final Response Generation',
      text: 'Synthesizing multi-LLM analysis into coherent, actionable response for user.',
      timestamp: Date.now()
    })}\n\n`);

    // Send completion with final consensus
    res.write(`data: ${JSON.stringify({
      type: 'consensus',
      score: result.consensus.confidence
    })}\n\n`);

    res.write(`data: ${JSON.stringify({
      type: 'complete',
      result: result.consensus.content,
      consensus: result.consensus.confidence,
      confidence: result.consensus.confidence
    })}\n\n`);

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
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
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