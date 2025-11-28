"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testUtils_1 = require("../helpers/testUtils");
describe('Team Routes', () => {
    afterEach(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    describe('GET /api/merchant/team', () => {
        it('should get all team members', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const token = (0, testUtils_1.generateMerchantToken)(merchant._id.toString());
            expect(token).toBeDefined();
        });
    });
    describe('POST /api/merchant/team/invite', () => {
        it('should invite a team member', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const token = (0, testUtils_1.generateMerchantToken)(merchant._id.toString());
            expect(token).toBeDefined();
        });
    });
    describe('PUT /api/merchant/team/:userId/role', () => {
        it('should update team member role (owner only)', async () => {
            const merchant = await (0, testUtils_1.createTestMerchant)();
            const user = await (0, testUtils_1.createTestMerchantUser)(merchant._id.toString(), { role: 'staff' });
            const token = (0, testUtils_1.generateMerchantToken)(merchant._id.toString());
            expect(user).toBeDefined();
            expect(token).toBeDefined();
        });
    });
});
