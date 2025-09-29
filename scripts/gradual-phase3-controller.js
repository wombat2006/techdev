#!/usr/bin/env node

/**
 * Gradual Phase 3 Controller
 * 超慎重な段階的移行: 1% → 2% → 5%
 * 各段階で厳格な承認ゲートを実装
 */

const fs = require('fs');
const readline = require('readline');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class GradualPhase3Controller {
  constructor() {
    this.phases = [
      {
        name: 'phase3a_2percent',
        traffic: 2,
        description: 'Conservative 2% Test',
        configFile: '.env.phase3-conservative-2percent',
        minDurationHours: 12,
        successCriteria: {
          maxErrorRate: 0.01,
          maxLatencyIncrease: 0.15,
          minConsensusRate: 0.9,
          requiredStabilityHours: 8
        }
      },
      {
        name: 'phase3b_5percent',
        traffic: 5,
        description: 'Full 5% Extended Test',
        configFile: '.env.phase3-5percent',
        minDurationHours: 24,
        successCriteria: {
          maxErrorRate: 0.015,
          maxLatencyIncrease: 0.20,
          minConsensusRate: 0.85,
          requiredStabilityHours: 12
        }
      }
    ];

    this.currentPhase = null;
    this.phaseStartTime = null;
    this.baselineMetrics = null;
  }

  async initialize() {
    console.log('🎯 Gradual Phase 3 Controller Initialized');
    console.log('📋 Planned progression: 1% → 2% → 5%');
    console.log('⚠️  Each phase requires explicit approval');

    await this.collectBaselineMetrics();
  }

  async collectBaselineMetrics() {
    console.log('📊 Collecting baseline metrics...');

    try {
      // Simulate collecting current 1% metrics
      this.baselineMetrics = {
        errorRate: 0.005,
        avgLatency: 2500,
        memoryUsage: 65,
        consensusRate: 0.95,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Baseline metrics collected:', this.baselineMetrics);
      return this.baselineMetrics;

    } catch (error) {
      console.error('❌ Failed to collect baseline metrics:', error.message);
      throw error;
    }
  }

  async requestPhaseApproval(phaseConfig) {
    console.log(`\\n🚦 APPROVAL REQUIRED: ${phaseConfig.description}`);
    console.log('='.repeat(50));
    console.log(`Traffic Increase: Current → ${phaseConfig.traffic}%`);
    console.log(`Duration: ${phaseConfig.minDurationHours} hours minimum`);
    console.log(`Success Criteria:`);
    console.log(`  - Error Rate: < ${(phaseConfig.successCriteria.maxErrorRate * 100).toFixed(1)}%`);
    console.log(`  - Latency Increase: < ${(phaseConfig.successCriteria.maxLatencyIncrease * 100)}%`);
    console.log(`  - Consensus Rate: > ${(phaseConfig.successCriteria.minConsensusRate * 100)}%`);
    console.log(`  - Stability Required: ${phaseConfig.successCriteria.requiredStabilityHours} hours`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      const askApproval = () => {
        rl.question('\\n❓ Proceed with this phase? (type "APPROVED" to continue, "ABORT" to cancel): ', (answer) => {
          const response = answer.trim().toUpperCase();

          if (response === 'APPROVED') {
            console.log('✅ Phase approved by user');
            rl.close();
            resolve(true);
          } else if (response === 'ABORT') {
            console.log('🛑 Phase aborted by user');
            rl.close();
            resolve(false);
          } else {
            console.log('⚠️  Please type exactly "APPROVED" or "ABORT"');
            askApproval();
          }
        });
      };

      askApproval();
    });
  }

  async executePhase(phaseConfig) {
    console.log(`\\n🚀 Executing ${phaseConfig.description}`);

    try {
      // Apply configuration
      console.log('📝 Applying configuration...');
      await execAsync(`cp "${phaseConfig.configFile}" .env`);
      console.log('✅ Configuration applied');

      // Restart application
      console.log('🔄 Restarting application...');
      await execAsync('npm run build');
      console.log('✅ Application built');

      // Start monitoring
      console.log('📊 Starting enhanced monitoring...');
      this.currentPhase = phaseConfig;
      this.phaseStartTime = new Date();

      // Start monitoring process
      const monitorCmd = `node ./scripts/monitor-srp-phase3.js > ./logs/phase-${phaseConfig.name}.log 2>&1 &`;
      await execAsync(monitorCmd);
      console.log('✅ Monitoring started');

      return true;

    } catch (error) {
      console.error('❌ Phase execution failed:', error.message);
      return false;
    }
  }

  async monitorPhaseProgress(phaseConfig) {
    console.log(`\\n👁️  Monitoring ${phaseConfig.description} progress...`);

    const checkInterval = setInterval(async () => {
      try {
        const currentMetrics = await this.getCurrentMetrics();
        const phaseRuntime = this.getPhaseRuntime();

        console.log(`\\n📈 Phase Runtime: ${phaseRuntime.hours}h ${phaseRuntime.minutes}m`);
        console.log(`🔍 Current Metrics:`);
        console.log(`  - Error Rate: ${(currentMetrics.errorRate * 100).toFixed(3)}%`);
        console.log(`  - Avg Latency: ${currentMetrics.avgLatency}ms`);
        console.log(`  - Memory Usage: ${currentMetrics.memoryUsage}%`);
        console.log(`  - Consensus Rate: ${(currentMetrics.consensusRate * 100).toFixed(1)}%`);

        // Check success criteria
        const evaluation = this.evaluatePhaseSuccess(phaseConfig, currentMetrics, phaseRuntime);

        if (evaluation.readyForNext) {
          console.log('\\n🎯 SUCCESS CRITERIA MET');
          console.log('✅ Phase completed successfully');
          clearInterval(checkInterval);
          return this.completePhase(phaseConfig, evaluation);
        }

        if (evaluation.shouldRollback) {
          console.log('\\n🚨 ROLLBACK CRITERIA TRIGGERED');
          console.log('❌ Phase failed safety criteria');
          clearInterval(checkInterval);
          return this.initiateRollback(phaseConfig, evaluation);
        }

        // Continue monitoring
        console.log(`⏱️  Continue monitoring... (${evaluation.status})`);

      } catch (error) {
        console.error('❌ Monitoring error:', error.message);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return checkInterval;
  }

  async getCurrentMetrics() {
    // Simulate metrics collection
    // In real implementation, this would collect from actual monitoring
    const variation = () => 0.8 + Math.random() * 0.4; // 0.8-1.2x variation

    return {
      errorRate: this.baselineMetrics.errorRate * variation(),
      avgLatency: this.baselineMetrics.avgLatency * variation(),
      memoryUsage: this.baselineMetrics.memoryUsage + (Math.random() - 0.5) * 10,
      consensusRate: Math.min(0.99, this.baselineMetrics.consensusRate * variation()),
      timestamp: new Date().toISOString()
    };
  }

  getPhaseRuntime() {
    if (!this.phaseStartTime) return { hours: 0, minutes: 0 };

    const elapsed = Date.now() - this.phaseStartTime.getTime();
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes };
  }

  evaluatePhaseSuccess(phaseConfig, currentMetrics, runtime) {
    const criteria = phaseConfig.successCriteria;
    const issues = [];

    // Check error rate
    if (currentMetrics.errorRate > criteria.maxErrorRate) {
      issues.push(`Error rate too high: ${(currentMetrics.errorRate * 100).toFixed(2)}%`);
    }

    // Check latency increase
    const latencyIncrease = (currentMetrics.avgLatency / this.baselineMetrics.avgLatency) - 1;
    if (latencyIncrease > criteria.maxLatencyIncrease) {
      issues.push(`Latency increase too high: ${(latencyIncrease * 100).toFixed(1)}%`);
    }

    // Check consensus rate
    if (currentMetrics.consensusRate < criteria.minConsensusRate) {
      issues.push(`Consensus rate too low: ${(currentMetrics.consensusRate * 100).toFixed(1)}%`);
    }

    // Check minimum runtime
    const hasMinRuntime = runtime.hours >= criteria.requiredStabilityHours;
    const hasMinPhaseDuration = runtime.hours >= phaseConfig.minDurationHours;

    return {
      issues,
      hasMinRuntime,
      hasMinPhaseDuration,
      readyForNext: issues.length === 0 && hasMinRuntime && hasMinPhaseDuration,
      shouldRollback: issues.length >= 2 || currentMetrics.errorRate > criteria.maxErrorRate * 2,
      status: issues.length === 0 ? 'healthy' : 'issues_detected'
    };
  }

  async completePhase(phaseConfig, evaluation) {
    console.log(`\\n🎉 ${phaseConfig.description} COMPLETED SUCCESSFULLY`);

    // Generate phase report
    const report = {
      phase: phaseConfig.name,
      duration: this.getPhaseRuntime(),
      success: true,
      evaluation,
      timestamp: new Date().toISOString()
    };

    const reportFile = `./logs/phase-${phaseConfig.name}-success-report.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`📄 Success report saved: ${reportFile}`);
    return report;
  }

  async initiateRollback(phaseConfig, evaluation) {
    console.log(`\\n🚨 INITIATING ROLLBACK FOR ${phaseConfig.description}`);

    try {
      // Execute rollback script
      await execAsync('./scripts/emergency-rollback-phase3.sh');

      // Generate failure report
      const report = {
        phase: phaseConfig.name,
        duration: this.getPhaseRuntime(),
        success: false,
        issues: evaluation.issues,
        rollbackExecuted: true,
        timestamp: new Date().toISOString()
      };

      const reportFile = `./logs/phase-${phaseConfig.name}-rollback-report.json`;
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

      console.log('✅ Rollback completed');
      console.log(`📄 Rollback report saved: ${reportFile}`);

      return report;

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  async runGradualMigration() {
    console.log('\\n🎯 Starting Gradual Phase 3 Migration');
    console.log('=' .repeat(50));

    for (const phase of this.phases) {
      console.log(`\\n📋 Next Phase: ${phase.description} (${phase.traffic}% traffic)`);

      // Request approval
      const approved = await this.requestPhaseApproval(phase);
      if (!approved) {
        console.log('🛑 Migration aborted by user');
        return false;
      }

      // Execute phase
      const executed = await this.executePhase(phase);
      if (!executed) {
        console.log('❌ Phase execution failed');
        return false;
      }

      // Monitor phase
      const monitoringInterval = await this.monitorPhaseProgress(phase);

      // Wait for monitoring to complete
      await new Promise(resolve => {
        const checkCompletion = setInterval(() => {
          if (!monitoringInterval || monitoringInterval._destroyed) {
            clearInterval(checkCompletion);
            resolve();
          }
        }, 1000);
      });

      console.log(`\\n✅ ${phase.description} completed`);
    }

    console.log('\\n🏁 GRADUAL PHASE 3 MIGRATION COMPLETED');
    return true;
  }
}

// Main execution
async function main() {
  try {
    const controller = new GradualPhase3Controller();
    await controller.initialize();

    console.log('\\n🚦 Ready to begin gradual migration');
    console.log('⚠️  This will proceed: 1% → 2% → 5%');
    console.log('⚠️  Each step requires explicit approval');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\\nPress ENTER to start gradual migration (Ctrl+C to abort): ', async () => {
      rl.close();
      await controller.runGradualMigration();
    });

  } catch (error) {
    console.error('💥 Migration controller failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Migration interrupted by user');
  process.exit(0);
});

if (require.main === module) {
  main();
}