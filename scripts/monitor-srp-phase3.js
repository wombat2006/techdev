#!/usr/bin/env node

/**
 * SRP Phase 3 (5%) Production Monitoring Script
 * Enhanced monitoring for 5% traffic with automated safety controls
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class SRPPhase3Monitor {
  constructor() {
    this.startTime = new Date();
    this.metrics = {
      totalRequests: 0,
      srpRequests: 0,
      legacyRequests: 0,
      errorCount: 0,
      srpErrorCount: 0,
      legacyErrorCount: 0,
      avgLatency: 0,
      srpAvgLatency: 0,
      legacyAvgLatency: 0,
      memoryUsage: 0,
      consensusSuccessRate: 0,
      llmProviderHealth: {
        'gpt-5-codex': 'unknown',
        'claude-code-direct': 'unknown',
        'gemini-2.5-pro': 'unknown',
        'gemini-2.5-flash': 'unknown'
      }
    };
    this.thresholds = {
      errorRate: parseFloat(process.env.SRP_ERROR_RATE_THRESHOLD || '0.01'),
      latency: parseInt(process.env.SRP_LATENCY_THRESHOLD_MS || '5000'),
      memoryUsage: parseInt(process.env.SRP_MEMORY_USAGE_THRESHOLD || '85'),
      autoRollbackErrorRate: parseFloat(process.env.AUTO_ROLLBACK_ERROR_RATE || '0.05'),
      autoRollbackLatency: parseInt(process.env.AUTO_ROLLBACK_LATENCY_MS || '8000')
    };

    console.log('🎯 SRP Phase 3 (5%) Monitor initialized');
    console.log('⚠️  Enhanced safety thresholds active');
    console.log(`📊 Error rate threshold: ${this.thresholds.errorRate * 100}%`);
    console.log(`⏱️  Latency threshold: ${this.thresholds.latency}ms`);
    console.log(`🧠 Memory threshold: ${this.thresholds.memoryUsage}%`);
  }

  async collectMetrics() {
    try {
      // Prometheus metrics collection
      const prometheusMetrics = await this.fetchPrometheusMetrics();

      // SRP specific metrics
      const srpMetrics = await this.fetchSRPMetrics();

      // System health metrics
      const systemMetrics = await this.fetchSystemMetrics();

      this.updateMetrics(prometheusMetrics, srpMetrics, systemMetrics);

      return {
        timestamp: new Date().toISOString(),
        phase: 'phase3_5percent',
        metrics: this.metrics,
        thresholds: this.thresholds,
        healthStatus: this.calculateHealthStatus()
      };

    } catch (error) {
      console.error('❌ Metrics collection failed:', error.message);
      return null;
    }
  }

  async fetchPrometheusMetrics() {
    try {
      const { stdout } = await execAsync('curl -s http://localhost:9090/api/v1/query?query=http_requests_total');
      return JSON.parse(stdout);
    } catch (error) {
      console.warn('⚠️ Prometheus metrics unavailable:', error.message);
      return {};
    }
  }

  async fetchSRPMetrics() {
    try {
      const logPath = './logs/app.log';
      const { stdout } = await execAsync(`tail -n 1000 ${logPath} | grep "SRP\\|wall-bounce" | tail -n 50`);

      const lines = stdout.split('\n').filter(line => line.trim());
      let srpCount = 0;
      let errorCount = 0;
      let totalLatency = 0;

      lines.forEach(line => {
        if (line.includes('SRP request')) srpCount++;
        if (line.includes('ERROR') && line.includes('SRP')) errorCount++;

        const latencyMatch = line.match(/duration[_\\s]*:?[_\\s]*(\\d+)/i);
        if (latencyMatch) {
          totalLatency += parseInt(latencyMatch[1]);
        }
      });

      return {
        srpRequestCount: srpCount,
        srpErrorCount: errorCount,
        avgSRPLatency: srpCount > 0 ? totalLatency / srpCount : 0
      };

    } catch (error) {
      console.warn('⚠️ SRP metrics collection failed:', error.message);
      return { srpRequestCount: 0, srpErrorCount: 0, avgSRPLatency: 0 };
    }
  }

  async fetchSystemMetrics() {
    try {
      const memoryInfo = process.memoryUsage();
      const { stdout: cpuInfo } = await execAsync('ps -p ' + process.pid + ' -o %cpu');

      return {
        memoryUsage: {
          heapUsed: memoryInfo.heapUsed,
          heapTotal: memoryInfo.heapTotal,
          rss: memoryInfo.rss,
          external: memoryInfo.external
        },
        cpuUsage: parseFloat(cpuInfo.split('\\n')[1]?.trim() || '0')
      };

    } catch (error) {
      console.warn('⚠️ System metrics collection failed:', error.message);
      return { memoryUsage: {}, cpuUsage: 0 };
    }
  }

  updateMetrics(prometheusData, srpData, systemData) {
    // Update SRP-specific metrics
    this.metrics.srpRequests += srpData.srpRequestCount || 0;
    this.metrics.srpErrorCount += srpData.srpErrorCount || 0;
    this.metrics.srpAvgLatency = srpData.avgSRPLatency || 0;

    // Update system metrics
    if (systemData.memoryUsage && systemData.memoryUsage.heapUsed) {
      const memoryPercent = (systemData.memoryUsage.heapUsed / systemData.memoryUsage.heapTotal) * 100;
      this.metrics.memoryUsage = Math.round(memoryPercent);
    }

    // Calculate derived metrics
    this.metrics.totalRequests = this.metrics.srpRequests + this.metrics.legacyRequests;
    this.metrics.errorCount = this.metrics.srpErrorCount + this.metrics.legacyErrorCount;
  }

  calculateHealthStatus() {
    const issues = [];

    // Error rate check
    const errorRate = this.metrics.totalRequests > 0
      ? this.metrics.errorCount / this.metrics.totalRequests
      : 0;

    if (errorRate > this.thresholds.errorRate) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
    }

    // Latency check
    if (this.metrics.srpAvgLatency > this.thresholds.latency) {
      issues.push(`High SRP latency: ${this.metrics.srpAvgLatency}ms`);
    }

    // Memory check
    if (this.metrics.memoryUsage > this.thresholds.memoryUsage) {
      issues.push(`High memory usage: ${this.metrics.memoryUsage}%`);
    }

    // Auto-rollback checks
    const shouldAutoRollback = this.shouldTriggerAutoRollback(errorRate);

    return {
      status: issues.length === 0 ? 'healthy' : 'warning',
      issues,
      autoRollbackRequired: shouldAutoRollback,
      recommendation: this.getHealthRecommendation(issues, shouldAutoRollback)
    };
  }

  shouldTriggerAutoRollback(currentErrorRate) {
    // Auto-rollback conditions
    const conditions = [
      currentErrorRate > this.thresholds.autoRollbackErrorRate,
      this.metrics.srpAvgLatency > this.thresholds.autoRollbackLatency,
      this.metrics.memoryUsage > 95 // Critical memory usage
    ];

    return conditions.some(condition => condition);
  }

  getHealthRecommendation(issues, autoRollback) {
    if (autoRollback) {
      return '🚨 IMMEDIATE AUTO-ROLLBACK REQUIRED';
    }

    if (issues.length === 0) {
      return '✅ System healthy - continue monitoring';
    }

    if (issues.length <= 2) {
      return '⚠️ Minor issues detected - increased monitoring recommended';
    }

    return '❌ Multiple issues detected - consider manual rollback';
  }

  async executeAutoRollback() {
    console.log('🚨 EXECUTING AUTO-ROLLBACK');

    try {
      // Disable SRP immediately
      await execAsync('echo "USE_SRP_WALL_BOUNCE=false" > .env.emergency-rollback');
      await execAsync('echo "SRP_MIGRATION_PHASE=disabled" >> .env.emergency-rollback');
      await execAsync('echo "SRP_TRAFFIC_PERCENTAGE=0" >> .env.emergency-rollback');

      // Log the rollback
      const rollbackLog = {
        timestamp: new Date().toISOString(),
        reason: 'Auto-rollback triggered',
        metrics: this.metrics,
        trigger: 'Threshold breach detected'
      };

      fs.writeFileSync('./logs/srp-auto-rollback.json', JSON.stringify(rollbackLog, null, 2));

      console.log('✅ Auto-rollback completed');
      console.log('📝 Rollback details logged to ./logs/srp-auto-rollback.json');

      return true;
    } catch (error) {
      console.error('❌ Auto-rollback failed:', error.message);
      return false;
    }
  }

  generateReport(data) {
    if (!data) return;

    const report = `
🎯 SRP Phase 3 (5%) Status Report
Generated: ${data.timestamp}
Phase: ${data.phase}

📊 Traffic Distribution:
- SRP Requests: ${this.metrics.srpRequests} (${this.calculatePercentage(this.metrics.srpRequests, this.metrics.totalRequests)}%)
- Legacy Requests: ${this.metrics.legacyRequests} (${this.calculatePercentage(this.metrics.legacyRequests, this.metrics.totalRequests)}%)
- Total Requests: ${this.metrics.totalRequests}

⚡ Performance Metrics:
- SRP Average Latency: ${this.metrics.srpAvgLatency}ms
- Memory Usage: ${this.metrics.memoryUsage}%
- Error Rate: ${((this.metrics.errorCount / Math.max(this.metrics.totalRequests, 1)) * 100).toFixed(3)}%

🛡️ Safety Status:
${data.healthStatus.status.toUpperCase()}: ${data.healthStatus.recommendation}

${data.healthStatus.issues.length > 0 ? '⚠️ Issues Detected:\n' + data.healthStatus.issues.map(issue => `- ${issue}`).join('\\n') : '✅ No issues detected'}

---
Monitoring Duration: ${this.getRunningTime()}
Next Report: ${new Date(Date.now() + 15 * 60 * 1000).toISOString()}
`;

    console.log(report);

    // Save report to file
    const reportFile = `./logs/srp-phase3-report-${Date.now()}.txt`;
    fs.writeFileSync(reportFile, report);
  }

  calculatePercentage(part, total) {
    return total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';
  }

  getRunningTime() {
    const elapsed = Date.now() - this.startTime.getTime();
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  async startMonitoring() {
    console.log('🚀 Starting SRP Phase 3 monitoring...');

    const monitoringInterval = setInterval(async () => {
      const data = await this.collectMetrics();

      if (data && data.healthStatus.autoRollbackRequired) {
        console.log('🚨 AUTO-ROLLBACK TRIGGERED');
        clearInterval(monitoringInterval);
        await this.executeAutoRollback();
        process.exit(1);
      }

      this.generateReport(data);

    }, 15 * 60 * 1000); // Every 15 minutes

    // Initial report
    const initialData = await this.collectMetrics();
    this.generateReport(initialData);
  }
}

// Start monitoring
const monitor = new SRPPhase3Monitor();
monitor.startMonitoring().catch(error => {
  console.error('💥 Monitoring failed:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Monitoring stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Monitoring terminated');
  process.exit(0);
});