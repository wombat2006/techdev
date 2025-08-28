/**
 * GoogleDrive Connector for RAG System
 * セキュアなドキュメント取得とOpenAI Vector Store統合
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import OpenAI from 'openai';
import { createReadStream } from 'fs';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';

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
  content: string;
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
      'text/csv'
    ]
  ): Promise<DocumentMetadata[]> {
    try {
      logger.info('📋 GoogleDriveドキュメント一覧取得開始', { folderId, mimeTypes });

      const query = [
        folderId ? `'${folderId}' in parents` : null,
        `mimeType in ('${mimeTypes.join("','")}')`,
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
        name: file.name,
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
        name: fileResponse.data.name,
        mimeType: fileResponse.data.mimeType,
        size: parseInt(fileResponse.data.size || '0'),
        modifiedTime: fileResponse.data.modifiedTime,
        webViewLink: fileResponse.data.webViewLink
      };

      if (metadata.mimeType === 'application/pdf' && metadata.size > 10 * 1024 * 1024) {
        throw new Error('PDF file size exceeds 10MB limit');
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
      } else {
        // その他のファイルを直接ダウンロード
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
      }

      logger.info('✅ ドキュメントダウンロード完了', { 
        name: metadata.name, 
        contentLength: content.length 
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
    try {
      logger.info('📚 Vector Storeにドキュメント追加開始', { 
        vectorStoreId, 
        documentName: document.name 
      });

      // 一時ファイル作成
      const tempDir = '/tmp/googledrive-rag';
      await fs.mkdir(tempDir, { recursive: true });
      
      const tempFilePath = path.join(tempDir, `${document.id}.txt`);
      await fs.writeFile(tempFilePath, document.content, 'utf-8');

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
          documentName: document.name 
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
        documentName: document.name,
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
              logger.error('❌ ドキュメント処理失敗', { 
                id: docMeta.id,
                name: docMeta.name,
                error: error instanceof Error ? error.message : 'Unknown error' 
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
        totalDocuments: documents.length 
      });

      return {
        vectorStoreId,
        processedCount,
        failedCount,
        processedDocuments
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
   * 🔍 RAG検索実行
   */
  async searchRAG(
    query: string,
    vectorStoreId: string,
    maxResults: number = 5
  ): Promise<{
    results: any[];
    usage: any;
  }> {
    try {
      logger.info('🔍 RAG検索実行開始', { query, vectorStoreId, maxResults });

      // OpenAI Assistant作成（一時的）
      const assistant = await this.openai.beta.assistants.create({
        name: 'GoogleDrive RAG Assistant',
        instructions: `You are a helpful assistant that answers questions based on documents from GoogleDrive. 
        Always provide detailed answers in Japanese and cite the source documents when possible.`,
        model: 'gpt-4-turbo',
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        }
      });

      try {
        // スレッド作成
        const thread = await this.openai.beta.threads.create();

        // メッセージ追加
        await this.openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: query
        });

        // 実行
        const run = await this.openai.beta.threads.runs.createAndPoll(thread.id, {
          assistant_id: assistant.id
        });

        // 結果取得
        const messages = await this.openai.beta.threads.messages.list(thread.id);
        const results = messages.data
          .filter(msg => msg.role === 'assistant')
          .map(msg => ({
            content: msg.content[0]?.type === 'text' ? msg.content[0].text.value : '',
            annotations: msg.content[0]?.type === 'text' ? msg.content[0].text.annotations : []
          }));

        logger.info('✅ RAG検索完了', { 
          query, 
          resultCount: results.length,
          usage: run.usage 
        });

        return {
          results,
          usage: run.usage
        };

      } finally {
        // Assistant削除（リソース節約）
        await this.openai.beta.assistants.del(assistant.id);
      }

    } catch (error) {
      logger.error('❌ RAG検索エラー', { query, vectorStoreId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }
}

export default GoogleDriveRAGConnector;