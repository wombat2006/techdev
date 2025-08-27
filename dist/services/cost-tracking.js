"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostTrackingService = void 0;
const logger_1 = require("../utils/logger");
const huggingface_1 = require("../types/huggingface");
const environment_1 = require("../config/environment");
class CostTrackingService {
    costRecords;
    modelPricing;
    budgetAlerts;
    monthlyBudget;
    alertThreshold;
    constructor() {
        this.costRecords = new Map();
        this.budgetAlerts = [];
        this.monthlyBudget = environment_1.config.costManagement.monthlyBudgetLimit;
        this.alertThreshold = environment_1.config.costManagement.alertThreshold;
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
    calculateCost(model, inputTokens, outputTokens, taskType = huggingface_1.TaskType.BASIC) {
        const pricing = this.modelPricing.get(model) || { inputPrice: 0.00001, outputPrice: 0.00002 };
        let baseCost = (inputTokens * pricing.inputPrice) + (outputTokens * pricing.outputPrice);
        // Apply task type multiplier
        switch (taskType) {
            case huggingface_1.TaskType.PREMIUM:
                baseCost *= 1.5;
                break;
            case huggingface_1.TaskType.CRITICAL:
                baseCost *= 2.0;
                break;
            default:
                // BASIC - no multiplier
                break;
        }
        return Number(baseCost.toFixed(6));
    }
    trackCost(userId, sessionId, model, inputTokens, outputTokens, taskType = huggingface_1.TaskType.BASIC) {
        const cost = this.calculateCost(model, inputTokens, outputTokens, taskType);
        const record = {
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
        this.costRecords.get(userId).push(record);
        // Check budget alerts
        this.checkBudgetAlerts(userId);
        logger_1.logger.info('Cost tracked', {
            userId,
            model,
            cost,
            inputTokens,
            outputTokens,
            taskType
        });
        return record;
    }
    getUserCostSummary(userId, days = 30) {
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
        const modelUsage = new Map();
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
    getGlobalCostSummary(days = 30) {
        const allRecords = [];
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
        const modelUsage = new Map();
        allRecords.forEach(record => {
            const existing = modelUsage.get(record.model) || { cost: 0, requests: 0 };
            existing.cost += record.cost;
            existing.requests += 1;
            modelUsage.set(record.model, existing);
        });
        // Calculate user usage
        const userUsage = new Map();
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
    predictCost(model, estimatedInputTokens, estimatedOutputTokens, taskType = huggingface_1.TaskType.BASIC) {
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
    getBudgetAlerts() {
        return [...this.budgetAlerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    getRecentAlerts(hours = 24) {
        const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
        return this.budgetAlerts.filter(alert => alert.timestamp.getTime() > cutoffTime);
    }
    exportCostData(userId, days = 30) {
        if (userId) {
            return this.getUserRecords(userId, days);
        }
        const allRecords = [];
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
    generateDailyReport() {
        const today = new Date();
        const todayRecords = this.getRecordsByDate(today);
        const totalCost = todayRecords.reduce((sum, record) => sum + record.cost, 0);
        const totalRequests = todayRecords.length;
        const budgetUsed = (totalCost / (this.monthlyBudget / 30)) * 100; // Daily budget estimate
        // Calculate model usage for today
        const modelUsage = new Map();
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
    getUserRecords(userId, days) {
        const records = this.costRecords.get(userId) || [];
        return records.filter(record => {
            const daysDiff = (Date.now() - record.timestamp.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= days;
        });
    }
    getRecordsByDate(date) {
        const targetDate = date.toISOString().split('T')[0];
        const allRecords = [];
        for (const records of this.costRecords.values()) {
            const dayRecords = records.filter(record => record.timestamp.toISOString().split('T')[0] === targetDate);
            allRecords.push(...dayRecords);
        }
        return allRecords;
    }
    checkBudgetAlerts(userId) {
        const summary = userId ? this.getUserCostSummary(userId) : this.getGlobalCostSummary();
        const usagePercentage = summary.budgetUsed;
        let alertType = null;
        let message = '';
        if (usagePercentage >= 100) {
            alertType = 'exceeded';
            message = `Budget exceeded! Current usage: $${summary.totalCost.toFixed(2)} (${usagePercentage.toFixed(1)}% of $${summary.monthlyBudget})`;
        }
        else if (usagePercentage >= this.alertThreshold * 100) {
            alertType = 'critical';
            message = `Critical budget usage: $${summary.totalCost.toFixed(2)} (${usagePercentage.toFixed(1)}% of $${summary.monthlyBudget})`;
        }
        else if (usagePercentage >= (this.alertThreshold * 0.7) * 100) {
            alertType = 'warning';
            message = `Warning: High budget usage: $${summary.totalCost.toFixed(2)} (${usagePercentage.toFixed(1)}% of $${summary.monthlyBudget})`;
        }
        if (alertType) {
            const alert = {
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
            logger_1.logger.warn('Budget alert triggered', alert);
        }
    }
    cleanupOldRecords() {
        const retentionDays = 90; // Keep records for 90 days
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        for (const [userId, records] of this.costRecords.entries()) {
            const filteredRecords = records.filter(record => record.timestamp.getTime() > cutoffTime);
            if (filteredRecords.length === 0) {
                this.costRecords.delete(userId);
            }
            else {
                this.costRecords.set(userId, filteredRecords);
            }
        }
        // Cleanup old budget alerts
        this.budgetAlerts = this.budgetAlerts.filter(alert => alert.timestamp.getTime() > cutoffTime);
        logger_1.logger.info('Cost tracking cleanup completed', {
            activeUsers: this.costRecords.size,
            activeAlerts: this.budgetAlerts.length
        });
    }
    // Method to update model pricing (for dynamic pricing updates)
    updateModelPricing(model, inputPrice, outputPrice) {
        this.modelPricing.set(model, { inputPrice, outputPrice });
        logger_1.logger.info('Model pricing updated', { model, inputPrice, outputPrice });
    }
    // Method to adjust budget limits
    updateBudgetLimit(newLimit) {
        this.monthlyBudget = newLimit;
        logger_1.logger.info('Monthly budget limit updated', { newLimit });
    }
    // Get current model pricing
    getModelPricing() {
        return Array.from(this.modelPricing.entries()).map(([model, pricing]) => ({
            model,
            ...pricing
        }));
    }
}
exports.CostTrackingService = CostTrackingService;
exports.default = CostTrackingService;
//# sourceMappingURL=cost-tracking.js.map