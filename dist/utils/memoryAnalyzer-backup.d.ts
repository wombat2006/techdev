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
/**
 * Comprehensive memory analysis utility for Worker Thread testing
 */
export declare class MemoryAnalyzer {
    private measurements;
    private readonly startTime;
    constructor();
    /**
     * Get detailed V8 heap statistics with old_space analysis
     */
    getDetailedMemoryStats(): DetailedMemoryStats;
    /**
     * Record a memory measurement with optional metadata
     */
    recordMeasurement(label: string, metadata?: Record<string, any>): MemoryMeasurement;
    /**
     * Get current memory stats (backward compatibility method)
     * Alias for getDetailedMemoryStats for existing code
     */
    getCurrentStats(): DetailedMemoryStats;
    /**
     * Get all recorded measurements
     */
    getMeasurements(): MemoryMeasurement[];
    /**
     * Clear all measurements
     */
    clearMeasurements(): void;
    /**
     * Compare two measurements and calculate differences
     */
    compareMeasurements(fromLabel: string, toLabel: string): MemoryDiff | null;
    /**
     * Analyze memory trends over time
     */
    analyzeMemoryTrends(): MemoryTrend[];
    private calculateTrend;
    /**
     * Force garbage collection and measure impact
     */
    forceGarbageCollection(): Promise<GarbageCollectionStats | null>;
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
    };
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
    };
    private generateRecommendations;
    /**
     * Export measurements to JSON
     */
    exportToJSON(): string;
    /**
     * Create a new analyzer instance with current state
     */
    clone(): MemoryAnalyzer;
}
export default MemoryAnalyzer;
