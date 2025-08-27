import { logger } from '../utils/logger';
import { CostTracking, TaskType } from '../types/huggingface';
import { config } from '../config/environment';

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

export class CostTrackingService {
  private costRecords: Map<string, CostTracking[]>;
  private modelPricing: Map<string, { inputPrice: number; outputPrice: number }>;
  private budgetAlerts: BudgetAlert[];
  private monthlyBudget: number;
  private alertThreshold: number;

  constructor() {
    this.costRecords = new Map();
    this.budgetAlerts = [];
    this.monthlyBudget = config.costManagement.monthlyBudgetLimit;
    this.alertThreshold = config.costManagement.alertThreshold;
    
    // Initialize model pricing (simplified - in real implementation, fetch from API)
    this.modelPricing = new Map([
      ['cl-tohoku/bert-base-japanese-v3', { inputPrice: 0.00001, outputPrice: 0.00001 }],
      ['sonoisa/sentence-bert-base-ja-mean-tokens-v2', { inputPrice: 0.00001, outputPrice: 0.00001 }],
      ['colorfulscoop/sbert-base-ja', { inputPrice: 0.00001, outputPrice: 0.00001 }],
      ['rinna/japanese-roberta-base', { inputPrice: 0.00001, outputPrice: 0.00001 }],
      ['rinna/japanese-gpt2-medium', { inputPrice: 0.00002, outputPrice: 0.00004 }],
      ['microsoft/DialoGPT-medium', { inputPrice: 0.00002, outputPrice: 0.00004 }],
      // Add more models as needed
    ]);

    // Clean up old records periodically
    setInterval(() => this.cleanupOldRecords(), 24 * 60 * 60 * 1000); // Daily cleanup
  }

  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    taskType: TaskType = TaskType.BASIC
  ): number {
    const pricing = this.modelPricing.get(model) || { inputPrice: 0.00001, outputPrice: 0.00002 };
    
    let baseCost = (inputTokens * pricing.inputPrice) + (outputTokens * pricing.outputPrice);
    
    // Apply task type multiplier
    switch (taskType) {
      case TaskType.PREMIUM:
        baseCost *= 1.5;
        break;
      case TaskType.CRITICAL:
        baseCost *= 2.0;
        break;
      default:
        // BASIC - no multiplier
        break;
    }

    return Number(baseCost.toFixed(6));
  }

  trackCost(
    userId: string,
    sessionId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    taskType: TaskType = TaskType.BASIC
  ): CostTracking {
    const cost = this.calculateCost(model, inputTokens, outputTokens, taskType);
    
    const record: CostTracking = {
      userId,
      sessionId,
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: new Date()
    };

    // Store the record
    if (!this.costRecords.has(userId)) {
      this.costRecords.set(userId, []);
    }
    this.costRecords.get(userId)!.push(record);

    // Check budget alerts
    this.checkBudgetAlerts(userId);

    logger.info('Cost tracked', {
      userId,
      model,
      cost,
      inputTokens,
      outputTokens,
      taskType
    });

    return record;
  }

  getUserCostSummary(userId: string, days: number = 30): CostSummary {
    const records = this.getUserRecords(userId, days);
    
    if (records.length === 0) {
      return {
        totalCost: 0,
        monthlyBudget: this.monthlyBudget,
        budgetUsed: 0,
        budgetRemaining: this.monthlyBudget,
        requestCount: 0,
        averageCostPerRequest: 0,
        topModels: [],
        topUsers: []
      };
    }

    const totalCost = records.reduce((sum, record) => sum + record.cost, 0);
    const budgetUsed = (totalCost / this.monthlyBudget) * 100;
    
    // Calculate model usage
    const modelUsage = new Map<string, { cost: number; requests: number }>();
    records.forEach(record => {
      const existing = modelUsage.get(record.model) || { cost: 0, requests: 0 };
      existing.cost += record.cost;
      existing.requests += 1;
      modelUsage.set(record.model, existing);
    });

    const topModels = Array.from(modelUsage.entries())
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    return {
      totalCost,
      monthlyBudget: this.monthlyBudget,
      budgetUsed,
      budgetRemaining: Math.max(0, this.monthlyBudget - totalCost),
      requestCount: records.length,
      averageCostPerRequest: totalCost / records.length,
      topModels,
      topUsers: [{ userId, cost: totalCost, requests: records.length }]
    };
  }

  getGlobalCostSummary(days: number = 30): CostSummary {
    const allRecords: CostTracking[] = [];
    
    for (const records of this.costRecords.values()) {
      const recentRecords = records.filter(record => {
        const daysDiff = (Date.now() - record.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= days;
      });
      allRecords.push(...recentRecords);
    }

    if (allRecords.length === 0) {
      return {
        totalCost: 0,
        monthlyBudget: this.monthlyBudget,
        budgetUsed: 0,
        budgetRemaining: this.monthlyBudget,
        requestCount: 0,
        averageCostPerRequest: 0,
        topModels: [],
        topUsers: []
      };
    }

    const totalCost = allRecords.reduce((sum, record) => sum + record.cost, 0);
    const budgetUsed = (totalCost / this.monthlyBudget) * 100;

    // Calculate model usage
    const modelUsage = new Map<string, { cost: number; requests: number }>();
    allRecords.forEach(record => {
      const existing = modelUsage.get(record.model) || { cost: 0, requests: 0 };
      existing.cost += record.cost;
      existing.requests += 1;
      modelUsage.set(record.model, existing);
    });

    // Calculate user usage
    const userUsage = new Map<string, { cost: number; requests: number }>();
    allRecords.forEach(record => {
      const existing = userUsage.get(record.userId) || { cost: 0, requests: 0 };
      existing.cost += record.cost;
      existing.requests += 1;
      userUsage.set(record.userId, existing);
    });

    const topModels = Array.from(modelUsage.entries())
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    const topUsers = Array.from(userUsage.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    return {
      totalCost,
      monthlyBudget: this.monthlyBudget,
      budgetUsed,
      budgetRemaining: Math.max(0, this.monthlyBudget - totalCost),
      requestCount: allRecords.length,
      averageCostPerRequest: totalCost / allRecords.length,
      topModels,
      topUsers
    };
  }

  predictCost(
    model: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
    taskType: TaskType = TaskType.BASIC
  ): { estimatedCost: number; budgetImpact: number; approved: boolean } {
    const estimatedCost = this.calculateCost(model, estimatedInputTokens, estimatedOutputTokens, taskType);
    const currentGlobalSummary = this.getGlobalCostSummary();
    const budgetImpact = ((currentGlobalSummary.totalCost + estimatedCost) / this.monthlyBudget) * 100;
    
    // Approve request if it doesn't exceed budget
    const approved = (currentGlobalSummary.totalCost + estimatedCost) <= this.monthlyBudget;

    return {
      estimatedCost,
      budgetImpact,
      approved
    };
  }

  getBudgetAlerts(): BudgetAlert[] {
    return [...this.budgetAlerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getRecentAlerts(hours: number = 24): BudgetAlert[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.budgetAlerts.filter(alert => alert.timestamp.getTime() > cutoffTime);
  }

  exportCostData(userId?: string, days: number = 30): CostTracking[] {
    if (userId) {
      return this.getUserRecords(userId, days);
    }

    const allRecords: CostTracking[] = [];
    for (const records of this.costRecords.values()) {
      const recentRecords = records.filter(record => {
        const daysDiff = (Date.now() - record.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= days;
      });
      allRecords.push(...recentRecords);
    }

    return allRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Generate daily cost report
  generateDailyReport(): {
    date: string;
    totalCost: number;
    totalRequests: number;
    budgetUsed: number;
    topModels: Array<{ model: string; cost: number; requests: number }>;
    alerts: BudgetAlert[];
  } {
    const today = new Date();
    const todayRecords = this.getRecordsByDate(today);
    
    const totalCost = todayRecords.reduce((sum, record) => sum + record.cost, 0);
    const totalRequests = todayRecords.length;
    const budgetUsed = (totalCost / (this.monthlyBudget / 30)) * 100; // Daily budget estimate

    // Calculate model usage for today
    const modelUsage = new Map<string, { cost: number; requests: number }>();
    todayRecords.forEach(record => {
      const existing = modelUsage.get(record.model) || { cost: 0, requests: 0 };
      existing.cost += record.cost;
      existing.requests += 1;
      modelUsage.set(record.model, existing);
    });

    const topModels = Array.from(modelUsage.entries())
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 3);

    const todayAlerts = this.getRecentAlerts(24);

    return {
      date: today.toISOString().split('T')[0],
      totalCost,
      totalRequests,
      budgetUsed,
      topModels,
      alerts: todayAlerts
    };
  }

  private getUserRecords(userId: string, days: number): CostTracking[] {
    const records = this.costRecords.get(userId) || [];
    return records.filter(record => {
      const daysDiff = (Date.now() - record.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= days;
    });
  }

  private getRecordsByDate(date: Date): CostTracking[] {
    const targetDate = date.toISOString().split('T')[0];
    const allRecords: CostTracking[] = [];
    
    for (const records of this.costRecords.values()) {
      const dayRecords = records.filter(record => 
        record.timestamp.toISOString().split('T')[0] === targetDate
      );
      allRecords.push(...dayRecords);
    }
    
    return allRecords;
  }

  private checkBudgetAlerts(userId?: string): void {
    const summary = userId ? this.getUserCostSummary(userId) : this.getGlobalCostSummary();
    const usagePercentage = summary.budgetUsed;

    let alertType: BudgetAlert['alertType'] | null = null;
    let message = '';

    if (usagePercentage >= 100) {
      alertType = 'exceeded';
      message = `Budget exceeded! Current usage: $${summary.totalCost.toFixed(2)} (${usagePercentage.toFixed(1)}% of $${summary.monthlyBudget})`;
    } else if (usagePercentage >= this.alertThreshold * 100) {
      alertType = 'critical';
      message = `Critical budget usage: $${summary.totalCost.toFixed(2)} (${usagePercentage.toFixed(1)}% of $${summary.monthlyBudget})`;
    } else if (usagePercentage >= (this.alertThreshold * 0.7) * 100) {
      alertType = 'warning';
      message = `Warning: High budget usage: $${summary.totalCost.toFixed(2)} (${usagePercentage.toFixed(1)}% of $${summary.monthlyBudget})`;
    }

    if (alertType) {
      const alert: BudgetAlert = {
        alertType,
        currentUsage: summary.totalCost,
        budgetLimit: summary.monthlyBudget,
        usagePercentage,
        message,
        timestamp: new Date()
      };

      this.budgetAlerts.push(alert);
      
      // Keep only recent alerts (last 100)
      if (this.budgetAlerts.length > 100) {
        this.budgetAlerts = this.budgetAlerts.slice(-100);
      }

      logger.warn('Budget alert triggered', alert);
    }
  }

  private cleanupOldRecords(): void {
    const retentionDays = 90; // Keep records for 90 days
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    for (const [userId, records] of this.costRecords.entries()) {
      const filteredRecords = records.filter(record => 
        record.timestamp.getTime() > cutoffTime
      );
      
      if (filteredRecords.length === 0) {
        this.costRecords.delete(userId);
      } else {
        this.costRecords.set(userId, filteredRecords);
      }
    }

    // Cleanup old budget alerts
    this.budgetAlerts = this.budgetAlerts.filter(alert => 
      alert.timestamp.getTime() > cutoffTime
    );

    logger.info('Cost tracking cleanup completed', {
      activeUsers: this.costRecords.size,
      activeAlerts: this.budgetAlerts.length
    });
  }

  // Method to update model pricing (for dynamic pricing updates)
  updateModelPricing(model: string, inputPrice: number, outputPrice: number): void {
    this.modelPricing.set(model, { inputPrice, outputPrice });
    logger.info('Model pricing updated', { model, inputPrice, outputPrice });
  }

  // Method to adjust budget limits
  updateBudgetLimit(newLimit: number): void {
    this.monthlyBudget = newLimit;
    logger.info('Monthly budget limit updated', { newLimit });
  }

  // Get current model pricing
  getModelPricing(): Array<{ model: string; inputPrice: number; outputPrice: number }> {
    return Array.from(this.modelPricing.entries()).map(([model, pricing]) => ({
      model,
      ...pricing
    }));
  }
}

export default CostTrackingService;