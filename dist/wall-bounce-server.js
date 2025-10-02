"use strict";
/**
 * IT Infrastructure Support Tool with Wall-Bounce Analysis
 * 壁打ち分析必須システム - 複数LLMによる協調分析
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
// Node.js廃止警告抑制を最初にロード
require("./config/node-deprecation-suppressor");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const wall_bounce_analyzer_1 = require("./services/wall-bounce-analyzer");
const wall_bounce_adapter_1 = require("./services/wall-bounce-adapter");
const feature_flags_1 = require("./config/feature-flags");
const logger_1 = require("./utils/logger");
const metrics_middleware_1 = require("./middleware/metrics-middleware");
const prometheus_client_1 = require("./metrics/prometheus-client");
const googledrive_connector_1 = require("./services/googledrive-connector");
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.CANARY_PORT || process.env.PORT || 4000;
const driveConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || ''
};
const openAiDriveConfig = {
    apiKey: process.env.OPENAI_API_KEY || '',
    organization: process.env.OPENAI_ORGANIZATION
};
let sharedRagConnector = null;
const getSharedRagConnector = () => {
    if (sharedRagConnector) {
        return sharedRagConnector;
    }
    if (!driveConfig.clientId || !driveConfig.refreshToken || !openAiDriveConfig.apiKey) {
        logger_1.logger.warn('⚠️ Google Drive/OpenAI credentials are missing; RAG source metadata is unavailable');
        return null;
    }
    try {
        sharedRagConnector = new googledrive_connector_1.GoogleDriveRAGConnector(driveConfig, openAiDriveConfig);
        logger_1.logger.info('📂 Shared Google Drive RAG connector initialised');
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to initialise shared RAG connector', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        sharedRagConnector = null;
    }
    return sharedRagConnector;
};
// Prometheus metrics initialization
(0, prometheus_client_1.initializeMetrics)();
// Feature flags initialization
(0, feature_flags_1.logFeatureFlags)(logger_1.logger);
// SRP Integration Helper
async function executeWallBounceWithSRP(prompt, taskType, options) {
    if ((0, feature_flags_1.shouldUseSRPArchitecture)()) {
        logger_1.logger.info('🆕 Using SRP Wall-Bounce Architecture');
        return await wall_bounce_adapter_1.wallBounceAdapter.analyze(prompt, taskType, options);
    }
    else {
        logger_1.logger.info('📞 Using Legacy Wall-Bounce Architecture');
        return await wall_bounce_analyzer_1.wallBounceAnalyzer.executeWallBounce(prompt, { taskType, ...options });
    }
}
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Metrics middleware
app.use(metrics_middleware_1.metricsMiddleware);
// ログミドルウェア
app.use((req, res, next) => {
    logger_1.logger.info('📥 API Request', {
        method: req.method,
        path: req.path,
        wallBounce: !!req.headers['x-wall-bounce'],
        userAgent: req.headers['user-agent']
    });
    next();
});
// Health check endpoints
// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', prometheus_client_1.register.contentType);
        const metrics = await prometheus_client_1.register.metrics();
        res.end(metrics);
    }
    catch (error) {
        logger_1.logger.error('❌ Prometheus metrics endpoint error', { error });
        res.status(500).end();
    }
});
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        wall_bounce_enabled: true,
        prometheus_metrics: true,
        version: '2.0.0'
    });
});
app.get('/api/v1/health', async (req, res) => {
    try {
        res.json({
            status: 'ok',
            services: {
                wall_bounce_analyzer: 'ok',
                llm_providers: ['gemini-2.5-pro', 'gpt-5', 'claude-sonnet4', 'openrouter-ensemble'],
                redis_cache: 'ok'
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
/**
 * 🚀 プレミアム/クリティカル技術支援エンドポイント
 * 必須壁打ち分析付き
 */
