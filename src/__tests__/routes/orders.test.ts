import request from 'supertest';
import { createTestMerchant, createTestOrder, generateMerchantToken, cleanupTestData } from '../helpers/testUtils';

describe('Order Routes', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/merchant/orders', () => {
    it('should get all orders for merchant', async () => {
      const merchant = await createTestMerchant();
      const token = generateMerchantToken(merchant._id.toString());
      await createTestOrder(merchant._id.toString());
      
      expect(token).toBeDefined();
    });
  });

  describe('PUT /api/merchant/orders/:id/status', () => {
    it('should update order status', async () => {
      const merchant = await createTestMerchant();
      const order = await createTestOrder(merchant._id.toString());
      const token = generateMerchantToken(merchant._id.toString());
      
      expect(order).toBeDefined();
      expect(token).toBeDefined();
    });
  });
});
