/**
 * Google Drive Push Notification Setup
 * GoogleDrive Push通知チャンネル設定・管理
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GoogleDriveConfig } from './googledrive-connector';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface PushChannelConfig {
  id: string;
  type: string;
  address: string;
  token?: string;
  expiration?: number;
  params?: {
    ttl?: number;
  };
}

export interface PushChannelResponse {
  kind: string;
  id: string;
  resourceId: string;
  resourceUri: string;
  token?: string;
  expiration: number;
}

export class GoogleDrivePushSetup {
  private oauth2Client: OAuth2Client;
  private drive: any;
  private baseUrl: string;

  constructor(
    private googleDriveConfig: GoogleDriveConfig,
    baseUrl?: string
  ) {
    // OAuth2 Client設定
    this.oauth2Client = new OAuth2Client(
      googleDriveConfig.clientId,
      googleDriveConfig.clientSecret,
      googleDriveConfig.redirectUri
    );

    this.oauth2Client.setCredentials({
      refresh_token: googleDriveConfig.refreshToken
    });

    // Google Drive API初期化
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });

    // Webhook受信用ベースURL
    this.baseUrl = baseUrl || process.env.WEBHOOK_BASE_URL || 'https://your-domain.com';

    logger.info('🔔 Google Drive Push Setup初期化完了', {
      baseUrl: this.baseUrl
    });
  }

  /**
   * 🔔 ファイル変更Push通知設定
   */
  async setupFilePushNotifications(
    folderId: string,
    ttlHours: number = 24 * 7 // 1週間
  ): Promise<PushChannelResponse> {
    try {
      logger.info('🔔 ファイル変更Push通知設定開始', {
        folderId,
        ttlHours
      });

      // チャンネル設定
      const channelConfig: PushChannelConfig = {
        id: `techsapo-files-${folderId}-${Date.now()}`,
        type: 'web_hook',
        address: `${this.baseUrl}/api/v1/webhooks/googledrive/notifications`,
        token: this.generateSecureToken(),
        expiration: Date.now() + (ttlHours * 60 * 60 * 1000),
        params: {
          ttl: ttlHours * 3600 // 秒単位
        }
      };

      // Push通知チャンネル作成
      const response = await this.drive.files.watch({
        fileId: folderId,
        requestBody: channelConfig,
        fields: 'kind,id,resourceId,resourceUri,token,expiration'
      });

      logger.info('✅ ファイル変更Push通知設定完了', {
        channelId: response.data.id,
        resourceId: response.data.resourceId,
        expiration: new Date(response.data.expiration).toISOString()
      });

      return response.data;

    } catch (error) {
      logger.error('❌ ファイル変更Push通知設定エラー', {
        folderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 📁 フォルダ変更Push通知設定（Changes API）
   */
  async setupFolderChangeNotifications(
    ttlHours: number = 24 * 7 // 1週間
  ): Promise<PushChannelResponse> {
    try {
      logger.info('📁 フォルダ変更Push通知設定開始', {
        ttlHours
      });

      // 開始ページトークン取得
      const startPageTokenResponse = await this.drive.changes.getStartPageToken();
      const startPageToken = startPageTokenResponse.data.startPageToken;

      // チャンネル設定
      const channelConfig: PushChannelConfig = {
        id: `techsapo-changes-${Date.now()}`,
        type: 'web_hook',
        address: `${this.baseUrl}/api/v1/webhooks/googledrive/notifications`,
        token: this.generateSecureToken(),
        expiration: Date.now() + (ttlHours * 60 * 60 * 1000)
      };

      // Changes API Push通知チャンネル作成
      const response = await this.drive.changes.watch({
        pageToken: startPageToken,
        requestBody: channelConfig,
        includeItemsFromAllDrives: false,
        supportsAllDrives: false,
        fields: 'kind,id,resourceId,resourceUri,token,expiration'
      });

      logger.info('✅ フォルダ変更Push通知設定完了', {
        channelId: response.data.id,
        resourceId: response.data.resourceId,
        startPageToken,
        expiration: new Date(response.data.expiration).toISOString()
      });

      return response.data;

    } catch (error) {
      logger.error('❌ フォルダ変更Push通知設定エラー', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 🔄 Push通知チャンネル更新
   */
  async renewPushChannel(
    channelId: string,
    resourceId: string,
    ttlHours: number = 24 * 7
  ): Promise<PushChannelResponse> {
    try {
      logger.info('🔄 Push通知チャンネル更新開始', {
        channelId,
        resourceId,
        ttlHours
      });

      // 既存チャンネル停止
      await this.stopPushChannel(channelId, resourceId);

      // 新しいチャンネル作成（フォルダ変更用）
      return await this.setupFolderChangeNotifications(ttlHours);

    } catch (error) {
      logger.error('❌ Push通知チャンネル更新エラー', {
        channelId,
        resourceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 🛑 Push通知チャンネル停止
   */
  async stopPushChannel(channelId: string, resourceId: string): Promise<void> {
    try {
      logger.info('🛑 Push通知チャンネル停止開始', {
        channelId,
        resourceId
      });

      await this.drive.channels.stop({
        requestBody: {
          id: channelId,
          resourceId: resourceId
        }
      });

      logger.info('✅ Push通知チャンネル停止完了', {
        channelId
      });

    } catch (error) {
      logger.error('❌ Push通知チャンネル停止エラー', {
        channelId,
        resourceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 🔍 アクティブなPush通知チャンネル一覧取得
   */
  async listActiveChannels(): Promise<{
    channels: Array<{
      id: string;
      resourceId: string;
      expiration: Date;
      isExpired: boolean;
    }>;
    totalCount: number;
    expiredCount: number;
  }> {
    try {
      // 注意: Google Drive APIにはチャンネル一覧取得APIがないため
      // アプリケーション側でチャンネル情報を管理する必要がある
      
      // ここでは設定例を示す（実際の実装では永続化が必要）
      const storedChannels = this.getStoredChannels();
      
      const channels = storedChannels.map(channel => ({
        ...channel,
        expiration: new Date(channel.expiration),
        isExpired: channel.expiration < Date.now()
      }));

      const expiredCount = channels.filter(c => c.isExpired).length;

      logger.info('📋 アクティブなPush通知チャンネル一覧', {
        totalCount: channels.length,
        expiredCount
      });

      return {
        channels,
        totalCount: channels.length,
        expiredCount
      };

    } catch (error) {
      logger.error('❌ Push通知チャンネル一覧取得エラー', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 🧹 期限切れチャンネル自動クリーンアップ
   */
  async cleanupExpiredChannels(): Promise<{
    cleaned: number;
    errors: number;
    details: Array<{
      channelId: string;
      status: 'cleaned' | 'error';
      error?: string;
    }>;
  }> {
    try {
      logger.info('🧹 期限切れチャンネル自動クリーンアップ開始');

      const { channels } = await this.listActiveChannels();
      const expiredChannels = channels.filter(c => c.isExpired);

      const results = {
        cleaned: 0,
        errors: 0,
        details: [] as Array<{
          channelId: string;
          status: 'cleaned' | 'error';
          error?: string;
        }>
      };

      for (const channel of expiredChannels) {
        try {
          await this.stopPushChannel(channel.id, channel.resourceId);
          
          results.cleaned++;
          results.details.push({
            channelId: channel.id,
            status: 'cleaned'
          });

        } catch (error) {
          results.errors++;
          results.details.push({
            channelId: channel.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info('✅ 期限切れチャンネル自動クリーンアップ完了', results);
      return results;

    } catch (error) {
      logger.error('❌ 期限切れチャンネル自動クリーンアップエラー', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 🔐 セキュアトークン生成
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 💾 保存されたチャンネル情報取得（実装例）
   */
  private getStoredChannels(): Array<{
    id: string;
    resourceId: string;
    expiration: number;
  }> {
    // 実際の実装では Redis/MySQL などから取得
    // ここでは例として環境変数から取得
    try {
      const storedData = process.env.GOOGLEDRIVE_PUSH_CHANNELS || '[]';
      return JSON.parse(storedData);
    } catch {
      return [];
    }
  }

  /**
   * 💾 チャンネル情報保存（実装例）
   */
  private saveChannelInfo(channel: PushChannelResponse): void {
    // 実際の実装では Redis/MySQL などに保存
    try {
      const currentChannels = this.getStoredChannels();
      const newChannel = {
        id: channel.id,
        resourceId: channel.resourceId,
        expiration: channel.expiration
      };
      
      currentChannels.push(newChannel);
      
      // 環境変数更新（実際の実装では永続化ストレージ使用）
      process.env.GOOGLEDRIVE_PUSH_CHANNELS = JSON.stringify(currentChannels);
      
      logger.debug('💾 チャンネル情報保存完了', { channelId: channel.id });
      
    } catch (error) {
      logger.error('❌ チャンネル情報保存エラー', {
        channelId: channel.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🔧 Push通知設定テスト
   */
  async testPushNotificationSetup(): Promise<{
    success: boolean;
    tests: Array<{
      name: string;
      status: 'passed' | 'failed';
      details?: any;
      error?: string;
    }>;
  }> {
    const tests = [];

    try {
      logger.info('🔧 Push通知設定テスト開始');

      // テスト1: OAuth認証確認
      try {
        const tokenInfo = await this.oauth2Client.getAccessToken();
        tests.push({
          name: 'OAuth Authentication',
          status: 'passed' as const,
          details: { hasToken: !!tokenInfo.token }
        });
      } catch (error) {
        tests.push({
          name: 'OAuth Authentication',
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // テスト2: Drive API接続確認
      try {
        const response = await this.drive.about.get({ fields: 'user' });
        tests.push({
          name: 'Drive API Connection',
          status: 'passed' as const,
          details: { user: response.data.user?.emailAddress }
        });
      } catch (error) {
        tests.push({
          name: 'Drive API Connection',
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // テスト3: Webhook URL確認
      try {
        const webhookUrl = `${this.baseUrl}/api/v1/webhooks/googledrive/notifications`;
        const urlValid = webhookUrl.startsWith('https://') || process.env.NODE_ENV === 'development';
        
        tests.push({
          name: 'Webhook URL Validation',
          status: urlValid ? 'passed' as const : 'failed' as const,
          details: { url: webhookUrl, isHttps: webhookUrl.startsWith('https://') },
          error: !urlValid ? 'Webhook URL must use HTTPS in production' : undefined
        });
      } catch (error) {
        tests.push({
          name: 'Webhook URL Validation',
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      const success = tests.every(test => test.status === 'passed');

      logger.info('✅ Push通知設定テスト完了', {
        success,
        passedTests: tests.filter(t => t.status === 'passed').length,
        failedTests: tests.filter(t => t.status === 'failed').length
      });

      return { success, tests };

    } catch (error) {
      logger.error('❌ Push通知設定テストエラー', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        tests: [{
          name: 'Push Notification Setup Test',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }

  /**
   * 🚀 簡単セットアップ（初回設定用）
   */
  async quickSetup(
    folderId?: string,
    ttlHours: number = 24 * 7
  ): Promise<{
    success: boolean;
    channels: PushChannelResponse[];
    message: string;
    nextSteps?: string[];
  }> {
    try {
      logger.info('🚀 Google Drive Push通知簡単セットアップ開始');

      const channels: PushChannelResponse[] = [];

      // 1. 全体変更通知設定
      const changeChannel = await this.setupFolderChangeNotifications(ttlHours);
      channels.push(changeChannel);

      // 2. 特定フォルダ監視（指定された場合）
      if (folderId) {
        const fileChannel = await this.setupFilePushNotifications(folderId, ttlHours);
        channels.push(fileChannel);
      }

      // チャンネル情報保存
      channels.forEach(channel => this.saveChannelInfo(channel));

      const message = `Push通知設定完了: ${channels.length}個のチャンネルを作成しました`;
      const nextSteps = [
        'Webhook URLがHTTPS対応か確認してください',
        '通知受信テストを実行してください',
        '24時間後にチャンネル期限を確認してください'
      ];

      logger.info('✅ Google Drive Push通知簡単セットアップ完了', {
        channelCount: channels.length,
        folderId: folderId || 'all_changes'
      });

      return {
        success: true,
        channels,
        message,
        nextSteps
      };

    } catch (error) {
      logger.error('❌ Google Drive Push通知簡単セットアップエラー', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        channels: [],
        message: 'Push通知設定に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }
}

export default GoogleDrivePushSetup;