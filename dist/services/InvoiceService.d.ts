import { Response } from 'express';
import { IOrder } from '../models/Order';
export interface InvoiceData {
    order: IOrder;
    merchant: {
        businessName: string;
        email: string;
        phone: string;
        address?: string;
        gstin?: string;
        pan?: string;
    };
    store: {
        name: string;
        address?: string;
        phone?: string;
    };
}
export declare class InvoiceService {
    private static readonly UPLOAD_DIR;
    private static readonly PUBLIC_URL_BASE;
    /**
     * Ensure upload directory exists
     */
    private static ensureUploadDir;
    /**
     * Generate invoice PDF for an order
     */
    static generateInvoice(order: IOrder, merchantId: string): Promise<string>;
    /**
     * Generate invoice PDF and stream directly to response
     */
    static streamInvoicePDF(res: Response, order: IOrder, merchantId: string): Promise<void>;
    /**
     * Create invoice PDF document
     */
    private static createInvoicePDF;
    /**
     * Add header to PDF
     */
    private static addHeader;
    /**
     * Add invoice details
     */
    private static addInvoiceDetails;
    /**
     * Add billing and shipping addresses
     */
    private static addAddresses;
    /**
     * Add items table
     */
    private static addItemsTable;
    /**
     * Add totals section
     */
    private static addTotals;
    /**
     * Add payment information
     */
    private static addPaymentInfo;
    /**
     * Add footer
     */
    private static addFooter;
    /**
     * Generate packing slip (similar to invoice but without prices)
     */
    static generatePackingSlip(order: IOrder, merchantId: string): Promise<string>;
    /**
     * Create packing slip PDF
     */
    private static createPackingSlipPDF;
}
export default InvoiceService;
