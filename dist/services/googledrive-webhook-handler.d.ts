/**
 * Google Drive Webhook Handler for Real-time RAG Sync
 * GoogleDrive Push通知によるリアルタイムRAG同期処理
 */
import { Request, Response } from 'express';
import { GoogleDriveConfig, OpenAIConfig } from './googledrive-connector';
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
export declare class GoogleDriveWebhookHandler {
    private googleDriveConfig;
    private openaiConfig;
    private ragConnector;
    private oauth2Client;
    private drive;
    private prometheusClient;
    private webhookSecret;
    private monitoredFolders;
    private readonly SUPPORTED_MIME_TYPES;
    constructor(googleDriveConfig: GoogleDriveConfig, openaiConfig: OpenAIConfig, webhookSecret: string);
    /**
     * 🔔 Webhookメイン処理エンドポイント
     */
    handleWebhook(req: Request, res: Response): Promise<void>;
    /**
     * 🔐 Webhook署名検証
     */
    private verifyWebhookSignature;
    /**
     * 📬 通知処理ディスパッチャー
     */
    private processNotification;
    /**
     * 🔄 同期完了通知処理
     */
    private handleSyncNotification;
    /**
     * 📝 ファイル更新通知処理
     */
    private handleUpdateNotification;
    /**
     * 🗑️ ファイル削除通知処理
     */
    private handleRemoveNotification;
    /**
     * 📋 Drive変更一覧取得
     */
    private getChanges;
    /**
     * 🔢 開始ページトークン取得
     */
    private getStartPageToken;
    /**
     * 📝 ファイル更新処理
     */
    private handleFileUpdate;
    /**
     * 🗑️ ファイル削除処理
     */
    private handleFileRemoval;
    /**
     * 📁 監視対象フォルダ判定
     */
    private isFileInMonitoredFolder;
    /**
     * 🔍 祖先フォルダ監視判定
     */
    private isAncestorMonitored;
    /**
     * 📚 ファイルをRAGに同期
     */
    private syncFileToRAG;
    /**
     * 🗑️ RAGからファイル削除
     */
    private removeFileFromRAG;
    /**
     * 📁 監視フォルダ追加
     */
    addMonitoredFolder(folderId: string): void;
    /**
     * 📁 監視フォルダ削除
     */
    removeMonitoredFolder(folderId: string): void;
    /**
     * 📋 監視フォルダ一覧取得
     */
    getMonitoredFolders(): string[];
    /**
     * 📊 Webhook統計情報取得
     */
    getWebhookStats(): {
        monitoredFoldersCount: number;
        supportedMimeTypes: string[];
        isInitialized: boolean;
    };
}
export default GoogleDriveWebhookHandler;
