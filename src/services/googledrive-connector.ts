/**
 * GoogleDrive Connector for RAG System
 * セキュアなドキュメント取得とOpenAI Vector Store統合
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import OpenAI from 'openai';
import { createReadStream, createWriteStream } from 'fs';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';
import { sanitizeFileName } from '../utils/security';

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

export class GoogleDriveRAGConnector {
  private drive: any;
  private openai: OpenAI;
  private oauth2Client: OAuth2Client;

  constructor(
    private googleDriveConfig: GoogleDriveConfig,
    private openaiConfig: OpenAIConfig
  ) {
    // Google OAuth2 Client設定
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

    // OpenAI Client初期化
    this.openai = new OpenAI({
      apiKey: openaiConfig.apiKey,
      organization: openaiConfig.organization
    });
  }

  /**
   * 🔍 GoogleDriveからドキュメント一覧取得
   */
  async listDocuments(
    folderId?: string,
    mimeTypes: string[] = [
      'application/pdf',
      'application/vnd.google-apps.document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'text/markdown',
      'text/x-markdown'
    ]
  ): Promise<DocumentMetadata[]> {
    try {
      logger.info('📋 GoogleDriveドキュメント一覧取得開始', { folderId, mimeTypes });

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

      const documents: DocumentMetadata[] = response.data.files.map((file: any) => ({
        id: file.id,
        name: sanitizeFileName(file.name || ''),
        mimeType: file.mimeType,
        size: parseInt(file.size || '0'),
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink
      }));

      logger.info('✅ GoogleDriveドキュメント取得完了', { count: documents.length });
      return documents;

    } catch (error) {
      logger.error('❌ GoogleDriveドキュメント取得エラー', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * 📄 GoogleDriveからドキュメント内容取得
   */
  async downloadDocument(documentId: string): Promise<ProcessedDocument> {
    try {
      logger.info('⬇️ GoogleDriveドキュメントダウンロード開始', { documentId });

      // ファイル情報取得
      const fileResponse = await this.drive.files.get({
        fileId: documentId,
        fields: 'id,name,mimeType,size,modifiedTime,webViewLink'
      });

      const metadata: DocumentMetadata = {
        id: fileResponse.data.id,
        name: sanitizeFileName(fileResponse.data.name || ''),
        mimeType: fileResponse.data.mimeType,
        size: parseInt(fileResponse.data.size || '0'),
        modifiedTime: fileResponse.data.modifiedTime,
        webViewLink: fileResponse.data.webViewLink
      };

      // 🎯 壁打ち分析結果：サイズベース最適化戦略
      // 8MB以下: ArrayBuffer直接処理（高速）
      // 8MB以上: Streaming処理（メモリ効率）
      const SIZE_THRESHOLD = 8 * 1024 * 1024; // 8MB
      const MAX_PDF_SIZE = 50 * 1024 * 1024;   // 50MB
      
      if (metadata.mimeType === 'application/pdf' && metadata.size > MAX_PDF_SIZE) {
        throw new Error(`PDF file size (${Math.round(metadata.size / 1024 / 1024)}MB) exceeds maximum limit (50MB)`);
      }

      let content: string | Buffer = '';

      // MIMEタイプに応じたコンテンツ取得
      if (metadata.mimeType === 'application/vnd.google-apps.document') {
        // Google Docsをプレーンテキストでエクスポート
        const exportResponse = await this.drive.files.export({
          fileId: documentId,
          mimeType: 'text/plain'
        });
        content = exportResponse.data;
      } else if (metadata.mimeType === 'application/vnd.google-apps.spreadsheet') {
        // Google Sheetsをテキストでエクスポート
        const exportResponse = await this.drive.files.export({
          fileId: documentId,
          mimeType: 'text/csv'
        });
        content = exportResponse.data;
      } else if (metadata.mimeType === 'application/vnd.google-apps.presentation') {
        // Google Slidesをテキストでエクスポート
        const exportResponse = await this.drive.files.export({
          fileId: documentId,
          mimeType: 'text/plain'
        });
        content = exportResponse.data;
      } else {
        // 🏓 統合戦略：サイズベース処理分岐
        const useStreamingMode = metadata.size > SIZE_THRESHOLD;
        
        logger.info('🎯 PDF処理モード選択', { 
          documentId, 
          mimeType: metadata.mimeType,
          fileSize: `${Math.round(metadata.size / 1024)}KB`,
          processingMode: useStreamingMode ? 'streaming' : 'arraybuffer'
        });
        
        if (!useStreamingMode) {
          // 小サイズファイル: ArrayBuffer直接処理（Codex方式）
          logger.info('⚡ ArrayBuffer直接処理開始');
          const downloadResponse = await this.drive.files.get(
            {
              fileId: documentId,
              alt: 'media'
            },
            { responseType: 'arraybuffer' }
          );
          const buffer = Buffer.from(downloadResponse.data as ArrayBuffer);
          if (metadata.mimeType === 'application/pdf') {
            content = buffer.toString('base64');
          } else {
            content = buffer.toString('utf-8');
          }
          
          logger.info('✅ ArrayBuffer処理完了', {
            bufferSize: buffer.length,
            contentType: typeof content
          });
          
        } else {
          // 大サイズファイル: Streaming処理（壁打ち推奨方式）
          logger.info('🌊 Streaming処理開始');
          
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
            await new Promise<void>((resolve, reject) => {
              const writeStream = createWriteStream(tmpPath);
              
              streamResponse.data
                .on('error', reject)
                .pipe(writeStream)
                .on('error', reject)
                .on('finish', () => {
                  logger.info('🌊 ストリーミング完了', { documentId });
                  resolve();
                });
            });
            
            // ファイルからBufferに読み込み
            content = await fs.readFile(tmpPath);
            
            logger.info('✅ Streaming処理完了', {
              bufferSize: content.length,
              tmpPath
            });
            
          } finally {
            // 一時ファイル削除（確実なクリーンアップ）
            try {
              await fs.unlink(tmpPath);
              logger.info('🗑️ 一時ファイル削除完了', { tmpPath });
            } catch (cleanupError) {
              logger.warn('⚠️ 一時ファイル削除失敗', { 
                tmpPath, 
                error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
              });
            }
          }
        }
      }

      logger.info('✅ ドキュメントダウンロード完了', { 
        name: metadata.name, 
        contentLength: Buffer.isBuffer(content) ? content.length : content.length 
      });

      return {
        id: documentId,
        name: metadata.name,
        content,
        metadata
      };

    } catch (error) {
      logger.error('❌ ドキュメントダウンロードエラー', { 
        documentId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * 🗂️ OpenAI Vector Storeの作成または取得
   */
  async getOrCreateVectorStore(name: string): Promise<string> {
    try {
      logger.info('🗂️ Vector Store確認開始', { name });

      // 既存のVector Store検索
      const vectorStores = await this.openai.vectorStores.list();
      const existingStore = vectorStores.data.find((store: any) => store.name === name);

      if (existingStore) {
        logger.info('✅ 既存Vector Store使用', { id: existingStore.id, name });
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

      logger.info('✅ Vector Store作成完了', { id: newStore.id, name });
      return newStore.id;

    } catch (error) {
      logger.error('❌ Vector Store作成エラー', { name, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * 📚 ドキュメントをVector Storeに追加
   */
  async addDocumentToVectorStore(
    vectorStoreId: string,
    document: ProcessedDocument
  ): Promise<string> {
    const sanitizedDocument: ProcessedDocument = {
      ...document,
      name: sanitizeFileName(document.name),
      metadata: {
        ...document.metadata,
        name: sanitizeFileName(document.metadata.name)
      }
    };

    try {
      
      logger.info('📚 Vector Storeにドキュメント追加開始', {
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
      } else {
        // テキストファイルの場合、UTF-8で書き込み
        await fs.writeFile(tempFilePath, sanitizedDocument.content, 'utf-8');
      }

      try {
        // OpenAI Files APIにアップロード
        const fileStream = createReadStream(tempFilePath);
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

        logger.info('✅ Vector Storeにドキュメント追加完了', {
          fileId: file.id,
          documentName: sanitizedDocument.name
        });

        return file.id;

      } catch (uploadError) {
        // エラー時も一時ファイル削除
        await fs.unlink(tempFilePath).catch(() => {});
        throw uploadError;
      }

    } catch (error) {
      logger.error('❌ Vector Storeドキュメント追加エラー', {
        vectorStoreId,
        documentName: sanitizedDocument.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async removeDocumentFromVectorStore(
    vectorStoreId: string,
    vectorStoreFileId: string
  ): Promise<void> {
    try {
      logger.info('🗑️ Vector Storeファイル削除開始', {
        vectorStoreId,
        vectorStoreFileId
      });

      const filesApi: any = this.openai.vectorStores?.files;
      if (filesApi?.del) {
        await filesApi.del(vectorStoreId, vectorStoreFileId);
      } else if (filesApi?.delete) {
        await filesApi.delete(vectorStoreId, vectorStoreFileId);
      } else {
        throw new Error('Vector store file delete API is not available in current OpenAI SDK');
      }

      const rootFilesApi: any = this.openai.files;
      if (rootFilesApi?.del) {
        await rootFilesApi.del(vectorStoreFileId);
      } else if (rootFilesApi?.delete) {
        await rootFilesApi.delete(vectorStoreFileId);
      }

      logger.info('✅ Vector Storeファイル削除完了', {
        vectorStoreId,
        vectorStoreFileId
      });

    } catch (error) {
      logger.error('❌ Vector Storeファイル削除エラー', {
        vectorStoreId,
        vectorStoreFileId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 🔄 GoogleDriveフォルダ全体をRAG化
   */
  async syncFolderToRAG(
    folderId: string, 
    vectorStoreName: string,
    batchSize: number = 5
  ): Promise<{
    vectorStoreId: string;
    processedCount: number;
    failedCount: number;
    processedDocuments: ProcessedDocument[];
    failedDocuments: Array<{ id: string; name: string; error: string }>;
  }> {
    try {
      logger.info('🔄 GoogleDriveフォルダRAG同期開始', { 
        folderId, 
        vectorStoreName,
        batchSize 
      });

      // Vector Store準備
      const vectorStoreId = await this.getOrCreateVectorStore(vectorStoreName);

      // ドキュメント一覧取得
      const documents = await this.listDocuments(folderId);
      
      const processedDocuments: ProcessedDocument[] = [];
      const failedDocuments: Array<{ id: string; name: string; error: string }> = [];
      let processedCount = 0;
      let failedCount = 0;

      // バッチ処理でドキュメント処理
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        logger.info('📦 バッチ処理開始', { 
          batchNumber: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
          totalDocuments: documents.length 
        });

        await Promise.allSettled(
          batch.map(async (docMeta) => {
            try {
              // ドキュメントダウンロード
              const document = await this.downloadDocument(docMeta.id);
              
              // Vector Storeに追加
              const vectorStoreFileId = await this.addDocumentToVectorStore(
                vectorStoreId, 
                document
              );

              document.vectorStoreFileId = vectorStoreFileId;
              processedDocuments.push(document);
              processedCount++;

              logger.info('✅ ドキュメント処理完了', { 
                name: document.name,
                vectorStoreFileId 
              });

            } catch (error) {
              failedCount++;
              const failureMessage = error instanceof Error ? error.message : 'Unknown error';
              failedDocuments.push({
                id: docMeta.id,
                name: docMeta.name,
                error: failureMessage
              });
              logger.error('❌ ドキュメント処理失敗', { 
                id: docMeta.id,
                name: docMeta.name,
                error: failureMessage 
              });
            }
          })
        );

        // バッチ間隔調整（レート制限対策）
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      logger.info('🎉 GoogleDriveフォルダRAG同期完了', { 
        vectorStoreId,
        processedCount,
        failedCount,
        totalDocuments: documents.length,
        failedDocuments: failedDocuments.length 
      });

      return {
        vectorStoreId,
        processedCount,
        failedCount,
        processedDocuments,
        failedDocuments
      };

    } catch (error) {
      logger.error('❌ GoogleDriveフォルダRAG同期エラー', { 
        folderId, 
        vectorStoreName,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * 📄 特定ドキュメントを再同期
   */
  async syncDocumentsById(
    documentIds: string[],
    vectorStoreName: string
  ): Promise<{
    vectorStoreId: string;
    processed: Array<{ id: string; name: string; vectorStoreFileId: string }>;
    failed: Array<{ id: string; error: string }>;
  }> {
    const vectorStoreId = await this.getOrCreateVectorStore(vectorStoreName);
    const processed: Array<{ id: string; name: string; vectorStoreFileId: string }> = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const documentId of documentIds) {
      try {
        const document = await this.downloadDocument(documentId);
        const vectorStoreFileId = await this.addDocumentToVectorStore(vectorStoreId, document);
        processed.push({ id: documentId, name: document.name, vectorStoreFileId });
        logger.info('✅ ドキュメント再同期完了', {
          documentId,
          vectorStoreFileId
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ id: documentId, error: message });
        logger.error('❌ ドキュメント再同期失敗', {
          documentId,
          error: message
        });
      }
    }

    return { vectorStoreId, processed, failed };
  }

  /**
   * 🔍 RAG検索実行
   */
  async searchRAG(
    query: string,
    vectorStoreId?: string,
    maxResults: number = 5
  ): Promise<{
    results: any[];
    usage: any;
  }> {
    try {
      logger.info('🔍 RAG検索実行開始 (MCP Enhanced)', { query, vectorStoreId, maxResults });

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
        } as any); // Temporary bypass for cutting-edge MCP functionality
        logger.info('🔗 Google Drive MCP Connector enabled');
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
        logger.info('📚 Context7 MCP enabled for technical documentation');
      }

      // Traditional file_search tool (fallback or primary depending on configuration)
      const tools: any[] = [...mcpTools];
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

      logger.info('✅ RAG検索完了 (Responses API + MCP)', { 
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

    } catch (error) {
      logger.error('❌ RAG検索エラー', { 
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
  async searchWithMCP(
    query: string,
    options: {
      searchRecent?: boolean;
      maxResults?: number;
      fileTypes?: string[];
    } = {}
  ): Promise<{
    results: any[];
    mcp_calls: any[];
    usage: any;
  }> {
    const { searchRecent = false, maxResults = 10, fileTypes = [] } = options;
    
    try {
      logger.info('🚀 MCP-Enhanced Google Drive Search', { 
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
          type: "mcp" as any, // Temporary bypass for cutting-edge MCP functionality
          server_label: "google_drive_search", 
          server_url: "https://api.googledrive.mcp/connector",
          authorization: process.env.GOOGLE_OAUTH_TOKEN,
          require_approval: "never",
          allowed_tools: searchRecent 
            ? ["recent_documents", "search", "fetch"] 
            : ["search", "fetch", "get_profile"]
        } as any],
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

      logger.info('✅ MCP-Enhanced search completed', {
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

    } catch (error) {
      logger.error('❌ MCP Google Drive search failed', { 
        query, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }
}

export default GoogleDriveRAGConnector;
