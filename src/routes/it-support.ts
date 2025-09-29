/**
 * IT Support Endpoints
 * Specialized endpoints for IT engineers and system administrators
 */

import express, { Request, Response } from 'express';
import winston from 'winston';
import { LogAnalyzer } from '../services/log-analyzer';
import { DataSanitizer } from '../utils/data-sanitizer';

const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'techsapo-it-support' },
  transports: [
    new winston.transports.File({ filename: 'logs/it-support.log' }),
    new winston.transports.Console()
  ]
});

interface ITGenerateRequest {
  prompt: string;
  task_type: 'basic' | 'premium' | 'critical';
  conversation_id?: string;
  context?: string;
}

/**
 * POST /analyze-logs
 * IT障害解析 - Log Analysis for IT Troubleshooting
 */
router.post('/analyze-logs', async (req: Request, res: Response) => {
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
    const analysisResult = await LogAnalyzer.analyzeLogs({
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

  } catch (error) {
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
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { prompt, task_type = 'basic', conversation_id, context } = req.body as ITGenerateRequest;

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
    const sanitizationResult = DataSanitizer.sanitizeForExternalAPI(prompt);
    if (sanitizationResult.riskLevel === 'high') {
      logger.warn('High-risk content detected in IT support request', {
        detectedPatterns: sanitizationResult.detectedPatterns,
        taskType: task_type
      });
    }

    // Multi-Tier LLM Orchestration Logic
    let response: string;
    let modelUsed: string;
    let estimatedCost: number;

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

  } catch (error) {
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

export default router;

/**
 * 🔄 UNIVERSAL MANDATORY Wall-Bounce Analysis for Technical Support
 * すべての技術支援レベルで複数LLMによる壁打ち分析を必須実行
 */
/**
 * Handle critical support requests with Claude Opus 4.1
 */
export async function handleCriticalSupport(prompt: string, context?: string): Promise<string> {
  // TODO: Implement Claude Opus 4.1 integration
  // This is a placeholder for critical support logic
  
  return `🚨 【緊急技術支援】Claude Opus 4.1による最高品質対応

**問題分析:**
${prompt}

**提供されたコンテキスト:**
${context ?? '※追加情報は提供されていません'}

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
export async function handlePremiumSupport(prompt: string, context?: string): Promise<string> {
  // TODO: Implement Claude Sonnet 4 integration
  // This is a placeholder for premium support logic
  
  return `🔧 【高度技術支援】Claude Sonnet 4による複雑分析

**問題の詳細分析:**
${prompt}

**提供されたコンテキスト:**
${context ?? '※追加情報は提供されていません'}

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
export async function handleBasicSupport(prompt: string, context?: string): Promise<string> {
  // TODO: Implement Gemini 2.5 Flash + Claude Haiku 3.5 integration
  // This is a placeholder for basic support logic
  
  return `⚡ 【基本技術支援】Gemini 2.5 Flash + Claude Haiku 3.5による協調分析

**問題概要:**
${prompt}

**提供されたコンテキスト:**
${context ?? '※追加情報は提供されていません'}

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
router.get('/health', (req: Request, res: Response) => {
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
