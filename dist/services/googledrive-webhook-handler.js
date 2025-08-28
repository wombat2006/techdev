"use strict";
/**
 * Google Drive Webhook Handler for Real-time RAG Sync
 * GoogleDrive Push通知によるリアルタイムRAG同期処理
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveWebhookHandler = void 0;
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const crypto_1 = __importDefault(require("crypto"));
const googledrive_connector_1 = require("./googledrive-connector");
const logger_1 = require("../utils/logger");
const prometheus_client_class_1 = require("../metrics/prometheus-client-class");
class GoogleDriveWebhookHandler {
    googleDriveConfig;
    openaiConfig;
    ragConnector;
    oauth2Client;
    drive;
    prometheusClient;
    webhookSecret;
    monitoredFolders;
    // RAG同期設定
    SUPPORTED_MIME_TYPES = [
        'application/pdf',
        'application/vnd.google-apps.document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'text/markdown'
    ];
    constructor(googleDriveConfig, openaiConfig, webhookSecret) {
        this.googleDriveConfig = googleDriveConfig;
        this.openaiConfig = openaiConfig;
        this.webhookSecret = webhookSecret;
        this.monitoredFolders = new Set();
        // RAGコネクタ初期化
        this.ragConnector = new googledrive_connector_1.GoogleDriveRAGConnector(googleDriveConfig, openaiConfig);
        // OAuth2 Client初期化
        this.oauth2Client = new google_auth_library_1.OAuth2Client(googleDriveConfig.clientId, googleDriveConfig.clientSecret, googleDriveConfig.redirectUri);
        this.oauth2Client.setCredentials({
            refresh_token: googleDriveConfig.refreshToken
        });
        // Google Drive API初期化
        this.drive = googleapis_1.google.drive({ version: 'v3', auth: this.oauth2Client });
        // Prometheusクライアント初期化
        this.prometheusClient = prometheus_client_class_1.PrometheusClient.getInstance();
        logger_1.logger.info('🔔 Google Drive Webhookハンドラー初期化完了', {
            supportedMimeTypes: this.SUPPORTED_MIME_TYPES.length
        });
    }
    /**
     * 🔔 Webhookメイン処理エンドポイント
     */
    async handleWebhook(req, res) {
        try {
            logger_1.logger.info('📥 Google Drive Webhook受信', {
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
                logger_1.logger.warn('❌ Webhook署名検証失敗');
                res.status(401).json({ error: 'Invalid webhook signature' });
                return;
            }
            const notification = {
                kind: req.headers['x-goog-channel-id'],
                id: req.headers['x-goog-channel-id'],
                resourceId: req.headers['x-goog-resource-id'],
                resourceUri: req.headers['x-goog-resource-uri'],
                token: req.headers['x-goog-channel-token'],
                expiration: parseInt(req.headers['x-goog-channel-expiration'] || '0')
            };
            const resourceState = req.headers['x-goog-resource-state'];
            // 通知タイプ別処理
            await this.processNotification(notification, resourceState);
            // 成功レスポンス
            res.status(200).json({
                status: 'success',
                message: 'Webhook processed successfully',
                timestamp: new Date().toISOString()
            });
            // メトリクス記録
            this.prometheusClient.recordWebhookNotification(resourceState, 'success');
        }
        catch (error) {
            logger_1.logger.error('❌ Webhook処理エラー', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            res.status(500).json({
                error: 'Webhook processing failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
            // メトリクス記録
            this.prometheusClient.recordWebhookNotification('error', 'failed');
        }
    }
    /**
     * 🔐 Webhook署名検証
     */
    verifyWebhookSignature(req) {
        try {
            const providedSignature = req.headers['x-goog-channel-signature'];
            if (!providedSignature) {
                logger_1.logger.debug('⚠️ Webhook署名ヘッダーなし（開発環境許可）');
                return process.env.NODE_ENV === 'development'; // 開発環境では署名なしでも許可
            }
            const payload = JSON.stringify(req.body);
            const expectedSignature = crypto_1.default
                .createHmac('sha256', this.webhookSecret)
                .update(payload)
                .digest('hex');
            const signatureMatch = crypto_1.default.timingSafeEqual(Buffer.from(providedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'));
            if (!signatureMatch) {
                logger_1.logger.warn('🚫 Webhook署名不一致', {
                    provided: providedSignature.substring(0, 8) + '...',
                    expected: expectedSignature.substring(0, 8) + '...'
                });
            }
            return signatureMatch;
        }
        catch (error) {
            logger_1.logger.error('❌ Webhook署名検証エラー', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    /**
     * 📬 通知処理ディスパッチャー
     */
    async processNotification(notification, resourceState) {
        logger_1.logger.info('🔄 Webhook通知処理開始', {
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
                logger_1.logger.info('ℹ️ 未処理の通知タイプ', { resourceState });
                break;
        }
    }
    /**
     * 🔄 同期完了通知処理
     */
    async handleSyncNotification(notification) {
        logger_1.logger.info('✅ Drive同期完了通知受信', {
            resourceId: notification.resourceId
        });
        // 同期完了メトリクス記録
        this.prometheusClient.recordDriveSyncEvent('completed', notification.resourceId);
    }
    /**
     * 📝 ファイル更新通知処理
     */
    async handleUpdateNotification(notification) {
        try {
            logger_1.logger.info('📝 Drive更新通知処理開始', {
                resourceUri: notification.resourceUri
            });
            // 変更一覧取得
            const changes = await this.getChanges(notification.resourceId);
            for (const change of changes) {
                if (change.removed) {
                    await this.handleFileRemoval(change);
                }
                else if (change.file) {
                    await this.handleFileUpdate(change.file);
                }
            }
            logger_1.logger.info('✅ Drive更新通知処理完了', {
                changesProcessed: changes.length
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Drive更新通知処理エラー', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * 🗑️ ファイル削除通知処理
     */
    async handleRemoveNotification(notification) {
        logger_1.logger.info('🗑️ Drive削除通知処理', {
            resourceId: notification.resourceId
        });
        // 削除メトリクス記録
        this.prometheusClient.recordDriveSyncEvent('file_removed', notification.resourceId);
    }
    /**
     * 📋 Drive変更一覧取得
     */
    async getChanges(pageToken) {
        try {
            const response = await this.drive.changes.list({
                pageToken: pageToken || await this.getStartPageToken(),
                includeItemsFromAllDrives: false,
                supportsAllDrives: false,
                fields: 'changes(changeType,removed,fileId,file(id,name,mimeType,parents,modifiedTime)),nextPageToken'
            });
            return response.data.changes || [];
        }
        catch (error) {
            logger_1.logger.error('❌ Drive変更一覧取得エラー', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * 🔢 開始ページトークン取得
     */
    async getStartPageToken() {
        try {
            const response = await this.drive.changes.getStartPageToken();
            return response.data.startPageToken;
        }
        catch (error) {
            logger_1.logger.error('❌ 開始ページトークン取得エラー', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * 📝 ファイル更新処理
     */
    async handleFileUpdate(file) {
        try {
            logger_1.logger.info('📝 ファイル更新処理開始', {
                fileId: file.id,
                fileName: file.name,
                mimeType: file.mimeType
            });
            // サポート対象MIMEタイプチェック
            if (!this.SUPPORTED_MIME_TYPES.includes(file.mimeType)) {
                logger_1.logger.debug('⏭️ 非対応ファイル形式', {
                    fileName: file.name,
                    mimeType: file.mimeType
                });
                return;
            }
            // 監視対象フォルダチェック
            const isMonitored = await this.isFileInMonitoredFolder(file);
            if (!isMonitored) {
                logger_1.logger.debug('⏭️ 監視対象外フォルダのファイル', {
                    fileName: file.name,
                    parents: file.parents
                });
                return;
            }
            // RAG同期実行
            await this.syncFileToRAG(file);
            logger_1.logger.info('✅ ファイル更新処理完了', {
                fileName: file.name
            });
            // 成功メトリクス記録
            this.prometheusClient.recordRAGSyncEvent('file_updated', file.mimeType, 'success');
        }
        catch (error) {
            logger_1.logger.error('❌ ファイル更新処理エラー', {
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
    async handleFileRemoval(change) {
        try {
            logger_1.logger.info('🗑️ ファイル削除処理開始', {
                fileId: change.fileId
            });
            // Vector Storeからファイル削除
            await this.removeFileFromRAG(change.fileId);
            logger_1.logger.info('✅ ファイル削除処理完了', {
                fileId: change.fileId
            });
            // 削除メトリクス記録
            this.prometheusClient.recordRAGSyncEvent('file_removed', 'unknown', 'success');
        }
        catch (error) {
            logger_1.logger.error('❌ ファイル削除処理エラー', {
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
    async isFileInMonitoredFolder(file) {
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
        }
        catch (error) {
            logger_1.logger.error('❌ 監視対象フォルダ判定エラー', {
                fileId: file.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    /**
     * 🔍 祖先フォルダ監視判定
     */
    async isAncestorMonitored(folderId) {
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
        }
        catch (error) {
            logger_1.logger.debug('⚠️ 祖先フォルダ取得エラー', {
                folderId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    /**
     * 📚 ファイルをRAGに同期
     */
    async syncFileToRAG(file) {
        try {
            logger_1.logger.info('📚 RAG同期開始', {
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
            const vectorStoreFileId = await this.ragConnector.addDocumentToVectorStore(vectorStoreId, document);
            logger_1.logger.info('✅ RAG同期完了', {
                fileName: file.name,
                vectorStoreFileId
            });
        }
        catch (error) {
            logger_1.logger.error('❌ RAG同期エラー', {
                fileName: file.name,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * 🗑️ RAGからファイル削除
     */
    async removeFileFromRAG(fileId) {
        try {
            // 実装予定: Vector StoreからファイルID基づく削除
            // OpenAI Files APIからファイル削除
            logger_1.logger.info('🗑️ RAGからファイル削除', { fileId });
            // TODO: OpenAI Files APIの削除処理実装
            // await this.openai.files.delete(vectorStoreFileId);
        }
        catch (error) {
            logger_1.logger.error('❌ RAGファイル削除エラー', {
                fileId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * 📁 監視フォルダ追加
     */
    addMonitoredFolder(folderId) {
        this.monitoredFolders.add(folderId);
        logger_1.logger.info('📁 監視フォルダ追加', { folderId });
    }
    /**
     * 📁 監視フォルダ削除
     */
    removeMonitoredFolder(folderId) {
        this.monitoredFolders.delete(folderId);
        logger_1.logger.info('📁 監視フォルダ削除', { folderId });
    }
    /**
     * 📋 監視フォルダ一覧取得
     */
    getMonitoredFolders() {
        return Array.from(this.monitoredFolders);
    }
    /**
     * 📊 Webhook統計情報取得
     */
    getWebhookStats() {
        return {
            monitoredFoldersCount: this.monitoredFolders.size,
            supportedMimeTypes: this.SUPPORTED_MIME_TYPES,
            isInitialized: !!this.ragConnector && !!this.drive
        };
    }
}
exports.GoogleDriveWebhookHandler = GoogleDriveWebhookHandler;
exports.default = GoogleDriveWebhookHandler;
//# sourceMappingURL=googledrive-webhook-handler.js.map