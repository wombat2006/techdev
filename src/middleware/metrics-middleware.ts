/**
 * Express Prometheus Metrics Middleware
 * HTTPリクエストの自動メトリクス収集
 */

import { Request, Response, NextFunction } from 'express';
import { recordHttpRequest, recordError } from '../metrics/prometheus-client';
import { logger } from '../utils/logger';

/**
 * HTTP リクエスト計測ミドルウェア
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // リクエストサイズ計算
  const requestSize = req.get('content-length') ? parseInt(req.get('content-length')!, 10) : 0;

  // レスポンス終了時の処理
  const originalSend = res.send;
  let responseSize = 0;

  res.send = function(body: any): Response {
    if (body) {
      responseSize = Buffer.byteLength(body, 'utf8');
    }
    return originalSend.call(this, body);
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = getRoutePattern(req.path);
    
    // メトリクス記録
    recordHttpRequest(
      req.method,
      route,
      res.statusCode,
      duration,
      requestSize,
      responseSize
    );

    // エラーレスポンスの場合はエラーメトリクスも記録
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      const severity = res.statusCode >= 500 ? 'high' : 'medium';
      
      recordError(errorType, severity, 'http_api');
    }

    // 詳細ログ
    logger.debug('📊 HTTP metrics recorded', {
      method: req.method,
      route,
      status: res.statusCode,
      duration_ms: duration,
      request_size: requestSize,
      response_size: responseSize,
      user_agent: req.get('user-agent')?.substring(0, 50)
    });
  });

  next();
}

/**
 * パスからルートパターンを抽出
 * 動的パラメータを正規化してカーディナリティを制御
 */
function getRoutePattern(path: string): string {
  // 既知のAPIパターンをマッピング
  const routePatterns = [
    { pattern: /^\/api\/v1\/generate$/, route: '/api/v1/generate' },
    { pattern: /^\/api\/v1\/analyze-logs$/, route: '/api/v1/analyze-logs' },
    { pattern: /^\/api\/v1\/rag\/search$/, route: '/api/v1/rag/search' },
    { pattern: /^\/api\/v1\/rag\/status$/, route: '/api/v1/rag/status' },
    { pattern: /^\/api\/v1\/health$/, route: '/api/v1/health' },
    { pattern: /^\/health$/, route: '/health' },
    { pattern: /^\/metrics$/, route: '/metrics' },
    // 動的パラメータを含むパターン
    { pattern: /^\/api\/v1\/sessions\/[^/]+$/, route: '/api/v1/sessions/:id' },
    { pattern: /^\/api\/v1\/users\/[^/]+$/, route: '/api/v1/users/:id' },
    { pattern: /^\/api\/v1\/projects\/[^/]+\/analysis$/, route: '/api/v1/projects/:id/analysis' },
  ];

  for (const { pattern, route } of routePatterns) {
    if (pattern.test(path)) {
      return route;
    }
  }

  // 未知のパスは汎用的なパターンに分類
  if (path.startsWith('/api/v1/')) {
    return '/api/v1/*';
  } else if (path.startsWith('/api/')) {
    return '/api/*';
  } else if (path.startsWith('/static/') || path.startsWith('/assets/')) {
    return '/static/*';
  }

  return path;
}

/**
 * エラーハンドリングミドルウェア (メトリクス収集機能付き)
 */
export function metricsErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // エラータイプ分類
  let errorType = 'unknown_error';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  if (error.type === 'entity.parse.failed') {
    errorType = 'json_parse_error';
    severity = 'low';
  } else if (error.name === 'ValidationError') {
    errorType = 'validation_error';
    severity = 'low';
  } else if (error.name === 'UnauthorizedError') {
    errorType = 'auth_error';
    severity = 'medium';
  } else if (error.name === 'TimeoutError') {
    errorType = 'timeout_error';
    severity = 'high';
  } else if (error.code === 'ECONNREFUSED') {
    errorType = 'connection_error';
    severity = 'high';
  } else if (error.statusCode >= 500 || !error.statusCode) {
    errorType = 'server_error';
    severity = 'critical';
  }

  // エラーメトリクス記録
  recordError(errorType, severity, 'express_app');

  logger.error('🚨 Application error captured', {
    error_type: errorType,
    severity,
    message: error.message,
    stack: error.stack?.substring(0, 500),
    path: req.path,
    method: req.method,
    user_agent: req.get('user-agent')
  });

  next(error);
}

/**
 * Wall-bounce分析用メトリクス収集ヘルパー
 */
export class WallBounceMetricsCollector {
  private static instance: WallBounceMetricsCollector;
  private analysisStartTimes: Map<string, number> = new Map();

  static getInstance(): WallBounceMetricsCollector {
    if (!WallBounceMetricsCollector.instance) {
      WallBounceMetricsCollector.instance = new WallBounceMetricsCollector();
    }
    return WallBounceMetricsCollector.instance;
  }

  startAnalysis(sessionId: string): void {
    this.analysisStartTimes.set(sessionId, Date.now());
  }

  endAnalysis(sessionId: string, result: any): void {
    const startTime = this.analysisStartTimes.get(sessionId);
    if (!startTime) {
      logger.warn('⚠️ Wall-bounce analysis start time not found', { sessionId });
      return;
    }

    const duration = Date.now() - startTime;
    this.analysisStartTimes.delete(sessionId);

    // 詳細メトリクス記録は prometheus-client.ts の recordWallBounceAnalysis で実行
    logger.debug('📊 Wall-bounce analysis metrics collected', {
      sessionId,
      duration_ms: duration,
      confidence: result.consensus?.confidence,
      providers: result.debug?.providers_used?.length,
      cost: result.total_cost
    });
  }
}

/**
 * 健康状態チェック用メトリクス更新
 */
export function updateHealthMetrics(): void {
  const used = process.memoryUsage();
  
  // Node.js プロセスメトリクス
  import('../metrics/prometheus-client').then(({ memoryUsage }) => {
    memoryUsage.set({ component: 'heap_used' }, used.heapUsed);
    memoryUsage.set({ component: 'heap_total' }, used.heapTotal);
    memoryUsage.set({ component: 'external' }, used.external);
    memoryUsage.set({ component: 'rss' }, used.rss);
  }).catch(error => {
    logger.error('❌ Failed to update health metrics', { error });
  });
}

// 定期的な健康状態メトリクス更新
setInterval(updateHealthMetrics, 30000); // 30秒間隔

logger.info('🔧 Prometheus metrics middleware initialized', {
  auto_collection: true,
  error_tracking: true,
  health_monitoring: true
});
