import { HuggingFaceClient } from './huggingface-client';
import { 
  InferenceRequest, 
  InferenceResponse, 
  TaskType
} from '../types/huggingface';
import { logger } from '../utils/logger';
import { config as environmentConfig } from '../config/environment';

export interface InferenceServiceConfig {
  defaultModel: string;
  fallbackModels: string[];
  maxRetries: number;
  timeoutMs: number;
  rateLimitPerMinute: number;
}

export interface ModelTierConfig {
  [TaskType.BASIC]: string[];
  [TaskType.PREMIUM]: string[];
  [TaskType.CRITICAL]: string[];
}

export interface ConversationContext {
  conversationId: string;
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  metadata: {
    model: string;
    taskType: TaskType;
    totalTokens: number;
    cost: number;
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

export interface InferenceAnalysisResponse extends InferenceResponse {
  analysis: {
    confidence: number;
    relevance: number;
    completeness: number;
    recommendedFollowUp?: string[];
  };
  conversation?: {
    conversationId: string;
    continuationAvailable: boolean;
  };
  cost: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    budgetUsed: number;
  };
}

export class InferenceService {
  private huggingFaceClient: HuggingFaceClient;
  private config: InferenceServiceConfig;
  private modelTiers: ModelTierConfig;
  private conversationHistory: Map<string, ConversationContext>;
  private requestCounts: Map<string, { count: number; resetTime: number }>;

  constructor(huggingFaceClient: HuggingFaceClient, config?: Partial<InferenceServiceConfig>) {
    this.huggingFaceClient = huggingFaceClient;
    this.config = {
      defaultModel: 'microsoft/DialoGPT-medium',
      fallbackModels: [
        'rinna/japanese-gpt2-medium',
        'rinna/japanese-roberta-base',
        'cl-tohoku/bert-base-japanese-v3'
      ],
      maxRetries: 3,
      timeoutMs: environmentConfig.wallBounce.enableTimeout ? (environmentConfig.wallBounce.timeoutMs || 60000) : Number.MAX_SAFE_INTEGER,
      rateLimitPerMinute: 60,
      ...config
    };

    this.modelTiers = {
      [TaskType.BASIC]: [
        'rinna/japanese-gpt2-small',
        'cl-tohoku/bert-base-japanese',
      ],
      [TaskType.PREMIUM]: [
        'rinna/japanese-gpt2-medium',
        'microsoft/DialoGPT-medium',
        'cl-tohoku/bert-base-japanese-v3'
      ],
      [TaskType.CRITICAL]: [
        'rinna/japanese-gpt2-xsmall',
        'microsoft/DialoGPT-large',
        'cl-tohoku/bert-large-japanese-v2'
      ]
    };

    this.conversationHistory = new Map();
    this.requestCounts = new Map();
  }

