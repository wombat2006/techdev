/**
 * Google Drive Push Notification Setup Endpoints
 * GoogleDrive Push通知設定・管理エンドポイント
 */

import { Router, Request, Response } from 'express';
import { GoogleDrivePushSetup } from '../services/googledrive-push-setup';
import { GoogleDriveConfig } from '../services/googledrive-connector';
import { logger } from '../utils/logger';

const router = Router();

// 設定読み込み
const googleDriveConfig: GoogleDriveConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob',
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN || ''
};

// Push Setup クライアント初期化
let pushSetup: GoogleDrivePushSetup | null = null;

const initializePushSetup = () => {
  if (!pushSetup && googleDriveConfig.clientId) {
    const baseUrl = process.env.WEBHOOK_BASE_URL || `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${process.env.PORT || 4000}`;
    pushSetup = new GoogleDrivePushSetup(googleDriveConfig, baseUrl);
    logger.info('🔔 Push Setup初期化完了');
  }
  return pushSetup;
};

/**
 * 🚀 簡単セットアップ（初回設定用）
 */
router.post('/googledrive/setup', async (req: Request, res: Response) => {
  try {
    const { folder_id, ttl_hours = 168 } = req.body; // デフォルト1週間

    logger.info('🚀 Push通知簡単セットアップ開始', {
      folder_id: folder_id || 'all_changes',
      ttl_hours
    });

    const setup = initializePushSetup();
    if (!setup) {
      return res.status(500).json({
        error: 'Push setup not initialized',
        message: 'Check Google Drive configuration'
      });
    }

    const result = await setup.quickSetup(folder_id, ttl_hours);

    res.json({
      success: result.success,
      message: result.message,
      data: {
        channels: result.channels.map(channel => ({
          id: channel.id,
          resource_id: channel.resourceId,
          resource_uri: channel.resourceUri,
          expiration: new Date(channel.expiration).toISOString(),
          expires_in_hours: Math.round((channel.expiration - Date.now()) / (1000 * 60 * 60))
        })),
        webhook_endpoint: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:4000'}/api/v1/webhooks/googledrive/notifications`,
        configuration: {
          folder_monitoring: folder_id ? 'specific_folder' : 'all_changes',
          ttl_hours,
          auto_renewal: false // 今後実装予定
        }
      },
      next_steps: result.nextSteps
    });

    logger.info('✅ Push通知簡単セットアップ完了');

  } catch (error) {
    logger.error('❌ Push通知簡単セットアップエラー', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Push notification setup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🔧 Push通知設定テスト
 */
router.get('/googledrive/test-setup', async (req: Request, res: Response) => {
  try {
    logger.info('🔧 Push通知設定テスト開始');

    const setup = initializePushSetup();
    if (!setup) {
      return res.status(500).json({
        error: 'Push setup not initialized'
      });
    }

    const testResult = await setup.testPushNotificationSetup();

    res.json({
      success: testResult.success,
      message: testResult.success 
        ? 'All push notification setup tests passed' 
        : 'Some push notification setup tests failed',
      data: {
        test_results: testResult.tests,
        summary: {
          total_tests: testResult.tests.length,
          passed: testResult.tests.filter(t => t.status === 'passed').length,
          failed: testResult.tests.filter(t => t.status === 'failed').length
        },
        environment: {
          node_env: process.env.NODE_ENV,
          webhook_base_url: process.env.WEBHOOK_BASE_URL,
          google_credentials_configured: !!googleDriveConfig.clientId && !!googleDriveConfig.refreshToken,
          ssl_required: process.env.NODE_ENV === 'production'
        }
      },
      recommendations: testResult.success ? [] : [
        'Ensure Google Drive credentials are properly configured',
        'Verify webhook base URL is accessible via HTTPS in production',
        'Check OAuth token refresh mechanism'
      ]
    });

  } catch (error) {
    logger.error('❌ Push通知設定テストエラー', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Push notification setup test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📋 アクティブなPush通知チャンネル一覧
 */
router.get('/googledrive/channels', async (req: Request, res: Response) => {
  try {
    logger.info('📋 Push通知チャンネル一覧取得開始');

    const setup = initializePushSetup();
    if (!setup) {
      return res.status(500).json({
        error: 'Push setup not initialized'
      });
    }

    const channelInfo = await setup.listActiveChannels();

    res.json({
      success: true,
      data: {
        channels: channelInfo.channels.map(channel => ({
          id: channel.id,
          resource_id: channel.resourceId,
          expiration: channel.expiration.toISOString(),
          is_expired: channel.isExpired,
          expires_in_hours: Math.round((channel.expiration.getTime() - Date.now()) / (1000 * 60 * 60)),
          status: channel.isExpired ? 'expired' : 'active'
        })),
        summary: {
          total_channels: channelInfo.totalCount,
          active_channels: channelInfo.totalCount - channelInfo.expiredCount,
          expired_channels: channelInfo.expiredCount,
          needs_cleanup: channelInfo.expiredCount > 0
        }
      }
    });

  } catch (error) {
    logger.error('❌ Push通知チャンネル一覧取得エラー', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to list push notification channels',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🔄 Push通知チャンネル更新
 */
router.post('/googledrive/channels/:channelId/renew', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { resource_id, ttl_hours = 168 } = req.body;

    if (!resource_id) {
      return res.status(400).json({
        error: 'resource_id is required',
        example: {
          resource_id: 'channel_resource_id_here',
          ttl_hours: 168
        }
      });
    }

    logger.info('🔄 Push通知チャンネル更新開始', {
      channelId,
      resource_id,
      ttl_hours
    });

    const setup = initializePushSetup();
    if (!setup) {
      return res.status(500).json({
        error: 'Push setup not initialized'
      });
    }

    const newChannel = await setup.renewPushChannel(channelId, resource_id, ttl_hours);

    res.json({
      success: true,
      message: 'Push notification channel renewed successfully',
      data: {
        old_channel_id: channelId,
        new_channel: {
          id: newChannel.id,
          resource_id: newChannel.resourceId,
          resource_uri: newChannel.resourceUri,
          expiration: new Date(newChannel.expiration).toISOString(),
          expires_in_hours: Math.round((newChannel.expiration - Date.now()) / (1000 * 60 * 60))
        }
      }
    });

    logger.info('✅ Push通知チャンネル更新完了', {
      oldChannelId: channelId,
      newChannelId: newChannel.id
    });

  } catch (error) {
    logger.error('❌ Push通知チャンネル更新エラー', {
      channelId: req.params.channelId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Push notification channel renewal failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🛑 Push通知チャンネル停止
 */
router.delete('/googledrive/channels/:channelId', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { resource_id } = req.body;

    if (!resource_id) {
      return res.status(400).json({
        error: 'resource_id is required'
      });
    }

    logger.info('🛑 Push通知チャンネル停止開始', {
      channelId,
      resource_id
    });

    const setup = initializePushSetup();
    if (!setup) {
      return res.status(500).json({
        error: 'Push setup not initialized'
      });
    }

    await setup.stopPushChannel(channelId, resource_id);

    res.json({
      success: true,
      message: 'Push notification channel stopped successfully',
      data: {
        channel_id: channelId,
        resource_id,
        stopped_at: new Date().toISOString()
      }
    });

    logger.info('✅ Push通知チャンネル停止完了', { channelId });

  } catch (error) {
    logger.error('❌ Push通知チャンネル停止エラー', {
      channelId: req.params.channelId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Push notification channel stop failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🧹 期限切れチャンネル自動クリーンアップ
 */
router.post('/googledrive/cleanup', async (req: Request, res: Response) => {
  try {
    logger.info('🧹 期限切れチャンネル自動クリーンアップ開始');

    const setup = initializePushSetup();
    if (!setup) {
      return res.status(500).json({
        error: 'Push setup not initialized'
      });
    }

    const cleanupResult = await setup.cleanupExpiredChannels();

    res.json({
      success: cleanupResult.cleaned > 0 || cleanupResult.errors === 0,
      message: `Cleanup completed: ${cleanupResult.cleaned} channels cleaned, ${cleanupResult.errors} errors`,
      data: {
        summary: {
          channels_cleaned: cleanupResult.cleaned,
          errors_encountered: cleanupResult.errors,
          total_processed: cleanupResult.cleaned + cleanupResult.errors
        },
        details: cleanupResult.details,
        cleanup_timestamp: new Date().toISOString()
      },
      recommendations: cleanupResult.errors > 0 ? [
        'Review error details for failed cleanup operations',
        'Consider manual cleanup for persistent errors'
      ] : []
    });

    logger.info('✅ 期限切れチャンネル自動クリーンアップ完了', {
      cleaned: cleanupResult.cleaned,
      errors: cleanupResult.errors
    });

  } catch (error) {
    logger.error('❌ 期限切れチャンネル自動クリーンアップエラー', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Expired channels cleanup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * ℹ️ Push通知設定情報取得
 */
router.get('/googledrive/info', async (req: Request, res: Response) => {
  try {
    res.json({
      service: 'Google Drive Push Notification Setup',
      status: 'active',
      configuration: {
        webhook_base_url: process.env.WEBHOOK_BASE_URL || 'not_configured',
        webhook_endpoint: '/api/v1/webhooks/googledrive/notifications',
        setup_endpoint: '/api/v1/webhook-setup/googledrive/setup',
        google_credentials_configured: !!googleDriveConfig.clientId && !!googleDriveConfig.refreshToken,
        environment: process.env.NODE_ENV || 'development'
      },
      capabilities: [
        'Real-time file change notifications',
        'Automatic RAG sync on document updates',
        'Channel management and renewal',
        'Expired channel cleanup',
        'Push notification testing'
      ],
      endpoints: {
        setup: 'POST /googledrive/setup',
        test: 'GET /googledrive/test-setup',
        channels: 'GET /googledrive/channels',
        renew: 'POST /googledrive/channels/:channelId/renew',
        stop: 'DELETE /googledrive/channels/:channelId',
        cleanup: 'POST /googledrive/cleanup',
        info: 'GET /googledrive/info'
      },
      requirements: {
        webhook_url: 'HTTPS URL accessible from Google servers',
        google_credentials: 'Valid OAuth2 client credentials and refresh token',
        permissions: 'Google Drive API read access',
        ssl_certificate: 'Required in production environment'
      }
    });

  } catch (error) {
    logger.error('❌ Push通知設定情報取得エラー', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get push notification setup info',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;