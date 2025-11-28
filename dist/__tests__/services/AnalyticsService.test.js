"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AnalyticsService_1 = require("../../merchantservices/AnalyticsService");
const testUtils_1 = require("../helpers/testUtils");
describe('AnalyticsService', () => {
    afterEach(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    describe('getSalesOverview', () => {
        it('should return sales overview for merchant', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const overview = await AnalyticsService_1.AnalyticsService.getSalesOverview(merchant._id.toString(), startDate, endDate);
            expect(overview).toBeDefined();
        });
    });
});
