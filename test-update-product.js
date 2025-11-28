const axios = require('axios');
const BASE_URL = 'http://localhost:5001';

async function test() {
  try {
    const registerData = {
      businessName: 'Product Test',
      ownerName: 'Test',
      email: `test-${Date.now()}@example.com`,
      phone: '+919999999999',
      password: 'Test@123456',
      businessAddress: {
        street: '123 Test Street',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India'
      }
    };

    const response = await axios.post(`${BASE_URL}/api/merchant/auth/register`, registerData);
    const authToken = response.data.data.token;

    const productData = {
      name: 'Test Product',
      description: 'A test product for testing purposes with complete description',
      category: '68ecdae37084846c4f4f71ba',
      price: 999,
      sku: `TEST-PROD-${Date.now()}`,
      inventory: { stock: 100, trackInventory: true, lowStockThreshold: 10 },
      cashback: { percentage: 5, isActive: true },
      images: [{ url: 'https://example.com/product.jpg', altText: 'Test product', isMain: true }]
    };

    const createResp = await axios.post(`${BASE_URL}/api/merchant/products`, productData, { headers: { Authorization: `Bearer ${authToken}` } });
    const productId = createResp.data.data.product.id;

    console.log('✅ Product created:', productId);

    // Try update with just name
    console.log('\nAttempting update with just name...');
    try {
      const updateResp = await axios.put(
        `${BASE_URL}/api/merchant/products/${productId}`,
        { name: 'Updated Product Name' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      console.log('✅ Update succeeded:', updateResp.status);
      console.log('Response:', JSON.stringify(updateResp.data, null, 2).substring(0, 300));
    } catch (err) {
      console.log('❌ Update failed:', err.response?.status);
      console.log('Error:', JSON.stringify(err.response?.data, null, 2));
    }

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}

test();
