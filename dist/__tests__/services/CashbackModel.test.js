"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Cashback_1 = require("../../models/Cashback");
const testUtils_1 = require("../helpers/testUtils");
const mongoose_1 = __importDefault(require("mongoose"));
describe('CashbackModel', () => {
    let testMerchant;
    beforeAll(async () => {
        testMerchant = await (0, testUtils_1.createTestMerchant)();
    });
    afterEach(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    describe('generateRequestNumber', () => {
        it('should generate unique request numbers', () => {
            const number1 = Cashback_1.CashbackModel.generateRequestNumber();
            const number2 = Cashback_1.CashbackModel.generateRequestNumber();
            expect(number1).toBeDefined();
            expect(number2).toBeDefined();
            expect(number1).not.toBe(number2);
            expect(number1).toMatch(/^CB-\d{8}-\d{6}$/);
        });
        it('should include date in request number', () => {
            const number = Cashback_1.CashbackModel.generateRequestNumber();
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
            expect(number).toContain(dateStr);
        });
    });
    describe('assessRisk', () => {
        it('should assess risk for low amount request', () => {
            const requestData = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer123',
                orderId: 'order123',
                requestedAmount: 10,
                cashbackRate: 5,
                paymentMethod: 'wallet'
            };
            const result = Cashback_1.CashbackModel.assessRisk(requestData);
            expect(result).toBeDefined();
            expect(result.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.riskScore).toBeLessThanOrEqual(100);
            expect(Array.isArray(result.riskFactors)).toBe(true);
            expect(typeof result.flaggedForReview).toBe('boolean');
        });
        it('should flag high amount requests for review', () => {
            const requestData = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer123',
                orderId: 'order123',
                requestedAmount: 10000, // High amount
                cashbackRate: 5,
                paymentMethod: 'wallet'
            };
            const result = Cashback_1.CashbackModel.assessRisk(requestData);
            expect(result.riskScore).toBeGreaterThan(50);
            expect(result.flaggedForReview).toBe(true);
        });
        it('should identify velocity risk factors', () => {
            const requestData = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer123',
                orderId: 'order123',
                requestedAmount: 100,
                cashbackRate: 5,
                paymentMethod: 'wallet'
            };
            const result = Cashback_1.CashbackModel.assessRisk(requestData);
            expect(result.riskFactors.length).toBeGreaterThan(0);
        });
    });
    describe('create', () => {
        it('should create cashback request successfully', async () => {
            const requestData = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer123',
                orderId: 'order123',
                customer: {
                    id: 'customer123',
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '+1234567890',
                    totalCashbackEarned: 0,
                    accountAge: 30,
                    verificationStatus: 'verified'
                },
                order: {
                    id: 'order123',
                    orderNumber: 'ORD-123',
                    totalAmount: 1000,
                    orderDate: new Date(),
                    items: []
                },
                requestedAmount: 50,
                cashbackRate: 5,
                calculationBreakdown: [],
                status: 'pending',
                priority: 'normal',
                riskScore: 10,
                riskFactors: [],
                flaggedForReview: false,
                paymentMethod: 'wallet',
                timeline: []
            };
            const request = await Cashback_1.CashbackModel.create(requestData);
            expect(request).toBeDefined();
            expect(request.id).toBeDefined();
            expect(request.requestNumber).toMatch(/^CB/);
            expect(request.status).toBe('pending');
            expect(request.requestedAmount).toBe(50);
        });
        it('should generate request number automatically', async () => {
            const requestData = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer123',
                orderId: 'order123',
                customer: {
                    id: 'customer123',
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '+1234567890',
                    totalCashbackEarned: 0,
                    accountAge: 30,
                    verificationStatus: 'verified'
                },
                order: {
                    id: 'order123',
                    orderNumber: 'ORD-123',
                    totalAmount: 1000,
                    orderDate: new Date(),
                    items: []
                },
                requestedAmount: 50,
                cashbackRate: 5,
                calculationBreakdown: [],
                status: 'pending',
                priority: 'normal',
                riskScore: 10,
                riskFactors: [],
                flaggedForReview: false,
                timeline: []
            };
            const request = await Cashback_1.CashbackModel.create(requestData);
            expect(request.requestNumber).toBeDefined();
            expect(request.requestNumber).toMatch(/^CB/);
        });
    });
    describe('approve', () => {
        it('should approve cashback request', async () => {
            const requestData = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer123',
                orderId: 'order123',
                customer: {
                    id: 'customer123',
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '+1234567890',
                    totalCashbackEarned: 0,
                    accountAge: 30,
                    verificationStatus: 'verified'
                },
                order: {
                    id: 'order123',
                    orderNumber: 'ORD-123',
                    totalAmount: 1000,
                    orderDate: new Date(),
                    items: []
                },
                requestedAmount: 50,
                cashbackRate: 5,
                calculationBreakdown: [],
                status: 'pending',
                priority: 'normal',
                riskScore: 10,
                riskFactors: [],
                flaggedForReview: false,
                timeline: []
            };
            const request = await Cashback_1.CashbackModel.create(requestData);
            const approved = await Cashback_1.CashbackModel.approve(request.id, 50, 'Approved for testing', 'test-reviewer');
            expect(approved).toBeDefined();
            expect(approved?.status).toBe('approved');
            expect(approved?.approvedAmount).toBe(50);
            expect(approved?.reviewedBy).toBe('test-reviewer');
            expect(approved?.reviewedAt).toBeDefined();
        });
        it('should return null if request not found', async () => {
            const result = await Cashback_1.CashbackModel.approve(new mongoose_1.default.Types.ObjectId().toString(), 50, 'Notes');
            expect(result).toBeNull();
        });
        it('should add timeline entry on approval', async () => {
            const requestData = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer123',
                orderId: 'order123',
                customer: {
                    id: 'customer123',
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '+1234567890',
                    totalCashbackEarned: 0,
                    accountAge: 30,
                    verificationStatus: 'verified'
                },
                order: {
                    id: 'order123',
                    orderNumber: 'ORD-123',
                    totalAmount: 1000,
                    orderDate: new Date(),
                    items: []
                },
                requestedAmount: 50,
                cashbackRate: 5,
                calculationBreakdown: [],
                status: 'pending',
                priority: 'normal',
                riskScore: 10,
                riskFactors: [],
                flaggedForReview: false,
                timeline: []
            };
            const request = await Cashback_1.CashbackModel.create(requestData);
            const approved = await Cashback_1.CashbackModel.approve(request.id, 50, 'Notes');
            expect(approved?.timeline).toBeDefined();
            expect(approved?.timeline.length).toBeGreaterThan(0);
            expect(approved?.timeline[approved.timeline.length - 1].status).toBe('approved');
        });
    });
    describe('reject', () => {
        it('should reject cashback request', async () => {
            const requestData = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer123',
                orderId: 'order123',
                customer: {
                    id: 'customer123',
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '+1234567890',
                    totalCashbackEarned: 0,
                    accountAge: 30,
                    verificationStatus: 'verified'
                },
                order: {
                    id: 'order123',
                    orderNumber: 'ORD-123',
                    totalAmount: 1000,
                    orderDate: new Date(),
                    items: []
                },
                requestedAmount: 50,
                cashbackRate: 5,
                calculationBreakdown: [],
                status: 'pending',
                priority: 'normal',
                riskScore: 10,
                riskFactors: [],
                flaggedForReview: false,
                timeline: []
            };
            const request = await Cashback_1.CashbackModel.create(requestData);
            const rejected = await Cashback_1.CashbackModel.reject(request.id, 'Invalid request', 'test-reviewer');
            expect(rejected).toBeDefined();
            expect(rejected?.status).toBe('rejected');
            expect(rejected?.rejectionReason).toBe('Invalid request');
            expect(rejected?.reviewedBy).toBe('test-reviewer');
        });
        it('should return null if request not found', async () => {
            const result = await Cashback_1.CashbackModel.reject(new mongoose_1.default.Types.ObjectId().toString(), 'Reason');
            expect(result).toBeNull();
        });
    });
    describe('getMetrics', () => {
        it('should return cashback metrics', async () => {
            // Create some test cashback requests
            const requestData1 = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer1',
                orderId: 'order1',
                customer: {
                    id: 'customer1',
                    name: 'Customer 1',
                    email: 'customer1@test.com',
                    phone: '+1234567890',
                    totalCashbackEarned: 0,
                    accountAge: 30,
                    verificationStatus: 'verified'
                },
                order: {
                    id: 'order1',
                    orderNumber: 'ORD-1',
                    totalAmount: 1000,
                    orderDate: new Date(),
                    items: []
                },
                requestedAmount: 50,
                cashbackRate: 5,
                calculationBreakdown: [],
                status: 'pending',
                priority: 'normal',
                riskScore: 10,
                riskFactors: [],
                flaggedForReview: false,
                timeline: []
            };
            const requestData2 = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer2',
                orderId: 'order2',
                customer: {
                    id: 'customer2',
                    name: 'Customer 2',
                    email: 'customer2@test.com',
                    phone: '+1234567891',
                    totalCashbackEarned: 0,
                    accountAge: 30,
                    verificationStatus: 'verified'
                },
                order: {
                    id: 'order2',
                    orderNumber: 'ORD-2',
                    totalAmount: 2000,
                    orderDate: new Date(),
                    items: []
                },
                requestedAmount: 100,
                cashbackRate: 5,
                calculationBreakdown: [],
                status: 'approved',
                priority: 'normal',
                riskScore: 10,
                riskFactors: [],
                flaggedForReview: false,
                timeline: []
            };
            await Cashback_1.CashbackModel.create(requestData1);
            await Cashback_1.CashbackModel.create(requestData2);
            const metrics = await Cashback_1.CashbackModel.getMetrics(testMerchant._id.toString());
            expect(metrics).toBeDefined();
            expect(metrics.totalPendingRequests).toBeGreaterThanOrEqual(0);
            expect(metrics.totalPendingAmount).toBeGreaterThanOrEqual(0);
            expect(typeof metrics.avgApprovalTime).toBe('number');
        });
    });
    describe('getAnalytics', () => {
        it('should return cashback analytics', async () => {
            const analytics = await Cashback_1.CashbackModel.getAnalytics(testMerchant._id.toString());
            expect(analytics).toBeDefined();
            expect(typeof analytics.totalPaid).toBe('number');
            expect(typeof analytics.totalPending).toBe('number');
            expect(typeof analytics.averageApprovalTime).toBe('number');
            expect(typeof analytics.approvalRate).toBe('number');
            expect(Array.isArray(analytics.topCategories)).toBe(true);
            expect(Array.isArray(analytics.monthlyTrends)).toBe(true);
        });
        it('should filter by date range', async () => {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
            const endDate = new Date();
            const analytics = await Cashback_1.CashbackModel.getAnalytics(testMerchant._id.toString(), { start: startDate, end: endDate });
            expect(analytics).toBeDefined();
        });
    });
    describe('search', () => {
        it('should search cashback requests', async () => {
            // Create test request
            const requestData = {
                merchantId: testMerchant._id.toString(),
                customerId: 'customer123',
                orderId: 'order123',
                customer: {
                    id: 'customer123',
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '+1234567890',
                    totalCashbackEarned: 0,
                    accountAge: 30,
                    verificationStatus: 'verified'
                },
                order: {
                    id: 'order123',
                    orderNumber: 'ORD-123',
                    totalAmount: 1000,
                    orderDate: new Date(),
                    items: []
                },
                requestedAmount: 50,
                cashbackRate: 5,
                calculationBreakdown: [],
                status: 'pending',
                priority: 'normal',
                riskScore: 10,
                riskFactors: [],
                flaggedForReview: false,
                timeline: []
            };
            await Cashback_1.CashbackModel.create(requestData);
            const result = await Cashback_1.CashbackModel.search({
                merchantId: testMerchant._id.toString(),
                page: 1,
                limit: 10
            });
            expect(result).toBeDefined();
            expect(Array.isArray(result.requests)).toBe(true);
            expect(typeof result.totalCount).toBe('number');
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });
        it('should filter by status', async () => {
            const result = await Cashback_1.CashbackModel.search({
                merchantId: testMerchant._id.toString(),
                status: 'pending',
                page: 1,
                limit: 10
            });
            expect(result).toBeDefined();
            if (result.requests.length > 0) {
                expect(result.requests[0].status).toBe('pending');
            }
        });
    });
});
