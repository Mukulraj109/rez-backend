/**
 * Pagination Helper Utilities
 *
 * Provides both offset-based and cursor-based pagination
 *
 * Cursor-based pagination is more efficient for large datasets
 * because it doesn't require counting all documents
 */
import { Document, Model, FilterQuery } from 'mongoose';
export interface OffsetPaginationOptions {
    page?: number;
    limit?: number;
    sort?: any;
    select?: string;
}
export interface OffsetPaginationResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
}
export interface CursorPaginationOptions {
    cursor?: string;
    limit?: number;
    sort?: any;
    select?: string;
    sortField?: string;
}
export interface CursorPaginationResult<T> {
    data: T[];
    pagination: {
        nextCursor: string | null;
        hasNext: boolean;
        limit: number;
    };
}
/**
 * Offset-based pagination (traditional page-based)
 * Good for small to medium datasets
 */
export declare function paginateOffset<T extends Document>(model: Model<T>, filter: FilterQuery<T>, options?: OffsetPaginationOptions): Promise<OffsetPaginationResult<T>>;
/**
 * Cursor-based pagination (more efficient for large datasets)
 * Does not require total count, more scalable
 */
export declare function paginateCursor<T extends Document>(model: Model<T>, filter: FilterQuery<T>, options?: CursorPaginationOptions): Promise<CursorPaginationResult<T>>;
/**
 * Helper to build pagination response
 */
export declare function buildPaginationResponse<T>(data: T[], total: number, page: number, limit: number): {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
};
/**
 * Extract pagination params from request query
 */
export declare function extractPaginationParams(query: any): {
    page: number;
    limit: number;
    cursor?: string;
};
/**
 * Extract sort params from request query
 */
export declare function extractSortParams(query: any, defaultSort?: any): any;
/**
 * Advanced pagination with aggregation pipeline
 */
export declare function paginateAggregation<T>(model: Model<any>, pipeline: any[], options?: OffsetPaginationOptions): Promise<OffsetPaginationResult<T>>;
/**
 * Optimize query with field projection
 */
export declare function optimizeQueryProjection(fields?: string): any;
