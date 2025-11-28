interface HomepageQueryParams {
    userId?: string;
    sections?: string[];
    limit?: number;
    location?: {
        lat: number;
        lng: number;
    };
}
interface HomepageResponse {
    success: boolean;
    data: {
        [key: string]: any;
    };
    errors?: {
        [key: string]: string;
    };
    metadata: {
        timestamp: Date;
        requestedSections: string[];
        successfulSections: string[];
        failedSections: string[];
        executionTime: number;
    };
}
/**
 * MAIN OPTIMIZED FUNCTION: Fetch all homepage data
 *
 * IMPROVEMENTS:
 * - Uses optimized aggregation functions
 * - Parallel execution maintained
 * - Better error handling
 * - Performance metrics
 */
export declare function getHomepageDataOptimized(params: HomepageQueryParams): Promise<HomepageResponse>;
/**
 * UTILITY: Compare performance between original and optimized versions
 */
export declare function comparePerformance(params: HomepageQueryParams): Promise<{
    original: {
        duration: number;
        success: boolean;
    };
    optimized: {
        duration: number;
        success: boolean;
    };
    improvement: number;
}>;
export {};
