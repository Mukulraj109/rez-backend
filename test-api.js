const API_BASE_URL = 'http://localhost:5001/api';

// You'll need to replace this with a valid auth token from your merchant app
// Get it from: AsyncStorage.getItem('auth_token')
// For now, we'll test public endpoints
const AUTH_TOKEN = '';

async function testEndpoint(name, url, options = {}) {
  const startTime = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...options.headers
      }
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    if (response.ok && data.success !== false) {
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      console.log(`   Response:`, JSON.stringify(data).substring(0, 100) + '...');
      return { passed: true, duration, data };
    } else {
      console.log(`❌ ${name} - FAILED (${duration}ms)`);
      console.log(`   Error:`, data.message || response.statusText);
      return { passed: false, duration, error: data.message };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${name} - ERROR (${duration}ms)`);
    console.log(`   Error:`, error.message);
    return { passed: false, duration, error: error.message };
  }
}

async function runTests() {
  console.log('\n🧪 Starting API Integration Tests...\n');
  console.log('API Base URL:', API_BASE_URL);
  console.log('Auth Token:', AUTH_TOKEN ? 'Set ✓' : 'NOT SET ✗');
  console.log('='.repeat(60) + '\n');

  if (!AUTH_TOKEN) {
    console.log('⚠️  Running without authentication - only testing endpoint availability');
    console.log('   Some endpoints may return 401 Unauthorized\n');
  }

  const results = [];

  // Sync Service Tests
  console.log('📦 Testing Sync Service...\n');
  results.push(await testEndpoint('Get Sync Status', '/merchant/sync/status'));
  results.push(await testEndpoint('Get Sync History', '/merchant/sync/history?limit=5'));
  results.push(await testEndpoint('Get Sync Health', '/merchant/sync/health'));
  
  // Profile Service Tests
  console.log('\n👤 Testing Profile Service...\n');
  results.push(await testEndpoint('Get Customer View Profile', '/merchant/profile/customer-view'));
  results.push(await testEndpoint('Get Visibility Settings', '/merchant/profile/visibility'));
  results.push(await testEndpoint('Get Customer Reviews', '/merchant/profile/customer-reviews?page=1&limit=5'));

  // Bulk Operations Tests
  console.log('\n📊 Testing Bulk Operations...\n');
  results.push(await testEndpoint('Download CSV Template', '/merchant/bulk/products/template?format=csv'));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary:\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Run tests
runTests().catch(console.error);
