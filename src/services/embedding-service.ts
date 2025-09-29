import { HuggingFaceClient } from './huggingface-client';
import { 
  EmbeddingRequest, 
  EmbeddingResponse, 
  JAPANESE_EMBEDDING_MODELS,
  JapaneseEmbeddingModel,
  TaskType
} from '../types/huggingface';
import { logger } from '../utils/logger';

export interface EmbeddingServiceConfig {
  maxBatchSize: number;
  defaultModel: string;
  fallbackModels: string[];
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface EmbeddingAnalysisRequest {
  text: string | string[];
  models?: string[];
  options?: {
    compareModels?: boolean;
    normalizeResults?: boolean;
    includeMetadata?: boolean;
  };
}

export interface EmbeddingAnalysisResponse {
  results: Array<{
    model: string;
    embeddings: number[][];
    dimensions: number;
    similarity?: number;
    metadata: {
      modelInfo: JapaneseEmbeddingModel;
      processingTime: number;
      tokenCount: number;
    };
  }>;
  comparison?: {
    bestModel: string;
    averageSimilarity: number;
    recommendation: string;
  };
}

export class EmbeddingService {
  private huggingFaceClient: HuggingFaceClient;
  private config: EmbeddingServiceConfig;
  private embeddingCache: Map<string, { embeddings: number[][], timestamp: number }>;

  constructor(huggingFaceClient: HuggingFaceClient, config?: Partial<EmbeddingServiceConfig>) {
    this.huggingFaceClient = huggingFaceClient;
    this.config = {
      maxBatchSize: 50,
      defaultModel: JAPANESE_EMBEDDING_MODELS[0].modelPath,
      fallbackModels: JAPANESE_EMBEDDING_MODELS.slice(1, 3).map(m => m.modelPath),
      cacheEnabled: true,
      cacheTTL: 3600000, // 1 hour in milliseconds
      ...config
    };
    this.embeddingCache = new Map();
  }

  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || this.config.defaultModel;
    const texts = Array.isArray(request.text) ? request.text : [request.text];
    
    // Check cache if enabled
    if (this.config.cacheEnabled) {
      const cacheKey = this.getCacheKey(texts, model);
      const cached = this.embeddingCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        logger.info('Using cached embeddings', { model, textCount: texts.length });
        return {
          embeddings: cached.embeddings,
          model,
          usage: {
            tokenCount: this.estimateTokenCount(texts),
            processingTime: 0
          }
        };
      }
    }

