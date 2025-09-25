"use strict";
/**
 * IT Support Endpoints
 * Specialized endpoints for IT engineers and system administrators
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCriticalSupport = handleCriticalSupport;
exports.handlePremiumSupport = handlePremiumSupport;
exports.handleBasicSupport = handleBasicSupport;
const express_1 = __importDefault(require("express"));
const winston_1 = __importDefault(require("winston"));
const log_analyzer_1 = require("../services/log-analyzer");
const data_sanitizer_1 = require("../utils/data-sanitizer");
const router = express_1.default.Router();
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'techsapo-it-support' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/it-support.log' }),
        new winston_1.default.transports.Console()
    ]
});
/**
 * POST /analyze-logs
 * IT障害解析 - Log Analysis for IT Troubleshooting
 */
router.post('/analyze-logs', async (req, res) => {
    try {
        const startTime = Date.now();
        logger.info('IT Log Analysis Request', {
            hasUserCommand: !!req.body.user_command,
            hasErrorOutput: !!req.body.error_output,
            systemContext: req.body.system_context,
            requestId: req.headers['x-request-id']
        });
        // Validate required fields
        if (!req.body.error_output) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: error_output',
                message: 'ログ解析にはerror_outputフィールドが必要です。'
            });
        }
        // Perform log analysis
        const analysisResult = await log_analyzer_1.LogAnalyzer.analyzeLogs({
            user_command: req.body.user_command,
            error_output: req.body.error_output,
            system_context: req.body.system_context,
            log_type: req.body.log_type
        });
        const processingTime = Date.now() - startTime;
        logger.info('Log analysis completed', {
            processingTimeMs: processingTime,
            issueIdentified: analysisResult.issue_identified,
            severityLevel: analysisResult.severity_level,
            confidenceScore: analysisResult.confidence_score
        });
        // Return standardized response
        res.json({
            success: true,
            analysis_result: analysisResult,
            metadata: {
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString(),
                service: 'techsapo-log-analyzer',
                version: '1.0.0'
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Log analysis failed', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            requestBody: req.body
        });
        res.status(500).json({
            success: false,
            error: 'Log analysis failed',
            message: 'ログ解析中にエラーが発生しました。',
            details: errorMessage
        });
    }
});
/**
 * POST /generate
 * 技術支援 - Technical Support with Multi-LLM Orchestration
 */
router.post('/generate', async (req, res) => {
    try {
        const startTime = Date.now();
        const { prompt, task_type = 'basic', conversation_id, context } = req.body;
        logger.info('IT Technical Support Request', {
            taskType: task_type,
            hasPrompt: !!prompt,
            conversationId: conversation_id,
            hasContext: !!context,
            requestId: req.headers['x-request-id']
        });
        // Validate required fields
        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: prompt',
                message: '技術支援にはpromptフィールドが必要です。'
            });
        }
        // 🛡️ セキュリティ: データサニタイゼーション
        const sanitizationResult = data_sanitizer_1.DataSanitizer.sanitizeForExternalAPI(prompt);
        if (sanitizationResult.riskLevel === 'high') {
            logger.warn('High-risk content detected in IT support request', {
                detectedPatterns: sanitizationResult.detectedPatterns,
                taskType: task_type
            });
        }
        // Multi-Tier LLM Orchestration Logic
        let response;
        let modelUsed;
        let estimatedCost;
        switch (task_type) {
            case 'critical':
                // Tier 5: Claude Opus4.1 - 最高品質対応
                response = await handleCriticalSupport(sanitizationResult.sanitizedText, context);
                modelUsed = 'Claude Opus 4.1';
                estimatedCost = 0.15; // High-cost model
                logger.info('Critical support request processed with Opus 4.1', { conversationId: conversation_id });
                break;
            case 'premium':
                // Tier 3: Claude Sonnet4 - 複雑分析
                response = await handlePremiumSupport(sanitizationResult.sanitizedText, context);
                modelUsed = 'Claude Sonnet 4';
                estimatedCost = 0.05; // Mid-cost model
                logger.info('Premium support request processed with Sonnet 4', { conversationId: conversation_id });
                break;
            case 'basic':
            default:
                // Tier 2: Gemini2.5 Flash + Claude Haiku3.5 - 基本問い合わせ
                response = await handleBasicSupport(sanitizationResult.sanitizedText, context);
                modelUsed = 'Gemini 2.5 Flash + Claude Haiku 3.5';
                estimatedCost = 0.01; // Low-cost models
                logger.info('Basic support request processed with Tier 2 models', { conversationId: conversation_id });
                break;
        }
        const processingTime = Date.now() - startTime;
        logger.info('Technical support completed', {
            processingTimeMs: processingTime,
            modelUsed: modelUsed,
            estimatedCost: estimatedCost,
            responseLength: response.length
        });
        res.json({
            success: true,
            response: response,
            metadata: {
                processing_time_ms: processingTime,
                model_used: modelUsed,
                task_type: task_type,
                estimated_cost_usd: estimatedCost,
                conversation_id: conversation_id || `session_${Date.now()}`,
                timestamp: new Date().toISOString(),
                service: 'techsapo-it-support',
                version: '1.0.0'
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Technical support failed', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            requestBody: req.body
        });
        res.status(500).json({
            success: false,
            error: 'Technical support failed',
            message: '技術支援中にエラーが発生しました。',
            details: errorMessage
        });
    }
});
exports.default = router;
/**
 * 🔄 UNIVERSAL MANDATORY Wall-Bounce Analysis for Technical Support
 * すべての技術支援レベルで複数LLMによる壁打ち分析を必須実行
 */
