"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OnboardingService_1 = require("../../merchantservices/OnboardingService");
const testUtils_1 = require("../helpers/testUtils");
describe("OnboardingService", () => {
    afterEach(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    describe("getOnboardingStatus", () => {
        it("should return onboarding status for a merchant", async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const status = await OnboardingService_1.OnboardingService.getOnboardingStatus(merchant._id.toString());
            expect(status).toBeDefined();
            expect(status.status).toBe("pending");
            expect(status.currentStep).toBe(1);
            expect(status.totalSteps).toBe(5);
            expect(status.completedSteps).toEqual([]);
            expect(status.progressPercentage).toBe(0);
        });
        it("should throw error for non-existent merchant", async () => {
            const fakeId = "507f1f77bcf86cd799439011";
            await expect(OnboardingService_1.OnboardingService.getOnboardingStatus(fakeId)).rejects.toThrow("Merchant not found");
        });
    });
    describe("saveStepData", () => {
        it("should save business info (step 1)", async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const businessInfo = {
                companyName: "Test Company",
                businessType: "retail",
                gstNumber: "GST123456"
            };
            const result = await OnboardingService_1.OnboardingService.saveStepData(merchant._id.toString(), 1, businessInfo);
            expect(result.stepData.businessInfo).toEqual(businessInfo);
            expect(result.status).toBe("in_progress");
        });
        it("should throw error for invalid step number", async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            await expect(OnboardingService_1.OnboardingService.saveStepData(merchant._id.toString(), 6, {})).rejects.toThrow("Invalid step number");
        });
    });
    describe("completeStep", () => {
        it("should mark step as completed", async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const result = await OnboardingService_1.OnboardingService.completeStep(merchant._id.toString(), 1);
            expect(result.completedSteps).toContain(1);
            expect(result.currentStep).toBe(2);
        });
    });
});
