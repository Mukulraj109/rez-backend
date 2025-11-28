export interface ExportOptions {
    format: 'csv' | 'json' | 'excel';
    dateRange?: {
        start: Date;
        end: Date;
    };
    includeCharts?: boolean;
    sections?: string[];
}
export interface ExportData {
    metadata: {
        merchantId: string;
        exportedAt: Date;
        dateRange?: {
            start: Date;
            end: Date;
        };
        format: string;
        sections: string[];
    };
    dashboard: {
        metrics: any;
        overview: any;
        notifications: any[];
    };
    orders?: any[];
    products?: any[];
    cashback?: any[];
    analytics?: {
        timeSeriesData: any[];
        categoryPerformance: any[];
        customerInsights: any;
    };
}
export declare class ExportService {
    static exportDashboardData(merchantId: string, options: ExportOptions): Promise<{
        data: any;
        filename: string;
        contentType: string;
    }>;
    private static gatherExportData;
    private static getDashboardOverview;
    private static getNotifications;
    private static generateCSVExport;
    private static generateJSONExport;
    private static generateExcelExport;
    private static metricsToTableData;
    static generateScheduledReport(merchantId: string, reportType: 'daily' | 'weekly' | 'monthly'): Promise<ExportData>;
    static exportOrders(merchantId: string, options: {
        format: 'csv' | 'json';
        dateRange?: {
            start: Date;
            end: Date;
        };
        status?: string;
    }): Promise<{
        data: string;
        filename: string;
        contentType: string;
    }>;
}
