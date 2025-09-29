/**
 * Google Drive Webhook Handler for Real-time RAG Sync
 * GoogleDrive Push通知によるリアルタイムRAG同期処理
 */

import { Request } from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { GoogleDriveRAGConnector, GoogleDriveConfig, OpenAIConfig } from './googledrive-connector';
import { logger } from '../utils/logger';
import { PrometheusClient } from '../metrics/prometheus-client-class';
import {
  rememberDriveVectorMapping,
  resolveDriveVectorMapping,
  clearDriveVectorMapping
} from './googledrive-vector-mapping';

export interface WebhookNotification {
  kind: string;
  id: string;
  resourceId: string;
  resourceUri: string;
  token: string;
  expiration: number;
}

export interface DriveChangeEvent {
  kind: string;
  changeId: string;
  time: string;
  removed: boolean;
  fileId: string;
  file?: {
    id: string;
    name: string;
    mimeType: string;
    parents: string[];
    modifiedTime: string;
  };
}

export class GoogleDriveWebhookHandler {
  private ragConnector: GoogleDriveRAGConnector;
  private oauth2Client: OAuth2Client;
  private drive: any;
  private prometheusClient: PrometheusClient;
  private webhookSecret: string;
  private monitoredFolders: Set<string>;
  // RAG同期設定
  private readonly SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.google-apps.document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'text/markdown'
  ];

  constructor(
    private googleDriveConfig: GoogleDriveConfig,
    private openaiConfig: OpenAIConfig,
    webhookSecret: string
  ) {
    this.webhookSecret = webhookSecret;
    this.monitoredFolders = new Set();
    
    // RAGコネクタ初期化
    this.ragConnector = new GoogleDriveRAGConnector(googleDriveConfig, openaiConfig);
    
    // OAuth2 Client初期化
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
    
    // Prometheusクライアント初期化
    this.prometheusClient = PrometheusClient.getInstance();

    logger.info('🔔 Google Drive Webhookハンドラー初期化完了', {
      supportedMimeTypes: this.SUPPORTED_MIME_TYPES.length
    });
  }

  /**
   * 🔔 Webhookメイン処理エンドポイント
   */
  async handleWebhook(req: Request): Promise<{ status: number; body: any }> {
    try {
      logger.info('📥 Google Drive Webhook受信', {
        headers: {
          'x-goog-channel-id': req.headers['x-goog-channel-id'],
          'x-goog-resource-id': req.headers['x-goog-resource-id'],
          'x-goog-resource-state': req.headers['x-goog-resource-state'],
          'x-goog-resource-uri': req.headers['x-goog-resource-uri']
        },
        body: req.body
      });

      // Webhook認証検証
      if (!this.verifyWebhookSignature(req)) {
        logger.warn('❌ Webhook署名検証失敗');
        return {
          status: 401,
          body: { error: 'Invalid webhook signature' }
        };
      }

      const notification: WebhookNotification = {
        kind: req.headers['x-goog-channel-id'] as string,
        id: req.headers['x-goog-channel-id'] as string,
        resourceId: req.headers['x-goog-resource-id'] as string,
        resourceUri: req.headers['x-goog-resource-uri'] as string,
        token: req.headers['x-goog-channel-token'] as string,
        expiration: parseInt(req.headers['x-goog-channel-expiration'] as string || '0')
      };

      const resourceState = req.headers['x-goog-resource-state'] as string;

      // 通知タイプ別処理
      await this.processNotification(notification, resourceState);

      this.prometheusClient.recordWebhookNotification(resourceState, 'success');

      // 成功レスポンス
      return {
        status: 200,
        body: {
          status: 'success',
          message: 'Webhook processed successfully',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ Webhook処理エラー', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      this.prometheusClient.recordWebhookNotification('error', 'failed');

      return {
        status: 500,
        body: {
          error: 'Webhook processing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * 🔐 Webhook署名検証
   */
  private verifyWebhookSignature(req: Request): boolean {
    try {
      const providedSignature = req.headers['x-goog-channel-signature'] as string;
      if (!providedSignature) {
        logger.debug('⚠️ Webhook署名ヘッダーなし（開発環境許可）');
        return process.env.NODE_ENV === 'development'; // 開発環境では署名なしでも許可
      }

      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const signatureMatch = crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!signatureMatch) {
        logger.warn('🚫 Webhook署名不一致', {
          provided: providedSignature.substring(0, 8) + '...',
          expected: expectedSignature.substring(0, 8) + '...'
        });
      }

      return signatureMatch;

    } catch (error) {
      logger.error('❌ Webhook署名検証エラー', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * 📬 通知処理ディスパッチャー
   */
  private async processNotification(
    notification: WebhookNotification, 
    resourceState: string
  ): Promise<void> {
    logger.info('🔄 Webhook通知処理開始', {
      resourceState,
      resourceId: notification.resourceId
    });

    switch (resourceState) {
      case 'sync':
        // 初期同期完了通知
        await this.handleSyncNotification(notification);
        break;
        
      case 'update':
        // ファイル更新通知
        await this.handleUpdateNotification(notification);
        break;
        
      case 'remove':
        // ファイル削除通知
        await this.handleRemoveNotification(notification);
        break;
        
      default:
        logger.info('ℹ️ 未処理の通知タイプ', { resourceState });
        break;
    }
  }

  /**
   * 🔄 同期完了通知処理
   */
  private async handleSyncNotification(notification: WebhookNotification): Promise<void> {
    logger.info('✅ Drive同期完了通知受信', {
      resourceId: notification.resourceId
    });

    // 同期完了メトリクス記録
    this.prometheusClient.recordDriveSyncEvent('completed', notification.resourceId);
  }

  /**
   * 📝 ファイル更新通知処理
   */
  private async handleUpdateNotification(notification: WebhookNotification): Promise<void> {
    try {
      logger.info('📝 Drive更新通知処理開始', {
        resourceUri: notification.resourceUri
      });

      // 変更一覧取得
      const changes = await this.getChanges(notification.resourceId);
      
      for (const change of changes) {
        if (change.removed) {
          await this.handleFileRemoval(change);
        } else if (change.file) {
          await this.handleFileUpdate(change.file);
        }
      }

      logger.info('✅ Drive更新通知処理完了', {
        changesProcessed: changes.length
      });

    } catch (error) {
      logger.error('❌ Drive更新通知処理エラー', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 🗑️ ファイル削除通知処理
   */
  private async handleRemoveNotification(notification: WebhookNotification): Promise<void> {
    logger.info('🗑️ Drive削除通知処理', {
      resourceId: notification.resourceId
    });

    // 削除メトリクス記録
    this.prometheusClient.recordDriveSyncEvent('file_removed', notification.resourceId);
  }

  /**
   * 📋 Drive変更一覧取得
   */
  private async getChanges(pageToken?: string): Promise<DriveChangeEvent[]> {
    try {
      const response = await this.drive.changes.list({
        pageToken: pageToken || await this.getStartPageToken(),
        includeItemsFromAllDrives: false,
        supportsAllDrives: false,
        fields: 'changes(changeType,removed,fileId,file(id,name,mimeType,parents,modifiedTime)),nextPageToken'
      });

      return response.data.changes || [];

    } catch (error) {
      logger.error('❌ Drive変更一覧取得エラー', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 🔢 開始ページトークン取得
   */
  private async getStartPageToken(): Promise<string> {
    try {
      const response = await this.drive.changes.getStartPageToken();
      return response.data.startPageToken;
    } catch (error) {
      logger.error('❌ 開始ページトークン取得エラー', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 📝 ファイル更新処理
   */
  private async handleFileUpdate(file: any): Promise<void> {
    try {
      logger.info('📝 ファイル更新処理開始', {
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType
      });

      // サポート対象MIMEタイプチェック
      if (!this.SUPPORTED_MIME_TYPES.includes(file.mimeType)) {
        logger.debug('⏭️ 非対応ファイル形式', {
          fileName: file.name,
          mimeType: file.mimeType
        });
        return;
      }

      // 監視対象フォルダチェック
      const isMonitored = await this.isFileInMonitoredFolder(file);
      if (!isMonitored) {
        logger.debug('⏭️ 監視対象外フォルダのファイル', {
          fileName: file.name,
          parents: file.parents
        });
        return;
      }

      // RAG同期実行
      await this.syncFileToRAG(file);

      logger.info('✅ ファイル更新処理完了', {
        fileName: file.name
      });

      // 成功メトリクス記録
      this.prometheusClient.recordRAGSyncEvent('file_updated', file.mimeType, 'success');

    } catch (error) {
      logger.error('❌ ファイル更新処理エラー', {
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // エラーメトリクス記録
      this.prometheusClient.recordRAGSyncEvent('file_updated', file.mimeType, 'error');
      throw error;
    }
  }

  /**
   * 🗑️ ファイル削除処理
   */
  private async handleFileRemoval(change: DriveChangeEvent): Promise<void> {
    try {
      logger.info('🗑️ ファイル削除処理開始', {
        fileId: change.fileId
      });

      // Vector Storeからファイル削除
      await this.removeFileFromRAG(change.fileId);

      logger.info('✅ ファイル削除処理完了', {
        fileId: change.fileId
      });

      // 削除メトリクス記録
      this.prometheusClient.recordRAGSyncEvent('file_removed', 'unknown', 'success');

    } catch (error) {
      logger.error('❌ ファイル削除処理エラー', {
        fileId: change.fileId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // エラーメトリクス記録
      this.prometheusClient.recordRAGSyncEvent('file_removed', 'unknown', 'error');
      throw error;
    }
  }

  /**
   * 📁 監視対象フォルダ判定
   */
  private async isFileInMonitoredFolder(file: any): Promise<boolean> {
    try {
      if (!file.parents || file.parents.length === 0) {
        return false;
      }

      // 親フォルダが監視対象かチェック
      for (const parentId of file.parents) {
        if (this.monitoredFolders.has(parentId)) {
          return true;
        }
        
        // 祖先フォルダも再帰的にチェック
        const ancestorMonitored = await this.isAncestorMonitored(parentId);
        if (ancestorMonitored) {
          return true;
        }
      }

      return false;

    } catch (error) {
      logger.error('❌ 監視対象フォルダ判定エラー', {
        fileId: file.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * 🔍 祖先フォルダ監視判定
   */
  private async isAncestorMonitored(folderId: string): Promise<boolean> {
    try {
      const folder = await this.drive.files.get({
        fileId: folderId,
        fields: 'parents'
      });

      if (!folder.data.parents) {
        return false;
      }

      for (const parentId of folder.data.parents) {
        if (this.monitoredFolders.has(parentId)) {
          return true;
        }
        
        // 再帰的にチェック（最大5階層まで）
        const depth = 5;
        if (depth > 0) {
          return this.isAncestorMonitored(parentId);
        }
      }

      return false;

    } catch (error) {
      logger.debug('⚠️ 祖先フォルダ取得エラー', {
        folderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * 📚 ファイルをRAGに同期
   */
  private async syncFileToRAG(file: any): Promise<void> {
    try {
      logger.info('📚 RAG同期開始', {
        fileId: file.id,
        fileName: file.name
      });

      // ドキュメントダウンロード
      const document = await this.ragConnector.downloadDocument(file.id);

      // Vector Store名決定（環境変数またはデフォルト）
      const vectorStoreName = process.env.DEFAULT_VECTOR_STORE_NAME || 'techsapo-realtime-docs';

      // Vector Store取得または作成
      const vectorStoreId = await this.ragConnector.getOrCreateVectorStore(vectorStoreName);

      // ドキュメントをVector Storeに追加
      const vectorStoreFileId = await this.ragConnector.addDocumentToVectorStore(
        vectorStoreId,
        document
      );

      await rememberDriveVectorMapping(file.id, vectorStoreId, vectorStoreFileId);

      logger.info('✅ RAG同期完了', {
        fileName: file.name,
        vectorStoreFileId
      });

    } catch (error) {
      logger.error('❌ RAG同期エラー', {
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 🗑️ RAGからファイル削除
   */
  private async removeFileFromRAG(fileId: string): Promise<void> {
    try {
      const mapping = await resolveDriveVectorMapping(fileId);

      if (!mapping) {
        logger.warn('⚠️ RAG mapping not found for Drive file', { fileId });
        return;
      }

      await this.ragConnector.removeDocumentFromVectorStore(
        mapping.vectorStoreId,
        mapping.vectorStoreFileId
      );

      await clearDriveVectorMapping(fileId);

    } catch (error) {
      logger.error('❌ RAGファイル削除エラー', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 📁 監視フォルダ追加
   */
  addMonitoredFolder(folderId: string): void {
    this.monitoredFolders.add(folderId);
    logger.info('📁 監視フォルダ追加', { folderId });
  }

  /**
   * 📁 監視フォルダ削除
   */
  removeMonitoredFolder(folderId: string): void {
    this.monitoredFolders.delete(folderId);
    logger.info('📁 監視フォルダ削除', { folderId });
  }

  /**
   * 📋 監視フォルダ一覧取得
   */
  getMonitoredFolders(): string[] {
    return Array.from(this.monitoredFolders);
  }

  /**
   * 📊 Webhook統計情報取得
   */
  getWebhookStats(): {
    monitoredFoldersCount: number;
    supportedMimeTypes: string[];
    isInitialized: boolean;
  } {
    return {
      monitoredFoldersCount: this.monitoredFolders.size,
      supportedMimeTypes: this.SUPPORTED_MIME_TYPES,
      isInitialized: !!this.ragConnector && !!this.drive
    };
  }
}

export default GoogleDriveWebhookHandler;
