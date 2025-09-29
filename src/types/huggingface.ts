export interface HuggingFaceConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface EmbeddingRequest {
  text: string | string[];
  model?: string;
  options?: {
    normalize?: boolean;
    truncate?: boolean;
  };
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    tokenCount: number;
    processingTime: number;
  };
}

export interface InferenceRequest {
  inputs: string;
  model: string;
  parameters?: {
    max_new_tokens?: number;
    temperature?: number;
    top_p?: number;
    repetition_penalty?: number;
  };
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface InferenceAnalysisRequest extends InferenceRequest {
  taskType?: TaskType;
  conversationId?: string;
  context?: string;
  options?: InferenceRequest['options'] & {
    includeSystemContext?: boolean;
    enforceJapanese?: boolean;
    maxContextLength?: number;
  };
}

export interface InferenceResponse {
  generated_text: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    processingTime: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  pipeline_tag: string;
  language: string[];
  license: string;
  downloads: number;
  likes: number;
  library_name: string;
  tags: string[];
}

export interface CostTracking {
  userId: string;
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

export interface JapaneseEmbeddingModel {
  id: string;
  name: string;
  description: string;
  modelPath: string;
  maxLength: number;
  dimensions: number;
  language: 'japanese';
  useCase: 'sentence' | 'document' | 'general';
}

export const JAPANESE_EMBEDDING_MODELS: JapaneseEmbeddingModel[] = [
  {
    id: 'tohoku-bert-v3',
    name: 'cl-tohoku/bert-base-japanese-v3',
    description: 'BERT base model for Japanese (v3) - 東北大学',
    modelPath: 'cl-tohoku/bert-base-japanese-v3',
    maxLength: 512,
    dimensions: 768,
    language: 'japanese',
    useCase: 'general'
  },
  {
    id: 'sentence-bert-ja',
    name: 'sonoisa/sentence-bert-base-ja-mean-tokens-v2',
    description: 'Sentence-BERT for Japanese with mean token pooling',
    modelPath: 'sonoisa/sentence-bert-base-ja-mean-tokens-v2',
    maxLength: 512,
    dimensions: 768,
    language: 'japanese',
    useCase: 'sentence'
  },
  {
    id: 'colorful-sbert',
    name: 'colorfulscoop/sbert-base-ja',
    description: 'Sentence-BERT base model for Japanese - ColorfulScoop',
    modelPath: 'colorfulscoop/sbert-base-ja',
    maxLength: 512,
    dimensions: 768,
    language: 'japanese',
    useCase: 'sentence'
  },
  {
    id: 'rinna-roberta',
    name: 'rinna/japanese-roberta-base',
    description: 'RoBERTa base model for Japanese - rinna Co., Ltd.',
    modelPath: 'rinna/japanese-roberta-base',
    maxLength: 512,
    dimensions: 768,
    language: 'japanese',
    useCase: 'general'
  },
  {
    id: 'tohoku-bert-v2',
    name: 'tohoku-nlp/bert-base-japanese-v2',
    description: 'BERT base model for Japanese (v2) - 東北大学NLP研究室',
    modelPath: 'tohoku-nlp/bert-base-japanese-v2',
    maxLength: 512,
    dimensions: 768,
    language: 'japanese',
    useCase: 'general'
  }
];

/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
export enum TaskType {
  BASIC = 'basic',
  PREMIUM = 'premium', 
  CRITICAL = 'critical'
}
/* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */

export interface HuggingFaceError extends Error {
  error: string;
  statusCode: number;
  details?: any;
  model?: string;
  retryable: boolean;
}
