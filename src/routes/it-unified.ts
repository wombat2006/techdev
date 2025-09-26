/**
 * IT Unified Support Endpoint
 * 単一エンドポイントでログ解析と技術支援を統合処理
 */

import express, { Request, Response } from 'express';
import winston from 'winston';
import { LogAnalyzer } from '../services/log-analyzer';
import { handleCriticalSupport, handlePremiumSupport, handleBasicSupport } from './it-support';
import { DataSanitizer } from '../utils/data-sanitizer';

const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'techsapo-it-unified' },
  transports: [
    new winston.transports.File({ filename: 'logs/it-unified.log' }),
    new winston.transports.Console()
  ]
});

interface ITUnifiedRequest {
  // 🔄 ログ解析用フィールド (Wall-Bounce Analysis対象)
  user_command?: string;
  error_output?: string;
  system_context?: string;
  log_type?: 'systemd' | 'application' | 'kernel' | 'nginx' | 'mysql' | 'general';
  
  // 💡 技術支援用フィールド  
  prompt?: string;
  task_type?: 'basic' | 'premium' | 'critical';
  conversation_id?: string;
  
  // 🎯 処理タイプ指定 (オプショナル - 自動検出あり)
  request_type?: 'log_analysis' | 'technical_support' | 'auto_detect';
}

interface ITUnifiedResponse {
  success: boolean;
  request_type: string;
  log_analysis?: any;
  technical_support?: any;
  recommendations?: string[];
  metadata: {
    processing_time_ms: number;
    timestamp: string;
    service: string;
    version: string;
  };
}

/**
 * POST /
 * 統合IT支援エンドポイント - ログ解析と技術支援を単一エンドポイントで処理
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const requestData = req.body as ITUnifiedRequest;
    
    logger.info('IT Unified Support Request', {
      requestType: requestData.request_type,
      hasErrorOutput: !!requestData.error_output,
      hasPrompt: !!requestData.prompt,
      taskType: requestData.task_type,
      systemContext: requestData.system_context,
      requestId: req.headers['x-request-id']
    });

    // 🎯 Enhanced Request Type Detection with Wall-Bounce Support
    let requestType: string = requestData.request_type || 'auto_detect';
    
    // 🔄 Auto-detect if request_type is missing or set to auto_detect
    if (!requestData.request_type || requestType === 'auto_detect') {
      requestType = detectRequestType(requestData);
      logger.info('🎯 Request type auto-detected', { detectedType: requestType });
    }

    const response: ITUnifiedResponse = {
      success: true,
      request_type: requestType,
      metadata: {
        processing_time_ms: 0,
        timestamp: new Date().toISOString(),
        service: 'techsapo-it-unified',
        version: '1.0.0'
      }
    };

    switch (requestType) {
      case 'log_analysis':
        response.log_analysis = await handleLogAnalysis(requestData);
        response.recommendations = generateLogRecommendations(response.log_analysis);
        break;

      case 'technical_support':
        response.technical_support = await handleTechnicalSupport(requestData);
        response.recommendations = generateSupportRecommendations(response.technical_support);
        break;

      default:
        throw new Error(`Unsupported request type: ${requestType}`);
    }

    response.metadata.processing_time_ms = Date.now() - startTime;

    logger.info('IT Unified Support completed', {
      requestType: response.request_type,
      processingTimeMs: response.metadata.processing_time_ms,
      hasLogAnalysis: !!response.log_analysis,
      hasTechnicalSupport: !!response.technical_support
    });

    res.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    logger.error('IT Unified Support failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: req.body
    });

    res.status(500).json({
      success: false,
      error: 'IT Unified Support failed',
      message: 'IT支援処理中にエラーが発生しました。',
      details: errorMessage,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'techsapo-it-unified',
        version: '1.0.0'
      }
    });
  }
});

/**
 * 🎯 Enhanced Request Type Auto-Detection with Wall-Bounce Support
 */
function detectRequestType(requestData: ITUnifiedRequest): string {
  // 🔍 Priority 1: error_outputがある場合はログ解析として扱う (壁打ち分析対象)
  if (requestData.error_output) {
    logger.info('🔄 Auto-detected as log_analysis - Wall-bounce analysis will be applied');
    return 'log_analysis';
  }
  
  // 🔍 Priority 2: promptがある場合は技術支援として扱う
  if (requestData.prompt) {
    logger.info('💡 Auto-detected as technical_support');
    return 'technical_support';
  }
  
  // 🔍 Priority 3: user_commandがある場合はログ解析として扱う
  if (requestData.user_command) {
    logger.info('⚡ Auto-detected as log_analysis based on user_command');
    return 'log_analysis';
  }
  
  // 両方ともない場合はエラー
  throw new Error('Cannot detect request type. Please provide either error_output/user_command for log analysis or prompt for technical support');
}

/**
 * ログ解析処理
 */
async function handleLogAnalysis(requestData: ITUnifiedRequest) {
  if (!requestData.error_output) {
    throw new Error('error_output is required for log analysis');
  }

  const analysisResult = await LogAnalyzer.analyzeLogs({
    user_command: requestData.user_command,
    error_output: requestData.error_output,
    system_context: requestData.system_context,
    log_type: requestData.log_type
  });

  return {
    type: 'log_analysis',
    analysis: analysisResult,
    summary: `${analysisResult.problem_category} (信頼度: ${Math.round(analysisResult.confidence_score * 100)}%)`,
    urgent_action_required: analysisResult.severity_level === 'critical' || analysisResult.severity_level === 'high'
  };
}

