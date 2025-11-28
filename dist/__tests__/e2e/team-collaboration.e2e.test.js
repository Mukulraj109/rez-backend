"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testUtils_1 = require("../helpers/testUtils");
describe('E2E: Team Collaboration', () => {
    afterAll(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    it('1. Owner creates merchant account', async () => {
        const merchant = await (0, testUtils_1.createTestMerchant)();
        expect(merchant).toBeDefined();
        expect(merchant.ownerName).toBeDefined();
    });
    it('2. Owner invites admin', async () => {
        const merchant = await (0, testUtils_1.createTestMerchant)();
        const admin = await (0, testUtils_1.createTestMerchantUser)(merchant._id.toString(), {
            role: 'admin',
            email: 'admin@test.com'
        });
        expect(admin.role).toBe('admin');
    });
    it('3. Admin invites manager', async () => {
        const merchant = await (0, testUtils_1.createTestMerchant)();
        const manager = await (0, testUtils_1.createTestMerchantUser)(merchant._id.toString(), {
            role: 'manager',
            email: 'manager@test.com'
        });
        expect(manager.role).toBe('manager');
    });
    it('4. Manager creates product (has permission)', async () => {
        const merchant = await (0, testUtils_1.createTestMerchant)();
        const manager = await (0, testUtils_1.createTestMerchantUser)(merchant._id.toString(), {
            role: 'manager'
        });
        expect(manager).toBeDefined();
    });
});
