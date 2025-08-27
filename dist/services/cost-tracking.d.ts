import { CostTracking, TaskType } from '../types/huggingface';
export interface CostSummary {
    totalCost: number;
    monthlyBudget: number;
    budgetUsed: number;
    budgetRemaining: number;
    requestCount: number;
    averageCostPerRequest: number;
    topModels: Array<{
        model: string;
        cost: number;
        requests: number;
    }>;
    topUsers: Array<{
        userId: string;
        cost: number;
        requests: number;
    }>;
}
export interface BudgetAlert {
    alertType: 'warning' | 'critical' | 'exceeded';
    currentUsage: number;
    budgetLimit: number;
    usagePercentage: number;
    message: string;
    timestamp: Date;
}
export declare class CostTrackingService {
    private costRecords;
    private modelPricing;
    private budgetAlerts;
    private monthlyBudget;
    private alertThreshold;
    constructor();
    calculateCost(model: string, inputTokens: number, outputTokens: number, taskType?: TaskType): number;
    trackCost(userId: string, sessionId: string, model: string, inputTokens: number, outputTokens: number, taskType?: TaskType): CostTracking;
    getUserCostSummary(userId: string, days?: number): CostSummary;
    getGlobalCostSummary(days?: number): CostSummary;
    predictCost(model: string, estimatedInputTokens: number, estimatedOutputTokens: number, taskType?: TaskType): {
        estimatedCost: number;
        budgetImpact: number;
        approved: boolean;
    };
    getBudgetAlerts(): BudgetAlert[];
    getRecentAlerts(hours?: number): BudgetAlert[];
    exportCostData(userId?: string, days?: number): CostTracking[];
    generateDailyReport(): {
        date: string;
        totalCost: number;
        totalRequests: number;
        budgetUsed: number;
        topModels: Array<{
            model: string;
            cost: number;
            requests: number;
        }>;
        alerts: BudgetAlert[];
    };
    private getUserRecords;
    private getRecordsByDate;
    private checkBudgetAlerts;
    private cleanupOldRecords;
    updateModelPricing(model: string, inputPrice: number, outputPrice: number): void;
    updateBudgetLimit(newLimit: number): void;
    getModelPricing(): Array<{
        model: string;
        inputPrice: number;
        outputPrice: number;
    }>;
}
export default CostTrackingService;
