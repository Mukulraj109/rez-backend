"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testUtils_1 = require("../helpers/testUtils");
describe('Analytics Routes', () => {
    afterEach(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    describe('GET /api/merchant/analytics/sales/overview', () => {
        it('should get sales overview', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const token = (0, testUtils_1.generateMerchantToken)(merchant._id.toString());
            expect(token).toBeDefined();
        });
    });
    describe('GET /api/merchant/analytics/forecast/sales', () => {
        it('should get sales forecast', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const token = (0, testUtils_1.generateMerchantToken)(merchant._id.toString());
            expect(token).toBeDefined();
        });
    });
});
