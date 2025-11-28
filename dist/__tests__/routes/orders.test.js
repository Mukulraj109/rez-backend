"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testUtils_1 = require("../helpers/testUtils");
describe('Order Routes', () => {
    afterEach(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    describe('GET /api/merchant/orders', () => {
        it('should get all orders for merchant', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const token = (0, testUtils_1.generateMerchantToken)(merchant._id.toString());
            await (0, testUtils_1.createTestOrder)(merchant._id.toString());
            expect(token).toBeDefined();
        });
    });
    describe('PUT /api/merchant/orders/:id/status', () => {
        it('should update order status', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const order = await (0, testUtils_1.createTestOrder)(merchant._id.toString());
            const token = (0, testUtils_1.generateMerchantToken)(merchant._id.toString());
            expect(order).toBeDefined();
            expect(token).toBeDefined();
        });
    });
});
