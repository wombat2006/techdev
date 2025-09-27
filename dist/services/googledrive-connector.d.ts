/**
 * GoogleDrive Connector for RAG System
 * セキュアなドキュメント取得とOpenAI Vector Store統合
 */
export interface GoogleDriveConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    refreshToken: string;
}
export interface OpenAIConfig {
    apiKey: string;
    organization?: string;
}
export interface DocumentMetadata {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    modifiedTime: string;
    webViewLink: string;
}
export interface ProcessedDocument {
    id: string;
    name: string;
    content: string | Buffer;
    metadata: DocumentMetadata;
    vectorStoreFileId?: string;
}
export declare class GoogleDriveRAGConnector {
    private googleDriveConfig;
    private openaiConfig;
    private drive;
    private openai;
    private oauth2Client;
    constructor(googleDriveConfig: GoogleDriveConfig, openaiConfig: OpenAIConfig);
    /**
     * 🔍 GoogleDriveからドキュメント一覧取得
     */
    listDocuments(folderId?: string, mimeTypes?: string[]): Promise<DocumentMetadata[]>;
    /**
     * 📄 GoogleDriveからドキュメント内容取得
     */
    downloadDocument(documentId: string): Promise<ProcessedDocument>;
    /**
     * 🗂️ OpenAI Vector Storeの作成または取得
     */
    getOrCreateVectorStore(name: string): Promise<string>;
    /**
     * 📚 ドキュメントをVector Storeに追加
     */
    addDocumentToVectorStore(vectorStoreId: string, document: ProcessedDocument): Promise<string>;
    removeDocumentFromVectorStore(vectorStoreId: string, vectorStoreFileId: string): Promise<void>;
    /**
     * 🔄 GoogleDriveフォルダ全体をRAG化
     */
    syncFolderToRAG(folderId: string, vectorStoreName: string, batchSize?: number): Promise<{
        vectorStoreId: string;
        processedCount: number;
        failedCount: number;
        processedDocuments: ProcessedDocument[];
        failedDocuments: Array<{
            id: string;
            name: string;
            error: string;
        }>;
    }>;
    /**
     * 🔍 RAG検索実行
     */
    searchRAG(query: string, vectorStoreId?: string, maxResults?: number): Promise<{
        results: any[];
        usage: any;
    }>;
    /**
     * 🔗 MCP-Enhanced Google Drive Search
     * Uses official Google Drive MCP connector for real-time document access
     */
    searchWithMCP(query: string, options?: {
        searchRecent?: boolean;
        maxResults?: number;
        fileTypes?: string[];
    }): Promise<{
        results: any[];
        mcp_calls: any[];
        usage: any;
    }>;
}
export default GoogleDriveRAGConnector;