  async generateInference(request: InferenceAnalysisRequest): Promise<InferenceAnalysisResponse> {
    const startTime = Date.now();
    
    // Rate limiting check
    if (!this.checkRateLimit(request.conversationId || 'anonymous')) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    // Select appropriate model based on task type
    const selectedModel = this.selectModel(request.taskType || TaskType.BASIC, request.model);
    
    // Prepare context and input
    const contextualInput = this.prepareContextualInput(request);
    
    logger.info('Starting inference generation', {
      model: selectedModel,
      taskType: request.taskType,
      conversationId: request.conversationId,
      inputLength: contextualInput.length
    });

    try {
      const inferenceRequest: InferenceRequest = {
        inputs: contextualInput,
        model: selectedModel,
        parameters: {
          max_new_tokens: request.parameters?.max_new_tokens || this.getDefaultMaxTokens(request.taskType),
          temperature: request.parameters?.temperature || 0.7,
          top_p: request.parameters?.top_p || 0.9,
          repetition_penalty: request.parameters?.repetition_penalty || 1.1,
          ...request.parameters
        },
        options: {
          wait_for_model: true,
          use_cache: false,
          ...request.options
        }
      };

      const response = await this.huggingFaceClient.retryWithBackoff(
        async () => await this.huggingFaceClient.generateInference(inferenceRequest),
        this.config.maxRetries
      );

      // Post-process response
      const processedResponse = this.postProcessResponse(response, request);
      
      // Update conversation history
      if (request.conversationId) {
        this.updateConversationHistory(request.conversationId, request, processedResponse);
      }

      // Calculate costs
      const cost = this.calculateCost(response, selectedModel);
      
      // Perform analysis
      const analysis = this.analyzeResponse(processedResponse.generated_text, request);

      const result: InferenceAnalysisResponse = {
        ...processedResponse,
        analysis,
        conversation: request.conversationId ? {
          conversationId: request.conversationId,
          continuationAvailable: true
        } : undefined,
        cost
      };

      logger.info('Inference generation completed', {
        model: selectedModel,
        processingTime: Date.now() - startTime,
        outputLength: processedResponse.generated_text.length,
        confidence: analysis.confidence
      });

      return result;

    } catch (error) {
      logger.error('Inference generation failed', {
        model: selectedModel,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Try fallback models
      const fallbackResponse = await this.tryFallbackInference(request, selectedModel);
      if (fallbackResponse) {
        return fallbackResponse;
      }

      throw error;
    }
  }

  async generateMultiModelInference(
    request: InferenceAnalysisRequest,
    models?: string[]
  ): Promise<Array<InferenceAnalysisResponse & { model: string }>> {
    const targetModels = models || this.modelTiers[request.taskType || TaskType.BASIC];
    
    logger.info('Starting multi-model inference', {
      modelCount: targetModels.length,
      taskType: request.taskType
    });

    const results = await Promise.allSettled(
      targetModels.map(async (model) => {
        const modelRequest = { ...request, model };
        const response = await this.generateInference(modelRequest);
        return { ...response, model };
      })
    );

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    if (successfulResults.length === 0) {
      throw new Error('All models failed during multi-model inference');
    }

    // Sort by confidence score
    successfulResults.sort((a, b) => b.analysis.confidence - a.analysis.confidence);

    logger.info('Multi-model inference completed', {
      successfulModels: successfulResults.length,
      bestModel: successfulResults[0]?.model,
      bestConfidence: successfulResults[0]?.analysis.confidence
    });

    return successfulResults;
  }

  async continueConversation(
    conversationId: string,
    userInput: string,
    options?: Partial<InferenceAnalysisRequest>
  ): Promise<InferenceAnalysisResponse> {
    const context = this.conversationHistory.get(conversationId);
    if (!context) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const request: InferenceAnalysisRequest = {
      inputs: userInput,
      model: context.metadata.model,
      taskType: context.metadata.taskType,
      conversationId,
      context: this.buildConversationContext(context),
      ...options
    };

    return await this.generateInference(request);
  }

  private selectModel(taskType: TaskType, preferredModel?: string): string {
    if (preferredModel && this.modelTiers[taskType].includes(preferredModel)) {
      return preferredModel;
    }

    const tierModels = this.modelTiers[taskType];
    return tierModels[0] || this.config.defaultModel;
  }

  private prepareContextualInput(request: InferenceAnalysisRequest): string {
    let input = request.inputs;

    // Add system context if requested
    if (request.options?.includeSystemContext) {
      const systemContext = this.buildSystemContext(request.taskType);
      input = `${systemContext}\n\n${input}`;
    }

    // Add conversation context
    if (request.conversationId && request.context) {
      input = `${request.context}\n\nUser: ${input}\nAssistant:`;
    }

    // Enforce Japanese language if requested
    if (request.options?.enforceJapanese) {
      input = `日本語で回答してください。\n\n${input}`;
    }

    // Limit context length if specified
    const maxLength = request.options?.maxContextLength || 2048;
    if (input.length > maxLength) {
      input = input.substring(input.length - maxLength);
    }

    return input;
  }

  private buildSystemContext(taskType?: TaskType): string {
    const baseContext = 'あなたはIT技術支援の専門家です。技術的な問題に対して正確で実用的な回答を提供してください。';
    
    switch (taskType) {
      case TaskType.CRITICAL:
        return `${baseContext} これは緊急度の高い問題です。迅速かつ確実な解決策を提示してください。`;
      case TaskType.PREMIUM:
        return `${baseContext} 詳細で包括的な分析と解決策を提供してください。`;
      default:
        return baseContext;
    }
  }

  private buildConversationContext(context: ConversationContext): string {
    const recentHistory = context.history.slice(-5); // Last 5 exchanges
    return recentHistory.map(entry => `${entry.role}: ${entry.content}`).join('\n');
  }

  private postProcessResponse(response: InferenceResponse, request: InferenceAnalysisRequest): InferenceResponse {
    let processedText = response.generated_text;

    // Clean up common artifacts
    processedText = processedText
      .replace(/^(User:|Assistant:|\s*)/g, '')
      .replace(/\s*<\|endoftext\|>\s*$/g, '')
      .trim();

    // Ensure Japanese output if requested
    if (request.options?.enforceJapanese && !/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(processedText)) {
      logger.warn('Non-Japanese output detected despite enforcement', {
        model: response.model,
        output: processedText.substring(0, 100)
      });
    }

    return {
      ...response,
      generated_text: processedText
    };
  }

  private analyzeResponse(text: string, request: InferenceAnalysisRequest) {
    const confidence = this.calculateConfidence(text, request);
    const relevance = this.calculateRelevance(text, request.inputs);
    const completeness = this.calculateCompleteness(text, request);

    return {
      confidence,
      relevance,
      completeness,
      recommendedFollowUp: this.generateFollowUpSuggestions(text, request)
    };
  }

  private calculateConfidence(text: string, request: InferenceAnalysisRequest): number {
    let confidence = 0.5; // Base confidence

    // Length-based confidence
    if (text.length > 50) confidence += 0.1;
    if (text.length > 200) confidence += 0.1;

    // Japanese content confidence
    const japaneseRatio = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length / text.length;
    confidence += japaneseRatio * 0.2;

    // Technical terms confidence
    const technicalTerms = ['システム', 'サーバ', 'エラー', '設定', '解決', '対処'];
    const techTermCount = technicalTerms.filter(term => text.includes(term)).length;
    confidence += (techTermCount / technicalTerms.length) * 0.1;

    // Task type weighting
    if (request.taskType === TaskType.CRITICAL) {
      confidence += 0.05;
    } else if (request.taskType === TaskType.PREMIUM) {
      confidence += 0.025;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateRelevance(response: string, input: string): number {
    const inputWords = input.split(/\s+/);
    const responseWords = response.split(/\s+/);
    
    const commonWords = inputWords.filter(word => 
      responseWords.some(rWord => rWord.includes(word) || word.includes(rWord))
    );
    
    return Math.min(commonWords.length / Math.max(inputWords.length, 1), 1.0);
  }

  private calculateCompleteness(text: string, request: InferenceAnalysisRequest): number {
    const expectedMinLength = this.getExpectedMinLength(request.taskType);
    const lengthRatio = Math.min(text.length / expectedMinLength, 1.0);
    
    // Check for complete sentences (Japanese periods)
    const sentenceCount = (text.match(/[。！？]/g) || []).length;
    const sentenceScore = Math.min(sentenceCount / 2, 0.5);
    
    return (lengthRatio * 0.7) + (sentenceScore * 0.3);
  }

  private generateFollowUpSuggestions(text: string, request: InferenceAnalysisRequest): string[] {
    const suggestions = [];
    
    if (text.includes('エラー') || text.includes('問題')) {
      suggestions.push('エラーログの詳細を確認してください');
      suggestions.push('追加の診断手順を実行しますか？');
    }
    
    if (text.includes('設定') || text.includes('構成')) {
      suggestions.push('設定変更の前にバックアップを作成してください');
      suggestions.push('この設定の影響範囲を確認しますか？');
    }
    
    if (request.taskType === TaskType.CRITICAL) {
      suggestions.push('緊急対応手順の詳細を確認しますか？');
      suggestions.push('関係者への報告は完了していますか？');
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private async tryFallbackInference(
    request: InferenceAnalysisRequest,
    failedModel: string
  ): Promise<InferenceAnalysisResponse | null> {
    const fallbackModels = this.config.fallbackModels.filter(m => m !== failedModel);
    
    for (const fallbackModel of fallbackModels) {
      try {
        logger.info(`Trying fallback inference model: ${fallbackModel}`);
        
        const fallbackRequest = { ...request, model: fallbackModel };
        return await this.generateInference(fallbackRequest);
        
      } catch (error) {
        logger.warn(`Fallback model ${fallbackModel} also failed`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return null;
  }

  private updateConversationHistory(
    conversationId: string,
    request: InferenceAnalysisRequest,
    response: InferenceResponse
  ): void {
    let context = this.conversationHistory.get(conversationId);
    
    if (!context) {
      context = {
        conversationId,
        history: [],
        metadata: {
          model: request.model || this.config.defaultModel,
          taskType: request.taskType || TaskType.BASIC,
          totalTokens: 0,
          cost: 0
        }
      };
    }

    context.history.push(
      {
        role: 'user',
        content: request.inputs,
        timestamp: new Date()
      },
      {
        role: 'assistant',
        content: response.generated_text,
        timestamp: new Date()
      }
    );

    context.metadata.totalTokens += response.usage.inputTokens + response.usage.outputTokens;
    
    // Limit history length
    if (context.history.length > 20) {
      context.history = context.history.slice(-20);
    }

    this.conversationHistory.set(conversationId, context);
  }

  private checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const key = identifier;
    const rateLimitData = this.requestCounts.get(key);

    if (!rateLimitData || now > rateLimitData.resetTime) {
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + 60000 // Reset every minute
      });
      return true;
    }

    if (rateLimitData.count >= this.config.rateLimitPerMinute) {
      return false;
    }

    rateLimitData.count++;
    return true;
  }

  private getDefaultMaxTokens(taskType?: TaskType): number {
    switch (taskType) {
      case TaskType.CRITICAL: return 1024;
      case TaskType.PREMIUM: return 768;
      default: return 512;
    }
  }

  private getExpectedMinLength(taskType?: TaskType): number {
    switch (taskType) {
      case TaskType.CRITICAL: return 200;
      case TaskType.PREMIUM: return 150;
      default: return 100;
    }
  }

  private calculateCost(response: InferenceResponse, model: string) {
    // Simplified cost calculation - in real implementation, use actual pricing
    const baseCostPerToken = 0.00001; // $0.00001 per token
    const inputCost = response.usage.inputTokens * baseCostPerToken;
    const outputCost = response.usage.outputTokens * baseCostPerToken * 2; // Output typically costs more
    const modelAdjustment = model.includes('critical') ? 1.75 : model.includes('premium') ? 1.3 : 1;
    const totalCost = (inputCost + outputCost) * modelAdjustment;

    return {
      inputCost,
      outputCost,
      totalCost,
      budgetUsed: 0.01 // Placeholder - implement actual budget tracking
    };
  }

  getConversationHistory(conversationId: string): ConversationContext | undefined {
    return this.conversationHistory.get(conversationId);
  }

  clearConversationHistory(conversationId: string): boolean {
    return this.conversationHistory.delete(conversationId);
  }

  getActiveConversations(): string[] {
    return Array.from(this.conversationHistory.keys());
  }
}

export default InferenceService;