/**
 * 技術支援処理
 */
async function handleTechnicalSupport(requestData: ITUnifiedRequest) {
  if (!requestData.prompt) {
    throw new Error('prompt is required for technical support');
  }

  const taskType = requestData.task_type || 'basic';
  
  // 🛡️ セキュリティ: データサニタイゼーション
  const sanitizationResult = DataSanitizer.sanitizeForExternalAPI(requestData.prompt);
  if (sanitizationResult.riskLevel === 'high') {
    logger.warn('High-risk content detected in technical support request', {
      detectedPatterns: sanitizationResult.detectedPatterns,
      taskType: taskType
    });
  }

  let response: string;
  let modelUsed: string;
  let estimatedCost: number;

  switch (taskType) {
    case 'critical':
      response = await handleCriticalSupport(sanitizationResult.sanitizedText, requestData.system_context);
      modelUsed = 'Claude Opus 4.1';
      estimatedCost = 0.15;
      break;

    case 'premium':
      response = await handlePremiumSupport(sanitizationResult.sanitizedText, requestData.system_context);
      modelUsed = 'Claude Sonnet 4';
      estimatedCost = 0.05;
      break;

    case 'basic':
    default:
      response = await handleBasicSupport(sanitizationResult.sanitizedText, requestData.system_context);
      modelUsed = 'Gemini 2.5 Flash + Claude Haiku 3.5';
      estimatedCost = 0.01;
      break;
  }

  return {
    type: 'technical_support',
    response: response,
    task_type: taskType,
    model_used: modelUsed,
    estimated_cost_usd: estimatedCost,
    conversation_id: requestData.conversation_id || `session_${Date.now()}`,
    summary: `${taskType.toUpperCase()}レベルの技術支援を${modelUsed}で処理`
  };
}

/**
 * ログ解析結果に基づく推奨事項生成
 */
function generateLogRecommendations(logAnalysis: any): string[] {
  const recommendations: string[] = [];
  
  if (logAnalysis && logAnalysis.analysis) {
    const analysis = logAnalysis.analysis;
    
    // 緊急度に基づく推奨事項
    if (analysis.severity_level === 'critical') {
      recommendations.push('🚨 緊急対応が必要です。システム管理者に即座に連絡してください。');
      recommendations.push('📋 incident response procedureに従って対処してください。');
    } else if (analysis.severity_level === 'high') {
      recommendations.push('⚠️ 高優先度の問題です。速やかな対処をお勧めします。');
      recommendations.push('📊 システムリソースの監視を強化してください。');
    }

    // 解決策に基づく推奨事項
    if (analysis.solution_steps && analysis.solution_steps.length > 0) {
      recommendations.push(`🔧 ${analysis.solution_steps.length}つの解決手順が提案されています。順次実行してください。`);
    }

    // 関連サービスに基づく推奨事項
    if (analysis.related_services && analysis.related_services.length > 0) {
      recommendations.push(`🔗 関連サービス(${analysis.related_services.join(', ')})の状況も確認してください。`);
    }

    // 信頼度が低い場合の推奨事項
    if (analysis.confidence_score < 0.7) {
      recommendations.push('❓ 分析の信頼度が低いため、追加情報の提供を検討してください。');
      recommendations.push('💡 premium または critical レベルでの技術支援をお勧めします。');
    }
  }

  return recommendations;
}

/**
 * 技術支援結果に基づく推奨事項生成
 */
function generateSupportRecommendations(technicalSupport: any): string[] {
  const recommendations: string[] = [];
  
  if (technicalSupport) {
    const taskType = technicalSupport.task_type;
    
    // タスクタイプに基づく推奨事項
    switch (taskType) {
      case 'critical':
        recommendations.push('🚨 緊急対応が完了しました。フォローアップ監視を継続してください。');
        recommendations.push('📝 インシデントレポートの作成をお勧めします。');
        break;

      case 'premium':
        recommendations.push('✅ 高品質な分析が完了しました。提案された手順に従って実行してください。');
        recommendations.push('🔍 実行後は結果をモニタリングしてください。');
        break;

      case 'basic':
        recommendations.push('💡 基本的な支援が完了しました。問題が解決しない場合は上位レベルをご利用ください。');
        recommendations.push('📚 関連ドキュメントの確認もお勧めします。');
        break;
    }

    // コストに関する推奨事項
    if (technicalSupport.estimated_cost_usd > 0.1) {
      recommendations.push(`💰 推定コスト: $${technicalSupport.estimated_cost_usd} - 高品質モデルを使用しました。`);
    }

    // 継続的な会話の推奨
    if (technicalSupport.conversation_id) {
      recommendations.push(`🔄 会話ID: ${technicalSupport.conversation_id} - 追加質問時にご利用ください。`);
    }
  }

  return recommendations;
}

/**
 * GET /health
 * IT Unified Support Health Check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'techsapo-it-unified',
    status: 'operational',
    features: {
      log_analysis: 'ログ解析とトラブルシューティング',
      technical_support: 'Multi-LLM技術支援 (basic/premium/critical)',
      auto_detection: 'リクエストタイプの自動判別',
      unified_endpoint: '単一エンドポイントでの統合処理'
    },
    usage: {
      log_analysis: 'POST / with error_output field',
      technical_support: 'POST / with prompt field',
      auto_detection: 'POST / with request_type: "auto_detect"'
    },
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;