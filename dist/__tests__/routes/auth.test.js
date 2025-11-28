"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testUtils_1 = require("../helpers/testUtils");
describe('Auth Routes', () => {
    afterEach(async () => {
        await (0, testUtils_1.cleanupTestData)();
    });
    it('placeholder test', () => {
        expect(true).toBe(true);
    });
});
