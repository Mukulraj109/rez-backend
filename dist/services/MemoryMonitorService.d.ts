/**
 * Memory Monitor Service
 *
 * Monitors application memory usage and detects potential memory leaks
 *
 * Features:
 * - Real-time memory tracking
 * - Heap usage monitoring
 * - Memory leak detection
 * - Automatic alerts
 * - Memory snapshots
 * - Trend analysis
 */
interface MemorySnapshot {
    timestamp: Date;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    arrayBuffers: number;
}
interface MemoryStats {
    current: MemorySnapshot;
    peak: MemorySnapshot;
    average: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
    };
    trend: 'increasing' | 'stable' | 'decreasing';
    leakDetected: boolean;
    uptime: number;
}
export declare class MemoryMonitorService {
    private static snapshots;
    private static monitorInterval;
    private static readonly MAX_SNAPSHOTS;
    private static readonly SNAPSHOT_INTERVAL;
    private static readonly MEMORY_THRESHOLD;
    private static readonly MAX_HEAP_SIZE;
    private static peakSnapshot;
    private static alertCallbacks;
    /**
     * Initialize memory monitoring
     */
    static initialize(options?: {
        interval?: number;
        maxHeapSize?: number;
    }): void;
    /**
     * Take memory snapshot
     */
    static takeSnapshot(): MemorySnapshot;
    /**
     * Get current memory statistics
     */
    static getStats(): MemoryStats;
    /**
     * Get formatted memory report
     */
    static getReport(): string;
    /**
     * Analyze memory and trigger alerts if needed
     */
    private static analyzeMemory;
    /**
     * Determine memory usage trend
     */
    private static determineTrend;
    /**
     * Detect potential memory leak
     */
    private static detectMemoryLeak;
    /**
     * Force garbage collection (if available)
     */
    static forceGC(): void;
    /**
     * Register alert callback
     */
    static onAlert(callback: (stats: MemoryStats) => void): void;
    /**
     * Trigger all alert callbacks
     */
    private static triggerAlerts;
    /**
     * Get memory usage percentage
     */
    static getMemoryUsagePercentage(): number;
    /**
     * Check if memory is healthy
     */
    static isHealthy(): boolean;
    /**
     * Format bytes to human-readable string
     */
    private static formatBytes;
    /**
     * Format uptime to human-readable string
     */
    private static formatUptime;
    /**
     * Clear all snapshots
     */
    static clearSnapshots(): void;
    /**
     * Shutdown memory monitor
     */
    static shutdown(): void;
}
export {};
