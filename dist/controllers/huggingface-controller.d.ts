import { Request, Response } from 'express';
export declare class HuggingFaceController {
    private huggingFaceClient;
    private embeddingService;
    private inferenceService;
    private costTrackingService;
    constructor();
    healthCheck: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getSystemInfo: (req: Request, res: Response, next: import("express").NextFunction) => void;
    generateEmbeddings: (req: Request, res: Response, next: import("express").NextFunction) => void;
    analyzeWithMultipleModels: (req: Request, res: Response, next: import("express").NextFunction) => void;
    generateInference: (req: Request, res: Response, next: import("express").NextFunction) => void;
    continueConversation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getConversationHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
    recommendModel: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCostSummary: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getBudgetAlerts: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getDailyReport: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getAvailableModels: (req: Request, res: Response, next: import("express").NextFunction) => void;
    predictCost: (req: Request, res: Response, next: import("express").NextFunction) => void;
    private getRecommendationReasoning;
}
export default HuggingFaceController;
