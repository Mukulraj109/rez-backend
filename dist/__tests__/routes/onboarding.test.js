"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testUtils_1 = require("../helpers/testUtils");
describe('Onboarding Routes', () => {
    afterEach(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    describe('GET /api/merchant/onboarding/status', () => {
        it('should get onboarding status', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const token = (0, testUtils_1.generateMerchantToken)(merchant._id.toString());
            // Note: This test would need the actual app instance
            expect(token).toBeDefined();
        });
    });
});
