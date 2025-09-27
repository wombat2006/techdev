/**
 * Google Drive Webhook Endpoints
 * GoogleDrive Push通知受信エンドポイント
 */

import { Router, Request, Response } from 'express';
import { GoogleDriveWebhookHandler } from '../services/googledrive-webhook-handler';
import { GoogleDriveRAGConnector, GoogleDriveConfig, OpenAIConfig } from '../services/googledrive-connector';
import { runManualDriveSync } from '../services/googledrive-manual-sync';
import { warmDriveVectorMappings } from '../services/googledrive-vector-mapping';
import { logger } from '../utils/logger';
import { PrometheusClient } from '../metrics/prometheus-client-class';

const router = Router();

// 設定読み込み
const googleDriveConfig: GoogleDriveConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob',
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN || ''
};

const openaiConfig: OpenAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  organization: process.env.OPENAI_ORGANIZATION
};

const webhookSecret = process.env.GOOGLEDRIVE_WEBHOOK_SECRET;

// Webhook ハンドラー初期化
let webhookHandler: GoogleDriveWebhookHandler | null = null;
let ragConnector: GoogleDriveRAGConnector | null = null;
let mappingWarmPromise: Promise<number> | null = null;

const initializeWebhookHandler = () => {
  if (!webhookSecret) {
    logger.error('❌ Google Drive webhook secret is not configured');
    return null;
  }

  if (!webhookHandler && googleDriveConfig.clientId && openaiConfig.apiKey) {
    webhookHandler = new GoogleDriveWebhookHandler(
      googleDriveConfig,
      openaiConfig,
      webhookSecret
    );

    // デフォルト監視フォルダ設定
    const defaultFolderId = process.env.RAG_FOLDER_ID;
    if (defaultFolderId) {
      webhookHandler.addMonitoredFolder(defaultFolderId);
      logger.info('🔔 デフォルトRAGフォルダを監視対象に追加', { folderId: defaultFolderId });
    }

    logger.info('🤖 Drive Webhookハンドラー初期化完了');

    if (!mappingWarmPromise) {
      mappingWarmPromise = warmDriveVectorMappings()
        .then(count => {
          logger.info('🔥 Drive vector mapping cache warmed', { entries: count });
          return count;
        })
        .catch(error => {
          logger.warn('⚠️ Failed to warm Drive vector mapping cache', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return 0;
        });
    }
  }
  return webhookHandler;
};

const getRagConnector = (): GoogleDriveRAGConnector | null => {
  if (ragConnector) {
    return ragConnector;
  }

  if (!googleDriveConfig.clientId || !googleDriveConfig.refreshToken || !openaiConfig.apiKey) {
    logger.error('❌ Google Drive/OpenAI credentials are not fully configured for manual sync');
    return null;
  }

  try {
    ragConnector = new GoogleDriveRAGConnector(googleDriveConfig, openaiConfig);
    logger.info('📂 Google Drive RAG connector initialised for manual sync');
  } catch (error) {
    logger.error('❌ Failed to initialise Google Drive RAG connector', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    ragConnector = null;
  }

  return ragConnector;
};

/**
 * 🔔 Google Drive Push通知受信エンドポイント
 * リアルタイムでファイル変更を検知してRAG同期実行
 */
router.post('/googledrive/notifications', async (req: Request, res: Response) => {
  const prometheusClient = PrometheusClient.getInstance();
  const startTime = Date.now();

  try {
    logger.info('🔔 Google Drive Webhook受信', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type')
    });

    const handler = initializeWebhookHandler();
    if (!handler) {
      logger.error('❌ Webhookハンドラー初期化失敗');
      return res.status(500).json({
        error: 'Webhook handler not initialized',
        message: 'Check Google Drive and OpenAI configuration'
      });
    }

    // Webhook処理実行 (HTTPレスポンス生成はルート側で担当)
    const result = await handler.handleWebhook(req);

    const duration = Date.now() - startTime;
    if (result.status < 500) {
      prometheusClient.recordWebhookProcessingDuration(duration);
      logger.info('✅ Google Drive Webhook処理完了', {
        duration: `${duration}ms`
      });
    }

    res.status(result.status).json(result.body);

  } catch (error) {
    logger.error('❌ Webhook処理エラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    prometheusClient.recordWebhookError('processing_error');
  }
});

/**
 * 📁 監視フォルダ管理エンドポイント
 */
router.post('/googledrive/monitor-folder', async (req: Request, res: Response) => {
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
    } else {
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

    logger.info('📁 監視フォルダ更新', { folder_id, action: action || 'add' });

  } catch (error) {
    logger.error('❌ 監視フォルダ管理エラー', {
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
router.get('/googledrive/webhook-stats', async (req: Request, res: Response) => {
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

  } catch (error) {
    logger.error('❌ Webhook統計取得エラー', {
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
router.post('/googledrive/test-webhook', async (req: Request, res: Response) => {
  try {
    logger.info('🧪 Webhookテスト実行開始');

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
    } as unknown as Request;

    // テスト実行
    const result = await handler.handleWebhook(mockReq);
    logger.info('📤 テストレスポンス', { status: result.status, data: result.body });

    res.status(result.status).json({
      success: true,
      message: 'Webhook test completed successfully',
      test_data: {
        channel_id: mockReq.headers['x-goog-channel-id'],
        resource_state: mockReq.headers['x-goog-resource-state'],
        timestamp: new Date().toISOString()
      },
      handler_response: result.body
    });

    logger.info('✅ Webhookテスト完了');

  } catch (error) {
    logger.error('❌ Webhookテストエラー', {
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
router.post('/googledrive/manual-sync', async (req: Request, res: Response) => {
  try {
    const { folder_id, force_full_sync = false, batch_size, dry_run = false } = req.body;

    logger.info('🔄 手動同期トリガー実行', { 
      folder_id: folder_id || 'default',
      force_full_sync,
      batch_size
    });

    const handler = initializeWebhookHandler();
    if (!handler) {
      return res.status(500).json({
        error: 'Webhook handler not initialized'
      });
    }

    const connector = getRagConnector();
    if (!connector) {
      return res.status(500).json({
        error: 'RAG connector not initialized',
        message: 'Check Google Drive and OpenAI credentials'
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
    const batchSize = typeof batch_size === 'number' && batch_size > 0 ? batch_size : 5;
    const syncResult = await runManualDriveSync({
      connector,
      folderId: targetFolderId,
      vectorStoreName,
      batchSize,
      dryRun: Boolean(dry_run)
    });

    if (!syncResult.dryRun && syncResult.failedCount > 0) {
      logger.warn('⚠️ Manual Drive sync completed with failures', {
        folderId: targetFolderId,
        processed: syncResult.processedCount,
        failed: syncResult.failedCount
      });
    } else {
      logger.info('✅ Manual Drive sync completed without failures', {
        folderId: targetFolderId,
        processed: syncResult.processedCount
      });
    }

    const statusCode = syncResult.dryRun
      ? 200
      : syncResult.failedCount > 0 && syncResult.processedCount > 0
        ? 207
        : syncResult.failedCount > 0
          ? 500
          : 200;

    res.status(statusCode).json({
      success: true,
      message: 'Manual sync triggered successfully',
      data: {
        folder_id: targetFolderId,
        vector_store_name: vectorStoreName,
        force_full_sync,
        dry_run: syncResult.dryRun,
        batch_size: syncResult.processedDocuments.length > 0 ? syncResult.batchSizeUsed : undefined,
        timestamp: new Date().toISOString(),
        sync_result: {
          vector_store_id: syncResult.vectorStoreId,
          processed: syncResult.processedCount,
          failed: syncResult.failedCount,
          failed_documents: syncResult.failedDocuments,
          processed_documents: syncResult.dryRun ? syncResult.processedDocuments : undefined
        }
      }
    });

    logger.info('✅ 手動同期トリガー完了', { folder_id: targetFolderId });

  } catch (error) {
    logger.error('❌ 手動同期トリガーエラー', {
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
router.get('/googledrive/notifications', async (req: Request, res: Response) => {
  try {
    // Google DriveのWebhook URL検証リクエスト
    const challenge = req.query.challenge as string;
    
    if (challenge) {
      logger.info('🔍 Webhook URL検証リクエスト受信', { challenge });
      
      // チャレンジレスポンス送信
      res.status(200).send(challenge);
      
      logger.info('✅ Webhook URL検証完了');
    } else {
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

  } catch (error) {
    logger.error('❌ Webhook URL検証エラー', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Webhook verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
