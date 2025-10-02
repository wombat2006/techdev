"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const environment_1 = require("./config/environment");
const redis_service_1 = require("./services/redis-service");
const session_manager_1 = require("./services/session-manager");
const wall_bounce_analyzer_1 = require("./services/wall-bounce-analyzer");
const log_analyzer_1 = require("./services/log-analyzer");
const rag_endpoint_1 = __importDefault(require("./routes/rag-endpoint"));
const codex_session_1 = __importDefault(require("./routes/codex-session"));
const pdf_routes_1 = __importDefault(require("./routes/pdf-routes"));
const GEMINI_CLI_TTL_MS = 5 * 60 * 1000; // cache for 5 minutes
let geminiCliHealth = null;
const resolveGeminiCliHealth = async () => {
    const now = Date.now();
    if (geminiCliHealth && (now - geminiCliHealth.lastChecked) < GEMINI_CLI_TTL_MS) {
        return geminiCliHealth;
    }
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const { stdout } = await execAsync('gemini --version', { timeout: 5000 });
        geminiCliHealth = {
            status: 'ok',
            version: stdout.trim(),
            lastChecked: now
        };
    }
    catch (error) {
        geminiCliHealth = {
            status: 'error',
            version: 'unknown',
            lastChecked: now
        };
    }
    return geminiCliHealth;
};
function createServer() {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false, // Allow inline styles for WebApp
        crossOriginEmbedderPolicy: false
    }));
    app.use((0, cors_1.default)());
    // Body parsing
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // Static file serving
    const publicPath = path_1.default.join(__dirname, '..', 'public');
    app.use(express_1.default.static(publicPath, {
        maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
        etag: true,
        lastModified: true
    }));
    // RAG API routes
    app.use('/api/v1/rag', rag_endpoint_1.default);
    // Codex Session API routes
    app.use('/api/codex', codex_session_1.default);
    // PDF API routes
    app.use('/api/v1/pdf', pdf_routes_1.default);
    // Real-time metrics endpoint (Server-Sent Events) - 開発環境のみ
    app.get('/api/v1/metrics/stream', (req, res) => {
        // 本番環境では無効化
        if (process.env.NODE_ENV === 'production') {
            return res.status(404).json({
                error: 'Metrics endpoint is only available in development mode'
            });
        }
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
            message: 'メトリクスストリーム接続完了（開発環境）'
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
            }
            catch (error) {
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
            const redis = (0, redis_service_1.getRedisService)();
            const sessionManager = (0, session_manager_1.getSessionManager)();
            const wallBounceAnalyzer = new wall_bounce_analyzer_1.WallBounceAnalyzer();
            // Test Redis connection
            let redisStatus = 'ok';
            try {
                await redis.set('health-check', 'ok', { ex: 10 });
                await redis.get('health-check');
            }
            catch (error) {
                redisStatus = 'error';
            }
            const geminiHealth = await resolveGeminiCliHealth();
            // Get current environment configuration
            const environmentConfig = {
                srpEnabled: process.env.USE_SRP_WALL_BOUNCE === 'true',
                srpTrafficPercentage: parseInt(process.env.SRP_TRAFFIC_PERCENTAGE || '0'),
                geminiStrategy: process.env.GEMINI_STRATEGY || 'api',
                geminiCliPercentage: parseInt(process.env.GEMINI_CLI_PERCENTAGE || '0'),
                deploymentVersion: process.env.DEPLOYMENT_VERSION || 'unknown'
            };
            res.json({
                status: 'ok',
                services: {
                    redis: redisStatus,
                    sessionManager: 'ok',
                    geminiCli: geminiHealth.status
                },
                gemini: {
                    cliVersion: geminiHealth.version,
                    strategy: environmentConfig.geminiStrategy,
                    cliPercentage: environmentConfig.geminiCliPercentage
                },
                srp: {
                    enabled: environmentConfig.srpEnabled,
                    trafficPercentage: environmentConfig.srpTrafficPercentage
                },
                deployment: {
                    version: environmentConfig.deploymentVersion,
                    environment: process.env.NODE_ENV || 'development'
                },
                uptime: process.uptime(),
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                },
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
            // Real Multi-LLM Wall-Bounce Analysis
            const wallBounceAnalyzer = new wall_bounce_analyzer_1.WallBounceAnalyzer();
            const wallBounceResult = await wallBounceAnalyzer.executeWallBounce(prompt, {
                taskType: task_type || 'basic'
            });
            const response = {
                response: wallBounceResult.consensus.content,
                confidence: wallBounceResult.consensus.confidence,
                reasoning: wallBounceResult.consensus.reasoning,
                session_id: session_id || `sess_${Date.now()}`,
                task_type: task_type || 'basic',
                total_cost: wallBounceResult.total_cost,
                processing_time_ms: wallBounceResult.processing_time_ms,
                providers_used: wallBounceResult.debug.providers_used,
                wall_bounce_verified: wallBounceResult.debug.wall_bounce_verified,
                timestamp: new Date().toISOString()
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                error: 'Wall-Bounce analysis failed',
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
            // Real Multi-LLM Wall-Bounce Log Analysis
            const logAnalysisResult = await log_analyzer_1.LogAnalyzer.analyzeLogs({
                user_command,
                error_output,
                system_context
            });
            const analysis = {
                analysis_result: {
                    issue_identified: logAnalysisResult.issue_identified,
                    problem_category: logAnalysisResult.problem_category,
                    root_cause: logAnalysisResult.root_cause,
                    solution_steps: logAnalysisResult.solution_steps,
                    related_services: logAnalysisResult.related_services,
                    severity_level: logAnalysisResult.severity_level,
                    confidence_score: logAnalysisResult.confidence_score,
                    additional_checks: logAnalysisResult.additional_checks,
                    collaboration_trace: logAnalysisResult.collaboration_trace
                },
                timestamp: new Date().toISOString()
            };
            res.json(analysis);
        }
        catch (error) {
            res.status(500).json({
                error: 'Log analysis failed',
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
        res.sendFile(path_1.default.join(publicPath, 'index.html'));
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
exports.createServer = createServer;
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
//# sourceMappingURL=server.js.map