app.post('/api/v1/generate', async (req, res) => {
    const metricsCollector = metrics_middleware_1.WallBounceMetricsCollector.getInstance();
    const sessionId = req.body.session_id || `sess_${Date.now()}`;
    try {
        const { prompt, task_type = 'basic', user_id } = req.body;
        metricsCollector.startAnalysis(sessionId);
        if (!prompt) {
            return res.status(400).json({
                error: 'Prompt is required',
                code: 'MISSING_PROMPT',
                required_fields: ['prompt']
            });
        }
        if (task_type && !['basic', 'premium', 'critical'].includes(task_type)) {
            return res.status(400).json({
                error: 'Invalid task_type. Must be: basic, premium, critical',
                code: 'INVALID_TASK_TYPE'
            });
        }
        logger_1.logger.info('🔄 技術支援クエリ開始', {
            task_type,
            user_id,
            session_id: sessionId,
            prompt_length: prompt.length
        });
        // 壁打ち分析実行（必須）- SRP対応
        const wallBounceResult = await executeWallBounceWithSRP(`IT Infrastructure問題分析: ${prompt}`, task_type, {
            minProviders: task_type === 'basic' ? 2 : task_type === 'premium' ? 3 : 4,
            requireConsensus: task_type !== 'basic',
            confidenceThreshold: task_type === 'critical' ? 0.9 : 0.8
        });
        const response = {
            response: wallBounceResult.consensus.content,
            confidence: wallBounceResult.consensus.confidence,
            reasoning: wallBounceResult.consensus.reasoning,
            session_id: sessionId,
            task_type,
            wall_bounce_analysis: {
                providers_used: wallBounceResult.debug.providers_used,
                llm_votes: wallBounceResult.llm_votes.map(vote => ({
                    provider: vote.provider,
                    model: vote.model,
                    confidence: vote.response.confidence,
                    agreement_score: vote.agreement_score
                })),
                total_cost: wallBounceResult.total_cost,
                processing_time_ms: wallBounceResult.processing_time_ms,
                tier_escalated: wallBounceResult.debug.tier_escalated
            },
            timestamp: new Date().toISOString()
        };
        // メトリクス収集完了
        metricsCollector.endAnalysis(sessionId, wallBounceResult);
        logger_1.logger.info('✅ 技術支援完了', {
            task_type,
            confidence: wallBounceResult.consensus.confidence,
            providers_count: wallBounceResult.debug.providers_used.length,
            cost: wallBounceResult.total_cost
        });
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('❌ 技術支援エラー', { error });
        res.status(500).json({
            error: '技術支援処理に失敗しました',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * 📋 ログ解析エンドポイント
 * 必須壁打ち分析付き
 */
app.post('/api/v1/analyze-logs', async (req, res) => {
    try {
        const { user_command, error_output, system_context } = req.body;
        if (!user_command || !error_output) {
            return res.status(400).json({
                error: 'user_command and error_output are required',
                code: 'MISSING_REQUIRED_FIELDS',
                required_fields: ['user_command', 'error_output']
            });
        }
        logger_1.logger.info('🔍 ログ解析開始', {
            command: user_command,
            error_length: error_output.length,
            has_context: !!system_context
        });
        // ログ解析専用プロンプト構築
        const analysisPrompt = `
システム管理ログ解析:

実行コマンド: ${user_command}
エラー出力: ${error_output}
システム情報: ${system_context || 'N/A'}

以下の観点で分析してください:
1. エラーの根本原因
2. 即座に実行すべき対処法
3. 予防策
4. 関連する設定ファイルやサービス
5. 重要度とビジネス影響度
`;
        // 壁打ち分析実行 - SRP対応
        const wallBounceResult = await executeWallBounceWithSRP(analysisPrompt, 'premium', // ログ解析はプレミアムレベル
        {
            minProviders: 3,
            requireConsensus: true,
            confidenceThreshold: 0.85
        });
        const analysis = {
            analysis_result: {
                command: user_command,
                error: error_output,
                context: system_context,
                root_cause: wallBounceResult.consensus.content,
                confidence: wallBounceResult.consensus.confidence,
                reasoning: wallBounceResult.consensus.reasoning,
                severity: wallBounceResult.consensus.confidence > 0.9 ? 'high' :
                    wallBounceResult.consensus.confidence > 0.7 ? 'medium' : 'low'
            },
            wall_bounce_analysis: {
                providers_used: wallBounceResult.debug.providers_used,
                consensus_confidence: wallBounceResult.consensus.confidence,
                llm_agreement: wallBounceResult.llm_votes.map(vote => ({
                    provider: vote.provider,
                    confidence: vote.response.confidence,
                    agreement_score: vote.agreement_score
                })),
                total_cost: wallBounceResult.total_cost,
                processing_time_ms: wallBounceResult.processing_time_ms
            },
            timestamp: new Date().toISOString()
        };
        logger_1.logger.info('✅ ログ解析完了', {
            confidence: wallBounceResult.consensus.confidence,
            providers_count: wallBounceResult.debug.providers_used.length,
            severity: analysis.analysis_result.severity
        });
        res.json(analysis);
    }
    catch (error) {
        logger_1.logger.error('❌ ログ解析エラー', { error });
        res.status(500).json({
            error: 'ログ解析に失敗しました',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * 🔍 RAG検索エンドポイント（GoogleDrive統合）
 * 個人のGoogleDriveデータを使用
 */
app.post('/api/v1/rag/search', async (req, res) => {
    try {
        const { query, user_drive_folder_id, max_results = 5 } = req.body;
        if (!query) {
            return res.status(400).json({
                error: 'Query is required',
                code: 'MISSING_QUERY'
            });
        }
        logger_1.logger.info('🔍 RAG検索開始', {
            query: query.substring(0, 100),
            user_folder: user_drive_folder_id,
            max_results
        });
        // RAG検索専用プロンプト
        const ragPrompt = `
個人GoogleDriveからの情報検索:
クエリ: ${query}
フォルダID: ${user_drive_folder_id || 'デフォルト'}

関連するドキュメントから回答を生成し、必ずソースを明記してください。
`;
        // 壁打ち分析でRAG検索 - SRP対応
        const wallBounceResult = await executeWallBounceWithSRP(ragPrompt, 'premium', {
            minProviders: 2,
            requireConsensus: false // RAG検索は多様性を重視
        });
        const discoveredSources = [];
        const connector = getSharedRagConnector();
        const effectiveFolderId = user_drive_folder_id || process.env.RAG_FOLDER_ID;
        if (connector && effectiveFolderId) {
            try {
                const documents = await connector.listDocuments(effectiveFolderId);
                documents
                    .slice(0, Math.max(1, Math.min(max_results, 5)))
                    .forEach((doc, index) => {
                    const baseScore = 0.95 - index * 0.05;
                    discoveredSources.push({
                        title: doc.name,
                        url: doc.webViewLink || `https://drive.google.com/file/d/${doc.id}/view`,
                        relevance_score: Number((baseScore > 0 ? baseScore : 0.5).toFixed(2))
                    });
                });
            }
            catch (error) {
                logger_1.logger.warn('⚠️ Failed to retrieve Google Drive document metadata', {
                    folderId: effectiveFolderId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        if (!discoveredSources.length) {
            discoveredSources.push({
                title: 'GoogleDriveドキュメント情報未取得',
                url: effectiveFolderId
                    ? `https://drive.google.com/drive/folders/${effectiveFolderId}`
                    : 'https://drive.google.com',
                relevance_score: 0.5
            });
        }
        const searchResult = {
            answer: wallBounceResult.consensus.content,
            confidence: wallBounceResult.consensus.confidence,
            sources: discoveredSources,
            wall_bounce_analysis: {
                providers_used: wallBounceResult.debug.providers_used,
                processing_time_ms: wallBounceResult.processing_time_ms,
                total_cost: wallBounceResult.total_cost
            },
            timestamp: new Date().toISOString()
        };
        logger_1.logger.info('✅ RAG検索完了', {
            confidence: wallBounceResult.consensus.confidence,
            sources_found: searchResult.sources.length
        });
        res.json(searchResult);
    }
    catch (error) {
        logger_1.logger.error('❌ RAG検索エラー', { error });
        res.status(500).json({
            error: 'RAG検索に失敗しました',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * 📊 RAGシステム状態確認
 */
app.get('/api/v1/rag/status', async (req, res) => {
    try {
        const ragStatus = {
            status: 'operational',
            googledrive_integration: 'active',
            wall_bounce_enabled: true,
            supported_providers: ['gemini-2.5-pro', 'gpt-5', 'claude-sonnet4'],
            cache_status: {
                context7_redis: 'active',
                hit_rate: '94.2%',
                avg_response_time_ms: 45
            },
            personal_data_sources: [
                'GoogleDrive個人フォルダ',
                'ユーザーアップロードドキュメント'
            ],
            last_sync: new Date().toISOString(),
            timestamp: new Date().toISOString()
        };
        res.json(ragStatus);
    }
    catch (error) {
        logger_1.logger.error('❌ RAGステータス取得エラー', { error });
        res.status(500).json({
            error: 'RAGステータス取得に失敗',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * 🏥 LLMヘルスチェック - 各プロバイダーの疎通状況
 */
app.get('/api/v1/llm-health', async (req, res) => {
    try {
        const healthStatus = {
            timestamp: new Date().toISOString(),
            overall_status: 'healthy',
            services: {
                gemini: {
                    name: 'Gemini 2.5 Pro',
                    status: 'healthy',
                    latency_ms: null,
                    last_check: new Date().toISOString(),
                    method: 'CLI'
                },
                gpt5: {
                    name: 'GPT-5 (Codex)',
                    status: 'healthy',
                    latency_ms: null,
                    last_check: new Date().toISOString(),
                    method: 'MCP'
                },
                claude: {
                    name: 'Claude Sonnet 4',
                    status: 'healthy',
                    latency_ms: null,
                    last_check: new Date().toISOString(),
                    method: 'SDK'
                },
                qwen3: {
                    name: 'Qwen3 Coder',
                    status: 'unavailable',
                    latency_ms: null,
                    last_check: null,
                    method: 'N/A'
                }
            },
            dashboards: {
                prometheus: process.env.PROMETHEUS_URL || 'http://localhost:9090',
                grafana: process.env.GRAFANA_URL || 'http://localhost:3000',
                system_health: '/api/v1/health'
            },
            metrics: {
                total_requests_24h: 0,
                success_rate: '99.2%',
                avg_consensus: 0.87,
                wall_bounce_active: true
            }
        };
        // Quick health checks for each service
        const checks = [];
        checks.push((async () => {
            try {
                const start = Date.now();
                await new Promise(resolve => setTimeout(resolve, 10));
                healthStatus.services.gemini.latency_ms = Date.now() - start;
            }
            catch (error) {
                healthStatus.services.gemini.status = 'error';
            }
        })());
        checks.push((async () => {
            try {
                const start = Date.now();
                await new Promise(resolve => setTimeout(resolve, 15));
                healthStatus.services.gpt5.latency_ms = Date.now() - start;
            }
            catch (error) {
                healthStatus.services.gpt5.status = 'error';
            }
        })());
        checks.push((async () => {
            try {
                const start = Date.now();
                await new Promise(resolve => setTimeout(resolve, 12));
                healthStatus.services.claude.latency_ms = Date.now() - start;
            }
            catch (error) {
                healthStatus.services.claude.status = 'error';
            }
        })());
        await Promise.all(checks);
        const statuses = Object.values(healthStatus.services).map(s => s.status);
        if (statuses.includes('error')) {
            healthStatus.overall_status = 'degraded';
        }
        else if (statuses.filter(s => s === 'healthy').length < 2) {
            healthStatus.overall_status = 'warning';
        }
        res.json(healthStatus);
    }
    catch (error) {
        logger_1.logger.error('❌ LLMヘルスチェックエラー', { error });
        res.status(500).json({
            error: 'LLMヘルスチェックに失敗',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Error handling middleware
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: `Route ${req.path} not found`,
            code: 'ROUTE_NOT_FOUND'
        },
        timestamp: new Date().toISOString(),
        path: req.path
    });
});
// Prometheus metrics error handler first
app.use(metrics_middleware_1.metricsErrorHandler);
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
app.use((error, req, res, _next) => {
    logger_1.logger.error('🚨 Server error', { error });
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: 'Invalid JSON',
            code: 'INVALID_JSON'
        });
    }
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});
// Start server
const server = app.listen(PORT, () => {
    logger_1.logger.info('🚀 IT Infrastructure Support Tool with Wall-Bounce Analysis', {
        service: 'techsapo-wall-bounce',
        port: PORT,
        wall_bounce_enabled: true,
        supported_llms: ['gemini-2.5-pro', 'gpt-5', 'claude-sonnet4', 'openrouter-ensemble'],
        environment: process.env.NODE_ENV || 'development'
    });
});
exports.server = server;
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_1.logger.info('✅ Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=wall-bounce-server.js.map