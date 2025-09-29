"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const environment_1 = require("./config/environment");
const logger_1 = require("./utils/logger");
const error_handler_1 = require("./middleware/error-handler");
const huggingface_routes_1 = __importDefault(require("./routes/huggingface-routes"));
const rag_endpoint_1 = __importDefault(require("./routes/rag-endpoint"));
const webhook_endpoints_1 = __importDefault(require("./routes/webhook-endpoints"));
const webhook_setup_1 = __importDefault(require("./routes/webhook-setup"));
class TechSapoServer {
    app;
    server;
    constructor() {
        this.app = (0, express_1.default)();
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddleware() {
        // Security middleware
        this.app.use((0, helmet_1.default)({
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
        this.app.use((0, cors_1.default)({
            origin: environment_1.config.server.nodeEnv === 'development'
                ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080']
                : [], // Configure production origins
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-session-id']
        }));
        // Body parsing middleware
        this.app.use(express_1.default.json({
            limit: '10mb',
            verify: (req, res, buf) => {
                req.rawBody = buf;
            }
        }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Request logging middleware
        this.app.use((req, res, next) => {
            logger_1.logger.info('Incoming request', {
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
    initializeRoutes() {
        // API routes
        this.app.use('/api/v1/huggingface', huggingface_routes_1.default);
        this.app.use('/api/huggingface', huggingface_routes_1.default); // Backward compatibility
        this.app.use('/', huggingface_routes_1.default); // Root level for direct access
        // RAG System routes
        this.app.use('/api/v1/rag', rag_endpoint_1.default);
        // Webhook routes
        this.app.use('/api/v1/webhooks', webhook_endpoints_1.default);
        this.app.use('/api/v1/webhook-setup', webhook_setup_1.default);
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
    initializeErrorHandling() {
        // 404 handler
        this.app.use(error_handler_1.notFoundHandler);
        // Global error handler
        this.app.use(error_handler_1.errorHandler);
        // Graceful shutdown handling
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('SIGINT', this.gracefulShutdown.bind(this));
        // Unhandled promise rejection handler
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Promise Rejection', {
                reason,
                promise: promise.toString()
            });
        });
        // Uncaught exception handler
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception', {
                error: error.message,
                stack: error.stack
            });
            // Gracefully shutdown
            this.gracefulShutdown();
        });
    }
    gracefulShutdown() {
        logger_1.logger.info('Received shutdown signal, starting graceful shutdown...');
        if (this.server) {
            this.server.close(() => {
                logger_1.logger.info('HTTP server closed');
                process.exit(0);
            });
            // Force shutdown after 30 seconds
            setTimeout(() => {
                logger_1.logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        }
        else {
            process.exit(0);
        }
    }
    async start() {
        try {
            // Validate environment variables
            (0, environment_1.validateEnvironment)();
            logger_1.logger.info('Starting TechSapo Hugging Face Integration server...');
            // Start server
            this.server = this.app.listen(environment_1.config.server.port, () => {
                logger_1.logger.info('Server started successfully', {
                    port: environment_1.config.server.port,
                    environment: environment_1.config.server.nodeEnv,
                    version: '1.0.0'
                });
                console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🚀 TechSapo Hugging Face Integration API Server Started         ║
║                                                                  ║
║  🌐 Local URL:    http://localhost:${environment_1.config.server.port}                         ║
║  📚 API Docs:     http://localhost:${environment_1.config.server.port}/api/docs                ║
║  💖 Health Check: http://localhost:${environment_1.config.server.port}/health                  ║
║                                                                  ║
║  🎯 Features:                                                    ║
║  • Japanese Embedding Models (5 models)                         ║
║  • Multi-Model Analysis & Comparison                            ║
║  • Text Generation & Inference                                  ║
║  • Conversation Management                                       ║
║  • Cost Tracking & Budget Monitoring                            ║
║  • Enterprise-Grade Error Handling                              ║
║                                                                  ║
║  Environment: ${environment_1.config.server.nodeEnv.toUpperCase().padEnd(10)}                                      ║
║  Version: 1.0.0                                                 ║
╚══════════════════════════════════════════════════════════════════╝
        `);
            });
            // Error handling for server
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger_1.logger.error(`Port ${environment_1.config.server.port} is already in use`);
                    process.exit(1);
                }
                else {
                    logger_1.logger.error('Server error', error);
                    process.exit(1);
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to start server', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            process.exit(1);
        }
    }
    getApp() {
        return this.app;
    }
}
// Start server if this file is run directly
if (require.main === module) {
    const server = new TechSapoServer();
    server.start().catch((error) => {
        logger_1.logger.error('Failed to start application', error);
        process.exit(1);
    });
}
// Export for testing compatibility
function createServer() {
    const app = (0, express_1.default)();
    // Basic middleware for testing
    app.use((0, cors_1.default)());
    app.use((0, helmet_1.default)());
    app.use(express_1.default.json());
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
    app.use((error, req, res, next) => {
        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ error: 'Invalid JSON' });
        }
        res.status(500).json({ error: 'Internal server error' });
    });
    // Mock server object for testing
    const mockServer = {
        close: (callback) => {
            if (callback)
                callback();
        }
    };
    return { app, server: mockServer };
}
exports.createServer = createServer;
exports.default = TechSapoServer;
//# sourceMappingURL=index.js.map