/**
 * Express Prometheus Metrics Middleware
 * HTTPリクエストの自動メトリクス収集
 */
import { Request, Response, NextFunction } from 'express';
/**
 * HTTP リクエスト計測ミドルウェア
 */
export declare function metricsMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * エラーハンドリングミドルウェア (メトリクス収集機能付き)
 */
export declare function metricsErrorHandler(error: any, req: Request, res: Response, next: NextFunction): void;
/**
 * Wall-bounce分析用メトリクス収集ヘルパー
 */
export declare class WallBounceMetricsCollector {
    private static instance;
    private analysisStartTimes;
    static getInstance(): WallBounceMetricsCollector;
    startAnalysis(sessionId: string): void;
    endAnalysis(sessionId: string, result: any): void;
}
/**
 * 健康状態チェック用メトリクス更新
 */
export declare function updateHealthMetrics(): void;
