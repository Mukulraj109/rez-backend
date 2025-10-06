export interface ReportSchedule {
    id: string;
    merchantId: string;
    name: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    format: 'csv' | 'json' | 'excel';
    sections: string[];
    recipients: string[];
    isActive: boolean;
    lastGenerated?: Date;
    nextScheduled: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface ReportHistory {
    id: string;
    scheduleId: string;
    merchantId: string;
    reportType: string;
    format: string;
    generatedAt: Date;
    fileSize: number;
    downloadUrl?: string;
    emailSent: boolean;
    recipients: string[];
    status: 'generated' | 'sent' | 'failed';
    errorMessage?: string;
}
export declare class ReportService {
    private static schedules;
    private static history;
    private static scheduleCounter;
    private static historyCounter;
    private static reportInterval;
    static initialize(): void;
    static createSchedule(scheduleData: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'nextScheduled'>): ReportSchedule;
    static updateSchedule(scheduleId: string, updates: Partial<ReportSchedule>): ReportSchedule | null;
    static deleteSchedule(scheduleId: string): boolean;
    static getSchedulesByMerchant(merchantId: string): ReportSchedule[];
    static getSchedule(scheduleId: string): ReportSchedule | null;
    private static calculateNextScheduledDate;
    private static processScheduledReports;
    private static generateScheduledReport;
    private static getDateRangeForFrequency;
    private static simulateEmailSending;
    private static addToHistory;
    static getHistoryByMerchant(merchantId: string, limit?: number): ReportHistory[];
    static getHistoryBySchedule(scheduleId: string, limit?: number): ReportHistory[];
    static generateAdHocReport(merchantId: string, reportConfig: {
        name: string;
        format: 'csv' | 'json' | 'excel';
        sections: string[];
        dateRange?: {
            start: Date;
            end: Date;
        };
        recipients?: string[];
    }): Promise<ReportHistory>;
    static getReportStatistics(merchantId: string): {
        totalSchedules: number;
        activeSchedules: number;
        totalReportsGenerated: number;
        reportsThisMonth: number;
        successRate: number;
        lastReportGenerated?: Date;
    };
    static createSampleSchedules(merchantId: string): void;
    static cleanup(): void;
    static triggerScheduledReport(scheduleId: string): Promise<ReportHistory>;
    static getUpcomingReports(merchantId: string, days?: number): Array<{
        schedule: ReportSchedule;
        daysUntilDue: number;
    }>;
}
