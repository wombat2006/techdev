"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const environment_1 = require("./config/environment");
const redis_service_1 = require("./services/redis-service");
const session_manager_1 = require("./services/session-manager");
const rag_endpoint_1 = __importDefault(require("./routes/rag-endpoint"));
function createServer() {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    // Body parsing
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // RAG API routes
    app.use('/api/v1/rag', rag_endpoint_1.default);
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
            const redis = (0, redis_service_1.getRedisService)();
            const sessionManager = (0, session_manager_1.getSessionManager)();
            // Test Redis connection
            let redisStatus = 'ok';
            try {
                await redis.set('health-check', 'ok', { ex: 10 });
                await redis.get('health-check');
            }
            catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
    app.use((error, req, res, next) => {
        console.error('Server error:', error);
        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ error: 'Invalid JSON' });
        }
        res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    });
    const server = app.listen(environment_1.config.server.port, () => {
        console.log(`Server running on port ${environment_1.config.server.port}`);
    });
    return { app, server };
}
// For testing purposes
if (require.main === module) {
    createServer();
}
//# sourceMappingURL=server.js.map