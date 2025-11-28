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

export class MemoryMonitorService {
  private static snapshots: MemorySnapshot[] = [];
  private static monitorInterval: NodeJS.Timeout | null = null;
  private static readonly MAX_SNAPSHOTS = 1000;
  private static readonly SNAPSHOT_INTERVAL = 30000; // 30 seconds
  private static readonly MEMORY_THRESHOLD = 0.85; // 85% of max
  private static readonly MAX_HEAP_SIZE = 512 * 1024 * 1024; // 512MB default

  private static peakSnapshot: MemorySnapshot | null = null;
  private static alertCallbacks: Array<(stats: MemoryStats) => void> = [];

  /**
   * Initialize memory monitoring
   */
  static initialize(options?: { interval?: number; maxHeapSize?: number }): void {
    const interval = options?.interval || this.SNAPSHOT_INTERVAL;

    // Take initial snapshot
    this.takeSnapshot();

    // Start monitoring interval
    this.monitorInterval = setInterval(() => {
      this.takeSnapshot();
      this.analyzeMemory();
    }, interval);

    console.log('📊 Memory monitor service initialized');
    console.log(`📊 Max heap size: ${this.formatBytes(this.MAX_HEAP_SIZE)}`);
  }

  /**
   * Take memory snapshot
   */
  static takeSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();

    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers
    };

    // Store snapshot
    this.snapshots.push(snapshot);

    // Trim old snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-this.MAX_SNAPSHOTS);
    }

    // Update peak if necessary
    if (!this.peakSnapshot || snapshot.heapUsed > this.peakSnapshot.heapUsed) {
      this.peakSnapshot = snapshot;
    }

    return snapshot;
  }

  /**
   * Get current memory statistics
   */
  static getStats(): MemoryStats {
    const current = this.snapshots[this.snapshots.length - 1];
    const peak = this.peakSnapshot || current;

    // Calculate averages
    const recentSnapshots = this.snapshots.slice(-10); // Last 10 snapshots
    const avgHeapUsed = recentSnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / recentSnapshots.length;
    const avgHeapTotal = recentSnapshots.reduce((sum, s) => sum + s.heapTotal, 0) / recentSnapshots.length;
    const avgRss = recentSnapshots.reduce((sum, s) => sum + s.rss, 0) / recentSnapshots.length;

    // Determine trend
    const trend = this.determineTrend();

    // Detect memory leak
    const leakDetected = this.detectMemoryLeak();

    return {
      current,
      peak,
      average: {
        heapUsed: avgHeapUsed,
        heapTotal: avgHeapTotal,
        rss: avgRss
      },
      trend,
      leakDetected,
      uptime: process.uptime()
    };
  }

  /**
   * Get formatted memory report
   */
  static getReport(): string {
    const stats = this.getStats();
    const memUsagePercent = (stats.current.heapUsed / stats.current.heapTotal) * 100;

    const report = [
      '========================================',
      '          MEMORY USAGE REPORT          ',
      '========================================',
      '',
      'Current Usage:',
      `  Heap Used:     ${this.formatBytes(stats.current.heapUsed)} (${memUsagePercent.toFixed(2)}%)`,
      `  Heap Total:    ${this.formatBytes(stats.current.heapTotal)}`,
      `  RSS:           ${this.formatBytes(stats.current.rss)}`,
      `  External:      ${this.formatBytes(stats.current.external)}`,
      '',
      'Peak Usage:',
      `  Heap Used:     ${this.formatBytes(stats.peak.heapUsed)}`,
      `  Heap Total:    ${this.formatBytes(stats.peak.heapTotal)}`,
      '',
      'Average (Last 10 samples):',
      `  Heap Used:     ${this.formatBytes(stats.average.heapUsed)}`,
      `  Heap Total:    ${this.formatBytes(stats.average.heapTotal)}`,
      '',
      `Trend:           ${stats.trend.toUpperCase()}`,
      `Memory Leak:     ${stats.leakDetected ? '⚠️ DETECTED' : '✅ None detected'}`,
      `Uptime:          ${this.formatUptime(stats.uptime)}`,
      `Snapshots:       ${this.snapshots.length}`,
      '',
      '========================================',
    ];

    return report.join('\n');
  }

  /**
   * Analyze memory and trigger alerts if needed
   */
  private static analyzeMemory(): void {
    const stats = this.getStats();
    const memUsagePercent = (stats.current.heapUsed / stats.current.heapTotal) * 100;

    // Check if memory usage is above threshold
    if (memUsagePercent > this.MEMORY_THRESHOLD * 100) {
      console.warn(`⚠️ High memory usage detected: ${memUsagePercent.toFixed(2)}%`);
      this.triggerAlerts(stats);
    }

    // Check for memory leak
    if (stats.leakDetected) {
      console.error('❌ Potential memory leak detected!');
      this.triggerAlerts(stats);
    }

    // Log periodic report (every 30 snapshots)
    if (this.snapshots.length % 30 === 0) {
      console.log(this.getReport());
    }
  }

  /**
   * Determine memory usage trend
   */
  private static determineTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.snapshots.length < 5) {
      return 'stable';
    }

    const recent = this.snapshots.slice(-5);
    const older = this.snapshots.slice(-10, -5);

    if (older.length === 0) {
      return 'stable';
    }

    const recentAvg = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.heapUsed, 0) / older.length;

    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (percentChange > 10) return 'increasing';
    if (percentChange < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Detect potential memory leak
   */
  private static detectMemoryLeak(): boolean {
    if (this.snapshots.length < 20) {
      return false;
    }

    // Check if memory usage is consistently increasing
    const recent = this.snapshots.slice(-20);
    let consecutiveIncreases = 0;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i].heapUsed > recent[i - 1].heapUsed) {
        consecutiveIncreases++;
      } else {
        consecutiveIncreases = 0;
      }

      // If memory increased for 15 consecutive snapshots, likely a leak
      if (consecutiveIncreases >= 15) {
        return true;
      }
    }

    return false;
  }

  /**
   * Force garbage collection (if available)
   */
  static forceGC(): void {
    if (global.gc) {
      console.log('🗑️ Forcing garbage collection...');
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;
      console.log(`✅ GC complete. Freed: ${this.formatBytes(freed)}`);
    } else {
      console.warn('⚠️ Garbage collection not available. Run with --expose-gc flag.');
    }
  }

  /**
   * Register alert callback
   */
  static onAlert(callback: (stats: MemoryStats) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Trigger all alert callbacks
   */
  private static triggerAlerts(stats: MemoryStats): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(stats);
      } catch (error) {
        console.error('Error in memory alert callback:', error);
      }
    });
  }

  /**
   * Get memory usage percentage
   */
  static getMemoryUsagePercentage(): number {
    const current = this.snapshots[this.snapshots.length - 1];
    if (!current) return 0;
    return (current.heapUsed / current.heapTotal) * 100;
  }

  /**
   * Check if memory is healthy
   */
  static isHealthy(): boolean {
    const usagePercent = this.getMemoryUsagePercentage();
    const stats = this.getStats();
    return usagePercent < this.MEMORY_THRESHOLD * 100 && !stats.leakDetected;
  }

  /**
   * Format bytes to human-readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format uptime to human-readable string
   */
  private static formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Clear all snapshots
   */
  static clearSnapshots(): void {
    this.snapshots = [];
    this.peakSnapshot = null;
    console.log('📊 Memory snapshots cleared');
  }

  /**
   * Shutdown memory monitor
   */
  static shutdown(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    console.log('📊 Memory monitor service shut down');
  }
}
