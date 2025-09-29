/**
 * Memory Analyzer - Single Responsibility: Core memory statistics collection
 *
 * Responsibilities:
 * - Collect detailed memory statistics from Node.js and V8
 * - Record memory measurements with labels and metadata
 * - Provide access to historical measurement data
 * - Generate memory diffs between measurements
 * - Basic memory statistics calculations
 *
 * Does NOT handle:
 * - Memory trend analysis (use MemoryTrendAnalyzer)
 * - Report generation (use MemoryReportGenerator)
 * - Data export (use MemoryDataExporter)
 * - Threshold monitoring (use MemoryThresholdMonitor)
 * - Recommendations (use MemoryRecommendationEngine)
 * - Garbage collection operations (use GarbageCollectionManager)
 */

import { performance } from 'perf_hooks';
import v8 from 'v8';

// Type definitions for memory analysis
export interface ProcessMemoryStats {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface V8HeapStats {
  totalHeapSize: number;
  usedHeapSize: number;
  heapSizeLimit: number;
  totalPhysicalSize: number;
}

export interface OldSpaceStats {
  spaceName: string;
  sizeUsed: number;
  sizeAvailable: number;
  physicalSize: number;
  usagePercent: number;
}

export interface CalculatedStats {
  totalHeapUsagePercent: number;
  processHeapUsagePercent: number;
}

export interface DetailedMemoryStats {
  timestamp: number;
  elapsed: number;
  process: ProcessMemoryStats;
  v8: V8HeapStats;
  oldSpace: OldSpaceStats | null;
  calculated: CalculatedStats;
}

export interface MemoryMeasurement {
  id: string;
  label: string;
  stats: DetailedMemoryStats;
  metadata?: Record<string, any>;
}

export interface MemoryDiff {
  label: string;
  timeDiff: number;
  rssChange: number;
  heapUsedChange: number;
  oldSpaceChange: number;
  percentageChanges: {
    rss: number;
    heapUsed: number;
    oldSpace: number;
  };
}

// Note: MemoryTrend interface moved to MemoryTrendAnalyzer
// Note: GarbageCollectionStats interface moved to GarbageCollectionManager

/**
 * Comprehensive memory analysis utility for Worker Thread testing
 */
export class MemoryAnalyzer {
  private measurements: MemoryMeasurement[] = [];
  private readonly startTime: number;

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Get detailed V8 heap statistics with old_space analysis
   */
  getDetailedMemoryStats(): DetailedMemoryStats {
    const heapStats = v8.getHeapStatistics();
    const heapSpaces = v8.getHeapSpaceStatistics();
    const oldSpace = heapSpaces.find(space => space.space_name === 'old_space');
    const processMemory = process.memoryUsage();

    return {
      timestamp: Date.now(),
      elapsed: Math.round(performance.now() - this.startTime),
      process: {
        rss: Math.round(processMemory.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(processMemory.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(processMemory.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(processMemory.external / 1024 / 1024 * 100) / 100,
        arrayBuffers: Math.round(processMemory.arrayBuffers / 1024 / 1024 * 100) / 100
      },
      v8: {
        totalHeapSize: Math.round(heapStats.total_heap_size / 1024 / 1024 * 100) / 100,
        usedHeapSize: Math.round(heapStats.used_heap_size / 1024 / 1024 * 100) / 100,
        heapSizeLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024 * 100) / 100,
        totalPhysicalSize: Math.round(heapStats.total_physical_size / 1024 / 1024 * 100) / 100
      },
      oldSpace: oldSpace ? {
        spaceName: oldSpace.space_name,
        sizeUsed: Math.round(oldSpace.space_used_size / 1024 / 1024 * 100) / 100,
        sizeAvailable: Math.round(oldSpace.space_available_size / 1024 / 1024 * 100) / 100,
        physicalSize: Math.round(oldSpace.physical_space_size / 1024 / 1024 * 100) / 100,
        usagePercent: Math.round(oldSpace.space_used_size / oldSpace.physical_space_size * 1000) / 10
      } : null,
      calculated: {
        totalHeapUsagePercent: Math.round(heapStats.used_heap_size / heapStats.heap_size_limit * 10000) / 100,
        processHeapUsagePercent: Math.round(processMemory.heapUsed / processMemory.heapTotal * 100)
      }
    };
  }

  /**
   * Record a memory measurement with optional metadata
   */
  recordMeasurement(label: string, metadata?: Record<string, any>): MemoryMeasurement {
    const stats = this.getDetailedMemoryStats();
    const measurement: MemoryMeasurement = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label,
      stats,
      metadata
    };

    this.measurements.push(measurement);
    return measurement;
  }

  /**
   * Get current memory stats (backward compatibility method)
   * Alias for getDetailedMemoryStats for existing code
   */
  getCurrentStats(): DetailedMemoryStats {
    return this.getDetailedMemoryStats();
  }

  /**
   * Get all recorded measurements
   */
  getMeasurements(): MemoryMeasurement[] {
    return [...this.measurements];
  }

  /**
   * Clear all measurements
   */
  clearMeasurements(): void {
    this.measurements = [];
  }

  /**
   * Compare two measurements and calculate differences
   */
  compareMeasurements(
    fromLabel: string,
    toLabel: string
  ): MemoryDiff | null {
    const fromMeasurement = this.measurements.find(m => m.label === fromLabel);
    const toMeasurement = this.measurements.find(m => m.label === toLabel);

    if (!fromMeasurement || !toMeasurement) {
      return null;
    }

    const from = fromMeasurement.stats;
    const to = toMeasurement.stats;

    const rssChange = to.process.rss - from.process.rss;
    const heapUsedChange = to.process.heapUsed - from.process.heapUsed;
    const oldSpaceChange = (to.oldSpace?.sizeUsed ?? 0) - (from.oldSpace?.sizeUsed ?? 0);

    return {
      label: `${fromLabel} → ${toLabel}`,
      timeDiff: to.elapsed - from.elapsed,
      rssChange,
      heapUsedChange,
      oldSpaceChange,
      percentageChanges: {
        rss: Math.round((rssChange / from.process.rss) * 10000) / 100,
        heapUsed: Math.round((heapUsedChange / from.process.heapUsed) * 10000) / 100,
        oldSpace: from.oldSpace?.sizeUsed
          ? Math.round((oldSpaceChange / from.oldSpace.sizeUsed) * 10000) / 100
          : 0
      }
    };
  }

  /**
   * Analyze memory trends over time
   */
  analyzeMemoryTrends(): MemoryTrend[] {
    if (this.measurements.length < 3) {
      return [];
    }

    const trends: MemoryTrend[] = [];

    // RSS trend
    const rssValues = this.measurements.map(m => m.stats.process.rss);
    const timestamps = this.measurements.map(m => m.stats.timestamp);

    trends.push(this.calculateTrend('RSS Memory', rssValues, timestamps));

    // Heap usage trend
    const heapValues = this.measurements.map(m => m.stats.process.heapUsed);
    trends.push(this.calculateTrend('Heap Used', heapValues, timestamps));

    // Old space trend (if available)
    const oldSpaceValues = this.measurements
      .map(m => m.stats.oldSpace?.sizeUsed ?? 0)
      .filter(v => v > 0);

    if (oldSpaceValues.length > 2) {
      trends.push(this.calculateTrend('Old Space', oldSpaceValues, timestamps.slice(0, oldSpaceValues.length)));
    }

    return trends;
  }

  private calculateTrend(
    metric: string,
    values: number[],
    timestamps: number[]
  ): MemoryTrend {
    // Simple linear regression for trend analysis
    const n = values.length;
    const sumX = timestamps.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = timestamps.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = timestamps.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.001) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return {
      metric,
      values,
      timestamps,
      trend,
      changeRate: slope
    };
  }

