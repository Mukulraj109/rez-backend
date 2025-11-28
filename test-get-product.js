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

    console.log('✅ Product ID:', productId);

    const getResp = await axios.get(`${BASE_URL}/api/merchant/products/${productId}`, { headers: { Authorization: `Bearer ${authToken}` } });

    console.log('\n📊 GET /products/:id response:');
    console.log('Status:', getResp.status);
    console.log('\nResponse structure:');
    const respStr = JSON.stringify(getResp.data, null, 2);
    console.log(respStr.substring(0, 600));
    console.log('\n...');

    console.log('\n✅ Has data.data.product?', !!getResp.data.data.product);
    console.log('✅ Has data.data (direct)?', !!getResp.data.data && typeof getResp.data.data === 'object');

    if (getResp.data.data) {
      const keys = Object.keys(getResp.data.data);
      console.log('\n📋 data.data keys:', keys.slice(0, 10).join(', '));
    }

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}

test();
