const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
let authToken = '';
let merchantId = '';

// Register and login
async function setupAuth() {
  console.log('\n🔐 Setting up authentication...\n');
  try {
    const registerData = {
      businessName: 'Remaining Failed Tests Store',
      ownerName: 'Test Owner',
      email: `remaining-test-${Date.now()}@example.com`,
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

// All remaining failed endpoints (31 tests)
const REMAINING_FAILED = [
  {
    group: '📊 Dashboard - Validation Issues (4 tests)',
    note: 'These return 200 but fail validation checks',
    endpoints: [
      {
        name: 'GET /api/merchant/dashboard/activity',
        method: 'get',
        url: '/api/merchant/dashboard/activity',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/dashboard/top-products',
        method: 'get',
        url: '/api/merchant/dashboard/top-products',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/dashboard/sales-data',
        method: 'get',
        url: '/api/merchant/dashboard/sales-data',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/dashboard/low-stock',
        method: 'get',
        url: '/api/merchant/dashboard/low-stock',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      }
    ]
  },
  {
    group: '🚀 Onboarding - Validation Issues (5 tests)',
    note: 'These need complete/valid data in request body',
    endpoints: [
      {
        name: 'GET /api/merchant/onboarding/status',
        method: 'get',
        url: '/api/merchant/onboarding/status',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
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
          category: 'fashion',  // Fixed: Added required category field
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
        needsAuth: true,
        expected: 200
      },
      {
        name: 'POST /api/merchant/onboarding/submit',
        method: 'post',
        url: '/api/merchant/onboarding/submit',
        data: null,
        needsAuth: true,
        expected: 200,
        note: 'Requires all steps to be completed first'
      }
    ]
  },
  {
    group: '👥 Team - Validation Issues (2 tests)',
    note: 'These return 200/201 but fail validation checks',
    endpoints: [
      {
        name: 'GET /api/merchant/team',
        method: 'get',
        url: '/api/merchant/team',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'POST /api/merchant/team/invite',
        method: 'post',
        url: '/api/merchant/team/invite',
        data: {
          email: 'newteam@example.com',
          name: 'New Team Member',
          role: 'manager',
          permissions: ['view_orders', 'manage_products', 'view_analytics']
        },
        needsAuth: true,
        expected: 201,
        validationIssue: 'Response format validation failing'
      }
    ]
  },
  {
    group: '🛍️ Products - Validation Issues (1 test)',
    note: 'Needs complete product data',
    endpoints: [
      {
        name: 'POST /api/merchant/products',
        method: 'post',
        url: '/api/merchant/products',
        data: {
          name: 'Test Product',
          description: 'This is a test product for testing purposes with more details',
          category: '68ecdae37084846c4f4f71ba', // Need valid category ID
          price: 999,
          sku: 'TEST-SKU-001',
          inventory: {
            stock: 100,  // Fixed: Changed stockQuantity to stock
            trackInventory: true,
            lowStockThreshold: 10
          },
          cashback: {
            percentage: 5,
            isActive: true  // Fixed: Changed enabled to isActive
          },
          images: [  // Fixed: Changed from string array to object array
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
    group: '📦 Orders - Validation Issues (1 test)',
    note: 'Returns 200 but fails validation',
    endpoints: [
      {
        name: 'GET /api/merchant/orders/analytics',
        method: 'get',
        url: '/api/merchant/orders/analytics',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      }
    ]
  },
  {
    group: '🔔 Notifications - Validation Issues (1 test)',
    note: 'Returns 200 but fails validation',
    endpoints: [
      {
        name: 'GET /api/merchant/notifications/stats',
        method: 'get',
        url: '/api/merchant/notifications/stats',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      }
    ]
  },
  {
    group: '📈 Analytics - Validation Issues (9 tests)',
    note: 'These return 200 but fail validation checks',
    endpoints: [
      {
        name: 'GET /api/merchant/analytics/sales/overview',
        method: 'get',
        url: '/api/merchant/analytics/sales/overview',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/analytics/sales/trends',
        method: 'get',
        url: '/api/merchant/analytics/sales/trends',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/analytics/sales/by-time',
        method: 'get',
        url: '/api/merchant/analytics/sales/by-time',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/analytics/sales/by-day',
        method: 'get',
        url: '/api/merchant/analytics/sales/by-day',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/analytics/products/top-selling',
        method: 'get',
        url: '/api/merchant/analytics/products/top-selling',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/analytics/categories/performance',
        method: 'get',
        url: '/api/merchant/analytics/categories/performance',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/analytics/customers/insights',
        method: 'get',
        url: '/api/merchant/analytics/customers/insights',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/analytics/inventory/status',
        method: 'get',
        url: '/api/merchant/analytics/inventory/status',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/analytics/payments/breakdown',
        method: 'get',
        url: '/api/merchant/analytics/payments/breakdown',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/analytics/export',
        method: 'get',
        url: '/api/merchant/analytics/export',
        needsAuth: true,
        expected: 200,
        actualIssue: 'Returns 404'
      }
    ]
  },
  {
    group: '📝 Audit - Validation Issues (7 tests)',
    note: 'These return 200 but fail validation checks',
    endpoints: [
      {
        name: 'GET /api/merchant/audit/stats',
        method: 'get',
        url: '/api/merchant/audit/stats',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/audit/timeline',
        method: 'get',
        url: '/api/merchant/audit/timeline',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/audit/timeline/today',
        method: 'get',
        url: '/api/merchant/audit/timeline/today',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/audit/timeline/recent',
        method: 'get',
        url: '/api/merchant/audit/timeline/recent',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/audit/timeline/critical',
        method: 'get',
        url: '/api/merchant/audit/timeline/critical',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/audit/retention/stats',
        method: 'get',
        url: '/api/merchant/audit/retention/stats',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
      },
      {
        name: 'GET /api/merchant/audit/retention/compliance',
        method: 'get',
        url: '/api/merchant/audit/retention/compliance',
        needsAuth: true,
        expected: 200,
        validationIssue: 'Response format validation failing'
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

  if (endpoint.validationIssue) {
    console.log(`⚠️  Known Issue: ${endpoint.validationIssue}`);
  }
  if (endpoint.actualIssue) {
    console.log(`❌ Actual Issue: ${endpoint.actualIssue}`);
  }
  if (endpoint.note) {
    console.log(`📝 Note: ${endpoint.note}`);
  }
  if (endpoint.data) {
    console.log(`Data:`, JSON.stringify(endpoint.data, null, 2));
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

      // Detailed response analysis
      if (response.data) {
        console.log(`\n📊 Response Analysis:`);
        console.log(`   - success: ${response.data.success}`);
        console.log(`   - message: ${response.data.message || 'N/A'}`);
        console.log(`   - data type: ${Array.isArray(response.data.data) ? 'Array' : typeof response.data.data}`);

        if (Array.isArray(response.data.data)) {
          console.log(`   - data length: ${response.data.data.length}`);
        } else if (typeof response.data.data === 'object' && response.data.data !== null) {
          console.log(`   - data keys: ${Object.keys(response.data.data).join(', ')}`);
        }

        if (response.data.success) {
          console.log(`✅ Response has success=true`);
        } else {
          console.log(`⚠️  Response has success=false (may be validation issue)`);
        }
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

    // Error analysis
    if (error.response?.data) {
      console.log(`\n📊 Error Analysis:`);
      console.log(`   - Type: ${error.response.data.message || 'Unknown'}`);
      if (error.response.data.errors) {
        console.log(`   - Validation errors:`, error.response.data.errors);
      }
    }
  }

  console.log('\n' + '='.repeat(80));

  // Wait before next test
  await new Promise(resolve => setTimeout(resolve, 400));
}

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              REMAINING 31 FAILED ENDPOINTS DEBUG TEST                         ║');
  console.log('║                    Most are validation issues                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  const authenticated = await setupAuth();
  if (!authenticated) {
    console.log('❌ Cannot proceed without auth');
    return;
  }

  let testNumber = 1;
  const totalTests = REMAINING_FAILED.reduce((sum, group) => sum + group.endpoints.length, 0);

  for (const group of REMAINING_FAILED) {
    console.log(`\n\n${'█'.repeat(80)}`);
    console.log(`${group.group}`);
    if (group.note) {
      console.log(`📝 ${group.note}`);
    }
    console.log(`${'█'.repeat(80)}`);

    for (const endpoint of group.endpoints) {
      await testEndpoint(endpoint, testNumber, totalTests);
      testNumber++;
    }
  }

  console.log('\n\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           TESTS COMPLETED                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Tested ${totalTests} remaining failed endpoints`);
  console.log(`\n📊 SUMMARY OF ISSUES:`);
  console.log(`   - Most are returning 200 but failing validation checks`);
  console.log(`   - Validation checks may be too strict or checking wrong fields`);
  console.log(`   - Some need complete/valid request data`);
  console.log(`\n💡 RECOMMENDATION:`);
  console.log(`   - Review the E2E test validation functions`);
  console.log(`   - Check if validation matches actual API response format`);
  console.log(`   - Update test expectations to match current API behavior\n`);
}

runTests().catch(console.error);
