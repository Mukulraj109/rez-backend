import { Response } from 'express';
interface InvoiceData {
    _id?: any;
    tier?: string;
    price?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    createdAt?: Date;
    user?: any;
    amount?: number;
    paymentId?: string;
    method?: string;
    metadata?: any;
}
interface InvoiceAddress {
    name: string;
    email: string;
    phone?: string;
    address?: string;
}
export declare class PDFService {
    /**
     * Generate invoice PDF and stream to response
     */
    static generateInvoicePDF(res: Response, invoiceData: InvoiceData, userInfo: InvoiceAddress): Promise<void>;
    /**
     * Add header with logo and company info
     */
    private static addHeader;
    /**
     * Add invoice details (number, date, etc.)
     */
    private static addInvoiceDetails;
    /**
     * Add billing information
     */
    private static addBillingInfo;
    /**
     * Add items table
     */
    private static addItemsTable;
    /**
     * Add totals section
     */
    private static addTotals;
    /**
     * Add footer with notes and thank you
     */
    private static addFooter;
}
export {};
