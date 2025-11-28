import { IAuditLog } from '../models/AuditLog';
import { Types } from 'mongoose';
export interface TimelineGroup {
    date: string;
    activities: IAuditLog[];
    count: number;
}
export interface TimelineFilters {
    merchantId: string | Types.ObjectId;
    merchantUserId?: string;
    resourceType?: string;
    action?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}
export declare class ActivityTimelineService {
    /**
     * Get timeline grouped by date
     */
    static getTimeline(filters: TimelineFilters): Promise<TimelineGroup[]>;
    /**
     * Get today's activities
     */
    static getTodayActivities(merchantId: string | Types.ObjectId): Promise<IAuditLog[]>;
    /**
     * Get recent activities
     */
    static getRecentActivities(merchantId: string | Types.ObjectId, limit?: number): Promise<IAuditLog[]>;
    /**
     * Get activity summary for a period
     */
    static getActivitySummary(merchantId: string | Types.ObjectId, startDate: Date, endDate: Date): Promise<{
        totalActivities: number;
        byAction: Record<string, number>;
        byResourceType: Record<string, number>;
        bySeverity: Record<string, number>;
        byUser: Array<{
            userId: string;
            userName: string;
            count: number;
        }>;
        dailyBreakdown: Array<{
            date: string;
            count: number;
        }>;
    }>;
    /**
     * Get critical activities
     */
    static getCriticalActivities(merchantId: string | Types.ObjectId, limit?: number): Promise<IAuditLog[]>;
    /**
     * Get activity feed (real-time compatible)
     */
    static getActivityFeed(merchantId: string | Types.ObjectId, since?: Date, limit?: number): Promise<IAuditLog[]>;
    /**
     * Search activities
     */
    static searchActivities(merchantId: string | Types.ObjectId, searchTerm: string, filters?: {
        startDate?: Date;
        endDate?: Date;
        resourceType?: string;
    }): Promise<IAuditLog[]>;
    /**
     * Helper: Group activities by date
     */
    private static groupByDate;
    /**
     * Get activity heatmap data
     */
    static getActivityHeatmap(merchantId: string | Types.ObjectId, startDate: Date, endDate: Date): Promise<Array<{
        date: string;
        hour: number;
        count: number;
    }>>;
    /**
     * Format activity for display
     */
    static formatActivity(activity: IAuditLog): string;
}
export default ActivityTimelineService;
