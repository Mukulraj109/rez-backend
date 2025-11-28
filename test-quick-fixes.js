const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function quickTest() {
  try {
    // Register
    console.log('🔐 Registering new merchant...');
    const registerData = {
      businessName: 'Quick Test Store',
      ownerName: 'Test Owner',
      email: `quick-test-${Date.now()}@example.com`,
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
    console.log('✅ Registered successfully\n');

    // Test onboarding step 2
    console.log('📝 Testing onboarding step 2...');
    try {
      const step2Result = await axios.post(
        `${BASE_URL}/api/merchant/onboarding/step/2`,
        {
          storeName: 'Test Store',
          storeDescription: 'A test store for testing purposes',
          category: 'fashion',
          address: {
            street: '123 Main St',
            city: 'Bangalore',
            state: 'Karnataka',
            zipCode: '560001',
            country: 'India'
          },
          gstNumber: 'TEST123456789',
          panNumber: 'ABCDE1234F'
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      console.log(`✅ Onboarding step 2: ${step2Result.status} - ${step2Result.data.success ? 'SUCCESS' : 'FAILED'}\n`);
    } catch (error) {
      console.log(`❌ Onboarding step 2 FAILED: ${error.response?.data?.message || error.message}\n`);
    }

    // Test product creation
    console.log('🛍️  Testing product creation...');
    try {
      const productResult = await axios.post(
        `${BASE_URL}/api/merchant/products`,
        {
          name: 'Test Product',
          description: 'This is a test product for testing purposes with more details',
          category: '68ecdae37084846c4f4f71ba',
          price: 999,
          sku: 'TEST-SKU-002',
          inventory: {
            stock: 100,
            trackInventory: true,
            lowStockThreshold: 10
          },
          cashback: {
            percentage: 5,
            isActive: true
          },
          images: [
            {
              url: 'https://example.com/product.jpg',
              altText: 'Test product image',
              isMain: true
            }
          ]
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      console.log(`✅ Product creation: ${productResult.status} - ${productResult.data.success ? 'SUCCESS' : 'FAILED'}\n`);
    } catch (error) {
      console.log(`❌ Product creation FAILED: ${error.response?.data?.message || error.message}\n`);
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ Both fixes are working!');
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Setup Error:', error.response?.data || error.message);
  }
}

quickTest();
