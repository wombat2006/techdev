import { Router } from 'express';
import HuggingFaceController from '../controllers/huggingface-controller';
import { 
  embeddingValidation,
  inferenceValidation,
  conversationValidation,
  multiModelValidation,
  sanitizeInput,
  rateLimiter
} from '../middleware/validation';

const router = Router();
const controller = new HuggingFaceController();

// Apply common middleware
router.use(sanitizeInput);
router.use(rateLimiter(60)); // 60 requests per minute

// Health and system endpoints
router.get('/health', controller.healthCheck);
router.get('/info', controller.getSystemInfo);
router.get('/models', controller.getAvailableModels);

// Embedding endpoints
router.post('/embeddings', embeddingValidation, controller.generateEmbeddings);
router.post('/embeddings/analyze', multiModelValidation, controller.analyzeWithMultipleModels);
router.post('/embeddings/recommend', controller.recommendModel);

// Inference endpoints  
router.post('/generate', inferenceValidation, controller.generateInference);
router.post('/conversation/continue', conversationValidation, controller.continueConversation);
router.get('/conversation/:conversationId', controller.getConversationHistory);

// Cost and monitoring endpoints
router.get('/cost/summary', controller.getCostSummary);
router.get('/cost/alerts', controller.getBudgetAlerts);
router.get('/cost/report/daily', controller.getDailyReport);
router.post('/cost/predict', controller.predictCost);

export default router;