  /**
   * Force garbage collection and measure impact
   */
  async forceGarbageCollection(): Promise<GarbageCollectionStats | null> {
    if (!global.gc) {
      console.warn('Garbage collection not exposed. Run with --expose-gc flag.');
      return null;
    }

    const before = this.getDetailedMemoryStats();
    const gcStartTime = performance.now();

    global.gc();

    const gcTime = Math.round(performance.now() - gcStartTime);
    const after = this.getDetailedMemoryStats();

    const heapReduction = before.process.heapUsed - after.process.heapUsed;
    const oldSpaceReduction = (before.oldSpace?.sizeUsed ?? 0) - (after.oldSpace?.sizeUsed ?? 0);
    const percentReduction = Math.round((heapReduction / before.process.heapUsed) * 10000) / 100;

    return {
      before,
      after,
      reduction: {
        heapUsed: heapReduction,
        oldSpace: oldSpaceReduction,
        percentReduction
      },
      gcTime
    };
  }

  /**
   * Check if memory usage exceeds thresholds
   */
  checkMemoryThresholds(thresholds: {
    heapUsagePercent?: number;
    oldSpacePercent?: number;
    rssLimit?: number;
  }): {
    exceeded: boolean;
    warnings: string[];
    stats: DetailedMemoryStats;
  } {
    const stats = this.getDetailedMemoryStats();
    const warnings: string[] = [];
    let exceeded = false;

    // Check heap usage percentage
    if (thresholds.heapUsagePercent && stats.calculated.totalHeapUsagePercent > thresholds.heapUsagePercent) {
      warnings.push(`Heap usage at ${stats.calculated.totalHeapUsagePercent}% exceeds threshold of ${thresholds.heapUsagePercent}%`);
      exceeded = true;
    }

    // Check old space percentage
    if (thresholds.oldSpacePercent && stats.oldSpace && stats.oldSpace.usagePercent > thresholds.oldSpacePercent) {
      warnings.push(`Old space usage at ${stats.oldSpace.usagePercent}% exceeds threshold of ${thresholds.oldSpacePercent}%`);
      exceeded = true;
    }

    // Check RSS limit
    if (thresholds.rssLimit && stats.process.rss > thresholds.rssLimit) {
      warnings.push(`RSS memory at ${stats.process.rss}MB exceeds threshold of ${thresholds.rssLimit}MB`);
      exceeded = true;
    }

    return { exceeded, warnings, stats };
  }

