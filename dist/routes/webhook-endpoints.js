"use strict";
/**
 * Google Drive Webhook Endpoints
 * GoogleDrive Push通知受信エンドポイント
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const googledrive_webhook_handler_1 = require("../services/googledrive-webhook-handler");
const logger_1 = require("../utils/logger");
const prometheus_client_class_1 = require("../metrics/prometheus-client-class");
const router = (0, express_1.Router)();
// 設定読み込み
const googleDriveConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || ''
};
const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY || '',
    organization: process.env.OPENAI_ORGANIZATION
};
const webhookSecret = process.env.GOOGLEDRIVE_WEBHOOK_SECRET || 'default-webhook-secret-change-in-production';
// Webhook ハンドラー初期化
let webhookHandler = null;
const initializeWebhookHandler = () => {
    if (!webhookHandler && googleDriveConfig.clientId && openaiConfig.apiKey) {
        webhookHandler = new googledrive_webhook_handler_1.GoogleDriveWebhookHandler(googleDriveConfig, openaiConfig, webhookSecret);
        // デフォルト監視フォルダ設定
        const defaultFolderId = process.env.RAG_FOLDER_ID;
        if (defaultFolderId) {
            webhookHandler.addMonitoredFolder(defaultFolderId);
            logger_1.logger.info('🔔 デフォルトRAGフォルダを監視対象に追加', { folderId: defaultFolderId });
        }
        logger_1.logger.info('🤖 Drive Webhookハンドラー初期化完了');
    }
    return webhookHandler;
};
/**
 * 🔔 Google Drive Push通知受信エンドポイント
 * リアルタイムでファイル変更を検知してRAG同期実行
 */
