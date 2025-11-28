export interface ValidationError {
    row: number;
    field: string;
    message: string;
    value?: any;
}
export interface ImportResult {
    success: boolean;
    totalRows: number;
    successCount: number;
    errorCount: number;
    errors: ValidationError[];
    products?: any[];
}
export interface ProductRow {
    name: string;
    description: string;
    shortDescription?: string;
    price: number;
    compareAtPrice?: number;
    category: string;
    subcategory?: string;
    brand?: string;
    sku?: string;
    barcode?: string;
    stock: number;
    lowStockThreshold?: number;
    weight?: number;
    tags?: string;
    status?: string;
    visibility?: string;
    cashbackPercentage?: number;
    imageUrl?: string;
}
declare class BulkProductService {
    private validateProductRow;
    private generateSKU;
    parseCSV(fileBuffer: Buffer): Promise<ProductRow[]>;
    parseExcel(fileBuffer: Buffer): Promise<ProductRow[]>;
    validateImport(products: ProductRow[], merchantId: string): Promise<{
        isValid: boolean;
        errors: ValidationError[];
    }>;
    importProducts(products: ProductRow[], merchantId: string, validateOnly?: boolean): Promise<ImportResult>;
    private createUserSideProduct;
    exportToCSV(merchantId: string, filePath: string): Promise<void>;
    exportToExcel(merchantId: string, filePath: string): Promise<void>;
    getTemplateHeaders(): string[];
}
declare const _default: BulkProductService;
export default _default;
