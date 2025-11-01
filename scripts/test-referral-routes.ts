import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGVmNGQ0MTA2MWZhYWYwNDUyMjI1MDYiLCJyb2xlIjoidXNlciIsImlhdCI6MTc2MTI4NDA4NiwiZXhwIjoxNzYxMzcwNDg2fQ.Egd9J4T-i-mOrH2qPqUWpJew4MjKOFCQluepqnhuSm4';

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

async function testEndpoint(method: string, endpoint: string, data?: any) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers,
      data
    };

    const response = await axios(config);

    results.push({
      endpoint,
      method,
      status: 'PASS',
      statusCode: response.status,
      response: response.data
    });

    console.log(`✅ ${method} ${endpoint} - ${response.status}`);
    return response.data;
  } catch (error: any) {
    results.push({
      endpoint,
      method,
      status: 'FAIL',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message
    });

    console.log(`❌ ${method} ${endpoint} - ${error.response?.status || 'ERROR'}: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('\n🧪 TESTING REFERRAL ROUTES\n');
  console.log('='.repeat(60));

  console.log('\n📋 Testing Referral Routes:');

  // GET routes
  await testEndpoint('GET', '/referral/data');
  await testEndpoint('GET', '/referral/history');
  await testEndpoint('GET', '/referral/statistics');
  await testEndpoint('GET', '/referral/leaderboard');

  // POST routes
  console.log('\n💡 Testing Referral Actions:');
  await testEndpoint('POST', '/referral/generate-link');

  await testEndpoint('POST', '/referral/share', {
    method: 'whatsapp'
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 REFERRAL ROUTES TEST SUMMARY\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(2)}%`);

  // Show failed tests
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}`);
      console.log(`    Status: ${r.statusCode}`);
      console.log(`    Error: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
