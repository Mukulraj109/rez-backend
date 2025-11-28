import { IOrder } from '../models/Order';
export declare class ShippingLabelService {
    private static readonly UPLOAD_DIR;
    private static readonly PUBLIC_URL_BASE;
    /**
     * Ensure upload directory exists
     */
    private static ensureUploadDir;
    /**
     * Generate barcode as PNG buffer
     */
    private static generateBarcode;
    /**
     * Generate shipping label PDF
     */
    static generateShippingLabel(order: IOrder, merchantId: string): Promise<string>;
    /**
     * Create shipping label PDF
     */
    private static createShippingLabelPDF;
    /**
     * Generate multiple shipping labels at once
     */
    static generateBulkShippingLabels(orders: IOrder[], merchantId: string): Promise<string[]>;
    /**
     * Generate combined shipping label PDF with multiple orders
     */
    static generateCombinedShippingLabels(orders: IOrder[], merchantId: string): Promise<string>;
}
export default ShippingLabelService;
