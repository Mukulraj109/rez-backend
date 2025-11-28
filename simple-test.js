// Simple API endpoint test
const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5001';

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    console.log(`Testing: ${url}`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const status = res.statusCode;
        console.log(`  Status: ${status}`);
        if (status === 200) {
          console.log(`  ✅ PASS\n`);
          resolve(true);
        } else if (status === 401) {
          console.log(`  ⚠️  REQUIRES AUTH (endpoint exists)\n`);
          resolve(true);
        } else {
          console.log(`  ❌ FAIL\n`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`  ❌ ERROR: ${err.message}\n`);
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('\n🧪 API Endpoint Tests\n');
  console.log('='.repeat(50));
  console.log('');
  
  const endpoints = [
    '/health',
    '/api/merchant/sync/status',
    '/api/merchant/sync/history',
    '/api/merchant/sync/health',
    '/api/merchant/profile/customer-view',
    '/api/merchant/profile/visibility',
    '/api/merchant/bulk/products/template?format=csv'
  ];
  
  let passed = 0;
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    if (result) passed++;
  }
  
  console.log('='.repeat(50));
  console.log(`\n📊 Results: ${passed}/${endpoints.length} endpoints accessible\n`);
}

runTests();
