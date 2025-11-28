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
    };
}
/**
 * Main function to fetch all homepage data
 * Executes all queries in parallel for optimal performance
 */
export declare function getHomepageData(params: HomepageQueryParams): Promise<HomepageResponse>;
export {};
