export interface ImportRow {
    rowNumber: number;
    status: 'success' | 'error' | 'warning';
    data: any;
    errors: string[];
    warnings: string[];
    productId?: string;
    action?: 'created' | 'updated' | 'skipped';
}
export interface ImportResult {
    total: number;
    successful: number;
    failed: number;
    warnings: number;
    rows: ImportRow[];
    startTime: Date;
    endTime?: Date;
    duration?: number;
}
export interface ProductImportData {
    name: string;
    description?: string;
    shortDescription?: string;
    sku?: string;
    price: number;
    costPrice?: number;
    compareAtPrice?: number;
    category: string;
    subcategory?: string;
    stock: number;
    lowStockThreshold?: number;
    brand?: string;
    tags?: string;
    status?: 'active' | 'draft' | 'inactive';
    images?: string;
    barcode?: string;
    weight?: number;
    isFeatured?: boolean;
}
export declare class BulkImportService {
    private batchSize;
    /**
     * Parse CSV file
     */
    parseCSV(filePath: string): Promise<any[]>;
    /**
     * Parse Excel file
     */
    parseExcel(filePath: string): Promise<any[]>;
    /**
     * Parse file based on extension
     */
    parseFile(filePath: string, fileType: string): Promise<any[]>;
    /**
     * Validate single product row
     */
    validateProductRow(row: any, rowNumber: number, storeId: string, merchantId: string): Promise<ImportRow>;
    /**
     * Create or update product from validated row
     */
    processProductRow(validatedRow: ImportRow, storeId: string, merchantId: string): Promise<ImportRow>;
    /**
     * Generate SKU from product name
     */
    private generateSKU;
    /**
     * Process bulk import
     */
    processBulkImport(filePath: string, fileType: string, storeId: string, merchantId: string): Promise<ImportResult>;
    /**
     * Generate CSV template
     */
    generateCSVTemplate(): string;
    /**
     * Get import instructions
     */
    getImportInstructions(): any;
}
export declare const bulkImportService: BulkImportService;
