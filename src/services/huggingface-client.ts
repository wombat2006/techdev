import { HfInference } from '@huggingface/inference';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  HuggingFaceConfig,
  EmbeddingRequest,
  EmbeddingResponse,
  InferenceRequest,
  InferenceResponse,
  ModelInfo,
  HuggingFaceError,
  JAPANESE_EMBEDDING_MODELS,
  JapaneseEmbeddingModel
} from '../types/huggingface';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

export class HuggingFaceClient {
  private hf: HfInference;
  private httpClient: AxiosInstance;
  private config: HuggingFaceConfig;

  constructor(huggingFaceConfig: HuggingFaceConfig) {
    this.config = huggingFaceConfig;
    this.hf = new HfInference(huggingFaceConfig.apiKey);
    
    this.httpClient = axios.create({
      baseURL: huggingFaceConfig.baseUrl,
      timeout: huggingFaceConfig.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${huggingFaceConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.info('HuggingFace API Request', {
          url: config.url,
          method: config.method,
          timestamp: new Date().toISOString()
        });
        return config;
      },
      (error) => {
        logger.error('HuggingFace API Request Error', error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        logger.info('HuggingFace API Response', {
          status: response.status,
          url: response.config.url,
          timestamp: new Date().toISOString()
        });
        return response;
      },
      (error: AxiosError) => {
        const huggingFaceError = this.handleApiError(error);
        logger.error('HuggingFace API Error', huggingFaceError);
        return Promise.reject(huggingFaceError);
      }
    );
  }

  private handleApiError(error: AxiosError): HuggingFaceError {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data as any;
    const errorMessage = errorData?.error || error.message || 'Unknown HuggingFace API error';
    
    const hfError = new Error(errorMessage) as HuggingFaceError;
    hfError.error = errorMessage;
    hfError.statusCode = statusCode;
    hfError.details = errorData;
    hfError.model = error.config?.url?.split('/').pop();
    hfError.retryable = statusCode >= 500 || statusCode === 429;
    
    return hfError;
  }

  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const model = request.model || JAPANESE_EMBEDDING_MODELS[0].modelPath;
    
    try {
      logger.info('Generating embeddings', {
        model,
        textCount: Array.isArray(request.text) ? request.text.length : 1
      });

      const response = await this.hf.featureExtraction({
        model,
        inputs: request.text
      });

      const embeddings = Array.isArray(response[0]) ? response as number[][] : [response as number[]];
      const processingTime = Date.now() - startTime;

      const result: EmbeddingResponse = {
        embeddings,
        model,
        usage: {
          tokenCount: this.estimateTokenCount(request.text),
          processingTime
        }
      };

      logger.info('Embeddings generated successfully', {
        model,
        embeddingCount: embeddings.length,
        dimensions: embeddings[0]?.length,
        processingTime
      });

      return result;
    } catch (error) {
      logger.error('Failed to generate embeddings', {
        model,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async generateInference(request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Generating text inference', {
        model: request.model,
        inputLength: request.inputs.length
      });

      const response = await this.hf.textGeneration({
        model: request.model,
        inputs: request.inputs,
        parameters: {
          max_new_tokens: request.parameters?.max_new_tokens || 512,
          temperature: request.parameters?.temperature || 0.7,
          top_p: request.parameters?.top_p || 0.9,
          repetition_penalty: request.parameters?.repetition_penalty || 1.1,
          return_full_text: false,
        },
        options: {
          wait_for_model: request.options?.wait_for_model ?? true,
          use_cache: request.options?.use_cache ?? true
        }
      });

      const processingTime = Date.now() - startTime;
      const inputTokens = this.estimateTokenCount(request.inputs);
      const outputTokens = this.estimateTokenCount(response.generated_text);

      const result: InferenceResponse = {
        generated_text: response.generated_text,
        model: request.model,
        usage: {
          inputTokens,
          outputTokens,
          processingTime
        }
      };

      logger.info('Inference generated successfully', {
        model: request.model,
        inputTokens,
        outputTokens,
        processingTime
      });

      return result;
    } catch (error) {
      logger.error('Failed to generate inference', {
        model: request.model,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getModelInfo(modelId: string): Promise<ModelInfo> {
    try {
      logger.info('Fetching model information', { modelId });
      
      const response = await this.httpClient.get(`/models/${modelId}`);
      const modelData = response.data;

      const modelInfo: ModelInfo = {
        id: modelData.id,
        name: modelData.id,
        description: modelData.cardData?.description || '',
        pipeline_tag: modelData.pipeline_tag,
        language: modelData.cardData?.language || [],
        license: modelData.cardData?.license || 'unknown',
        downloads: modelData.downloads || 0,
        likes: modelData.likes || 0,
        library_name: modelData.library_name || '',
        tags: modelData.tags || []
      };

      logger.info('Model information fetched successfully', { modelId });
      return modelInfo;
    } catch (error) {
      logger.error('Failed to fetch model information', {
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  getAvailableEmbeddingModels(): JapaneseEmbeddingModel[] {
    return JAPANESE_EMBEDDING_MODELS;
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing HuggingFace connection');
      
      // Use a simple feature extraction request to test connection
      const testText = 'テスト';
      await this.generateEmbeddings({
        text: testText,
        model: JAPANESE_EMBEDDING_MODELS[0].modelPath
      });

      logger.info('HuggingFace connection test successful');
      return true;
    } catch (error) {
      logger.error('HuggingFace connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private estimateTokenCount(text: string | string[]): number {
    if (Array.isArray(text)) {
      return text.reduce((total, t) => total + this.estimateTokenCount(t), 0);
    }
    
    // Japanese text token estimation (rough approximation)
    // Japanese characters typically represent 1-2 tokens each
    const japaneseCharCount = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
    const otherCharCount = text.length - japaneseCharCount;
    
    return Math.ceil(japaneseCharCount * 1.5 + otherCharCount * 0.25);
  }

  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryAttempts || 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || (error as HuggingFaceError)?.retryable === false) {
          break;
        }

        const delay = initialDelay * Math.pow(2, attempt);
        logger.warn(`Retrying operation after ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

// Factory function to create HuggingFace client instance
export const createHuggingFaceClient = (): HuggingFaceClient => {
  // For testing, check if we should use mock
  if (process.env.NODE_ENV === 'development' && process.env.USE_HF_MOCK === 'true') {
    const { HuggingFaceMockClient } = require('./huggingface-mock');
    logger.info('Using Hugging Face Mock Client for development');
    return new HuggingFaceMockClient(config.huggingface) as any;
  }
  
  return new HuggingFaceClient(config.huggingface);
};

export default HuggingFaceClient;