  /**
   * Generate a comprehensive memory report
   */
  generateReport(): {
    summary: {
      totalMeasurements: number;
      timeSpan: number;
      averageRSS: number;
      peakRSS: number;
      averageHeapUsed: number;
      peakHeapUsed: number;
    };
    trends: MemoryTrend[];
    measurements: MemoryMeasurement[];
    recommendations: string[];
  } {
    const measurements = this.getMeasurements();

    if (measurements.length === 0) {
      return {
        summary: {
          totalMeasurements: 0,
          timeSpan: 0,
          averageRSS: 0,
          peakRSS: 0,
          averageHeapUsed: 0,
          peakHeapUsed: 0
        },
        trends: [],
        measurements: [],
        recommendations: ['No measurements recorded']
      };
    }

    const rssValues = measurements.map(m => m.stats.process.rss);
    const heapValues = measurements.map(m => m.stats.process.heapUsed);
    const timeSpan = measurements[measurements.length - 1].stats.elapsed - measurements[0].stats.elapsed;

    const summary = {
      totalMeasurements: measurements.length,
      timeSpan,
      averageRSS: Math.round(rssValues.reduce((a, b) => a + b, 0) / rssValues.length * 100) / 100,
      peakRSS: Math.max(...rssValues),
      averageHeapUsed: Math.round(heapValues.reduce((a, b) => a + b, 0) / heapValues.length * 100) / 100,
      peakHeapUsed: Math.max(...heapValues)
    };

    const trends = this.analyzeMemoryTrends();
    const recommendations = this.generateRecommendations(summary, trends);

    return {
      summary,
      trends,
      measurements,
      recommendations
    };
  }

  private generateRecommendations(
    summary: ReturnType<MemoryAnalyzer['generateReport']>['summary'],
    trends: MemoryTrend[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for memory leaks
    const heapTrend = trends.find(t => t.metric === 'Heap Used');
    if (heapTrend && heapTrend.trend === 'increasing' && heapTrend.changeRate > 0.1) {
      recommendations.push('Potential memory leak detected - heap usage consistently increasing');
    }

    // Check for high memory usage
    if (summary.peakRSS > 1000) { // 1GB
      recommendations.push('High memory usage detected - consider optimization');
    }

    // Check for frequent garbage collection needs
    const oldSpaceTrend = trends.find(t => t.metric === 'Old Space');
    if (oldSpaceTrend && oldSpaceTrend.trend === 'increasing') {
      recommendations.push('Consider more frequent garbage collection or memory optimization');
    }

    // Performance recommendations
    if (summary.averageHeapUsed > 512) { // 512MB
      recommendations.push('Consider implementing memory pooling or streaming for large datasets');
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory usage appears optimal - no immediate action required');
    }

    return recommendations;
  }

  /**
   * Export measurements to JSON
   */
  exportToJSON(): string {
    return JSON.stringify({
      analyzer: {
        startTime: this.startTime,
        generatedAt: new Date().toISOString()
      },
      measurements: this.measurements,
      report: this.generateReport()
    }, null, 2);
  }

  /**
   * Create a new analyzer instance with current state
   */
  clone(): MemoryAnalyzer {
    const newAnalyzer = new MemoryAnalyzer();
    newAnalyzer.measurements = [...this.measurements];
    return newAnalyzer;
  }
}

export default MemoryAnalyzer;