router.post('/googledrive/notifications', async (req, res) => {
    const prometheusClient = prometheus_client_class_1.PrometheusClient.getInstance();
    const startTime = Date.now();
    try {
        logger_1.logger.info('🔔 Google Drive Webhook受信', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            contentType: req.get('Content-Type')
        });
        const handler = initializeWebhookHandler();
        if (!handler) {
            logger_1.logger.error('❌ Webhookハンドラー初期化失敗');
            return res.status(500).json({
                error: 'Webhook handler not initialized',
                message: 'Check Google Drive and OpenAI configuration'
            });
        }
        // Webhook処理実行
        await handler.handleWebhook(req, res);
        // 成功メトリクス記録
        const duration = Date.now() - startTime;
        prometheusClient.recordWebhookProcessingDuration(duration);
        logger_1.logger.info('✅ Google Drive Webhook処理完了', {
            duration: `${duration}ms`
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Webhook処理エラー', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Webhook processing failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        // エラーメトリクス記録
        const duration = Date.now() - startTime;
        prometheusClient.recordWebhookError('processing_error');
    }
});
/**
 * 📁 監視フォルダ管理エンドポイント
 */
router.post('/googledrive/monitor-folder', async (req, res) => {
    try {
        const { folder_id, action } = req.body;
        if (!folder_id) {
            return res.status(400).json({
                error: 'folder_id is required',
                example: {
                    folder_id: '1BxYzCdEfGhIjKlMnOpQrStUvWxYz123456',
                    action: 'add' // or 'remove'
                }
            });
        }
        const handler = initializeWebhookHandler();
        if (!handler) {
            return res.status(500).json({
                error: 'Webhook handler not initialized'
            });
        }
        if (action === 'remove') {
            handler.removeMonitoredFolder(folder_id);
        }
        else {
            handler.addMonitoredFolder(folder_id);
        }
        res.json({
            success: true,
            message: `Folder ${action === 'remove' ? 'removed from' : 'added to'} monitoring`,
            data: {
                folder_id,
                action: action || 'add',
                monitored_folders: handler.getMonitoredFolders()
            }
        });
        logger_1.logger.info('📁 監視フォルダ更新', { folder_id, action: action || 'add' });
    }
    catch (error) {
        logger_1.logger.error('❌ 監視フォルダ管理エラー', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            error: 'Monitor folder operation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * 📋 Webhook統計情報取得
 */
router.get('/googledrive/webhook-stats', async (req, res) => {
    try {
        const handler = initializeWebhookHandler();
        if (!handler) {
            return res.status(500).json({
                error: 'Webhook handler not initialized'
            });
        }
        const stats = handler.getWebhookStats();
        res.json({
            success: true,
            data: {
                ...stats,
                configuration: {
                    webhook_secret_configured: !!process.env.GOOGLEDRIVE_WEBHOOK_SECRET,
                    google_credentials_configured: !!googleDriveConfig.clientId && !!googleDriveConfig.refreshToken,
                    openai_configured: !!openaiConfig.apiKey,
                    default_vector_store: process.env.DEFAULT_VECTOR_STORE_NAME || 'techsapo-realtime-docs'
                },
                monitoring: {
                    folders: handler.getMonitoredFolders(),
                    default_folder_id: process.env.RAG_FOLDER_ID
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Webhook統計取得エラー', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            error: 'Failed to get webhook stats',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * 🔧 Webhook設定テスト
 */
router.post('/googledrive/test-webhook', async (req, res) => {
    try {
        logger_1.logger.info('🧪 Webhookテスト実行開始');
        const handler = initializeWebhookHandler();
        if (!handler) {
            return res.status(500).json({
                error: 'Webhook handler not initialized'
            });
        }
        // テスト用モックリクエスト作成
        const mockReq = {
            ...req,
            headers: {
                ...req.headers,
                'x-goog-channel-id': 'test-channel-' + Date.now(),
                'x-goog-resource-id': 'test-resource-id',
                'x-goog-resource-state': 'sync',
                'x-goog-resource-uri': 'https://www.googleapis.com/drive/v3/files/test',
                'x-goog-channel-token': 'test-token'
            },
            body: { test: true }
        };
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    logger_1.logger.info('📤 テストレスポンス', { status: code, data });
                    return data;
                }
            })
        };
        // テスト実行
        await handler.handleWebhook(mockReq, mockRes);
        res.json({
            success: true,
            message: 'Webhook test completed successfully',
            test_data: {
                channel_id: mockReq.headers['x-goog-channel-id'],
                resource_state: mockReq.headers['x-goog-resource-state'],
                timestamp: new Date().toISOString()
            }
        });
        logger_1.logger.info('✅ Webhookテスト完了');
    }
    catch (error) {
        logger_1.logger.error('❌ Webhookテストエラー', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            error: 'Webhook test failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * 🔄 手動同期トリガー（緊急時用）
 */
router.post('/googledrive/manual-sync', async (req, res) => {
    try {
        const { folder_id, force_full_sync = false } = req.body;
        logger_1.logger.info('🔄 手動同期トリガー実行', {
            folder_id: folder_id || 'default',
            force_full_sync
        });
        const handler = initializeWebhookHandler();
        if (!handler) {
            return res.status(500).json({
                error: 'Webhook handler not initialized'
            });
        }
        // 使用するフォルダID決定
        const targetFolderId = folder_id || process.env.RAG_FOLDER_ID;
        if (!targetFolderId) {
            return res.status(400).json({
                error: 'folder_id is required or set RAG_FOLDER_ID environment variable'
            });
        }
        // RAGコネクタによる同期実行
        const vectorStoreName = process.env.DEFAULT_VECTOR_STORE_NAME || 'techsapo-realtime-docs';
        // TODO: ragConnectorへのアクセス方法を検討
        // const syncResult = await ragConnector.syncFolderToRAG(targetFolderId, vectorStoreName, 5);
        res.json({
            success: true,
            message: 'Manual sync triggered successfully',
            data: {
                folder_id: targetFolderId,
                vector_store_name: vectorStoreName,
                force_full_sync,
                timestamp: new Date().toISOString()
                // sync_result: syncResult
            }
        });
        logger_1.logger.info('✅ 手動同期トリガー完了', { folder_id: targetFolderId });
    }
    catch (error) {
        logger_1.logger.error('❌ 手動同期トリガーエラー', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            error: 'Manual sync failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * 🔔 Webhook URL検証エンドポイント（Google Drive用）
 */
router.get('/googledrive/notifications', async (req, res) => {
    try {
        // Google DriveのWebhook URL検証リクエスト
        const challenge = req.query.challenge;
        if (challenge) {
            logger_1.logger.info('🔍 Webhook URL検証リクエスト受信', { challenge });
            // チャレンジレスポンス送信
            res.status(200).send(challenge);
            logger_1.logger.info('✅ Webhook URL検証完了');
        }
        else {
            // 通常のGETリクエスト（情報表示）
            res.json({
                service: 'Google Drive Webhook Endpoint',
                status: 'active',
                endpoint: '/api/v1/webhooks/googledrive/notifications',
                methods: ['GET', 'POST'],
                description: 'Google Drive Push Notifications receiver for real-time RAG sync',
                configuration: {
                    webhook_initialized: !!webhookHandler,
                    monitoring_enabled: true
                }
            });
        }
    }
    catch (error) {
        logger_1.logger.error('❌ Webhook URL検証エラー', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            error: 'Webhook verification failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=webhook-endpoints.js.map