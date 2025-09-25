"use strict";
/**
 * GoogleDrive Connector for RAG System
 * セキュアなドキュメント取得とOpenAI Vector Store統合
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveRAGConnector = void 0;
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const openai_1 = __importDefault(require("openai"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const logger_1 = require("../utils/logger");
const security_1 = require("../utils/security");
class GoogleDriveRAGConnector {
    googleDriveConfig;
    openaiConfig;
    drive;
    openai;
    oauth2Client;
    constructor(googleDriveConfig, openaiConfig) {
        this.googleDriveConfig = googleDriveConfig;
        this.openaiConfig = openaiConfig;
        // Google OAuth2 Client設定
        this.oauth2Client = new google_auth_library_1.OAuth2Client(googleDriveConfig.clientId, googleDriveConfig.clientSecret, googleDriveConfig.redirectUri);
        this.oauth2Client.setCredentials({
            refresh_token: googleDriveConfig.refreshToken
        });
        // Google Drive API初期化
        this.drive = googleapis_1.google.drive({ version: 'v3', auth: this.oauth2Client });
        // OpenAI Client初期化
        this.openai = new openai_1.default({
            apiKey: openaiConfig.apiKey,
            organization: openaiConfig.organization
        });
    }
    /**
     * 🔍 GoogleDriveからドキュメント一覧取得
     */
    async listDocuments(folderId, mimeTypes = [
        'application/pdf',
        'application/vnd.google-apps.document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'text/markdown',
        'text/x-markdown'
    ]) {
        try {
            logger_1.logger.info('📋 GoogleDriveドキュメント一覧取得開始', { folderId, mimeTypes });
            // 一時的にMIMETypeフィルタを無効化して全ファイル取得
            const query = [
                folderId ? `'${folderId}' in parents` : null,
                'trashed = false'
            ].filter(Boolean).join(' and ');
            const response = await this.drive.files.list({
                q: query,
                fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink)',
                orderBy: 'modifiedTime desc',
                pageSize: 100
            });
            const documents = response.data.files.map((file) => ({
                id: file.id,
                name: (0, security_1.sanitizeFileName)(file.name || ''),
                mimeType: file.mimeType,
                size: parseInt(file.size || '0'),
                modifiedTime: file.modifiedTime,
                webViewLink: file.webViewLink
            }));
            logger_1.logger.info('✅ GoogleDriveドキュメント取得完了', { count: documents.length });
            return documents;
        }
        catch (error) {
            logger_1.logger.error('❌ GoogleDriveドキュメント取得エラー', { error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
        }
    }
    /**
     * 📄 GoogleDriveからドキュメント内容取得
     */
    async downloadDocument(documentId) {
        try {
            logger_1.logger.info('⬇️ GoogleDriveドキュメントダウンロード開始', { documentId });
            // ファイル情報取得
            const fileResponse = await this.drive.files.get({
                fileId: documentId,
                fields: 'id,name,mimeType,size,modifiedTime,webViewLink'
            });
            const metadata = {
                id: fileResponse.data.id,
                name: (0, security_1.sanitizeFileName)(fileResponse.data.name || ''),
                mimeType: fileResponse.data.mimeType,
                size: parseInt(fileResponse.data.size || '0'),
                modifiedTime: fileResponse.data.modifiedTime,
                webViewLink: fileResponse.data.webViewLink
            };
            // 🎯 壁打ち分析結果：サイズベース最適化戦略
            // 8MB以下: ArrayBuffer直接処理（高速）
            // 8MB以上: Streaming処理（メモリ効率）
            const SIZE_THRESHOLD = 8 * 1024 * 1024; // 8MB
            const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB
            if (metadata.mimeType === 'application/pdf' && metadata.size > MAX_PDF_SIZE) {
                throw new Error(`PDF file size (${Math.round(metadata.size / 1024 / 1024)}MB) exceeds maximum limit (50MB)`);
            }
            let content = '';
            // MIMEタイプに応じたコンテンツ取得
            if (metadata.mimeType === 'application/vnd.google-apps.document') {
                // Google Docsをプレーンテキストでエクスポート
                const exportResponse = await this.drive.files.export({
                    fileId: documentId,
                    mimeType: 'text/plain'
                });
                content = exportResponse.data;
            }
            else if (metadata.mimeType === 'application/vnd.google-apps.spreadsheet') {
                // Google Sheetsをテキストでエクスポート
                const exportResponse = await this.drive.files.export({
                    fileId: documentId,
                    mimeType: 'text/csv'
                });
                content = exportResponse.data;
            }
            else if (metadata.mimeType === 'application/vnd.google-apps.presentation') {
                // Google Slidesをテキストでエクスポート
                const exportResponse = await this.drive.files.export({
                    fileId: documentId,
                    mimeType: 'text/plain'
                });
                content = exportResponse.data;
            }
            else {
                // 🏓 統合戦略：サイズベース処理分岐
                const useStreamingMode = metadata.size > SIZE_THRESHOLD;
                logger_1.logger.info('🎯 PDF処理モード選択', {
                    documentId,
                    mimeType: metadata.mimeType,
                    fileSize: `${Math.round(metadata.size / 1024)}KB`,
                    processingMode: useStreamingMode ? 'streaming' : 'arraybuffer'
                });
                if (!useStreamingMode) {
                    // 小サイズファイル: ArrayBuffer直接処理（Codex方式）
                    logger_1.logger.info('⚡ ArrayBuffer直接処理開始');
                    const downloadResponse = await this.drive.files.get({
                        fileId: documentId,
                        alt: 'media'
                    }, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(downloadResponse.data);
                    if (metadata.mimeType === 'application/pdf') {
                        content = buffer.toString('base64');
                    }
                    else {
                        content = buffer.toString('utf-8');
                    }
                    logger_1.logger.info('✅ ArrayBuffer処理完了', {
                        bufferSize: buffer.length,
                        contentType: typeof content
                    });
                }
                else {
                    // 大サイズファイル: Streaming処理（壁打ち推奨方式）
                    logger_1.logger.info('🌊 Streaming処理開始');
                    const tmpDir = '/tmp/googledrive-rag';
                    await fs.mkdir(tmpDir, { recursive: true });
                    const fileExtension = metadata.mimeType === 'application/pdf' ? '.pdf' :
                        metadata.mimeType.includes('image') ? '.img' : '.bin';
                    const tmpPath = path.join(tmpDir, `${documentId}${fileExtension}`);
                    try {
                        // Node.js pipeline streaming処理
                        const streamResponse = await this.drive.files.get({
                            fileId: documentId,
                            alt: 'media'
                        }, {
                            responseType: 'stream'
                        });
                        // Pipeline with back-pressure handling
                        await new Promise((resolve, reject) => {
                            const writeStream = (0, fs_1.createWriteStream)(tmpPath);
                            streamResponse.data
                                .on('error', reject)
                                .pipe(writeStream)
                                .on('error', reject)
                                .on('finish', () => {
                                logger_1.logger.info('🌊 ストリーミング完了', { documentId });
                                resolve();
                            });
                        });
                        // ファイルからBufferに読み込み
                        content = await fs.readFile(tmpPath);
                        logger_1.logger.info('✅ Streaming処理完了', {
                            bufferSize: content.length,
                            tmpPath
                        });
                    }
                    finally {
                        // 一時ファイル削除（確実なクリーンアップ）
                        try {
                            await fs.unlink(tmpPath);
                            logger_1.logger.info('🗑️ 一時ファイル削除完了', { tmpPath });
                        }
                        catch (cleanupError) {
                            logger_1.logger.warn('⚠️ 一時ファイル削除失敗', {
                                tmpPath,
                                error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
                            });
                        }
                    }
                }
                // 一時ファイル作成（GPT-5推奨パターンC）
                const tmpDir = '/tmp/googledrive-rag';
                await fs.mkdir(tmpDir, { recursive: true });
                const fileExtension = metadata.mimeType === 'application/pdf' ? '.pdf' :
                    metadata.mimeType.includes('image') ? '.img' : '.bin';
                const tmpPath = path.join(tmpDir, `${documentId}${fileExtension}`);
                try {
                    // 公式Google Drive APIサンプル準拠ストリーミング処理
                    const streamResponse = await this.drive.files.get({
                        fileId: documentId,
                        alt: 'media'
                    }, {
                        responseType: 'stream' // Blob問題完全回避
                    });
                    // Node.js pipeline使用（back-pressure対応）
                    await new Promise((resolve, reject) => {
                        const writeStream = (0, fs_1.createWriteStream)(tmpPath);
                        streamResponse.data
                            .on('error', reject)
                            .pipe(writeStream)
                            .on('error', reject)
                            .on('finish', () => {
                            logger_1.logger.info('🎯 ストリーミング完了', { documentId });
                            resolve();
                        });
                    });
                    // 一時ファイルからBufferに読み込み
                    content = await fs.readFile(tmpPath);
                    logger_1.logger.info('✅ 公式パターン処理完了', {
                        documentId,
                        bufferSize: content.length,
                        tmpPath
                    });
                }
                finally {
                    // 一時ファイル削除（必ずクリーンアップ）
                    try {
                        await fs.unlink(tmpPath);
                        logger_1.logger.info('🗑️ 一時ファイル削除完了', { tmpPath });
                    }
                    catch (cleanupError) {
                        logger_1.logger.warn('⚠️ 一時ファイル削除失敗', {
                            tmpPath,
                            error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
                        });
                    }
                }
            }
            logger_1.logger.info('✅ ドキュメントダウンロード完了', {
                name: metadata.name,
                contentLength: Buffer.isBuffer(content) ? content.length : content.length
            });
            return {
                id: documentId,
                name: metadata.name,
                content,
                metadata
            };
        }
        catch (error) {
            logger_1.logger.error('❌ ドキュメントダウンロードエラー', {
                documentId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * 🗂️ OpenAI Vector Storeの作成または取得
     */
    async getOrCreateVectorStore(name) {
        try {
            logger_1.logger.info('🗂️ Vector Store確認開始', { name });
            // 既存のVector Store検索
            const vectorStores = await this.openai.vectorStores.list();
            const existingStore = vectorStores.data.find((store) => store.name === name);
            if (existingStore) {
                logger_1.logger.info('✅ 既存Vector Store使用', { id: existingStore.id, name });
                return existingStore.id;
            }
            // 新規Vector Store作成
            const newStore = await this.openai.vectorStores.create({
                name,
                expires_after: {
                    anchor: 'last_active_at',
                    days: 90 // 90日間非アクティブで自動削除
                }
            });
            logger_1.logger.info('✅ Vector Store作成完了', { id: newStore.id, name });
            return newStore.id;
        }
        catch (error) {
            logger_1.logger.error('❌ Vector Store作成エラー', { name, error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
        }
    }
    /**
     * 📚 ドキュメントをVector Storeに追加
     */
    async addDocumentToVectorStore(vectorStoreId, document) {
        const sanitizedDocument = {
            ...document,
            name: (0, security_1.sanitizeFileName)(document.name),
            metadata: {
                ...document.metadata,
                name: (0, security_1.sanitizeFileName)(document.metadata.name)
            }
        };
        try {
            logger_1.logger.info('📚 Vector Storeにドキュメント追加開始', {
                vectorStoreId,
                documentName: sanitizedDocument.name
            });
            // 一時ファイル作成
            const tempDir = '/tmp/googledrive-rag';
            await fs.mkdir(tempDir, { recursive: true });
            // ファイル拡張子を適切に設定
            const fileExtension = sanitizedDocument.metadata.mimeType === 'application/pdf' ? '.pdf' : '.txt';
            const tempFilePath = path.join(tempDir, `${sanitizedDocument.id}${fileExtension}`);
            // Bufferかプレーンテキストかを判定して適切に書き込み
            if (Buffer.isBuffer(sanitizedDocument.content)) {
                // バイナリファイルの場合、Bufferとして直接書き込み
                await fs.writeFile(tempFilePath, sanitizedDocument.content);
            }
            else {
                // テキストファイルの場合、UTF-8で書き込み
                await fs.writeFile(tempFilePath, sanitizedDocument.content, 'utf-8');
            }
            try {
                // OpenAI Files APIにアップロード
                const fileStream = (0, fs_1.createReadStream)(tempFilePath);
                const file = await this.openai.files.create({
                    file: fileStream,
                    purpose: 'assistants'
                });
                // Vector Storeにファイル追加
                await this.openai.vectorStores.files.create(vectorStoreId, {
                    file_id: file.id
                });
                // 一時ファイル削除
                await fs.unlink(tempFilePath);
                logger_1.logger.info('✅ Vector Storeにドキュメント追加完了', {
                    fileId: file.id,
                    documentName: sanitizedDocument.name
                });
                return file.id;
            }
            catch (uploadError) {
                // エラー時も一時ファイル削除
                await fs.unlink(tempFilePath).catch(() => { });
                throw uploadError;
            }
        }
        catch (error) {
            logger_1.logger.error('❌ Vector Storeドキュメント追加エラー', {
                vectorStoreId,
                documentName: sanitizedDocument.name,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * 🔄 GoogleDriveフォルダ全体をRAG化
     */
    async syncFolderToRAG(folderId, vectorStoreName, batchSize = 5) {
        try {
            logger_1.logger.info('🔄 GoogleDriveフォルダRAG同期開始', {
                folderId,
                vectorStoreName,
                batchSize
            });
            // Vector Store準備
            const vectorStoreId = await this.getOrCreateVectorStore(vectorStoreName);
            // ドキュメント一覧取得
            const documents = await this.listDocuments(folderId);
            const processedDocuments = [];
            let processedCount = 0;
            let failedCount = 0;
            // バッチ処理でドキュメント処理
            for (let i = 0; i < documents.length; i += batchSize) {
                const batch = documents.slice(i, i + batchSize);
                logger_1.logger.info('📦 バッチ処理開始', {
                    batchNumber: Math.floor(i / batchSize) + 1,
                    batchSize: batch.length,
                    totalDocuments: documents.length
                });
                await Promise.allSettled(batch.map(async (docMeta) => {
                    try {
                        // ドキュメントダウンロード
                        const document = await this.downloadDocument(docMeta.id);
                        // Vector Storeに追加
                        const vectorStoreFileId = await this.addDocumentToVectorStore(vectorStoreId, document);
                        document.vectorStoreFileId = vectorStoreFileId;
                        processedDocuments.push(document);
                        processedCount++;
                        logger_1.logger.info('✅ ドキュメント処理完了', {
                            name: document.name,
                            vectorStoreFileId
                        });
                    }
                    catch (error) {
                        failedCount++;
                        logger_1.logger.error('❌ ドキュメント処理失敗', {
                            id: docMeta.id,
                            name: docMeta.name,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                }));
                // バッチ間隔調整（レート制限対策）
                if (i + batchSize < documents.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            logger_1.logger.info('🎉 GoogleDriveフォルダRAG同期完了', {
                vectorStoreId,
                processedCount,
                failedCount,
                totalDocuments: documents.length
            });
            return {
                vectorStoreId,
                processedCount,
                failedCount,
                processedDocuments
            };
        }
        catch (error) {
            logger_1.logger.error('❌ GoogleDriveフォルダRAG同期エラー', {
                folderId,
                vectorStoreName,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * 🔍 RAG検索実行
     */
    async searchRAG(query, vectorStoreId, maxResults = 5) {
        try {
            logger_1.logger.info('🔍 RAG検索実行開始 (MCP Enhanced)', { query, vectorStoreId, maxResults });
            // MCP tools configuration for enhanced Google Drive integration
            const mcpTools = [];
            // Official Google Drive MCP Connector (if available and configured)
            if (process.env.GOOGLE_DRIVE_MCP_ENABLED === 'true' && process.env.GOOGLE_OAUTH_TOKEN) {
                mcpTools.push({
                    type: "mcp",
                    server_label: "google_drive",
                    server_url: "https://api.googledrive.mcp/connector", // Placeholder URL for connector
                    authorization: process.env.GOOGLE_OAUTH_TOKEN,
                    require_approval: {
                        never: {
                            tool_names: ["search", "recent_documents", "fetch"]
                        }
                    },
                    allowed_tools: ["search", "recent_documents", "fetch"]
                }); // Temporary bypass for cutting-edge MCP functionality
                logger_1.logger.info('🔗 Google Drive MCP Connector enabled');
            }
            // Context7 MCP for technical documentation enhancement
            if (process.env.CONTEXT7_MCP_ENABLED === 'true') {
                mcpTools.push({
                    type: "mcp",
                    server_label: "context7_docs",
                    server_url: "https://api.context7.com/mcp",
                    authorization: process.env.CONTEXT7_API_KEY,
                    require_approval: "never",
                    allowed_tools: ["get_library_docs", "resolve_library_id"]
                });
                logger_1.logger.info('📚 Context7 MCP enabled for technical documentation');
            }
            // Traditional file_search tool (fallback or primary depending on configuration)
            const tools = [...mcpTools];
            if (vectorStoreId && !process.env.GOOGLE_DRIVE_MCP_ONLY) {
                tools.push({
                    type: 'file_search',
                    vector_store_ids: [vectorStoreId]
                });
            }
            // Using new Responses API with MCP integration
            const response = await this.openai.responses.create({
                model: 'gpt-5', // Using GPT-5 for better performance
                tools,
                instructions: `You are a helpful IT infrastructure support assistant that answers questions based on documents from GoogleDrive and technical documentation.

利用可能なツール:
- Google Drive MCP: リアルタイムドキュメント検索とアクセス
- Context7 MCP: 技術ドキュメントとライブラリリファレンス
- File Search: ベクターストア検索（従来方式）

Always provide detailed answers in Japanese and cite the source documents when possible. When using MCP tools, leverage real-time access for the most current information.`,
                input: query,
                store: true, // Enable stateful context for better reasoning
                reasoning: {
                    effort: 'medium'
                }
            });
            // Extract results from the new Responses API format with MCP support
            const results = [{
                    content: response.output_text || 'No response generated',
                    annotations: [], // Responses API handles citations internally
                    mcp_calls: response.output?.filter(item => item.type === 'mcp_call') || []
                }];
            logger_1.logger.info('✅ RAG検索完了 (Responses API + MCP)', {
                query,
                resultCount: results.length,
                mcp_tools_used: mcpTools.length,
                mcp_calls: response.output?.filter(item => item.type === 'mcp_call')?.length || 0,
                usage: response.usage
            });
            return {
                results,
                usage: response.usage
            };
        }
        catch (error) {
            logger_1.logger.error('❌ RAG検索エラー', {
                query,
                vectorStoreId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * 🔗 MCP-Enhanced Google Drive Search
     * Uses official Google Drive MCP connector for real-time document access
     */
    async searchWithMCP(query, options = {}) {
        const { searchRecent = false, maxResults = 10, fileTypes = [] } = options;
        try {
            logger_1.logger.info('🚀 MCP-Enhanced Google Drive Search', {
                query,
                searchRecent,
                maxResults,
                fileTypes
            });
            if (!process.env.GOOGLE_DRIVE_MCP_ENABLED || !process.env.GOOGLE_OAUTH_TOKEN) {
                throw new Error('Google Drive MCP not configured. Set GOOGLE_DRIVE_MCP_ENABLED=true and GOOGLE_OAUTH_TOKEN');
            }
            // Enhanced search prompt for MCP
            const searchPrompt = searchRecent
                ? `Find recent documents related to: "${query}". Focus on files modified within the last 30 days.`
                : `Search Google Drive for documents containing: "${query}". Provide detailed summaries with source links.`;
            const response = await this.openai.responses.create({
                model: 'gpt-5',
                tools: [{
                        type: "mcp", // Temporary bypass for cutting-edge MCP functionality
                        server_label: "google_drive_search",
                        server_url: "https://api.googledrive.mcp/connector",
                        authorization: process.env.GOOGLE_OAUTH_TOKEN,
                        require_approval: "never",
                        allowed_tools: searchRecent
                            ? ["recent_documents", "search", "fetch"]
                            : ["search", "fetch", "get_profile"]
                    }],
                instructions: `You are an IT infrastructure support specialist with access to Google Drive documents via MCP.

Your task:
1. Search for relevant documents using the Google Drive MCP connector
2. Provide detailed Japanese summaries with source links
3. Prioritize recent documents if requested
4. Include document metadata (modification dates, file types, sizes)

Always cite your sources and provide actionable insights.`,
                input: searchPrompt,
                store: true,
                reasoning: { effort: 'medium' }
            });
            // Extract MCP call results
            const mcpCalls = response.output?.filter(item => item.type === 'mcp_call') || [];
            const results = [{
                    content: response.output_text || 'No response generated',
                    query,
                    search_type: searchRecent ? 'recent' : 'full',
                    source: 'google_drive_mcp'
                }];
            logger_1.logger.info('✅ MCP-Enhanced search completed', {
                query,
                results_count: results.length,
                mcp_calls_count: mcpCalls.length,
                cost_estimate: response.usage?.total_tokens ? (response.usage.total_tokens * 0.00001) : 0
            });
            return {
                results,
                mcp_calls: mcpCalls,
                usage: response.usage
            };
        }
        catch (error) {
            logger_1.logger.error('❌ MCP Google Drive search failed', {
                query,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}
exports.GoogleDriveRAGConnector = GoogleDriveRAGConnector;
exports.default = GoogleDriveRAGConnector;
//# sourceMappingURL=googledrive-connector.js.map