/**
 * Google Drive Push Notification Setup
 * GoogleDrive Push通知チャンネル設定・管理
 */
import { GoogleDriveConfig } from './googledrive-connector';
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
export declare class GoogleDrivePushSetup {
    private googleDriveConfig;
    private oauth2Client;
    private drive;
    private baseUrl;
    constructor(googleDriveConfig: GoogleDriveConfig, baseUrl?: string);
    /**
     * 🔔 ファイル変更Push通知設定
     */
    setupFilePushNotifications(folderId: string, ttlHours?: number): Promise<PushChannelResponse>;
    /**
     * 📁 フォルダ変更Push通知設定（Changes API）
     */
    setupFolderChangeNotifications(ttlHours?: number): Promise<PushChannelResponse>;
    /**
     * 🔄 Push通知チャンネル更新
     */
    renewPushChannel(channelId: string, resourceId: string, ttlHours?: number): Promise<PushChannelResponse>;
    /**
     * 🛑 Push通知チャンネル停止
     */
    stopPushChannel(channelId: string, resourceId: string): Promise<void>;
    /**
     * 🔍 アクティブなPush通知チャンネル一覧取得
     */
    listActiveChannels(): Promise<{
        channels: Array<{
            id: string;
            resourceId: string;
            expiration: Date;
            isExpired: boolean;
        }>;
        totalCount: number;
        expiredCount: number;
    }>;
    /**
     * 🧹 期限切れチャンネル自動クリーンアップ
     */
    cleanupExpiredChannels(): Promise<{
        cleaned: number;
        errors: number;
        details: Array<{
            channelId: string;
            status: 'cleaned' | 'error';
            error?: string;
        }>;
    }>;
    /**
     * 🔐 セキュアトークン生成
     */
    private generateSecureToken;
    /**
     * 💾 保存されたチャンネル情報取得（実装例）
     */
    private getStoredChannels;
    /**
     * 💾 チャンネル情報保存（実装例）
     */
    private saveChannelInfo;
    /**
     * 🔧 Push通知設定テスト
     */
    testPushNotificationSetup(): Promise<{
        success: boolean;
        tests: Array<{
            name: string;
            status: 'passed' | 'failed';
            details?: any;
            error?: string;
        }>;
    }>;
    /**
     * 🚀 簡単セットアップ（初回設定用）
     */
    quickSetup(folderId?: string, ttlHours?: number): Promise<{
        success: boolean;
        channels: PushChannelResponse[];
        message: string;
        nextSteps?: string[];
    }>;
}
export default GoogleDrivePushSetup;
