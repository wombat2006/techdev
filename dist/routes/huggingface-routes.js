"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const huggingface_controller_1 = __importDefault(require("../controllers/huggingface-controller"));
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
const controller = new huggingface_controller_1.default();
// Apply common middleware
router.use(validation_1.sanitizeInput);
router.use((0, validation_1.rateLimiter)(60)); // 60 requests per minute
// Health and system endpoints
router.get('/health', controller.healthCheck);
router.get('/info', controller.getSystemInfo);
router.get('/models', controller.getAvailableModels);
// Embedding endpoints
router.post('/embeddings', validation_1.embeddingValidation, controller.generateEmbeddings);
router.post('/embeddings/analyze', validation_1.multiModelValidation, controller.analyzeWithMultipleModels);
router.post('/embeddings/recommend', controller.recommendModel);
// Inference endpoints  
router.post('/generate', validation_1.inferenceValidation, controller.generateInference);
router.post('/conversation/continue', validation_1.conversationValidation, controller.continueConversation);
router.get('/conversation/:conversationId', controller.getConversationHistory);
// Cost and monitoring endpoints
router.get('/cost/summary', controller.getCostSummary);
router.get('/cost/alerts', controller.getBudgetAlerts);
router.get('/cost/report/daily', controller.getDailyReport);
router.post('/cost/predict', controller.predictCost);
exports.default = router;
//# sourceMappingURL=huggingface-routes.js.map