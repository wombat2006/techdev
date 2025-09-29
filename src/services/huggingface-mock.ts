import { 
  EmbeddingRequest, 
  EmbeddingResponse, 
  InferenceRequest, 
  InferenceResponse,
  ModelInfo,
  JAPANESE_EMBEDDING_MODELS
} from '../types/huggingface';
import { logger } from '../utils/logger';

export class HuggingFaceMockClient {
  private config: any;
  
  constructor(config: any) {
    this.config = config;
  }

  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const model = request.model || JAPANESE_EMBEDDING_MODELS[0].modelPath;
    
    logger.info('Mock: Generating embeddings', {
      model,
      textCount: Array.isArray(request.text) ? request.text.length : 1
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const texts = Array.isArray(request.text) ? request.text : [request.text];
    const dimensions = 768; // Standard BERT dimensions
    
    // Generate mock embeddings (random but consistent for same input)
    const embeddings = texts.map(text => {
      const seed = this.hashString(text + model);
      return this.generateMockEmbedding(dimensions, seed);
    });

    const processingTime = Date.now() - startTime;
    const tokenCount = this.estimateTokenCount(texts);

    const result: EmbeddingResponse = {
      embeddings,
      model,
      usage: {
        tokenCount,
        processingTime
      }
    };

    logger.info('Mock: Embeddings generated successfully', {
      model,
      embeddingCount: embeddings.length,
      dimensions,
      processingTime
    });

    return result;
  }

  async generateInference(request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = Date.now();
    
    logger.info('Mock: Generating text inference', {
      model: request.model,
      inputLength: request.inputs.length
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));

    // Generate mock response based on input
    const responses = [
      'システムエラーの解決方法を説明します。まず、ログファイルを確認してください。',
      'この問題は設定ファイルの不備が原因と考えられます。以下の手順で修正できます。',
      'データベース接続エラーが発生しています。接続設定を見直してください。',
      'サーバーの再起動が必要です。メンテナンス時間を設定してください。',
      'セキュリティパッチの適用をお勧めします。システムを最新状態に保ってください。'
    ];

    const seed = this.hashString(request.inputs + request.model);
    const generated_text = responses[seed % responses.length];
    
    const processingTime = Date.now() - startTime;
    const inputTokens = this.estimateTokenCount([request.inputs]);
    const outputTokens = this.estimateTokenCount([generated_text]);

    const result: InferenceResponse = {
      generated_text,
      model: request.model,
      usage: {
        inputTokens,
        outputTokens,
        processingTime
      }
    };

    logger.info('Mock: Inference generated successfully', {
      model: request.model,
      inputTokens,
      outputTokens,
      processingTime
    });

    return result;
  }

  async getModelInfo(modelId: string): Promise<ModelInfo> {
    logger.info('Mock: Fetching model information', { modelId });
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      id: modelId,
      name: modelId,
      description: `Mock description for ${modelId}`,
      pipeline_tag: 'feature-extraction',
      language: ['japanese', 'english'],
      license: 'apache-2.0',
      downloads: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 1000),
      library_name: 'transformers',
      tags: ['pytorch', 'bert', 'feature-extraction']
    };
  }

  getAvailableEmbeddingModels() {
    return JAPANESE_EMBEDDING_MODELS;
  }

  async testConnection(): Promise<boolean> {
    logger.info('Mock: Testing connection (always returns true)');
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    logger.debug('Mock retryWithBackoff invoked', {
      maxRetries,
      initialDelay
    });
    // Mock implementation - just execute once
    return await operation();
  }

  private generateMockEmbedding(dimensions: number, seed: number): number[] {
    const embedding = [];
    let currentSeed = seed;
    
    for (let i = 0; i < dimensions; i++) {
      // Simple linear congruential generator for consistent random numbers
      currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
      const random = currentSeed / 0x7fffffff;
      embedding.push((random - 0.5) * 2); // Range [-1, 1]
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private estimateTokenCount(texts: string[]): number {
    return texts.reduce((total, text) => {
      const japaneseCharCount = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
      const otherCharCount = text.length - japaneseCharCount;
      return total + Math.ceil(japaneseCharCount * 1.5 + otherCharCount * 0.25);
    }, 0);
  }
}

export default HuggingFaceMockClient;
