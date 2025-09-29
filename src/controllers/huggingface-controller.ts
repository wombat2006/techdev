import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { HuggingFaceClient, createHuggingFaceClient } from '../services/huggingface-client';
import EmbeddingService from '../services/embedding-service';
import InferenceService from '../services/inference-service';
import CostTrackingService from '../services/cost-tracking';
import { 
  TaskType, 
  JAPANESE_EMBEDDING_MODELS,
  EmbeddingRequest,
  InferenceAnalysisRequest 
} from '../types/huggingface';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/error-handler';

export class HuggingFaceController {
  private huggingFaceClient: HuggingFaceClient;
  private embeddingService: EmbeddingService;
  private inferenceService: InferenceService;
  private costTrackingService: CostTrackingService;

  constructor() {
    this.huggingFaceClient = createHuggingFaceClient();
    this.embeddingService = new EmbeddingService(this.huggingFaceClient);
    this.inferenceService = new InferenceService(this.huggingFaceClient);
    this.costTrackingService = new CostTrackingService();
  }

  // Health check endpoint
  healthCheck = asyncHandler(async (req: Request, res: Response) => {
    const isConnected = await this.huggingFaceClient.testConnection();
    
    res.status(isConnected ? 200 : 503).json({
      status: isConnected ? 'healthy' : 'unhealthy',
      service: 'techsapo-integration',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // System information endpoint
  getSystemInfo = asyncHandler(async (req: Request, res: Response) => {
    const availableModels = this.huggingFaceClient.getAvailableEmbeddingModels();
    const costSummary = this.costTrackingService.getGlobalCostSummary();

    res.json({
      service: 'TechSapo Hugging Face Integration',
      version: '1.0.0',
      features: [
        'Japanese Embedding Models',
        'Multi-Model Analysis',
        'Text Generation',
        'Cost Tracking',
        'Conversation Management'
      ],
      availableModels: availableModels.map(model => ({
        id: model.id,
        name: model.name,
        useCase: model.useCase,
        maxLength: model.maxLength,
        dimensions: model.dimensions
      })),
      budgetStatus: {
        monthlyBudget: costSummary.monthlyBudget,
        currentUsage: costSummary.totalCost,
        budgetUsed: costSummary.budgetUsed,
        requestCount: costSummary.requestCount
      },
      timestamp: new Date().toISOString()
    });
  });

  // Generate embeddings
  generateEmbeddings = asyncHandler(async (req: Request, res: Response) => {
    const { text, model, options } = req.body;
    const userId = (req.headers['x-user-id'] as string) || 'anonymous';
    const sessionId = req.headers['x-session-id'] as string || uuidv4();

    logger.info('Generating embeddings', {
      userId,
      sessionId,
      model: model || 'default',
      textLength: Array.isArray(text) ? text.join('').length : text.length
    });

    const embeddingRequest: EmbeddingRequest = {
      text,
      model,
      options
    };

    const response = await this.embeddingService.generateEmbeddings(embeddingRequest);
    
    // Track costs
    const costRecord = this.costTrackingService.trackCost(
      userId,
      sessionId,
      response.model,
      response.usage.tokenCount,
      0, // Embeddings don't have output tokens
      TaskType.BASIC
    );

    res.json({
      success: true,
      data: {
        embeddings: response.embeddings,
        model: response.model,
        dimensions: response.embeddings[0]?.length || 0,
        tokenCount: response.usage.tokenCount,
        processingTime: response.usage.processingTime
      },
      cost: {
        inputTokens: response.usage.tokenCount,
        cost: costRecord.cost,
        currency: 'USD'
      },
      metadata: {
        userId,
        sessionId,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Multi-model embedding analysis
  analyzeWithMultipleModels = asyncHandler(async (req: Request, res: Response) => {
    const { text, models, options } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const sessionId = req.headers['x-session-id'] as string || uuidv4();

    logger.info('Starting multi-model analysis', {
      userId,
      sessionId,
      modelCount: models?.length || 3,
      textLength: Array.isArray(text) ? text.join('').length : text.length
    });

    const analysisRequest = {
      text,
      models,
      options: {
        compareModels: true,
        normalizeResults: true,
        includeMetadata: true,
        ...options
      }
    };

    const response = await this.embeddingService.analyzeWithMultipleModels(analysisRequest);
    
    // Track costs for each model used
    const costRecords = response.results.map(result => 
      this.costTrackingService.trackCost(
        userId,
        sessionId,
        result.model,
        result.metadata.tokenCount,
        0,
        TaskType.PREMIUM
      )
    );

    const totalCost = costRecords.reduce((sum, record) => sum + record.cost, 0);

    res.json({
      success: true,
      data: {
        results: response.results.map(result => ({
          model: result.model,
          modelInfo: result.metadata.modelInfo,
          dimensions: result.dimensions,
          processingTime: result.metadata.processingTime,
          tokenCount: result.metadata.tokenCount,
          embeddings: result.embeddings
        })),
        comparison: response.comparison,
        recommendation: response.comparison?.recommendation
      },
      cost: {
        totalCost,
        breakdown: costRecords.map(record => ({
          model: record.model,
          cost: record.cost,
          inputTokens: record.inputTokens
        })),
        currency: 'USD'
      },
      metadata: {
        userId,
        sessionId,
        modelsUsed: response.results.length,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Generate text inference
  generateInference = asyncHandler(async (req: Request, res: Response) => {
    const { inputs, model, taskType, conversationId, context, parameters, options } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const sessionId = req.headers['x-session-id'] as string || conversationId || uuidv4();

    logger.info('Generating inference', {
      userId,
      sessionId,
      model,
      taskType: taskType || TaskType.BASIC,
      inputLength: inputs.length
    });

    const inferenceRequest: InferenceAnalysisRequest = {
      inputs,
      model,
      taskType: taskType || TaskType.BASIC,
      conversationId: sessionId,
      context,
      parameters,
      options: {
        includeSystemContext: true,
        enforceJapanese: true,
        ...options
      }
    };

    const response = await this.inferenceService.generateInference(inferenceRequest);
    
    // Track costs
    const costRecord = this.costTrackingService.trackCost(
      userId,
      sessionId,
      response.model,
      response.usage.inputTokens,
      response.usage.outputTokens,
      taskType || TaskType.BASIC
    );

    res.json({
      success: true,
      data: {
        response: response.generated_text,
        model: response.model,
        analysis: response.analysis,
        conversation: response.conversation
      },
      cost: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        processingTime: response.usage.processingTime,
        cost: costRecord.cost,
        currency: 'USD'
      },
      metadata: {
        userId,
        sessionId,
        taskType: taskType || TaskType.BASIC,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Continue conversation
  continueConversation = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId, userInput, options } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    logger.info('Continuing conversation', {
      userId,
      conversationId,
      inputLength: userInput.length
    });

    const response = await this.inferenceService.continueConversation(
      conversationId,
      userInput,
      options
    );

    // Track costs
    const costRecord = this.costTrackingService.trackCost(
      userId,
      conversationId,
      response.model,
      response.usage.inputTokens,
      response.usage.outputTokens,
      TaskType.BASIC
    );

    res.json({
      success: true,
      data: {
        response: response.generated_text,
        analysis: response.analysis,
        conversation: response.conversation
      },
      cost: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cost: costRecord.cost,
        currency: 'USD'
      },
      metadata: {
        userId,
        conversationId,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Get conversation history
  getConversationHistory = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    const history = this.inferenceService.getConversationHistory(conversationId);
    
    if (!history) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
        conversationId
      });
      return;
    }

    res.json({
      success: true,
      data: {
        conversationId,
        history: history.history.map(entry => ({
          role: entry.role,
          content: entry.content,
          timestamp: entry.timestamp
        })),
        metadata: {
          ...(history.metadata || {}),
          requestedBy: userId
        },
        totalMessages: history.history.length
      }
    });
  });

  // Recommend best model for text
  recommendModel = asyncHandler(async (req: Request, res: Response) => {
    const { text, taskType } = req.body;

    const recommendation = await this.embeddingService.getRecommendedModel(
      text,
      taskType as TaskType
    );

    res.json({
      success: true,
      data: {
        recommendedModel: recommendation,
        reasoning: this.getRecommendationReasoning(text, recommendation, taskType),
        alternatives: JAPANESE_EMBEDDING_MODELS
          .filter(model => model.id !== recommendation.id)
          .slice(0, 3)
      }
    });
  });

  // Get cost summary
  getCostSummary = asyncHandler(async (req: Request, res: Response) => {
    const { days = 30 } = req.query;
    const userId = req.headers['x-user-id'] as string;
    
    let summary;
    if (userId && userId !== 'anonymous') {
      summary = this.costTrackingService.getUserCostSummary(userId, Number(days));
    } else {
      summary = this.costTrackingService.getGlobalCostSummary(Number(days));
    }

    res.json({
      success: true,
      data: summary,
      metadata: {
        period: `${days} days`,
        userId: userId || 'global',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Get budget alerts
  getBudgetAlerts = asyncHandler(async (req: Request, res: Response) => {
    const { hours = 24 } = req.query;
    
    const alerts = this.costTrackingService.getRecentAlerts(Number(hours));
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        period: `${hours} hours`
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  });

  // Get daily cost report
  getDailyReport = asyncHandler(async (req: Request, res: Response) => {
    const report = this.costTrackingService.generateDailyReport();
    
    res.json({
      success: true,
      data: report,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  });

  // Get available models
  getAvailableModels = asyncHandler(async (req: Request, res: Response) => {
    const models = this.huggingFaceClient.getAvailableEmbeddingModels();
    
    res.json({
      success: true,
      data: {
        embeddingModels: models,
        count: models.length,
        supportedLanguages: ['japanese'],
        supportedUseCases: ['sentence', 'document', 'general']
      }
    });
  });

  // Predict request cost
  predictCost = asyncHandler(async (req: Request, res: Response) => {
    const { model, estimatedInputTokens, estimatedOutputTokens, taskType } = req.body;
    
    const prediction = this.costTrackingService.predictCost(
      model,
      estimatedInputTokens || 100,
      estimatedOutputTokens || 0,
      taskType || TaskType.BASIC
    );
    
    res.json({
      success: true,
      data: prediction,
      metadata: {
        model,
        taskType: taskType || TaskType.BASIC,
        timestamp: new Date().toISOString()
      }
    });
  });

  private getRecommendationReasoning(text: string, model: any, taskType?: TaskType): string {
    const textLength = text.length;
    let reasoning = `推奨理由: `;

    if (taskType === TaskType.CRITICAL) {
      reasoning += '緊急度の高いタスクのため、最高品質のモデルを選択しました。';
    } else if (textLength < 100) {
      reasoning += '短いテキストのため、文レベル処理に最適化されたモデルを選択しました。';
    } else if (textLength > 1000) {
      reasoning += '長いテキストのため、文書レベル処理に適したモデルを選択しました。';
    } else {
      reasoning += '一般的な用途に適した汎用性の高いモデルを選択しました。';
    }

    reasoning += ` モデル特徴: ${model.description}`;
    
    return reasoning;
  }
}

export default HuggingFaceController;
