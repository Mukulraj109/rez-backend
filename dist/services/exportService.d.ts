import { Job } from 'bull';
export interface ExportJobData {
    storeId: string;
    exportType: 'sales' | 'products' | 'customers' | 'orders';
    format: 'csv' | 'json';
    startDate?: Date;
    endDate?: Date;
    filters?: any;
}
export interface ExportResult {
    success: boolean;
    fileUrl?: string;
    fileName?: string;
    recordCount?: number;
    error?: string;
}
export declare class ExportService {
    /**
     * Process export job
     */
    static processExport(job: Job<ExportJobData>): Promise<ExportResult>;
    /**
     * Export sales data
     */
    private static exportSalesData;
    /**
     * Export products data
     */
    private static exportProductsData;
    /**
     * Export customers data
     */
    private static exportCustomersData;
    /**
     * Export orders data
     */
    private static exportOrdersData;
    /**
     * Convert array of objects to CSV
     */
    private static convertToCSV;
}
