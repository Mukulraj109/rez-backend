"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PredictiveAnalyticsService_1 = require("../../merchantservices/PredictiveAnalyticsService");
const testUtils_1 = require("../helpers/testUtils");
describe('PredictiveAnalyticsService', () => {
    afterEach(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    describe('forecastSales', () => {
        it('should forecast sales for next period', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const forecast = await PredictiveAnalyticsService_1.PredictiveAnalyticsService.forecastSales(merchant._id.toString(), 30);
            expect(forecast).toBeDefined();
            expect(Array.isArray(forecast)).toBe(true);
        });
    });
    describe('predictStockout', () => {
        it('should predict potential stockouts', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const predictions = await PredictiveAnalyticsService_1.PredictiveAnalyticsService.predictStockout(merchant._id.toString());
            expect(predictions).toBeDefined();
        });
    });
});
