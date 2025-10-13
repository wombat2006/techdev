/**
 * Regression Monitoring Dashboard
 *
 * Analyzes benchmark history and generates regression reports
 */

import { promises as fs } from 'fs';
import path from 'path';

interface BenchmarkData {
  modelId: string;
  modelVersion: string;
  benchmarkDate: string;
  overallScore: number;
  categoryScores: {
    [category: string]: {
      totalTests: number;
      passedTests: number;
      averageScore: number;
      passRate: number;
      averageExecutionTimeMs: number;
      totalCost: number;
    };
  };
  performance: {
    averageExecutionTimeMs: number;
    totalCost: number;
    averageCostPerTest: number;
    tokenEfficiency?: number;
  };
}

interface RegressionAnalysis {
  modelId: string;
  currentScore: number;
  previousScore: number;
  scoreDelta: number;
  percentageChange: number;
  regressionDetected: boolean;
  currentCost: number;
  previousCost: number;
  costDelta: number;
  currentLatency: number;
  previousLatency: number;
  latencyDelta: number;
  benchmarkDate: string;
  previousBenchmarkDate: string;
}

interface DashboardReport {
  generatedAt: string;
  models: string[];
  totalBenchmarks: number;
  regressions: RegressionAnalysis[];
  trends: {
    modelId: string;
    scoreTrend: 'improving' | 'declining' | 'stable';
    costTrend: 'improving' | 'declining' | 'stable';
    latencyTrend: 'improving' | 'declining' | 'stable';
    weeklyData: Array<{
      date: string;
      score: number;
      cost: number;
      latency: number;
    }>;
  }[];
}

class RegressionDashboard {
  private static readonly BENCHMARKS_DIR = '/audit/techdev/evals/benchmarks';
  private static readonly REGRESSION_THRESHOLD = -5; // -5% or more is a regression

  /**
   * Load all benchmarks for a model
   */
  static async loadBenchmarksForModel(modelId: string): Promise<BenchmarkData[]> {
    const files = await fs.readdir(this.BENCHMARKS_DIR);
    const modelFiles = files
      .filter(f => f.includes(modelId) && f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)

    const benchmarks: BenchmarkData[] = [];
    for (const file of modelFiles) {
      const filepath = path.join(this.BENCHMARKS_DIR, file);
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content) as BenchmarkData;
      benchmarks.push(data);
    }

