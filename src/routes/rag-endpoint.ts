/**
 * RAG API Endpoints with Wall-Bounce Analysis
 * GoogleDrive + OpenAI Vector Store統合エンドポイント
 */

import { Router, Request, Response } from 'express';
import { GoogleDriveRAGConnector, GoogleDriveConfig, OpenAIConfig } from '../services/googledrive-connector';
import { logger } from '../utils/logger';
import { mcp__gpt_5__deep_analysis } from '../utils/mcp-clients';
import { mcp__gemini_cli__ask_gemini } from '../utils/mcp-clients';

const router = Router();

// RAG設定（環境変数から取得）
const googleDriveConfig: GoogleDriveConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob',
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN || ''
};

const openaiConfig: OpenAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  organization: process.env.OPENAI_ORGANIZATION
};

// RAGコネクタ初期化
let ragConnector: GoogleDriveRAGConnector | null = null;

const initializeRAGConnector = () => {
  if (!ragConnector && googleDriveConfig.clientId && openaiConfig.apiKey) {
    ragConnector = new GoogleDriveRAGConnector(googleDriveConfig, openaiConfig);
    logger.info('🤖 RAGコネクタ初期化完了');
  }
  return ragConnector;
};

/**
 * 🏥 RAGシステムヘルスチェック
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const status = {
      status: 'healthy',
      service: 'rag-system',
      timestamp: new Date().toISOString(),
      configuration: {
        google_drive_configured: !!googleDriveConfig.clientId && !!googleDriveConfig.refreshToken,
        openai_configured: !!openaiConfig.apiKey,
        rag_connector_initialized: !!ragConnector
      }
    };

    res.json(status);
    
    logger.info('🏥 RAGヘルスチェック実行', status);
  } catch (error) {
    logger.error('❌ RAGヘルスチェックエラー', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      status: 'unhealthy',
      service: 'rag-system',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🔄 GoogleDriveフォルダをRAGに同期
 */