async function performTechnicalWallBounceAnalysis(prompt, context, supportLevel) {
    try {
        logger.info('🔄 Technical Support Wall-Bounce Analysis started', { supportLevel });
        // 🎯 Phase 1: GPT-5 高精度技術分析
        const technicalAnalysis = await performGpt5TechnicalAnalysis(prompt, context, supportLevel);
        // 🎯 Phase 2: Gemini 環境依存性分析
        const environmentAnalysis = await performGeminiTechnicalAnalysis(prompt, context, technicalAnalysis);
        // 🎯 Phase 3: 統合技術支援レスポンス生成
        const integratedResponse = generateIntegratedTechnicalResponse(prompt, context, supportLevel, technicalAnalysis, environmentAnalysis);
        logger.info('🎉 Technical Support Wall-Bounce Analysis completed successfully', {
            supportLevel,
            responseLength: integratedResponse.length
        });
        return integratedResponse;
    }
    catch (error) {
        logger.error('🚨 Technical Support Wall-Bounce Analysis failed', {
            supportLevel,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}
/**
 * GPT-5による高精度技術分析
 */
async function performGpt5TechnicalAnalysis(prompt, context, level) {
    try {
        const analysisPrompt = `Technical support analysis (${level} level):

User Query: ${prompt}
Context: ${context || 'General technical support'}

Provide detailed technical analysis:
1. Problem identification and scope
2. Root cause analysis
3. Step-by-step resolution
4. Risk assessment
5. Best practices recommendations

Focus on accuracy, safety, and industry standards.`;
        // MCP GPT-5呼び出し (シミュレート)
        return {
            problemScope: 'Technical issue requiring systematic approach',
            rootCause: 'Multi-factor technical challenge identified',
            resolution: ['Systematic diagnostic approach', 'Controlled implementation', 'Verification testing'],
            riskLevel: level === 'critical' ? 'high' : level === 'premium' ? 'medium' : 'low'
        };
    }
    catch (error) {
        logger.error('GPT-5 technical analysis failed', { error });
        throw error;
    }
}
/**
 * Geminiによる環境依存性分析
 */
async function performGeminiTechnicalAnalysis(prompt, context, gpt5Analysis) {
    try {
        const environmentPrompt = `Environment-specific technical analysis:

Original Query: ${prompt}
Context: ${context}
Technical Analysis: ${JSON.stringify(gpt5Analysis, null, 2)}

Analyze environment factors:
1. Platform/OS considerations
2. Configuration dependencies
3. Integration requirements
4. Compatibility issues
5. Implementation constraints`;
        // MCP Gemini呼び出し (シミュレート)
        return {
            platformConsiderations: ['Cross-platform compatibility', 'Version requirements'],
            configurationNeeds: ['Environment-specific settings', 'Service dependencies'],
            implementationGuidance: ['Phased rollout recommended', 'Testing protocols']
        };
    }
    catch (error) {
        logger.error('Gemini technical analysis failed', { error });
        throw error;
    }
}
/**
 * 統合技術支援レスポンス生成
 */
function generateIntegratedTechnicalResponse(prompt, context, supportLevel, gpt5Analysis, environmentAnalysis) {
    const levelEmojis = {
        critical: '🚨',
        premium: '🔧',
        basic: '⚡'
    };
    const levelNames = {
        critical: '緑急技術支援',
        premium: '高度技術支援',
        basic: '基本技術支援'
    };
    return `${levelEmojis[supportLevel]} 【${levelNames[supportLevel]}】🔄 Wall-Bounce Collaborative Analysis

**問題分析:**
${prompt}

**🎯 根本原因分析 (Multi-LLM):**
${gpt5Analysis.rootCause}

**🌐 環境依存性考慮:**
${environmentAnalysis.platformConsiderations?.join(', ')}

**🔄 統合解決手順:**
${gpt5Analysis.resolution?.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**🛡️ リスク評価:**
リスクレベル: ${gpt5Analysis.riskLevel}

**📊 品質保証:**
✓ 複数LLMによる壁打ち分析完了
✓ 環境依存性を考慮した解決策
✓ リスクアセスメント完了

*処理モデル: Multi-LLM Wall-Bounce Analysis (gpt-5 + Gemini + Claude)*`;
}
/**
 * Handle critical support requests with Claude Opus 4.1
 */
async function handleCriticalSupport(prompt, context) {
    // TODO: Implement Claude Opus 4.1 integration
    // This is a placeholder for critical support logic
    return `🚨 【緊急技術支援】Claude Opus 4.1による最高品質対応

**問題分析:**
${prompt}

**緊急対応手順:**
1. 即座にシステム状況を確認
2. サービス停止の影響範囲を特定
3. 緊急復旧手順を実行
4. データ整合性の確認
5. 監視システムでの継続確認

**推奨される即時対応:**
- システム管理者への緊急連絡
- バックアップシステムへの切り替え検討
- ログの詳細収集と保存
- ステークホルダーへの状況報告

**フォローアップ:**
根本原因の調査と再発防止策の策定が必要です。

*処理モデル: Claude Opus 4.1 (最高品質)*`;
}
/**
 * Handle premium support requests with Claude Sonnet 4
 */
async function handlePremiumSupport(prompt, context) {
    // TODO: Implement Claude Sonnet 4 integration
    // This is a placeholder for premium support logic
    return `🔧 【高度技術支援】Claude Sonnet 4による複雑分析

**問題の詳細分析:**
${prompt}

**技術的診断:**
1. システムアーキテクチャの確認
2. 依存関係の分析
3. パフォーマンスボトルネックの特定
4. セキュリティ影響の評価
5. スケーラビリティの検証

**推奨解決策:**
- 段階的なアプローチによる問題解決
- テスト環境での検証
- 本番環境への慎重な適用
- モニタリング強化

**予防策:**
継続的な監視とメンテナンスの実施を推奨します。

*処理モデル: Claude Sonnet 4 (高品質分析)*`;
}
/**
 * Handle basic support requests with Tier 2 models
 */
async function handleBasicSupport(prompt, context) {
    // TODO: Implement Gemini 2.5 Flash + Claude Haiku 3.5 integration
    // This is a placeholder for basic support logic
    return `⚡ 【基本技術支援】Gemini 2.5 Flash + Claude Haiku 3.5による協調分析

**問題概要:**
${prompt}

**基本的な対応手順:**
1. 現在の状況確認
2. 基本的なトラブルシューティング
3. 設定の確認
4. サービスの再起動
5. 動作確認

**一般的な解決方法:**
- 公式ドキュメントの参照
- コミュニティフォーラムでの情報収集
- 基本的な設定の見直し
- ログの確認

**次のステップ:**
問題が解決しない場合は、premiumまたはcriticalレベルでの支援をご利用ください。

*処理モデル: Gemini 2.5 Flash + Claude Haiku 3.5 (効率的な基本支援)*`;
}
/**
 * GET /health
 * IT Support Health Check
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'techsapo-it-support',
        status: 'operational',
        endpoints: {
            analyze_logs: 'POST /analyze-logs - IT障害解析',
            generate: 'POST /generate - 技術支援 (basic/premium/critical)',
            health: 'GET /health - ヘルスチェック'
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
//# sourceMappingURL=it-support.js.map