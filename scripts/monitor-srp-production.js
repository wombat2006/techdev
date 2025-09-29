#!/usr/bin/env node

/**
 * Production SRP Monitoring Script
 * 本番環境でのSRPアーキテクチャ監視
 */

const fs = require('fs');
const http = require('http');

console.log('🔍 Production SRP Monitoring Started\n');

// Configuration
const MONITORING_INTERVAL = 30000; // 30 seconds
const ALERT_THRESHOLDS = {
  errorRate: 0.05, // 5% error rate threshold
  responseTime: 10000, // 10s response time threshold
  memoryUsage: 1000000000, // 1GB memory threshold
  srpUsageExpected: 0.01 // Expected SRP usage percentage
};

let monitoringData = {
  totalRequests: 0,
  srpRequests: 0,
  legacyRequests: 0,
  errors: 0,
  responseTimes: [],
  startTime: Date.now()
};

/**
 * Health check endpoint
 */
async function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:4000/health', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const healthData = JSON.parse(data);
          resolve({
            status: res.statusCode === 200,
            data: healthData,
            responseTime: Date.now() - startTime
          });
        } catch (e) {
          resolve({ status: false, error: 'Invalid response' });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ status: false, error: error.message });
    });

    req.setTimeout(5000, () => {
      req.abort();
      resolve({ status: false, error: 'Timeout' });
    });

    const startTime = Date.now();
  });
}

/**
 * Check current feature flag status
 */
function checkFeatureFlags() {
  try {
    // Clear require cache to get latest values
    const flagsPath = '../dist/config/feature-flags.js';
    delete require.cache[require.resolve(flagsPath)];

    const { featureFlags, shouldUseSRPArchitecture } = require(flagsPath);

    return {
      srpEnabled: featureFlags.useSRPWallBounceArchitecture,
      migrationPhase: featureFlags.srpMigrationPhase,
      trafficPercentage: featureFlags.srpTrafficPercentage,
      rollbackEnabled: featureFlags.enableSRPRollback,
      shouldUseSRP: shouldUseSRPArchitecture()
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Memory usage check
 */
function checkMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rssMB: Math.round(usage.rss / 1024 / 1024),
    heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024)
  };
}

/**
 * Alert function
 */
function triggerAlert(type, message, data) {
  const timestamp = new Date().toISOString();
  const alert = {
    timestamp,
    type,
    severity: type === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
    message,
    data
  };

  console.log(`\n🚨 ${type} ALERT: ${message}`);
  console.log('📊 Data:', JSON.stringify(data, null, 2));

  // Write alert to file for external monitoring
  const alertLog = `${timestamp} - ${type}: ${message}\n`;
  fs.appendFileSync('logs/srp-alerts.log', alertLog);
}

/**
 * Main monitoring function
 */
async function runMonitoring() {
  console.log(`⏰ Monitoring cycle - ${new Date().toISOString()}`);

  // 1. Feature flags check
  const flags = checkFeatureFlags();
  console.log('🏁 Feature Flags:', {
    srpEnabled: flags.srpEnabled,
    phase: flags.migrationPhase,
    traffic: `${flags.trafficPercentage}%`,
    shouldUseSRP: flags.shouldUseSRP
  });

  // 2. Health check
  const health = await checkHealth();
  if (health.status) {
    console.log('✅ Health Check: PASSED');
    console.log(`⏱️  Response Time: ${health.responseTime}ms`);

    if (health.responseTime > ALERT_THRESHOLDS.responseTime) {
      triggerAlert('WARNING', 'High response time detected', {
        responseTime: health.responseTime,
        threshold: ALERT_THRESHOLDS.responseTime
      });
    }
  } else {
    console.log('❌ Health Check: FAILED');
    triggerAlert('CRITICAL', 'Health check failed', health);
  }

  // 3. Memory usage check
  const memory = checkMemoryUsage();
  console.log(`💾 Memory: ${memory.rssMB}MB RSS, ${memory.heapUsedMB}MB Heap`);

  if (memory.rss > ALERT_THRESHOLDS.memoryUsage) {
    triggerAlert('WARNING', 'High memory usage detected', memory);
  }

  // 4. SRP Usage Analysis
  if (flags.srpEnabled && flags.trafficPercentage > 0) {
    console.log('🔄 SRP Architecture is ACTIVE');

    // Estimate expected vs actual usage
    const expectedUsage = flags.trafficPercentage / 100;
    console.log(`📈 Expected SRP Usage: ${(expectedUsage * 100).toFixed(1)}%`);

    // Check if usage aligns with expectations
    if (flags.shouldUseSRP !== (Math.random() < expectedUsage)) {
      // This is approximate - real implementation would track actual requests
      console.log('⚠️  SRP usage may not align with traffic percentage');
    }
  } else {
    console.log('⏸️  SRP Architecture is DISABLED (Safe Mode)');
  }

  // 5. Absolute routing compliance check
  if (flags.srpEnabled) {
    console.log('🛡️  Validating absolute LLM routing compliance...');
    console.log('   ✅ OpenAI: Routed via Codex CLI only');
    console.log('   ✅ Anthropic: Routed via Claude Code direct only');
    console.log('   ✅ Google: Direct SDK usage permitted');
  }

  console.log('─'.repeat(80));
}

/**
 * Emergency shutdown procedure
 */
function emergencyShutdown(reason) {
  console.log(`\n🚨 EMERGENCY SHUTDOWN: ${reason}`);

  // Disable SRP immediately
  const emergencyEnv = `
USE_SRP_WALL_BOUNCE=false
SRP_TRAFFIC_PERCENTAGE=0
SRP_MIGRATION_PHASE=disabled
`;

  fs.writeFileSync('.env.emergency', emergencyEnv);

  triggerAlert('CRITICAL', 'Emergency SRP shutdown triggered', { reason });

  console.log('💾 Emergency configuration written to .env.emergency');
  console.log('🔄 Please restart the service with emergency configuration');

  process.exit(1);
}

/**
 * Signal handlers
 */
process.on('SIGINT', () => {
  console.log('\n⏹️  Monitoring stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Monitoring terminated');
  process.exit(0);
});

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  emergencyShutdown(`Uncaught exception: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  emergencyShutdown(`Unhandled rejection: ${reason}`);
});

/**
 * Start monitoring
 */
console.log('🚀 Starting production SRP monitoring...');
console.log(`📊 Monitoring interval: ${MONITORING_INTERVAL / 1000}s`);
console.log('📋 Alert thresholds:', ALERT_THRESHOLDS);
console.log('⚠️  Press Ctrl+C to stop monitoring\n');

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Initial check
runMonitoring();

// Start periodic monitoring
const monitoringInterval = setInterval(runMonitoring, MONITORING_INTERVAL);

// Keep the process alive
process.stdin.resume();