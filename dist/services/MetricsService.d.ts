declare class MetricsService {
    private metrics;
    private gauges;
    increment(metric: string, value?: number, labels?: Record<string, string>): void;
    gauge(metric: string, value: number, labels?: Record<string, string>): void;
    timing(metric: string, duration: number, labels?: Record<string, string>): void;
    histogram(metric: string, value: number, labels?: Record<string, string>): void;
    getSummary(metric: string, labels?: Record<string, string>): {
        count: number;
        sum: number;
        avg: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
        p99: number;
    } | null;
    getMetrics(): Record<string, any>;
    reset(): void;
    cleanOldMetrics(): void;
    exportPrometheus(): string;
    private getKey;
    private splitKey;
    private parseLabels;
    private formatLabels;
    private percentile;
    logSummary(): void;
}
export declare const metrics: MetricsService;
export {};
