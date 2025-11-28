"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InvoiceService_1 = require("../../services/InvoiceService");
const Order_1 = require("../../models/Order");
const Store_1 = require("../../models/Store");
const User_1 = require("../../models/User");
const testUtils_1 = require("../helpers/testUtils");
const mongoose_1 = __importDefault(require("mongoose"));
// Mock PDFDocument
jest.mock('pdfkit', () => {
    return jest.fn().mockImplementation(() => {
        const mockDoc = {
            pipe: jest.fn().mockReturnThis(),
            fontSize: jest.fn().mockReturnThis(),
            font: jest.fn().mockReturnThis(),
            text: jest.fn().mockReturnThis(),
            moveDown: jest.fn().mockReturnThis(),
            y: 0,
            end: jest.fn(),
            on: jest.fn((event, callback) => {
                if (event === 'finish') {
                    setTimeout(() => callback(), 10);
                }
                return mockDoc;
            })
        };
        return mockDoc;
    });
});
// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    createWriteStream: jest.fn(() => ({
        on: jest.fn((event, callback) => {
            if (event === 'finish') {
                setTimeout(() => callback(), 10);
            }
        })
    }))
}));
describe('InvoiceService', () => {
    let testMerchant;
    let testOrder;
    let testUser;
    let testStore;
    beforeAll(async () => {
        testMerchant = await (0, testUtils_1.createTestMerchant)({
            businessName: 'Test Business',
            email: 'merchant@test.com',
            phone: '+1234567890',
            businessAddress: {
                street: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
                country: 'Test Country'
            }
        });
        testUser = await User_1.User.create({
            name: 'Test User',
            email: `testuser${Date.now()}@example.com`,
            phone: '+1234567890',
            password: 'hashedpassword'
        });
        testStore = await Store_1.Store.create({
            name: 'Test Store',
            merchantId: testMerchant._id,
            location: {
                address: '456 Store St',
                city: 'Store City',
                state: 'Store State',
                pincode: '54321',
                country: 'Store Country'
            }
        });
        testOrder = await Order_1.Order.create({
            user: testUser._id,
            orderNumber: `ORD-${Date.now()}`,
            items: [{
                    product: new mongoose_1.default.Types.ObjectId(),
                    name: 'Test Product',
                    quantity: 2,
                    price: 100,
                    total: 200,
                    store: testStore._id
                }],
            totals: {
                subtotal: 200,
                tax: 20,
                shipping: 10,
                total: 230,
                paidAmount: 230
            },
            payment: {
                method: 'razorpay',
                status: 'paid',
                transactionId: 'txn_test123',
                paidAt: new Date()
            },
            delivery: {
                address: {
                    name: 'Test User',
                    street: '789 User St',
                    city: 'User City',
                    state: 'User State',
                    zipCode: '98765',
                    country: 'User Country'
                }
            }
        });
    });
    afterEach(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    afterAll(async () => {
        await Order_1.Order.deleteMany({});
        await User_1.User.deleteMany({});
        await Store_1.Store.deleteMany({});
    });
    describe('generateInvoice', () => {
        it('should generate invoice PDF successfully', async () => {
            const invoiceUrl = await InvoiceService_1.InvoiceService.generateInvoice(testOrder, testMerchant._id.toString());
            expect(invoiceUrl).toBeDefined();
            expect(typeof invoiceUrl).toBe('string');
            expect(invoiceUrl).toContain('invoice-');
            expect(invoiceUrl).toContain('.pdf');
        });
        it('should throw error if merchant not found', async () => {
            await expect(InvoiceService_1.InvoiceService.generateInvoice(testOrder, new mongoose_1.default.Types.ObjectId().toString())).rejects.toThrow('Merchant not found');
        });
        it('should include merchant details in invoice', async () => {
            const invoiceUrl = await InvoiceService_1.InvoiceService.generateInvoice(testOrder, testMerchant._id.toString());
            expect(invoiceUrl).toBeDefined();
            // Invoice should be generated with merchant details
        });
        it('should include order details in invoice', async () => {
            const invoiceUrl = await InvoiceService_1.InvoiceService.generateInvoice(testOrder, testMerchant._id.toString());
            expect(invoiceUrl).toBeDefined();
            // Invoice should contain order number, items, totals
        });
    });
    describe('streamInvoicePDF', () => {
        it('should stream PDF to response', async () => {
            const mockRes = {
                setHeader: jest.fn(),
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            await InvoiceService_1.InvoiceService.streamInvoicePDF(mockRes, testOrder, testMerchant._id.toString());
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('invoice-'));
        });
        it('should throw error if merchant not found', async () => {
            const mockRes = {
                setHeader: jest.fn()
            };
            await expect(InvoiceService_1.InvoiceService.streamInvoicePDF(mockRes, testOrder, new mongoose_1.default.Types.ObjectId().toString())).rejects.toThrow('Merchant not found');
        });
        it('should set correct filename in Content-Disposition', async () => {
            const mockRes = {
                setHeader: jest.fn()
            };
            await InvoiceService_1.InvoiceService.streamInvoicePDF(mockRes, testOrder, testMerchant._id.toString());
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining(`invoice-${testOrder.orderNumber}.pdf`));
        });
    });
});