    // Batch processing for large requests
    const batches = this.createBatches(texts, this.config.maxBatchSize);
    const allEmbeddings: number[][] = [];
    let totalProcessingTime = 0;
    let totalTokenCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`Processing embedding batch ${i + 1}/${batches.length}`, {
        model,
        batchSize: batch.length
      });

      try {
        const batchResponse = await this.huggingFaceClient.retryWithBackoff(async () => {
          return await this.huggingFaceClient.generateEmbeddings({
            text: batch,
            model,
            options: request.options
          });
        });

        allEmbeddings.push(...batchResponse.embeddings);
        totalProcessingTime += batchResponse.usage.processingTime;
        totalTokenCount += batchResponse.usage.tokenCount;

      } catch (error) {
        logger.error(`Failed to process embedding batch ${i + 1}`, {
          model,
          batchSize: batch.length,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Try fallback models
        const fallbackResult = await this.tryFallbackModels(batch, request.options);
        if (fallbackResult) {
          allEmbeddings.push(...fallbackResult.embeddings);
          totalProcessingTime += fallbackResult.usage.processingTime;
          totalTokenCount += fallbackResult.usage.tokenCount;
        } else {
          throw error;
        }
      }
    }

    const response: EmbeddingResponse = {
      embeddings: allEmbeddings,
      model,
      usage: {
        tokenCount: totalTokenCount,
        processingTime: totalProcessingTime
      }
    };

    // Cache results if enabled
    if (this.config.cacheEnabled) {
      const cacheKey = this.getCacheKey(texts, model);
      this.embeddingCache.set(cacheKey, {
        embeddings: allEmbeddings,
        timestamp: Date.now()
      });
    }

    return response;
  }

  async analyzeWithMultipleModels(request: EmbeddingAnalysisRequest): Promise<EmbeddingAnalysisResponse> {
    const models = request.models || JAPANESE_EMBEDDING_MODELS.slice(0, 3).map(m => m.modelPath);
    const texts = Array.isArray(request.text) ? request.text : [request.text];
    
    logger.info('Starting multi-model embedding analysis', {
      modelCount: models.length,
      textCount: texts.length
    });

    const results = await Promise.allSettled(
      models.map(async (modelPath) => {
        const modelInfo = this.getModelInfo(modelPath);
        const startTime = Date.now();

        try {
          const response = await this.generateEmbeddings({
            text: request.text,
            model: modelPath,
            options: {
              normalize: request.options?.normalizeResults,
            }
          });

          return {
            model: modelPath,
            embeddings: response.embeddings,
            dimensions: response.embeddings[0]?.length || 0,
            metadata: {
              modelInfo,
              processingTime: Date.now() - startTime,
              tokenCount: response.usage.tokenCount
            }
          };
        } catch (error) {
          logger.warn(`Model ${modelPath} failed during analysis`, {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }
      })
    );

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    if (successfulResults.length === 0) {
      throw new Error('All embedding models failed during analysis');
    }

    let comparison: {
      bestModel: string;
      averageSimilarity: number;
      recommendation: string;
    } | undefined;
    if (request.options?.compareModels && successfulResults.length > 1) {
      comparison = this.compareEmbeddingResults(successfulResults, texts) || undefined;
    }

    const analysisResponse: EmbeddingAnalysisResponse = {
      results: successfulResults,
      comparison
    };

    logger.info('Multi-model embedding analysis completed', {
      successfulModels: successfulResults.length,
      totalModels: models.length,
      bestModel: comparison?.bestModel
    });

    return analysisResponse;
  }

  async getRecommendedModel(text: string, taskType?: TaskType): Promise<JapaneseEmbeddingModel> {
    const textLength = text.length;
    const hasSpecializedTerms = this.detectSpecializedTerms(text);
    
    // Rule-based model selection
    if (taskType === TaskType.CRITICAL || hasSpecializedTerms) {
      return JAPANESE_EMBEDDING_MODELS.find(m => m.id === 'tohoku-bert-v3') || JAPANESE_EMBEDDING_MODELS[0];
    }
    
    if (textLength < 100) {
      // Short text - use sentence-optimized model
      return JAPANESE_EMBEDDING_MODELS.find(m => m.useCase === 'sentence') || JAPANESE_EMBEDDING_MODELS[1];
    }
    
    if (textLength > 1000) {
      // Long text - use document-optimized model
      return JAPANESE_EMBEDDING_MODELS.find(m => m.useCase === 'document') || JAPANESE_EMBEDDING_MODELS[0];
    }

    // Default: general purpose model
    return JAPANESE_EMBEDDING_MODELS.find(m => m.useCase === 'general') || JAPANESE_EMBEDDING_MODELS[0];
  }

  private async tryFallbackModels(
    texts: string[],
    options?: EmbeddingRequest['options']
  ): Promise<EmbeddingResponse | null> {
    for (const fallbackModel of this.config.fallbackModels) {
      try {
        logger.info(`Trying fallback model: ${fallbackModel}`);
        
        const response = await this.huggingFaceClient.generateEmbeddings({
          text: texts,
          model: fallbackModel,
          options
        });
        
        logger.info(`Fallback model ${fallbackModel} succeeded`);
        return response;
        
      } catch (error) {
        logger.warn(`Fallback model ${fallbackModel} also failed`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return null;
  }

  private createBatches(texts: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }
    return batches;
  }

  private getCacheKey(texts: string[], model: string): string {
    const textHash = texts.join('|');
    return `${model}:${Buffer.from(textHash).toString('base64')}`;
  }

  private getModelInfo(modelPath: string): JapaneseEmbeddingModel {
    return JAPANESE_EMBEDDING_MODELS.find(m => m.modelPath === modelPath) || JAPANESE_EMBEDDING_MODELS[0];
  }

  private compareEmbeddingResults(results: any[], texts: string[]) {
    if (results.length < 2) return null;

    // Calculate average cosine similarity between different models
    const similarities: number[] = [];
    
    for (let i = 0; i < results.length - 1; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const sim = this.calculateCosineSimilarity(
          results[i].embeddings[0],
          results[j].embeddings[0]
        );
        similarities.push(sim);
      }
    }

    const averageSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    
    // Select best model based on processing time and dimensions
    const bestModel = results.reduce((best, current) => {
      const bestScore = (best.dimensions * 1000) / best.metadata.processingTime;
      const currentScore = (current.dimensions * 1000) / current.metadata.processingTime;
      return currentScore > bestScore ? current : best;
    });

    return {
      bestModel: bestModel.model,
      averageSimilarity,
      recommendation: this.generateRecommendation(bestModel, averageSimilarity, texts)
    };
  }

  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private generateRecommendation(bestModel: any, averageSimilarity: number, texts: string[]): string {
    const modelInfo = this.getModelInfo(bestModel.model);
    const textLength = texts.join(' ').length;
    const lengthDescriptor = textLength > 500 ? '長文' : '短文';

    if (averageSimilarity > 0.8) {
      return `高い一貫性（${(averageSimilarity * 100).toFixed(1)}%）。${modelInfo.name} を推奨します。（テキスト長: ${lengthDescriptor}）`;
    } else if (averageSimilarity > 0.6) {
      return `中程度の一貫性（${(averageSimilarity * 100).toFixed(1)}%）。用途に応じてモデルを選択してください。（テキスト長: ${lengthDescriptor}）`;
    } else {
      return `低い一貫性（${(averageSimilarity * 100).toFixed(1)}%）。テキストの性質を考慮したモデル選択が重要です。（テキスト長: ${lengthDescriptor}）`;
    }
  }

  private detectSpecializedTerms(text: string): boolean {
    const specializedPatterns = [
      /システム|サーバ|データベース|ネットワーク/,
      /エラー|障害|異常|復旧/,
      /設定|構成|パラメータ|環境/,
      /ログ|監視|メトリクス|アラート/
    ];
    
    return specializedPatterns.some(pattern => pattern.test(text));
  }

  private estimateTokenCount(texts: string[]): number {
    return texts.reduce((total, text) => {
      const japaneseCharCount = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
      const otherCharCount = text.length - japaneseCharCount;
      return total + Math.ceil(japaneseCharCount * 1.5 + otherCharCount * 0.25);
    }, 0);
  }

  clearCache(): void {
    this.embeddingCache.clear();
    logger.info('Embedding cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.embeddingCache.size,
      keys: Array.from(this.embeddingCache.keys())
    };
  }
}

export default EmbeddingService;
