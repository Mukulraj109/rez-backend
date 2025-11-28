const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function test() {
  try {
    // Register
    const registerData = {
      businessName: 'Product Test Store',
      ownerName: 'Test Owner',
      email: `product-test-${Date.now()}@example.com`,
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
    console.log('✅ Registered\n');

    // Create a product
    console.log('Creating product...');
    const productData = {
      name: 'Test Product',
      description: 'A test product for testing purposes with complete description',
      category: '68ecdae37084846c4f4f71ba',
      price: 999,
      sku: 'TEST-PROD-001',
      inventory: {
        stock: 100,
        trackInventory: true,
        lowStockThreshold: 10
      },
      cashback: {
        percentage: 5,
        isActive: true
      },
      images: [{
        url: 'https://example.com/product.jpg',
        altText: 'Test product',
        isMain: true
      }]
    };

    const createResp = await axios.post(
      `${BASE_URL}/api/merchant/products`,
      productData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const productId = createResp.data.data.product._id;
    console.log('✅ Product created:', productId);

    // Get product by ID
    console.log('\nGetting product by ID...');
    const getResp = await axios.get(
      `${BASE_URL}/api/merchant/products/${productId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('\n📊 GET /products/:id Response:');
    console.log('Status:', getResp.status);
    console.log('Response structure:');
    console.log(JSON.stringify(getResp.data, null, 2).substring(0, 500));

    if (getResp.data.data) {
      console.log('\n📋 data.data keys:', Object.keys(getResp.data.data).join(', '));
      console.log('Has data.data.product?', !!getResp.data.data.product);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

test();
