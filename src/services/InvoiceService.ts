import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { IOrder } from '../models/Order';
import { Merchant } from '../models/Merchant';
import { Store } from '../models/Store';

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

export class InvoiceService {
  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'invoices');
  private static readonly PUBLIC_URL_BASE = process.env.PUBLIC_URL || 'http://localhost:5000';

  /**
   * Ensure upload directory exists
   */
  private static ensureUploadDir(): void {
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
  }

  /**
   * Generate invoice PDF for an order
   */
  static async generateInvoice(order: IOrder, merchantId: string): Promise<string> {
    try {
      this.ensureUploadDir();

      // Fetch merchant and store details
      const merchant = await Merchant.findById(merchantId);
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // Get the first store from order items
      const storeId = order.items[0]?.store;
      const store = storeId ? await Store.findById(storeId) : null;

      // Format merchant address
      const merchantAddress = merchant.businessAddress
        ? `${merchant.businessAddress.street}, ${merchant.businessAddress.city}, ${merchant.businessAddress.state} ${merchant.businessAddress.zipCode}, ${merchant.businessAddress.country}`
        : '';

      const invoiceData: InvoiceData = {
        order,
        merchant: {
          businessName: merchant.businessName || 'Your Store',
          email: merchant.email,
          phone: merchant.phone || '',
          address: merchantAddress,
          gstin: (merchant as any).gstin,
          pan: (merchant as any).pan,
        },
        store: {
          name: store?.name || merchant.businessName || 'Store',
          address: store?.location?.address,
          phone: (store as any)?.contactInfo?.phone || merchant.phone,
        },
      };

      const filename = `invoice-${order.orderNumber}-${Date.now()}.pdf`;
      const filepath = path.join(this.UPLOAD_DIR, filename);

      await this.createInvoicePDF(invoiceData, filepath);

      // Return public URL
      return `${this.PUBLIC_URL_BASE}/uploads/invoices/${filename}`;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw new Error(`Failed to generate invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate invoice PDF and stream directly to response
   */
  static async streamInvoicePDF(res: Response, order: IOrder, merchantId: string): Promise<void> {
    try {
      // Fetch merchant and store details
      const merchant = await Merchant.findById(merchantId);
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // Get the first store from order items
      const storeId = order.items[0]?.store;
      const store = storeId ? await Store.findById(storeId) : null;

      // Format merchant address
      const merchantAddress = merchant.businessAddress
        ? `${merchant.businessAddress.street}, ${merchant.businessAddress.city}, ${merchant.businessAddress.state} ${merchant.businessAddress.zipCode}, ${merchant.businessAddress.country}`
        : '';

      const invoiceData: InvoiceData = {
        order,
        merchant: {
          businessName: merchant.businessName || 'Your Store',
          email: merchant.email,
          phone: merchant.phone || '',
          address: merchantAddress,
          gstin: (merchant as any).gstin,
          pan: (merchant as any).pan,
        },
        store: {
          name: store?.name || merchant.businessName || 'Store',
          address: store?.location?.address,
          phone: (store as any)?.contactInfo?.phone || merchant.phone,
        },
      };

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);

      // Create PDF and stream to response
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ margin: 50 });
          doc.pipe(res);

          // Header
          this.addHeader(doc, invoiceData);

          // Invoice details
          this.addInvoiceDetails(doc, invoiceData.order);

          // Billing and shipping addresses
          this.addAddresses(doc, invoiceData);

          // Items table
          this.addItemsTable(doc, invoiceData.order);

          // Totals
          this.addTotals(doc, invoiceData.order);

          // Payment info
          this.addPaymentInfo(doc, invoiceData.order);

          // Footer
          this.addFooter(doc, invoiceData);

          doc.end();

          doc.on('finish', () => resolve());
          doc.on('error', (err) => reject(err));
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error streaming invoice PDF:', error);
      throw new Error(`Failed to stream invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create invoice PDF document
   */
  private static async createInvoicePDF(data: InvoiceData, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        this.addHeader(doc, data);

        // Invoice details
        this.addInvoiceDetails(doc, data.order);

        // Billing and shipping addresses
        this.addAddresses(doc, data);

        // Items table
        this.addItemsTable(doc, data.order);

        // Totals
        this.addTotals(doc, data.order);

        // Payment info
        this.addPaymentInfo(doc, data.order);

        // Footer
        this.addFooter(doc, data);

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add header to PDF
   */
  private static addHeader(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const currentY = doc.y;

    // Store/Merchant name
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(data.merchant.businessName, 50, currentY);

    // INVOICE title on the right
    doc
      .fontSize(20)
      .text('INVOICE', 400, currentY, { align: 'right' });

    doc.moveDown(0.5);

    // Merchant details
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.merchant.address || '', 50, doc.y)
      .text(`Email: ${data.merchant.email}`, 50, doc.y)
      .text(`Phone: ${data.merchant.phone}`, 50, doc.y);

    if (data.merchant.gstin) {
      doc.text(`GSTIN: ${data.merchant.gstin}`, 50, doc.y);
    }

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);
  }

  /**
   * Add invoice details
   */
  private static addInvoiceDetails(doc: PDFKit.PDFDocument, order: IOrder): void {
    const detailsY = doc.y;

    // Left column
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Invoice Number:', 50, detailsY)
      .font('Helvetica')
      .text(order.orderNumber, 150, detailsY);

    doc
      .font('Helvetica-Bold')
      .text('Invoice Date:', 50, doc.y)
      .font('Helvetica')
      .text(new Date(order.createdAt).toLocaleDateString('en-IN'), 150, doc.y);

    doc
      .font('Helvetica-Bold')
      .text('Order Status:', 50, doc.y)
      .font('Helvetica')
      .text(order.status.toUpperCase(), 150, doc.y);

    // Right column
    if (order.payment?.transactionId) {
      doc
        .font('Helvetica-Bold')
        .text('Payment ID:', 350, detailsY)
        .font('Helvetica')
        .text(order.payment.transactionId, 450, detailsY);
    }

    doc
      .font('Helvetica-Bold')
      .text('Payment Method:', 350, detailsY + 15)
      .font('Helvetica')
      .text(order.payment?.method?.toUpperCase() || 'N/A', 450, detailsY + 15);

    doc
      .font('Helvetica-Bold')
      .text('Payment Status:', 350, detailsY + 30)
      .font('Helvetica')
      .text(order.payment?.status?.toUpperCase() || 'PENDING', 450, detailsY + 30);

    doc.moveDown(2);
  }

  /**
   * Add billing and shipping addresses
   */
  private static addAddresses(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const addressY = doc.y;

    // Billing address (left)
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('BILL TO:', 50, addressY);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.order.delivery.address.name, 50, doc.y)
      .text(data.order.delivery.address.phone, 50, doc.y)
      .text(data.order.delivery.address.email || '', 50, doc.y);

    // Shipping address (right)
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('SHIP TO:', 320, addressY);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.order.delivery.address.name, 320, addressY + 15)
      .text(data.order.delivery.address.addressLine1, 320, doc.y);

    if (data.order.delivery.address.addressLine2) {
      doc.text(data.order.delivery.address.addressLine2, 320, doc.y);
    }

    doc.text(
      `${data.order.delivery.address.city}, ${data.order.delivery.address.state} ${data.order.delivery.address.pincode}`,
      320,
      doc.y
    );
    doc.text(data.order.delivery.address.country, 320, doc.y);
    doc.text(data.order.delivery.address.phone, 320, doc.y);

    doc.moveDown(2);
  }

  /**
   * Add items table
   */
  private static addItemsTable(doc: PDFKit.PDFDocument, order: IOrder): void {
    const tableTop = doc.y;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 350;
    const priceX = 420;
    const amountX = 490;

    // Table header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('ITEM', itemCodeX, tableTop)
      .text('DESCRIPTION', descriptionX, tableTop)
      .text('QTY', quantityX, tableTop)
      .text('PRICE', priceX, tableTop)
      .text('AMOUNT', amountX, tableTop);

    // Header line
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let position = tableTop + 25;

    // Items
    doc.font('Helvetica').fontSize(9);

    order.items.forEach((item, index) => {
      const itemName = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;

      doc.text(`${index + 1}`, itemCodeX, position);
      doc.text(itemName, descriptionX, position);

      if (item.variant) {
        doc.fontSize(8).text(`(${item.variant.type}: ${item.variant.value})`, descriptionX, position + 10);
        doc.fontSize(9);
      }

      doc.text(item.quantity.toString(), quantityX, position);
      doc.text(`₹${item.price.toFixed(2)}`, priceX, position);
      doc.text(`₹${item.subtotal.toFixed(2)}`, amountX, position);

      position += item.variant ? 35 : 25;

      // Add new page if needed
      if (position > 700) {
        doc.addPage();
        position = 50;
      }
    });

    // Bottom line
    doc.moveTo(50, position).lineTo(550, position).stroke();
    doc.y = position + 10;
  }

  /**
   * Add totals section
   */
  private static addTotals(doc: PDFKit.PDFDocument, order: IOrder): void {
    const totalsX = 380;
    const amountX = 490;
    let currentY = doc.y + 10;

    doc.fontSize(10).font('Helvetica');

    // Subtotal
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`₹${order.totals.subtotal.toFixed(2)}`, amountX, currentY);
    currentY += 15;

    // Discount
    if (order.totals.discount > 0) {
      doc.text('Discount:', totalsX, currentY);
      doc.text(`-₹${order.totals.discount.toFixed(2)}`, amountX, currentY);
      currentY += 15;
    }

    // Tax
    if (order.totals.tax > 0) {
      doc.text('Tax (GST):', totalsX, currentY);
      doc.text(`₹${order.totals.tax.toFixed(2)}`, amountX, currentY);
      currentY += 15;
    }

    // Delivery
    if (order.totals.delivery > 0) {
      doc.text('Delivery Charges:', totalsX, currentY);
      doc.text(`₹${order.totals.delivery.toFixed(2)}`, amountX, currentY);
      currentY += 15;
    }

    // Cashback
    if (order.totals.cashback > 0) {
      doc.text('Cashback:', totalsX, currentY);
      doc.text(`-₹${order.totals.cashback.toFixed(2)}`, amountX, currentY);
      currentY += 15;
    }

    // Total line
    doc.moveTo(totalsX, currentY).lineTo(550, currentY).stroke();
    currentY += 10;

    // Grand Total
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL:', totalsX, currentY);
    doc.text(`₹${order.totals.total.toFixed(2)}`, amountX, currentY);

    doc.moveDown(2);
  }

  /**
   * Add payment information
   */
  private static addPaymentInfo(doc: PDFKit.PDFDocument, order: IOrder): void {
    const currentY = doc.y + 10;

    doc.fontSize(10).font('Helvetica-Bold').text('Payment Information:', 50, currentY);

    doc.font('Helvetica').fontSize(9);
    doc.text(`Method: ${order.payment?.method?.toUpperCase() || 'N/A'}`, 50, doc.y);
    doc.text(`Status: ${order.payment?.status?.toUpperCase() || 'PENDING'}`, 50, doc.y);

    if (order.payment?.paidAt) {
      doc.text(`Paid On: ${new Date(order.payment.paidAt).toLocaleDateString('en-IN')}`, 50, doc.y);
    }

    if (order.payment?.transactionId) {
      doc.text(`Transaction ID: ${order.payment.transactionId}`, 50, doc.y);
    }

    doc.moveDown(1);
  }

  /**
   * Add footer
   */
  private static addFooter(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const bottomY = 750;

    doc.fontSize(8).font('Helvetica');

    // Terms and conditions
    doc.text('Terms & Conditions:', 50, bottomY);
    doc.text('1. Goods once sold will not be taken back or exchanged.', 50, doc.y);
    doc.text('2. All disputes are subject to local jurisdiction only.', 50, doc.y);

    // Thank you note
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Thank you for your business!', 50, doc.y + 20, { align: 'center' });

    // Signature
    doc
      .fontSize(8)
      .font('Helvetica')
      .text('Authorized Signatory', 400, bottomY + 60);

    doc.moveTo(400, bottomY + 55).lineTo(550, bottomY + 55).stroke();
  }

  /**
   * Generate packing slip (similar to invoice but without prices)
   */
  static async generatePackingSlip(order: IOrder, merchantId: string): Promise<string> {
    try {
      this.ensureUploadDir();

      const merchant = await Merchant.findById(merchantId);
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      const storeId = order.items[0]?.store;
      const store = storeId ? await Store.findById(storeId) : null;

      const filename = `packing-slip-${order.orderNumber}-${Date.now()}.pdf`;
      const filepath = path.join(process.cwd(), 'uploads', 'packing-slips', filename);

      // Ensure directory exists
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await this.createPackingSlipPDF(order, merchant, store, filepath);

      return `${this.PUBLIC_URL_BASE}/uploads/packing-slips/${filename}`;
    } catch (error) {
      console.error('Error generating packing slip:', error);
      throw new Error(`Failed to generate packing slip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create packing slip PDF
   */
  private static async createPackingSlipPDF(
    order: IOrder,
    merchant: any,
    store: any,
    filepath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('PACKING SLIP', { align: 'center' });

        doc.moveDown(1);

        // Order info
        doc.fontSize(10).font('Helvetica');
        doc.text(`Order Number: ${order.orderNumber}`, 50, doc.y);
        doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 50, doc.y);
        doc.text(`Total Items: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}`, 50, doc.y);

        doc.moveDown(1);

        // Shipping address
        doc.fontSize(11).font('Helvetica-Bold').text('SHIP TO:', 50, doc.y);
        doc.fontSize(10).font('Helvetica');
        doc.text(order.delivery.address.name, 50, doc.y);
        doc.text(order.delivery.address.addressLine1, 50, doc.y);
        if (order.delivery.address.addressLine2) {
          doc.text(order.delivery.address.addressLine2, 50, doc.y);
        }
        doc.text(
          `${order.delivery.address.city}, ${order.delivery.address.state} ${order.delivery.address.pincode}`,
          50,
          doc.y
        );
        doc.text(order.delivery.address.phone, 50, doc.y);

        doc.moveDown(2);

        // Items table
        const tableTop = doc.y;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('ITEM', 50, tableTop)
          .text('DESCRIPTION', 150, tableTop)
          .text('QUANTITY', 450, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        let position = tableTop + 25;
        doc.font('Helvetica').fontSize(9);

        order.items.forEach((item, index) => {
          doc.text(`${index + 1}`, 50, position);
          doc.text(item.name, 150, position, { width: 280 });
          if (item.variant) {
            doc.fontSize(8).text(`(${item.variant.type}: ${item.variant.value})`, 150, position + 12);
            doc.fontSize(9);
          }
          doc.text(item.quantity.toString(), 450, position);

          position += item.variant ? 35 : 25;
        });

        doc.moveTo(50, position).lineTo(550, position).stroke();

        // Special instructions
        if (order.specialInstructions) {
          doc.moveDown(2);
          doc.fontSize(10).font('Helvetica-Bold').text('Special Instructions:', 50, doc.y);
          doc.fontSize(9).font('Helvetica').text(order.specialInstructions, 50, doc.y);
        }

        // Footer
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Checked by: _______________', 50, 720);

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default InvoiceService;