    return benchmarks;
  }

  /**
   * Analyze regression between current and previous benchmark
   */
  static analyzeRegression(
    current: BenchmarkData,
    previous: BenchmarkData
  ): RegressionAnalysis {
    const scoreDelta = current.overallScore - previous.overallScore;
    const percentageChange = (scoreDelta / previous.overallScore) * 100;
    const regressionDetected = percentageChange < this.REGRESSION_THRESHOLD;

    const costDelta = current.performance.totalCost - previous.performance.totalCost;
    const latencyDelta =
      current.performance.averageExecutionTimeMs -
      previous.performance.averageExecutionTimeMs;

    return {
      modelId: current.modelId,
      currentScore: current.overallScore,
      previousScore: previous.overallScore,
      scoreDelta,
      percentageChange,
      regressionDetected,
      currentCost: current.performance.totalCost,
      previousCost: previous.performance.totalCost,
      costDelta,
      currentLatency: current.performance.averageExecutionTimeMs,
      previousLatency: previous.performance.averageExecutionTimeMs,
      latencyDelta,
      benchmarkDate: current.benchmarkDate,
      previousBenchmarkDate: previous.benchmarkDate
    };
  }

  /**
   * Determine trend direction
   */
  private static determineTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';

    const deltas = [];
    for (let i = 1; i < values.length; i++) {
      deltas.push(values[i] - values[i - 1]);
    }

    const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;

    if (Math.abs(avgDelta) < 0.5) return 'stable';
    return avgDelta > 0 ? 'improving' : 'declining';
  }

  /**
   * Generate dashboard report
   */
  static async generateDashboard(): Promise<DashboardReport> {
    const allFiles = await fs.readdir(this.BENCHMARKS_DIR);
    const modelIds = [
      ...new Set(
        allFiles
          .filter(f => f.endsWith('.json'))
          .map(f => {
            // Extract model ID from filename: YYYY-MM-DD-{modelId}.json
            const parts = f.replace('.json', '').split('-');
            return parts.slice(3).join('-');
          })
      )
    ];

    const regressions: RegressionAnalysis[] = [];
    const trends: DashboardReport['trends'] = [];

    for (const modelId of modelIds) {
      const benchmarks = await this.loadBenchmarksForModel(modelId);

      if (benchmarks.length >= 2) {
        // Analyze latest regression
        const regression = this.analyzeRegression(benchmarks[0], benchmarks[1]);
        regressions.push(regression);
      }

      // Analyze trends (last 12 weeks)
      const recentBenchmarks = benchmarks.slice(0, 12);
      const weeklyData = recentBenchmarks.map(b => ({
        date: b.benchmarkDate,
        score: b.overallScore,
        cost: b.performance.totalCost,
        latency: b.performance.averageExecutionTimeMs
      }));

      const scores = weeklyData.map(d => d.score);
      const costs = weeklyData.map(d => d.cost);
      const latencies = weeklyData.map(d => d.latency);

      trends.push({
        modelId,
        scoreTrend: this.determineTrend(scores),
        costTrend: this.determineTrend(costs.map(c => -c)), // Lower cost is better (improving)
        latencyTrend: this.determineTrend(latencies.map(l => -l)), // Lower latency is better
        weeklyData: weeklyData.reverse() // Oldest first for charts
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      models: modelIds,
      totalBenchmarks: allFiles.filter(f => f.endsWith('.json')).length,
      regressions,
      trends
    };
  }

  /**
   * Print dashboard to console
   */
  static async printDashboard(): Promise<void> {
    const report = await this.generateDashboard();

    console.log('━'.repeat(80));
    console.log('📊 Regression Monitoring Dashboard');
    console.log('━'.repeat(80));
    console.log();
    console.log(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    console.log(`Models Tracked: ${report.models.length}`);
    console.log(`Total Benchmarks: ${report.totalBenchmarks}`);
    console.log();

    // Regressions
    console.log('━'.repeat(80));
    console.log('⚠️  Regression Analysis (Latest vs Previous)');
    console.log('━'.repeat(80));
    console.log();

    if (report.regressions.length === 0) {
      console.log('✅ No regression data available (need at least 2 benchmarks per model)');
    } else {
      for (const reg of report.regressions) {
        const statusIcon = reg.regressionDetected ? '❌' : '✅';
        const trendIcon = reg.scoreDelta > 0 ? '📈' : reg.scoreDelta < 0 ? '📉' : '➡️';

        console.log(`${statusIcon} ${reg.modelId}`);
        console.log(`   ${trendIcon} Score: ${reg.previousScore.toFixed(1)} → ${reg.currentScore.toFixed(1)} (Δ ${reg.scoreDelta > 0 ? '+' : ''}${reg.scoreDelta.toFixed(1)}, ${reg.percentageChange > 0 ? '+' : ''}${reg.percentageChange.toFixed(1)}%)`);
        console.log(`   💰 Cost: $${reg.previousCost.toFixed(4)} → $${reg.currentCost.toFixed(4)} (Δ ${reg.costDelta > 0 ? '+' : ''}$${reg.costDelta.toFixed(4)})`);
        console.log(`   ⚡ Latency: ${reg.previousLatency.toFixed(0)}ms → ${reg.currentLatency.toFixed(0)}ms (Δ ${reg.latencyDelta > 0 ? '+' : ''}${reg.latencyDelta.toFixed(0)}ms)`);
        console.log(`   📅 ${new Date(reg.previousBenchmarkDate).toLocaleDateString()} → ${new Date(reg.benchmarkDate).toLocaleDateString()}`);

        if (reg.regressionDetected) {
          console.log(`   🚨 REGRESSION DETECTED: Score dropped by ${Math.abs(reg.percentageChange).toFixed(1)}%`);
        }

        console.log();
      }
    }

    // Trends
    console.log('━'.repeat(80));
    console.log('📈 Trend Analysis (Last 12 Weeks)');
    console.log('━'.repeat(80));
    console.log();

    for (const trend of report.trends) {
      const scoreTrendIcon =
        trend.scoreTrend === 'improving' ? '📈' :
        trend.scoreTrend === 'declining' ? '📉' : '➡️';
      const costTrendIcon =
        trend.costTrend === 'improving' ? '📉' :
        trend.costTrend === 'declining' ? '📈' : '➡️';
      const latencyTrendIcon =
        trend.latencyTrend === 'improving' ? '📉' :
        trend.latencyTrend === 'declining' ? '📈' : '➡️';

      console.log(`📊 ${trend.modelId} (${trend.weeklyData.length} weeks of data)`);
      console.log(`   ${scoreTrendIcon} Score Trend: ${trend.scoreTrend.toUpperCase()}`);
      console.log(`   ${costTrendIcon} Cost Trend: ${trend.costTrend.toUpperCase()}`);
      console.log(`   ${latencyTrendIcon} Latency Trend: ${trend.latencyTrend.toUpperCase()}`);

      if (trend.weeklyData.length > 0) {
        const latest = trend.weeklyData[trend.weeklyData.length - 1];
        const oldest = trend.weeklyData[0];

        console.log();
        console.log(`   First Week (${new Date(oldest.date).toLocaleDateString()}):`);
        console.log(`     Score: ${oldest.score.toFixed(1)}, Cost: $${oldest.cost.toFixed(4)}, Latency: ${oldest.latency.toFixed(0)}ms`);

        console.log(`   Latest Week (${new Date(latest.date).toLocaleDateString()}):`);
        console.log(`     Score: ${latest.score.toFixed(1)}, Cost: $${latest.cost.toFixed(4)}, Latency: ${latest.latency.toFixed(0)}ms`);

        const scoreDelta = latest.score - oldest.score;
        const costDelta = latest.cost - oldest.cost;
        const latencyDelta = latest.latency - oldest.latency;

        console.log(`   Overall Change:`);
        console.log(`     Score: ${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(1)} (${((scoreDelta / oldest.score) * 100).toFixed(1)}%)`);
        console.log(`     Cost: ${costDelta > 0 ? '+' : ''}$${costDelta.toFixed(4)} (${((costDelta / oldest.cost) * 100).toFixed(1)}%)`);
        console.log(`     Latency: ${latencyDelta > 0 ? '+' : ''}${latencyDelta.toFixed(0)}ms (${((latencyDelta / oldest.latency) * 100).toFixed(1)}%)`);
      }

      console.log();
    }

    console.log('━'.repeat(80));
  }

  /**
   * Save dashboard report to JSON
   */
  static async saveDashboard(outputPath?: string): Promise<string> {
    const report = await this.generateDashboard();

    const defaultPath = '/audit/techdev/evals/regression-dashboard.json';
    const filepath = outputPath || defaultPath;

    await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf-8');

    return filepath;
  }
}

// Main execution
async function main() {
  try {
    console.log('🔍 Generating Regression Dashboard...\n');

    // Print dashboard to console
    await RegressionDashboard.printDashboard();

    // Save to file
    const filepath = await RegressionDashboard.saveDashboard();
    console.log(`✅ Dashboard saved to: ${filepath}`);
    console.log();

  } catch (error) {
    console.error('❌ Error generating dashboard:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default RegressionDashboard;
