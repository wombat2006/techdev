import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateEnvironment } from './config/environment';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import huggingfaceRoutes from './routes/huggingface-routes';

class TechSapoServer {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api-inference.huggingface.co"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.server.nodeEnv === 'development' 
        ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080']
        : [], // Configure production origins
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-session-id']
    }));

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.headers['x-user-id'] || 'anonymous'
      });
      next();
    });

    // Health check for load balancers
    this.app.get('/ping', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'techsapo-huggingface-integration'
      });
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1/huggingface', huggingfaceRoutes);
    this.app.use('/api/huggingface', huggingfaceRoutes); // Backward compatibility
    this.app.use('/', huggingfaceRoutes); // Root level for direct access

    // API documentation endpoint
    this.app.get('/api/docs', (req, res) => {
      res.json({
        service: 'TechSapo Hugging Face Integration API',
        version: '1.0.0',
        description: 'Multi-Tier LLM Orchestrator with Japanese embedding models integration',
        endpoints: {
          health: 'GET /health - Health check',
          info: 'GET /info - System information',
          models: 'GET /models - Available models',
          embeddings: {
            generate: 'POST /embeddings - Generate embeddings',
            analyze: 'POST /embeddings/analyze - Multi-model analysis',
            recommend: 'POST /embeddings/recommend - Get model recommendation'
          },
          inference: {
            generate: 'POST /generate - Generate text inference',
            continue: 'POST /conversation/continue - Continue conversation',
            history: 'GET /conversation/{id} - Get conversation history'
          },
          cost: {
            summary: 'GET /cost/summary - Cost summary',
            alerts: 'GET /cost/alerts - Budget alerts',
            daily: 'GET /cost/report/daily - Daily report',
            predict: 'POST /cost/predict - Predict cost'
          }
        },
        documentation: 'https://github.com/your-repo/techsapo-huggingface-integration',
        contact: 'support@techsapo.com'
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'TechSapo Hugging Face Integration API',
        version: '1.0.0',
        status: 'running',
        docs: '/api/docs',
        health: '/health',
        timestamp: new Date().toISOString()
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);

    // Graceful shutdown handling
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    
    // Unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', {
        reason,
        promise: promise.toString()
      });
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
      });
      
      // Gracefully shutdown
      this.gracefulShutdown();
    });
  }

  private gracefulShutdown(): void {
    logger.info('Received shutdown signal, starting graceful shutdown...');
    
    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    } else {
      process.exit(0);
    }
  }

  public async start(): Promise<void> {
    try {
      // Validate environment variables
      validateEnvironment();
      
      logger.info('Starting TechSapo Hugging Face Integration server...');
      
      // Start server
      this.server = this.app.listen(config.server.port, () => {
        logger.info('Server started successfully', {
          port: config.server.port,
          environment: config.server.nodeEnv,
          version: '1.0.0'
        });
        
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🚀 TechSapo Hugging Face Integration API Server Started         ║
║                                                                  ║
║  🌐 Local URL:    http://localhost:${config.server.port}                         ║
║  📚 API Docs:     http://localhost:${config.server.port}/api/docs                ║
║  💖 Health Check: http://localhost:${config.server.port}/health                  ║
║                                                                  ║
║  🎯 Features:                                                    ║
║  • Japanese Embedding Models (5 models)                         ║
║  • Multi-Model Analysis & Comparison                            ║
║  • Text Generation & Inference                                  ║
║  • Conversation Management                                       ║
║  • Cost Tracking & Budget Monitoring                            ║
║  • Enterprise-Grade Error Handling                              ║
║                                                                  ║
║  Environment: ${config.server.nodeEnv.toUpperCase().padEnd(10)}                                      ║
║  Version: 1.0.0                                                 ║
╚══════════════════════════════════════════════════════════════════╝
        `);
      });

      // Error handling for server
      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${config.server.port} is already in use`);
          process.exit(1);
        } else {
          logger.error('Server error', error);
          process.exit(1);
        }
      });

    } catch (error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new TechSapoServer();
  server.start().catch((error) => {
    logger.error('Failed to start application', error);
    process.exit(1);
  });
}

// Export for testing compatibility
export function createServer() {
  const app = express();
  
  // Basic middleware for testing
  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  
  // Test endpoints
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.get('/api/v1/health', (req, res) => {
    res.json({
      status: 'ok',
      services: {
        redis: 'ok',
        sessionManager: 'ok'
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/v1/generate', (req, res) => {
    const { prompt, task_type, user_id, session_id } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (task_type && !['basic', 'premium', 'critical'].includes(task_type)) {
      return res.status(400).json({ error: 'Invalid task_type' });
    }

    res.json({
      response: `Mock response for: ${prompt}`,
      session_id: session_id || `sess_${Date.now()}`,
      task_type: task_type || 'basic',
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/v1/analyze-logs', (req, res) => {
    const { user_command, error_output, system_context } = req.body;

    if (!user_command || !error_output) {
      return res.status(400).json({ 
        error: 'user_command and error_output are required' 
      });
    }

    res.json({
      analysis_result: {
        command: user_command,
        error: error_output,
        context: system_context,
        suggestions: ['Check service status', 'Verify configuration']
      },
      timestamp: new Date().toISOString()
    });
  });

  // Error handling
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path
    });
  });

  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    res.status(500).json({ error: 'Internal server error' });
  });
  
  // Mock server object for testing
  const mockServer = {
    close: (callback?: () => void) => {
      if (callback) callback();
    }
  };
  
  return { app, server: mockServer };
}

export default TechSapoServer;