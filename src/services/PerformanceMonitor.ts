import { logger } from '../config/logger';
import { metrics } from './MetricsService';

interface TimerData {
  start: number;
  labels?: Record<string, string>;
}

class PerformanceMonitor {
  private timers: Map<string, TimerData> = new Map();
  private thresholds: Map<string, number> = new Map();

  // Start timing
  start(label: string, labels?: Record<string, string>) {
    const key = this.getKey(label, labels);
    this.timers.set(key, {
      start: Date.now(),
      labels
    });
  }

  // End timing and return duration
  end(label: string, labels?: Record<string, string>): number {
    const key = this.getKey(label, labels);
    const timer = this.timers.get(key);

    if (!timer) {
      logger.warn(`Performance timer not found: ${label}`);
      return 0;
    }

    const duration = Date.now() - timer.start;
    this.timers.delete(key);

    // Log if exceeds threshold
    const threshold = this.thresholds.get(label);
    if (threshold && duration > threshold) {
      logger.warn(`Performance threshold exceeded: ${label}`, {
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
        labels
      });
    }

    // Record metric
    metrics.timing(label, duration, labels);

    logger.debug(`Performance: ${label}`, {
      duration: `${duration}ms`,
      labels
    });

    return duration;
  }

  // Measure async function
  async measure<T>(label: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T> {
    this.start(label, labels);
    try {
      const result = await fn();
      this.end(label, labels);
      return result;
    } catch (error) {
      this.end(label, labels);
      throw error;
    }
  }

  // Measure sync function
  measureSync<T>(label: string, fn: () => T, labels?: Record<string, string>): T {
    this.start(label, labels);
    try {
      const result = fn();
      this.end(label, labels);
      return result;
    } catch (error) {
      this.end(label, labels);
      throw error;
    }
  }

  // Set performance threshold for a label
  setThreshold(label: string, milliseconds: number) {
    this.thresholds.set(label, milliseconds);
  }

  // Get current timers
  getActiveTimers(): string[] {
    return Array.from(this.timers.keys());
  }

  // Clear all timers
  clear() {
    this.timers.clear();
  }

  // Get key with labels
  private getKey(label: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return label;
    }
    return `${label}|${JSON.stringify(labels)}`;
  }

  // Mark a checkpoint
  mark(label: string) {
    logger.debug(`Performance mark: ${label}`, {
      timestamp: Date.now()
    });
  }

  // Measure between two marks
  measureMarks(startMark: string, endMark: string): number {
    // Simple implementation - in production use Performance API
    logger.debug(`Performance measure: ${startMark} to ${endMark}`);
    return 0;
  }
}

export const perfMonitor = new PerformanceMonitor();

// Set default thresholds (in milliseconds)
perfMonitor.setThreshold('db.query', 100);
perfMonitor.setThreshold('api.request', 500);
perfMonitor.setThreshold('cache.get', 10);
perfMonitor.setThreshold('file.upload', 5000);
perfMonitor.setThreshold('image.process', 2000);
