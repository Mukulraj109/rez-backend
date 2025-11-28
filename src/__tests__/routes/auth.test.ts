import request from 'supertest';
import { createTestMerchant, TEST_PASSWORD, cleanupTestData } from '../helpers/testUtils';

describe('Auth Routes', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  it('placeholder test', () => {
    expect(true).toBe(true);
  });
});
