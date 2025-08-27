"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuggingFaceController = void 0;
const uuid_1 = require("uuid");
const huggingface_client_1 = require("../services/huggingface-client");
const embedding_service_1 = __importDefault(require("../services/embedding-service"));
const inference_service_1 = __importDefault(require("../services/inference-service"));
const cost_tracking_1 = __importDefault(require("../services/cost-tracking"));
const huggingface_1 = require("../types/huggingface");
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../middleware/error-handler");
class HuggingFaceController {
    huggingFaceClient;
    embeddingService;
    inferenceService;
    costTrackingService;
    constructor() {
        this.huggingFaceClient = (0, huggingface_client_1.createHuggingFaceClient)();
        this.embeddingService = new embedding_service_1.default(this.huggingFaceClient);
        this.inferenceService = new inference_service_1.default(this.huggingFaceClient);
        this.costTrackingService = new cost_tracking_1.default();
    }
    // Health check endpoint
    healthCheck = (0, error_handler_1.asyncHandler)(async (req, res) => {
        const isConnected = await this.huggingFaceClient.testConnection();
        res.status(isConnected ? 200 : 503).json({
            status: isConnected ? 'healthy' : 'unhealthy',
            service: 'huggingface-integration',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    });
    // System information endpoint
    getSystemInfo = (0, error_handler_1.asyncHandler)(async (req, res) => {
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
    generateEmbeddings = (0, error_handler_1.asyncHandler)(async (req, res) => {
        const { text, model, options } = req.body;
        const userId = req.headers['x-user-id'] || 'anonymous';
        const sessionId = req.headers['x-session-id'] || (0, uuid_1.v4)();
        logger_1.logger.info('Generating embeddings', {
            userId,
            sessionId,
            model: model || 'default',
            textLength: Array.isArray(text) ? text.join('').length : text.length
        });
        const embeddingRequest = {
            text,
            model,
            options
        };
        const response = await this.embeddingService.generateEmbeddings(embeddingRequest);
        // Track costs
        const costRecord = this.costTrackingService.trackCost(userId, sessionId, response.model, response.usage.tokenCount, 0, // Embeddings don't have output tokens
        huggingface_1.TaskType.BASIC);
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
    analyzeWithMultipleModels = (0, error_handler_1.asyncHandler)(async (req, res) => {
        const { text, models, options } = req.body;
        const userId = req.headers['x-user-id'] || 'anonymous';
        const sessionId = req.headers['x-session-id'] || (0, uuid_1.v4)();
        logger_1.logger.info('Starting multi-model analysis', {
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
        const costRecords = response.results.map(result => this.costTrackingService.trackCost(userId, sessionId, result.model, result.metadata.tokenCount, 0, huggingface_1.TaskType.PREMIUM));
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
    generateInference = (0, error_handler_1.asyncHandler)(async (req, res) => {
        const { inputs, model, taskType, conversationId, context, parameters, options } = req.body;
        const userId = req.headers['x-user-id'] || 'anonymous';
        const sessionId = req.headers['x-session-id'] || conversationId || (0, uuid_1.v4)();
        logger_1.logger.info('Generating inference', {
            userId,
            sessionId,
            model,
            taskType: taskType || huggingface_1.TaskType.BASIC,
            inputLength: inputs.length
        });
        const inferenceRequest = {
            inputs,
            model,
            taskType: taskType || huggingface_1.TaskType.BASIC,
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
        const costRecord = this.costTrackingService.trackCost(userId, sessionId, response.model, response.usage.inputTokens, response.usage.outputTokens, taskType || huggingface_1.TaskType.BASIC);
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
                taskType: taskType || huggingface_1.TaskType.BASIC,
                timestamp: new Date().toISOString()
            }
        });
    });
    // Continue conversation
    continueConversation = (0, error_handler_1.asyncHandler)(async (req, res) => {
        const { conversationId, userInput, options } = req.body;
        const userId = req.headers['x-user-id'] || 'anonymous';
        logger_1.logger.info('Continuing conversation', {
            userId,
            conversationId,
            inputLength: userInput.length
        });
        const response = await this.inferenceService.continueConversation(conversationId, userInput, options);
        // Track costs
        const costRecord = this.costTrackingService.trackCost(userId, conversationId, response.model, response.usage.inputTokens, response.usage.outputTokens, huggingface_1.TaskType.BASIC);
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
    getConversationHistory = (0, error_handler_1.asyncHandler)(async (req, res) => {
        const { conversationId } = req.params;
        const userId = req.headers['x-user-id'] || 'anonymous';
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
                metadata: history.metadata,
                totalMessages: history.history.length
            }
        });
    });
    // Recommend best model for text
    recommendModel = (0, error_handler_1.asyncHandler)(async (req, res) => {
        const { text, taskType } = req.body;
        const recommendation = await this.embeddingService.getRecommendedModel(text, taskType);
        res.json({
            success: true,
            data: {
                recommendedModel: recommendation,
                reasoning: this.getRecommendationReasoning(text, recommendation, taskType),
                alternatives: huggingface_1.JAPANESE_EMBEDDING_MODELS
                    .filter(model => model.id !== recommendation.id)
                    .slice(0, 3)
            }
        });
    });
    // Get cost summary
    getCostSummary = (0, error_handler_1.asyncHandler)(async (req, res) => {
        const { days = 30 } = req.query;
        const userId = req.headers['x-user-id'];
        let summary;
        if (userId && userId !== 'anonymous') {
            summary = this.costTrackingService.getUserCostSummary(userId, Number(days));
        }
        else {
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
    getBudgetAlerts = (0, error_handler_1.asyncHandler)(async (req, res) => {
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
    getDailyReport = (0, error_handler_1.asyncHandler)(async (req, res) => {
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
    getAvailableModels = (0, error_handler_1.asyncHandler)(async (req, res) => {
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
    predictCost = (0, error_handler_1.asyncHandler)(async (req, res) => {
        const { model, estimatedInputTokens, estimatedOutputTokens, taskType } = req.body;
        const prediction = this.costTrackingService.predictCost(model, estimatedInputTokens || 100, estimatedOutputTokens || 0, taskType || huggingface_1.TaskType.BASIC);
        res.json({
            success: true,
            data: prediction,
            metadata: {
                model,
                taskType: taskType || huggingface_1.TaskType.BASIC,
                timestamp: new Date().toISOString()
            }
        });
    });
    getRecommendationReasoning(text, model, taskType) {
        const textLength = text.length;
        let reasoning = `推奨理由: `;
        if (taskType === huggingface_1.TaskType.CRITICAL) {
            reasoning += '緊急度の高いタスクのため、最高品質のモデルを選択しました。';
        }
        else if (textLength < 100) {
            reasoning += '短いテキストのため、文レベル処理に最適化されたモデルを選択しました。';
        }
        else if (textLength > 1000) {
            reasoning += '長いテキストのため、文書レベル処理に適したモデルを選択しました。';
        }
        else {
            reasoning += '一般的な用途に適した汎用性の高いモデルを選択しました。';
        }
        reasoning += ` モデル特徴: ${model.description}`;
        return reasoning;
    }
}
exports.HuggingFaceController = HuggingFaceController;
exports.default = HuggingFaceController;
//# sourceMappingURL=huggingface-controller.js.map