router.post('/sync-folder', async (req: Request, res: Response) => {
  try {
    const { folder_id, vector_store_name, batch_size = 5 } = req.body;

    if (!folder_id || !vector_store_name) {
      return res.status(400).json({
        error: 'folder_id and vector_store_name are required',
        required_fields: ['folder_id', 'vector_store_name']
      });
    }

    const connector = initializeRAGConnector();
    if (!connector) {
      return res.status(500).json({
        error: 'RAG connector not initialized. Check environment variables.',
        required_env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'OPENAI_API_KEY']
      });
    }

    logger.info('🔄 RAGフォルダ同期開始', { folder_id, vector_store_name });

    const result = await connector.syncFolderToRAG(
      folder_id,
      vector_store_name,
      batch_size
    );

    res.json({
      success: true,
      message: 'GoogleDriveフォルダのRAG同期が完了しました',
      data: {
        vector_store_id: result.vectorStoreId,
        processed_documents: result.processedCount,
        failed_documents: result.failedCount,
        total_documents: result.processedCount + result.failedCount,
        processed_files: result.processedDocuments.map(doc => ({
          id: doc.id,
          name: doc.name,
          vector_store_file_id: doc.vectorStoreFileId
        }))
      }
    });

    logger.info('✅ RAGフォルダ同期完了', { 
      folder_id, 
      processed: result.processedCount,
      failed: result.failedCount 
    });

  } catch (error) {
    logger.error('❌ RAGフォルダ同期エラー', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      error: 'RAG sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📋 GoogleDriveドキュメント一覧取得
 */
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const { folder_id } = req.query;

    const connector = initializeRAGConnector();
    if (!connector) {
      return res.status(500).json({
        error: 'RAG connector not initialized'
      });
    }

    const documents = await connector.listDocuments(folder_id as string);

    res.json({
      success: true,
      data: {
        documents,
        count: documents.length
      }
    });

  } catch (error) {
    logger.error('❌ ドキュメント一覧取得エラー', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      error: 'Failed to list documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🔍 RAG検索 with 壁打ち分析
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { 
      query, 
      vector_store_id, 
      max_results = 5, 
      enable_wall_bounce = true,
      wall_bounce_models = ['gpt-5', 'gemini']
    } = req.body;

    if (!query || !vector_store_id) {
      return res.status(400).json({
        error: 'query and vector_store_id are required',
        required_fields: ['query', 'vector_store_id']
      });
    }

    const connector = initializeRAGConnector();
    if (!connector) {
      return res.status(500).json({
        error: 'RAG connector not initialized'
      });
    }

    logger.info('🔍 RAG検索開始', { query, vector_store_id, enable_wall_bounce });

    // 基本RAG検索実行
    const ragResult = await connector.searchRAG(query, vector_store_id, max_results);

    let wallBounceResults: any = {};

    // 🔄 壁打ち分析実行（有効な場合）
    if (enable_wall_bounce && wall_bounce_models.length > 0) {
      logger.info('🏓 壁打ち分析開始', { models: wall_bounce_models });

      const wallBouncePromises = [];

      // GPT-5分析
      if (wall_bounce_models.includes('gpt-5')) {
        wallBouncePromises.push(
          mcp__gpt_5__deep_analysis({
            input: `以下のRAG検索結果を分析し、より詳細で正確な回答を生成してください。

質問: ${query}

RAG検索結果:
${ragResult.results.map(r => r.content).join('\n\n---\n\n')}

日本語で回答し、情報の信頼性と追加の洞察を提供してください。`
          }).then(result => ({ model: 'gpt-5', result })).catch(err => ({ model: 'gpt-5', error: err.message }))
        );
      }

      // Gemini分析
      if (wall_bounce_models.includes('gemini')) {
        wallBouncePromises.push(
          mcp__gemini_cli__ask_gemini({
            prompt: `RAG検索結果の品質評価と改善提案:

元の質問: ${query}

RAG回答: ${ragResult.results[0]?.content || 'N/A'}

この回答を評価し、以下の観点から改善提案を行ってください:
1. 回答の正確性
2. 情報の完全性
3. 追加すべき情報
4. より良い回答の例

日本語で詳細に分析してください。`,
            changeMode: false
          }).then(result => ({ model: 'gemini', result })).catch(err => ({ model: 'gemini', error: err.message }))
        );
      }

      const wallBounceResponses = await Promise.allSettled(wallBouncePromises);
      
      wallBounceResults = wallBounceResponses.reduce((acc, response) => {
        if (response.status === 'fulfilled') {
          const modelResult = response.value as any;
          acc[modelResult.model] = modelResult.result || modelResult.error;
        }
        return acc;
      }, {} as any);

      logger.info('✅ 壁打ち分析完了', { 
        models: Object.keys(wallBounceResults) 
      });
    }

    // 🎯 統合回答生成
    let finalAnswer = ragResult.results[0]?.content || 'RAG検索結果が見つかりませんでした。';
    
    if (enable_wall_bounce && Object.keys(wallBounceResults).length > 0) {
      finalAnswer = `【RAG + 壁打ち分析統合回答】

== 基本RAG回答 ==
${ragResult.results[0]?.content || 'N/A'}

== 壁打ち分析結果 ==
${Object.entries(wallBounceResults).map(([model, result]) => 
  `【${model}分析】\n${typeof result === 'string' ? result : JSON.stringify(result)}`
).join('\n\n')}

== 統合結論 ==
上記の多角的分析に基づき、より正確で包括的な情報を提供いたします。`;
    }

    const response = {
      success: true,
      message: 'RAG検索が完了しました',
      data: {
        query,
        vector_store_id,
        final_answer: finalAnswer,
        rag_results: ragResult.results,
        wall_bounce_enabled: enable_wall_bounce,
        wall_bounce_results: wallBounceResults,
        usage: ragResult.usage,
        metadata: {
          search_time: new Date().toISOString(),
          models_used: ['openai-rag', ...(enable_wall_bounce ? wall_bounce_models : [])],
          result_count: ragResult.results.length
        }
      }
    };

    res.json(response);

    logger.info('✅ RAG検索完了', { 
      query, 
      wall_bounce_enabled: enable_wall_bounce,
      result_length: finalAnswer.length 
    });

  } catch (error) {
    logger.error('❌ RAG検索エラー', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      error: 'RAG search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📊 Vector Store情報取得
 */
router.get('/vector-stores', async (req: Request, res: Response) => {
  try {
    const connector = initializeRAGConnector();
    if (!connector) {
      return res.status(500).json({
        error: 'RAG connector not initialized'
      });
    }

    // OpenAI Vector Store一覧取得（直接APIアクセス）
    const openai = (connector as any).openai;
    const vectorStores = await openai.vectorStores.list();

    res.json({
      success: true,
      data: {
        vector_stores: vectorStores.data.map((store: any) => ({
          id: store.id,
          name: store.name,
          file_counts: store.file_counts,
          created_at: store.created_at,
          expires_at: store.expires_at,
          status: store.status
        }))
      }
    });

  } catch (error) {
    logger.error('❌ Vector Store一覧取得エラー', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      error: 'Failed to list vector stores',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🗑️ Vector Store削除
 */
router.delete('/vector-stores/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const connector = initializeRAGConnector();
    if (!connector) {
      return res.status(500).json({
        error: 'RAG connector not initialized'
      });
    }

    // Vector Store削除
    const openai = (connector as any).openai;
    const deletedStore = await openai.vectorStores.del(id);

    res.json({
      success: true,
      message: 'Vector Storeを削除しました',
      data: {
        id: deletedStore.id,
        deleted: deletedStore.deleted
      }
    });

    logger.info('🗑️ Vector Store削除完了', { id });

  } catch (error) {
    logger.error('❌ Vector Store削除エラー', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      error: 'Failed to delete vector store',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📈 RAGシステム状態確認
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const config_status = {
      google_drive: {
        client_id_set: !!googleDriveConfig.clientId,
        client_secret_set: !!googleDriveConfig.clientSecret,
        refresh_token_set: !!googleDriveConfig.refreshToken
      },
      openai: {
        api_key_set: !!openaiConfig.apiKey,
        organization_set: !!openaiConfig.organization
      },
      connector_initialized: !!ragConnector
    };

    const all_configured = 
      config_status.google_drive.client_id_set &&
      config_status.google_drive.client_secret_set &&
      config_status.google_drive.refresh_token_set &&
      config_status.openai.api_key_set;

    res.json({
      success: true,
      data: {
        status: all_configured ? 'ready' : 'configuration_needed',
        config_status,
        required_env_vars: [
          'GOOGLE_CLIENT_ID',
          'GOOGLE_CLIENT_SECRET', 
          'GOOGLE_REFRESH_TOKEN',
          'OPENAI_API_KEY'
        ],
        optional_env_vars: [
          'OPENAI_ORGANIZATION'
        ],
        features: {
          document_sync: all_configured,
          rag_search: all_configured,
          wall_bounce_analysis: all_configured
        }
      }
    });

  } catch (error) {
    logger.error('❌ RAGシステム状態確認エラー', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
