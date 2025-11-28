const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
let authToken = '';
let merchantId = '';

// Register and login
async function setupAuth() {
  console.log('\n🔐 Setting up authentication...\n');
  try {
    const registerData = {
      businessName: 'Failed Tests Store',
      ownerName: 'Test Owner',
      email: `failed-test-${Date.now()}@example.com`,
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

    console.log('✅ Registered:', response.data.data.merchant.businessName);
    console.log('✅ Merchant ID:', merchantId);
    console.log('✅ Token obtained\n');
    return true;
  } catch (error) {
    console.log('❌ Auth failed:', error.response?.data || error.message);
    return false;
  }
}

// All failed endpoints from test results
const FAILED_ENDPOINTS = [
  {
    group: '🔐 Authentication (2 tests)',
    endpoints: [
      {
        name: 'POST /api/merchant/auth/reset-password/:token',
        method: 'post',
        url: '/api/merchant/auth/reset-password/invalid-reset-token-12345',
        data: { password: 'NewPass@123' },
        needsAuth: false,
        expected: 400
      },
      {
        name: 'POST /api/merchant/auth/verify-email/:token',
        method: 'post',
        url: '/api/merchant/auth/verify-email/invalid-email-token-12345',
        data: null,
        needsAuth: false,
        expected: 400
      }
    ]
  },
  {
    group: '📊 Dashboard (4 tests)',
    endpoints: [
      {
        name: 'GET /api/merchant/dashboard/activity',
        method: 'get',
        url: '/api/merchant/dashboard/activity',
        needsAuth: true,
        expected: 200
      },
      {
        name: 'GET /api/merchant/dashboard/top-products',
        method: 'get',
        url: '/api/merchant/dashboard/top-products',
        needsAuth: true,
        expected: 200
      },
      {
        name: 'GET /api/merchant/dashboard/sales-data',
        method: 'get',
        url: '/api/merchant/dashboard/sales-data',
        needsAuth: true,
        expected: 200
      },
      {
        name: 'GET /api/merchant/dashboard/low-stock',
        method: 'get',
        url: '/api/merchant/dashboard/low-stock',
        needsAuth: true,
        expected: 200
      }
    ]
  },
  {
    group: '🚀 Onboarding (5 tests)',
    endpoints: [
      {
        name: 'GET /api/merchant/onboarding/status',
        method: 'get',
        url: '/api/merchant/onboarding/status',
        needsAuth: true,
        expected: 200
      },
      {
        name: 'POST /api/merchant/onboarding/step/1',
        method: 'post',
        url: '/api/merchant/onboarding/step/1',
        data: { businessType: 'retail', category: 'fashion', hasPhysicalStore: true },
        needsAuth: true,
        expected: 200
      },
      {
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
        needsAuth: true,
        expected: 200
      },
      {
        name: 'POST /api/merchant/onboarding/step/5',
        method: 'post',
        url: '/api/merchant/onboarding/step/5',
        data: { operatingHours: { monday: { open: '09:00', close: '21:00', isOpen: true } } },
        needsAuth: true,
        expected: 200
      },
      {
        name: 'POST /api/merchant/onboarding/submit',
        method: 'post',
        url: '/api/merchant/onboarding/submit',
        data: null,
        needsAuth: true,
        expected: 200
      }
    ]
  },
  {
    group: '👥 Team (2 tests)',
    endpoints: [
      {
        name: 'GET /api/merchant/team',
        method: 'get',
        url: '/api/merchant/team',
        needsAuth: true,
        expected: 200
      },
      {
        name: 'POST /api/merchant/team/invite',
        method: 'post',
        url: '/api/merchant/team/invite',
        data: { email: 'team@example.com', name: 'Team Member', role: 'manager' },
        needsAuth: true,
        expected: 201
      }
    ]
  },
  {
    group: '🛍️ Products (1 test)',
    endpoints: [
      {
        name: 'POST /api/merchant/products',
        method: 'post',
        url: '/api/merchant/products',
        data: {
          name: 'Test Product',
          description: 'This is a test product for testing purposes with more details',
          category: '68ecdae37084846c4f4f71ba',
          price: 999,
          sku: 'TEST-SKU-003',
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
        needsAuth: true,
        expected: 201
      }
    ]
  },
  {
    group: '📦 Orders (1 test)',
    endpoints: [
      {
        name: 'GET /api/merchant/orders/analytics',
        method: 'get',
        url: '/api/merchant/orders/analytics',
        needsAuth: true,
        expected: 200
      }
    ]
  },
  {
    group: '🔔 Notifications (1 test)',
    endpoints: [
      {
        name: 'GET /api/merchant/notifications/stats',
        method: 'get',
        url: '/api/merchant/notifications/stats',
        needsAuth: true,
        expected: 200
      }
    ]
  },
  {
    group: '📈 Analytics (12 tests - ALL 404)',
    endpoints: [
      {
        name: 'GET /api/merchant/analytics/sales/overview',
        method: 'get',
        url: '/api/merchant/analytics/sales/overview',
        needsAuth: true,
        expected: 200
      },
      {
        name: 'GET /api/merchant/analytics/sales/trends',
        method: 'get',
        url: '/api/merchant/analytics/sales/trends',
        needsAuth: true,
        expected: 200
      },
      {
        name: 'GET /api/merchant/analytics/sales/by-time',
        method: 'get',
        url: '/api/merchant/analytics/sales/by-time',
        needsAuth: true,
        expected: 200
      },
      {
        name: 'GET /api/merchant/analytics/products/top-selling',
        method: 'get',
        url: '/api/merchant/analytics/products/top-selling',
        needsAuth: true,
        expected: 200
      }
    ]
  },
  {
    group: '📝 Audit (8 tests)',
    endpoints: [
      {
        name: 'GET /api/merchant/audit/stats',
        method: 'get',
        url: '/api/merchant/audit/stats',
        needsAuth: true,
        expected: 200
      },
      {
        name: 'GET /api/merchant/audit/search',
        method: 'get',
        url: '/api/merchant/audit/search?q=test',  // Fixed: Changed 'query=' to 'q='
        needsAuth: true,
        expected: 200
      },
      {
        name: 'GET /api/merchant/audit/timeline',
        method: 'get',
        url: '/api/merchant/audit/timeline',
        needsAuth: true,
        expected: 200
      }
    ]
  }
];

async function testEndpoint(endpoint, number, total) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`[${number}/${total}] ${endpoint.name}`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`Method: ${endpoint.method.toUpperCase()}`);
  console.log(`Expected: ${endpoint.expected}`);
  if (endpoint.data) {
    console.log(`Data:`, JSON.stringify(endpoint.data));
  }
  console.log('\n👀 CHECK BACKEND CONSOLE NOW! 👀\n');

  try {
    const config = {
      method: endpoint.method,
      url: `${BASE_URL}${endpoint.url}`,
      headers: {}
    };

    if (endpoint.needsAuth) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (endpoint.data !== undefined) {
      config.data = endpoint.data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    const status = response.status;

    console.log(`\n✅ Status: ${status}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));

    if (status === endpoint.expected) {
      console.log(`\n✅ STATUS MATCH! (Got ${status}, expected ${endpoint.expected})`);

      // Check response format
      if (response.data.success === false) {
        console.log(`⚠️  WARNING: Response has success=false (validation issue)`);
      } else {
        console.log(`✅ FULLY PASSING!`);
      }
    } else {
      console.log(`\n❌ STATUS MISMATCH! (Got ${status}, expected ${endpoint.expected})`);
    }
  } catch (error) {
    const status = error.response?.status || 'ERROR';
    console.log(`\n❌ Status: ${status}`);
    console.log(`Error:`, JSON.stringify(error.response?.data || error.message, null, 2));

    if (status === endpoint.expected) {
      console.log(`\n✅ STATUS MATCH! (Got ${status}, expected ${endpoint.expected})`);
    } else {
      console.log(`\n❌ STATUS MISMATCH! (Got ${status}, expected ${endpoint.expected})`);
    }
  }

  // Wait before next test
  await new Promise(resolve => setTimeout(resolve, 300));
}

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                 FAILED ENDPOINTS DEBUG TEST SUITE                             ║');
  console.log('║                       36 Failed Tests                                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  const authenticated = await setupAuth();
  if (!authenticated) {
    console.log('❌ Cannot proceed without auth');
    return;
  }

  let testNumber = 1;
  const totalTests = FAILED_ENDPOINTS.reduce((sum, group) => sum + group.endpoints.length, 0);

  for (const group of FAILED_ENDPOINTS) {
    console.log(`\n\n${'█'.repeat(80)}`);
    console.log(`${group.group}`);
    console.log(`${'█'.repeat(80)}`);

    for (const endpoint of group.endpoints) {
      await testEndpoint(endpoint, testNumber, totalTests);
      testNumber++;
    }
  }

  console.log('\n\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           TESTS COMPLETED                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Tested ${totalTests} failed endpoints`);
  console.log(`📝 Review backend console for detailed error logs\n`);
}

runTests().catch(console.error);
