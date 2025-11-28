const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
let authToken = '';
let merchantId = '';

async function setupAuth() {
  console.log('🔐 Setting up authentication...\n');
  try {
    const registerData = {
      businessName: '19 Failures Test Store',
      ownerName: 'Test Owner',
      email: `test-19-${Date.now()}@example.com`,
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
    authToken = response.data.data.token;
    merchantId = response.data.data.merchant._id;
    console.log('✅ Registered successfully\n');
    return true;
  } catch (error) {
    console.log('❌ Auth failed:', error.response?.data || error.message);
    return false;
  }
}

const FAILING_TESTS = [
  {
    num: 1,
    name: 'GET /api/merchant/dashboard/activity',
    method: 'get',
    url: '/api/merchant/dashboard/activity',
    expectedValidation: 'Array.isArray(data.data)',
    issue: 'Validation checking wrong field'
  },
  {
    num: 2,
    name: 'POST /api/merchant/onboarding/step/1',
    method: 'post',
    url: '/api/merchant/onboarding/step/1',
    data: {
      companyName: 'Test Company LLC',
      businessType: 'retail',
      category: 'fashion',
      hasPhysicalStore: true,
      numberOfEmployees: '10-50',
      yearEstablished: 2020
    },
    issue: 'May need complete data'
  },
  {
    num: 3,
    name: 'POST /api/merchant/onboarding/step/2',
    method: 'post',
    url: '/api/merchant/onboarding/step/2',
    data: {
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
    issue: 'Need to update E2E test data'
  },
  {
    num: 4,
    name: 'POST /api/merchant/onboarding/step/5',
    method: 'post',
    url: '/api/merchant/onboarding/step/5',
    data: {
      documents: [
        {
          type: 'gst_certificate',
          url: 'https://example.com/gst.pdf',
          verified: false
        }
      ],
      operatingHours: {
        monday: { open: '09:00', close: '21:00', isOpen: true },
        tuesday: { open: '09:00', close: '21:00', isOpen: true },
        wednesday: { open: '09:00', close: '21:00', isOpen: true },
        thursday: { open: '09:00', close: '21:00', isOpen: true },
        friday: { open: '09:00', close: '21:00', isOpen: true },
        saturday: { open: '09:00', close: '21:00', isOpen: true },
        sunday: { open: '10:00', close: '20:00', isOpen: true }
      }
    },
    issue: 'May need complete data'
  },
  {
    num: 5,
    name: 'POST /api/merchant/onboarding/submit',
    method: 'post',
    url: '/api/merchant/onboarding/submit',
    issue: 'Expected - needs all steps completed first'
  },
  {
    num: 6,
    name: 'GET /api/merchant/team',
    method: 'get',
    url: '/api/merchant/team',
    expectedValidation: 'data.data.teamMembers !== undefined',
    issue: 'Validation checking wrong field'
  },
  {
    num: 7,
    name: 'GET /api/merchant/products',
    method: 'get',
    url: '/api/merchant/products',
    issue: 'Validation checking wrong field'
  },
  {
    num: 8,
    name: 'POST /api/merchant/products',
    method: 'post',
    url: '/api/merchant/products',
    data: {
      name: 'Test Product',
      description: 'This is a test product for testing purposes with more details',
      category: '68ecdae37084846c4f4f71ba',
      price: 999,
      sku: 'TEST-SKU-19',
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
    issue: 'Need to update E2E test data'
  },
  {
    num: 9,
    name: 'GET /api/merchant/cashback/stats',
    method: 'get',
    url: '/api/merchant/cashback/stats',
    issue: 'Validation checking wrong field'
  },
  {
    num: 10,
    name: 'GET /api/merchant/analytics/customers/insights',
    method: 'get',
    url: '/api/merchant/analytics/customers/insights',
    issue: 'Validation checking wrong field'
  },
  {
    num: 11,
    name: 'GET /api/merchant/analytics/inventory/status',
    method: 'get',
    url: '/api/merchant/analytics/inventory/status',
    issue: 'Validation checking wrong field'
  },
  {
    num: 12,
    name: 'GET /api/merchant/analytics/trends/seasonal',
    method: 'get',
    url: '/api/merchant/analytics/trends/seasonal',
    issue: 'Validation checking wrong field'
  },
  {
    num: 13,
    name: 'GET /api/merchant/analytics/export',
    method: 'get',
    url: '/api/merchant/analytics/export',
    issue: 'Route does not exist (404)'
  },
  {
    num: 14,
    name: 'GET /api/merchant/audit/stats',
    method: 'get',
    url: '/api/merchant/audit/stats',
    issue: 'Validation checking wrong field'
  },
  {
    num: 15,
    name: 'GET /api/merchant/audit/timeline/today',
    method: 'get',
    url: '/api/merchant/audit/timeline/today',
    issue: 'Validation checking wrong field'
  },
  {
    num: 16,
    name: 'GET /api/merchant/audit/timeline/recent',
    method: 'get',
    url: '/api/merchant/audit/timeline/recent',
    issue: 'Validation checking wrong field'
  },
  {
    num: 17,
    name: 'GET /api/merchant/audit/timeline/critical',
    method: 'get',
    url: '/api/merchant/audit/timeline/critical',
    issue: 'Validation checking wrong field'
  },
  {
    num: 18,
    name: 'GET /api/merchant/audit/retention/stats',
    method: 'get',
    url: '/api/merchant/audit/retention/stats',
    issue: 'Validation checking wrong field'
  },
  {
    num: 19,
    name: 'GET /api/merchant/audit/retention/compliance',
    method: 'get',
    url: '/api/merchant/audit/retention/compliance',
    issue: 'Validation checking wrong field'
  }
];

async function testEndpoint(test) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`[${test.num}/19] ${test.name}`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`Issue: ${test.issue}`);

  try {
    const config = {
      method: test.method,
      url: `${BASE_URL}${test.url}`,
      headers: { Authorization: `Bearer ${authToken}` }
    };

    if (test.data) {
      config.data = test.data;
    }

    const response = await axios(config);
    console.log(`\n✅ Status: ${response.status}`);
    console.log(`Response structure:`, JSON.stringify(response.data, null, 2).substring(0, 500));

    // Analyze response structure
    if (response.data.data) {
      const dataType = Array.isArray(response.data.data) ? 'Array' : typeof response.data.data;
      console.log(`\n📊 data.data type: ${dataType}`);

      if (Array.isArray(response.data.data)) {
        console.log(`   Array length: ${response.data.data.length}`);
      } else if (typeof response.data.data === 'object') {
        console.log(`   Object keys: ${Object.keys(response.data.data).join(', ')}`);
      }
    }

    if (test.expectedValidation) {
      console.log(`\n💡 Correct validation: ${test.expectedValidation}`);
    }

  } catch (error) {
    console.log(`\n❌ Status: ${error.response?.status || 'ERROR'}`);
    console.log(`Error:`, error.response?.data || error.message);
  }

  await new Promise(resolve => setTimeout(resolve, 200));
}

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          TESTING 19 REMAINING FAILED ENDPOINTS                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const authenticated = await setupAuth();
  if (!authenticated) {
    console.log('❌ Cannot proceed without auth');
    return;
  }

  for (const test of FAILING_TESTS) {
    await testEndpoint(test);
  }

  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    ALL TESTS COMPLETED                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

runTests().catch(console.error);
