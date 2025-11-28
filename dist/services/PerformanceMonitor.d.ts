declare class PerformanceMonitor {
    private timers;
    private thresholds;
    start(label: string, labels?: Record<string, string>): void;
    end(label: string, labels?: Record<string, string>): number;
    measure<T>(label: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T>;
    measureSync<T>(label: string, fn: () => T, labels?: Record<string, string>): T;
    setThreshold(label: string, milliseconds: number): void;
    getActiveTimers(): string[];
    clear(): void;
    private getKey;
    mark(label: string): void;
    measureMarks(startMark: string, endMark: string): number;
}
export declare const perfMonitor: PerformanceMonitor;
export {};
