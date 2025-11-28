"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingLabelService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bwip_js_1 = __importDefault(require("bwip-js"));
const Merchant_1 = require("../models/Merchant");
const Store_1 = require("../models/Store");
class ShippingLabelService {
    /**
     * Ensure upload directory exists
     */
    static ensureUploadDir() {
        if (!fs_1.default.existsSync(this.UPLOAD_DIR)) {
            fs_1.default.mkdirSync(this.UPLOAD_DIR, { recursive: true });
        }
    }
    /**
     * Generate barcode as PNG buffer
     */
    static async generateBarcode(text) {
        try {
            const png = await bwip_js_1.default.toBuffer({
                bcid: 'code128',
                text: text,
                scale: 3,
                height: 10,
                includetext: true,
                textxalign: 'center',
            });
            return png;
        }
        catch (error) {
            console.error('Error generating barcode:', error);
            // Return empty buffer if barcode generation fails
            return Buffer.from('');
        }
    }
    /**
     * Generate shipping label PDF
     */
    static async generateShippingLabel(order, merchantId) {
        try {
            this.ensureUploadDir();
            // Fetch merchant and store details
            const merchant = await Merchant_1.Merchant.findById(merchantId);
            if (!merchant) {
                throw new Error('Merchant not found');
            }
            const storeId = order.items[0]?.store;
            const store = storeId ? await Store_1.Store.findById(storeId) : null;
            const filename = `shipping-label-${order.orderNumber}-${Date.now()}.pdf`;
            const filepath = path_1.default.join(this.UPLOAD_DIR, filename);
            await this.createShippingLabelPDF(order, merchant, store, filepath);
            return `${this.PUBLIC_URL_BASE}/uploads/labels/${filename}`;
        }
        catch (error) {
            console.error('Error generating shipping label:', error);
            throw new Error(`Failed to generate shipping label: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Create shipping label PDF
     */
    static async createShippingLabelPDF(order, merchant, store, filepath) {
        return new Promise(async (resolve, reject) => {
            try {
                // Generate barcode
                const barcodeBuffer = await this.generateBarcode(order.orderNumber);
                const doc = new pdfkit_1.default({
                    size: [4 * 72, 6 * 72], // 4x6 inches shipping label
                    margin: 20,
                });
                const stream = fs_1.default.createWriteStream(filepath);
                doc.pipe(stream);
                // Header with merchant/store info
                doc
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text('FROM:', 20, 20);
                doc.fontSize(10).font('Helvetica');
                doc.text(store?.name || merchant.businessName || 'Store', 20, doc.y);
                if (store?.location?.address || merchant.businessAddress) {
                    const address = store?.location?.address || merchant.businessAddress;
                    doc.text(address, 20, doc.y, { width: 240 });
                }
                if (store?.contactInfo?.phone || merchant.phone) {
                    doc.text(`Phone: ${store?.contactInfo?.phone || merchant.phone}`, 20, doc.y);
                }
                // Divider
                doc.moveTo(20, doc.y + 10).lineTo(268, doc.y + 10).stroke();
                const dividerY = doc.y + 15;
                // Shipping address
                doc
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text('TO:', 20, dividerY);
                doc.fontSize(12).font('Helvetica-Bold');
                doc.text(order.delivery.address.name, 20, doc.y);
                doc.fontSize(10).font('Helvetica');
                doc.text(order.delivery.address.addressLine1, 20, doc.y, { width: 240 });
                if (order.delivery.address.addressLine2) {
                    doc.text(order.delivery.address.addressLine2, 20, doc.y, { width: 240 });
                }
                if (order.delivery.address.landmark) {
                    doc.text(`Landmark: ${order.delivery.address.landmark}`, 20, doc.y, { width: 240 });
                }
                doc.fontSize(11).font('Helvetica-Bold');
                doc.text(`${order.delivery.address.city}, ${order.delivery.address.state} - ${order.delivery.address.pincode}`, 20, doc.y);
                doc.fontSize(10).font('Helvetica');
                doc.text(`Phone: ${order.delivery.address.phone}`, 20, doc.y);
                if (order.delivery.address.email) {
                    doc.text(`Email: ${order.delivery.address.email}`, 20, doc.y);
                }
                // Divider
                const beforeBarcodeY = doc.y + 10;
                doc.moveTo(20, beforeBarcodeY).lineTo(268, beforeBarcodeY).stroke();
                // Order details
                const orderDetailsY = beforeBarcodeY + 15;
                doc.fontSize(10).font('Helvetica-Bold');
                doc.text('Order Number:', 20, orderDetailsY);
                doc.fontSize(12).font('Helvetica');
                doc.text(order.orderNumber, 20, doc.y);
                doc.fontSize(9).font('Helvetica');
                doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 20, doc.y);
                doc.text(`Items: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}`, 20, doc.y);
                if (order.payment?.method === 'cod') {
                    doc
                        .fontSize(11)
                        .font('Helvetica-Bold')
                        .fillColor('red')
                        .text(`COD: ₹${order.totals.total.toFixed(2)}`, 20, doc.y);
                    doc.fillColor('black');
                }
                else {
                    doc
                        .fontSize(10)
                        .font('Helvetica-Bold')
                        .text('PREPAID', 20, doc.y);
                }
                // Add barcode if generated successfully
                if (barcodeBuffer.length > 0) {
                    const barcodeY = doc.y + 10;
                    doc.image(barcodeBuffer, 50, barcodeY, {
                        width: 180,
                        align: 'center',
                    });
                }
                // Delivery instructions if any
                if (order.delivery.instructions) {
                    doc.moveDown(3);
                    doc.fontSize(8).font('Helvetica-Bold');
                    doc.text('Delivery Instructions:', 20, doc.y);
                    doc.fontSize(8).font('Helvetica');
                    doc.text(order.delivery.instructions, 20, doc.y, { width: 240 });
                }
                // Tracking ID if available
                if (order.delivery.trackingId) {
                    doc.fontSize(8).font('Helvetica');
                    doc.text(`Tracking: ${order.delivery.trackingId}`, 20, 410, { align: 'center' });
                }
                doc.end();
                stream.on('finish', resolve);
                stream.on('error', reject);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Generate multiple shipping labels at once
     */
    static async generateBulkShippingLabels(orders, merchantId) {
        const labels = [];
        for (const order of orders) {
            try {
                const labelUrl = await this.generateShippingLabel(order, merchantId);
                labels.push(labelUrl);
            }
            catch (error) {
                console.error(`Failed to generate label for order ${order.orderNumber}:`, error);
                labels.push(''); // Add empty string for failed labels
            }
        }
        return labels;
    }
    /**
     * Generate combined shipping label PDF with multiple orders
     */
    static async generateCombinedShippingLabels(orders, merchantId) {
        try {
            this.ensureUploadDir();
            const merchant = await Merchant_1.Merchant.findById(merchantId);
            if (!merchant) {
                throw new Error('Merchant not found');
            }
            const filename = `shipping-labels-batch-${Date.now()}.pdf`;
            const filepath = path_1.default.join(this.UPLOAD_DIR, filename);
            return new Promise(async (resolve, reject) => {
                try {
                    const doc = new pdfkit_1.default({
                        size: [4 * 72, 6 * 72],
                        margin: 20,
                        autoFirstPage: false,
                    });
                    const stream = fs_1.default.createWriteStream(filepath);
                    doc.pipe(stream);
                    for (let i = 0; i < orders.length; i++) {
                        const order = orders[i];
                        const storeId = order.items[0]?.store;
                        const store = storeId ? await Store_1.Store.findById(storeId) : null;
                        // Add new page for each label
                        doc.addPage();
                        // Generate barcode
                        const barcodeBuffer = await this.generateBarcode(order.orderNumber);
                        // FROM section
                        doc
                            .fontSize(14)
                            .font('Helvetica-Bold')
                            .text('FROM:', 20, 20);
                        doc.fontSize(10).font('Helvetica');
                        doc.text(store?.name || merchant.businessName || 'Store', 20, doc.y);
                        if (store?.location?.address || merchant.businessAddress) {
                            const address = store?.location?.address ||
                                (typeof merchant.businessAddress === 'string'
                                    ? merchant.businessAddress
                                    : `${merchant.businessAddress?.street || ''}, ${merchant.businessAddress?.city || ''}, ${merchant.businessAddress?.state || ''} ${merchant.businessAddress?.zipCode || ''}`);
                            doc.text(address, 20, doc.y, {
                                width: 240,
                            });
                        }
                        if (store?.contactInfo?.phone || merchant.phone) {
                            doc.text(`Phone: ${store?.contactInfo?.phone || merchant.phone}`, 20, doc.y);
                        }
                        doc.moveTo(20, doc.y + 10).lineTo(268, doc.y + 10).stroke();
                        // TO section
                        doc
                            .fontSize(14)
                            .font('Helvetica-Bold')
                            .text('TO:', 20, doc.y + 15);
                        doc.fontSize(12).font('Helvetica-Bold');
                        doc.text(order.delivery.address.name, 20, doc.y);
                        doc.fontSize(10).font('Helvetica');
                        doc.text(order.delivery.address.addressLine1, 20, doc.y, { width: 240 });
                        if (order.delivery.address.addressLine2) {
                            doc.text(order.delivery.address.addressLine2, 20, doc.y, { width: 240 });
                        }
                        doc.fontSize(11).font('Helvetica-Bold');
                        doc.text(`${order.delivery.address.city}, ${order.delivery.address.state} - ${order.delivery.address.pincode}`, 20, doc.y);
                        doc.fontSize(10).font('Helvetica');
                        doc.text(`Phone: ${order.delivery.address.phone}`, 20, doc.y);
                        const beforeBarcodeY = doc.y + 10;
                        doc.moveTo(20, beforeBarcodeY).lineTo(268, beforeBarcodeY).stroke();
                        // Order details
                        doc.fontSize(10).font('Helvetica-Bold');
                        doc.text('Order Number:', 20, doc.y + 15);
                        doc.fontSize(12).font('Helvetica');
                        doc.text(order.orderNumber, 20, doc.y);
                        if (order.payment?.method === 'cod') {
                            doc
                                .fontSize(11)
                                .font('Helvetica-Bold')
                                .fillColor('red')
                                .text(`COD: ₹${order.totals.total.toFixed(2)}`, 20, doc.y + 5);
                            doc.fillColor('black');
                        }
                        // Barcode
                        if (barcodeBuffer.length > 0) {
                            doc.image(barcodeBuffer, 50, doc.y + 10, {
                                width: 180,
                                align: 'center',
                            });
                        }
                    }
                    doc.end();
                    stream.on('finish', () => {
                        const publicUrl = `${this.PUBLIC_URL_BASE}/uploads/labels/${filename}`;
                        resolve(publicUrl);
                    });
                    stream.on('error', reject);
                }
                catch (error) {
                    reject(error);
                }
            });
        }
        catch (error) {
            console.error('Error generating combined shipping labels:', error);
            throw new Error(`Failed to generate combined shipping labels: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.ShippingLabelService = ShippingLabelService;
ShippingLabelService.UPLOAD_DIR = path_1.default.join(process.cwd(), 'uploads', 'labels');
ShippingLabelService.PUBLIC_URL_BASE = process.env.PUBLIC_URL || 'http://localhost:5000';
exports.default = ShippingLabelService;
