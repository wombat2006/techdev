import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/environment';
import { getRedisService } from './services/redis-service';
import { getSessionManager } from './services/session-manager';
import ragEndpoints from './routes/rag-endpoint';

export function createServer() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // RAG API routes
  app.use('/api/v1/rag', ragEndpoints);

  // Health check endpoints
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.get('/api/v1/health', async (req, res) => {
    try {
      const redis = getRedisService();
      const sessionManager = getSessionManager();

      // Test Redis connection
      let redisStatus = 'ok';
      try {
        await redis.set('health-check', 'ok', { ex: 10 });
        await redis.get('health-check');
      } catch (error) {
        redisStatus = 'error';
      }

      res.json({
        status: 'ok',
        services: {
          redis: redisStatus,
          sessionManager: 'ok'
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // API endpoints
  app.post('/api/v1/generate', async (req, res) => {
    try {
      const { prompt, task_type, user_id, session_id } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (task_type && !['basic', 'premium', 'critical'].includes(task_type)) {
        return res.status(400).json({ error: 'Invalid task_type' });
      }

      // Mock response for testing
      const response = {
        response: `Mock response for: ${prompt}`,
        session_id: session_id || `sess_${Date.now()}`,
        task_type: task_type || 'basic',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/v1/analyze-logs', async (req, res) => {
    try {
      const { user_command, error_output, system_context } = req.body;

      if (!user_command || !error_output) {
        return res.status(400).json({ 
          error: 'user_command and error_output are required' 
        });
      }

      // Mock analysis response
      const analysis = {
        analysis_result: {
          command: user_command,
          error: error_output,
          context: system_context,
          suggestions: [
            'Check service status',
            'Verify configuration',
            'Review logs'
          ],
          severity: 'medium'
        },
        timestamp: new Date().toISOString()
      };

      res.json(analysis);
    } catch (error) {
      res.status(500).json({
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Error handling middleware
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
      method: req.method
    });
  });

  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', error);
    
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  });

  const server = app.listen(config.server.port, () => {
    console.log(`Server running on port ${config.server.port}`);
  });

  return { app, server };
}

// For testing purposes
if (require.main === module) {
  createServer();
}