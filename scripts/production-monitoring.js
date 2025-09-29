#!/usr/bin/env node

/**
 * TechSapo本番環境監視スクリプト
 * Gemini CLI統合対応版
 */

const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 監視設定
const MONITORING_CONFIG = {
  healthCheckUrl: 'http://localhost:4000/api/v1/health',
  checkInterval: 30000, // 30秒間隔
  alertThresholds: {
    memoryUsageMB: 800,
    errorRate: 0.03, // 3%
    responseTimeMs: 10000, // 10秒
    consensus: 0.7 // 70%
  },
  geminiCli: {
    maxErrorRate: 0.2, // 20%
    timeoutMs: 180000 // 3分
  }
};

// メトリクス保存
let lastMetrics = {};
let alertCount = 0;

async function checkHealth() {
  try {
    const startTime = Date.now();
    
    // Node.js HTTP request instead of fetch for compatibility
    const response = await new Promise((resolve, reject) => {
      const req = http.get(MONITORING_CONFIG.healthCheckUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ ok: res.statusCode === 200, json: () => JSON.parse(data) }));
      });
      req.setTimeout(5000, () => reject(new Error('Request timeout')));
      req.on('error', reject);
    });
    
    const responseTime = Date.now() - startTime;
    const healthData = await response.json();
    
    // 基本健康状態チェック
    const alerts = [];
    
    // メモリ使用量チェック
    if (healthData.memory?.used > MONITORING_CONFIG.alertThresholds.memoryUsageMB) {
      alerts.push(`High memory usage: ${healthData.memory.used}MB`);
    }
    
    // サービス状態チェック
    if (healthData.services?.redis !== 'ok') {
      alerts.push('Redis service error');
    }
    
    if (healthData.services?.geminiCli !== 'ok') {
      alerts.push('Gemini CLI unavailable');
    }
    
    // 応答時間チェック
    if (responseTime > MONITORING_CONFIG.alertThresholds.responseTimeMs) {
      alerts.push(`Slow response time: ${responseTime}ms`);
    }
    
    // SRP設定チェック
    if (!healthData.srp?.enabled) {
      alerts.push('SRP wall-bounce disabled');
    }
    
    // Gemini CLI設定チェック
    if (healthData.gemini?.strategy === 'hybrid' && healthData.gemini?.cliPercentage < 50) {
      alerts.push(`Low Gemini CLI percentage: ${healthData.gemini?.cliPercentage}%`);
    }
    
    // ログ出力
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Health Check Results:`);
    console.log(`  Status: ${healthData.status}`);
    console.log(`  Memory: ${healthData.memory?.used}/${healthData.memory?.total}MB`);
    console.log(`  Uptime: ${Math.round(healthData.uptime)}s`);
    console.log(`  SRP: ${healthData.srp?.enabled ? 'ON' : 'OFF'} (${healthData.srp?.trafficPercentage}%)`);
    console.log(`  Gemini: ${healthData.gemini?.strategy} (CLI: ${healthData.gemini?.cliPercentage}%)`);
    console.log(`  Response Time: ${responseTime}ms`);
    
    if (alerts.length > 0) {
      console.warn(`  🚨 ALERTS (${alerts.length}):`);
      alerts.forEach(alert => console.warn(`    - ${alert}`));
      alertCount++;
      
      // 連続アラートが5回以上の場合は緊急対応
      if (alertCount >= 5) {
        await emergencyResponse();
      }
    } else {
      console.log(`  ✅ All systems normal`);
      alertCount = 0;
    }
    
    // メトリクス保存
    lastMetrics = {
      timestamp,
      healthData,
      responseTime,
      alerts: alerts.length
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Health check failed:`, error.message);
    alertCount++;
    
    if (alertCount >= 3) {
      await emergencyResponse();
    }
  }
}

async function emergencyResponse() {
  console.error(`🚨 EMERGENCY: ${alertCount} consecutive failures detected`);
  
  try {
    // 1. プロセス状況確認
    const { stdout: psOutput } = await execAsync('ps aux | grep "node.*server" | grep -v grep');
    console.log('Running processes:', psOutput);
    
    // 2. メモリ状況確認
    const { stdout: memOutput } = await execAsync('free -h');
    console.log('Memory status:', memOutput);
    
    // 3. ディスク使用量確認
    const { stdout: diskOutput } = await execAsync('df -h');
    console.log('Disk usage:', diskOutput);
    
    // 4. 最新ログ確認
    try {
      const { stdout: logOutput } = await execAsync('tail -20 logs/app-error.log');
      console.log('Recent errors:', logOutput);
    } catch (logError) {
      console.log('No recent error logs found');
    }
    
    // 5. 自動復旧試行
    console.log('Attempting automatic recovery...');
    
    // GCトリガー
    const { stdout: gcOutput } = await execAsync('curl -s http://localhost:4000/api/v1/gc-trigger || echo "GC trigger failed"');
    console.log('GC trigger result:', gcOutput);
    
    // 最終手段: サービス再起動推奨
    if (alertCount >= 10) {
      console.error('🚨 CRITICAL: Consider service restart');
      console.error('Manual intervention required:');
      console.error('  sudo systemctl restart techsapo-production');
    }
    
  } catch (error) {
    console.error('Emergency response failed:', error.message);
  }
}

async function generateDailyReport() {
  const now = new Date();
  const reportDate = now.toISOString().split('T')[0];
  
  console.log(`\n=== TechSapo Daily Report ${reportDate} ===`);
  
  if (lastMetrics.healthData) {
    console.log(`最終健康状態: ${lastMetrics.healthData.status}`);
    console.log(`稼働時間: ${Math.round(lastMetrics.healthData.uptime / 3600)}時間`);
    console.log(`メモリ使用量: ${lastMetrics.healthData.memory?.used}MB`);
    console.log(`SRP設定: ${lastMetrics.healthData.srp?.enabled ? 'ON' : 'OFF'} (${lastMetrics.healthData.srp?.trafficPercentage}%)`);
    console.log(`Gemini CLI: ${lastMetrics.healthData.gemini?.strategy} (${lastMetrics.healthData.gemini?.cliPercentage}%)`);
    console.log(`デプロイバージョン: ${lastMetrics.healthData.deployment?.version}`);
  }
  
  console.log(`本日のアラート回数: ${alertCount}`);
  console.log('='.repeat(50));
}

// メイン実行
console.log('🚀 TechSapo Production Monitoring Started');
console.log(`健康チェック間隔: ${MONITORING_CONFIG.checkInterval / 1000}秒`);
console.log(`監視URL: ${MONITORING_CONFIG.healthCheckUrl}`);

// 初回実行
checkHealth();

// 定期実行
setInterval(checkHealth, MONITORING_CONFIG.checkInterval);

// 日次レポート（毎日午前9時）
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 9 && now.getMinutes() === 0) {
    generateDailyReport();
  }
}, 60000); // 1分間隔でチェック

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n📊 Monitoring stopped');
  generateDailyReport();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📊 Monitoring terminated');
  generateDailyReport();
  process.exit(0);
});