import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/environment';
import { getRedisService } from './services/redis-service';
import { getSessionManager } from './services/session-manager';
import ragEndpoints from './routes/rag-endpoint';

export function createServer() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow inline styles for WebApp
    crossOriginEmbedderPolicy: false
  }));
  app.use(cors());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static file serving
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
  }));

  // RAG API routes
  app.use('/api/v1/rag', ragEndpoints);

  // Real-time metrics endpoint (Server-Sent Events)
  app.get('/api/v1/metrics/stream', (req, res) => {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      message: 'メトリクスストリーム接続完了'
    })}\n\n`);

    // Send metrics every 5 seconds
    const interval = setInterval(async () => {
      try {
        const metrics = await generateRealTimeMetrics();
        res.write(`data: ${JSON.stringify({
          type: 'metrics',
          timestamp: new Date().toISOString(),
          data: metrics
        })}\n\n`);
      } catch (error) {
        console.error('Error generating metrics:', error);
      }
    }, 5000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(interval);
      console.log('SSE client disconnected');
    });
  });

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

  // SPA routing - serve index.html for non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        error: 'API endpoint not found',
        path: req.path,
        method: req.method
      });
    }

    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(publicPath, 'index.html'));
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

/**
 * Generate real-time system metrics
 */
async function generateRealTimeMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Calculate CPU percentage (approximation)
  const cpuPercent = Math.min(100, Math.floor(Math.random() * 100)); // Mock for now

  // Memory usage in MB
  const memoryUsagePercent = Math.floor((memUsage.heapUsed / memUsage.heapTotal) * 100);

  // Active connections (mock)
  const activeConnections = Math.floor(Math.random() * 50) + 1;

  // Response time (mock based on some calculation)
  const responseTime = Math.floor(Math.random() * 200) + 30;

  return {
    cpu: {
      usage: cpuPercent,
      userTime: cpuUsage.user,
      systemTime: cpuUsage.system
    },
    memory: {
      usage: memoryUsagePercent,
      heapUsed: Math.floor(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.floor(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.floor(memUsage.external / 1024 / 1024) // MB
    },
    network: {
      activeConnections,
      responseTime
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

// For testing purposes
if (require.main === module) {
  createServer();
}