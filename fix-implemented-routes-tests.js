const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, 'tests/e2e/merchant-endpoints-test.js');
let content = fs.readFileSync(testFile, 'utf8');

console.log('🔧 Updating test expectations for newly implemented routes...\n');

// Fix variants GET route - expect 200 now
content = content.replace(
  "name: 'GET /api/merchant/products/:id/variants - Get product variants',\n      method: 'get',\n      url: () => `/api/merchant/products/${testData.products[0]?._id || testData.products[0]?.id || 'invalid'}/variants`,\n      expectedStatus: 404,  // Route not implemented",
  "name: 'GET /api/merchant/products/:id/variants - Get product variants',\n      method: 'get',\n      url: () => `/api/merchant/products/${testData.products[0]?._id || testData.products[0]?.id || 'invalid'}/variants`,\n      expectedStatus: 200,  // Now implemented!"
);

// Fix variants POST route - expect 201 now
content = content.replace(
  "name: 'POST /api/merchant/products/:id/variants - Create variant',\n      method: 'post',\n      url: () => `/api/merchant/products/${testData.products[0]?._id || testData.products[0]?.id || 'invalid'}/variants`,\n      data: config.testVariant,\n      expectedStatus: 404,  // Route not implemented",
  "name: 'POST /api/merchant/products/:id/variants - Create variant',\n      method: 'post',\n      url: () => `/api/merchant/products/${testData.products[0]?._id || testData.products[0]?.id || 'invalid'}/variants`,\n      data: config.testVariant,\n      expectedStatus: 201,  // Now implemented!"
);

// Fix reviews GET route - expect 200 now
content = content.replace(
  "name: 'GET /api/merchant/products/:id/reviews - Get product reviews',\n      method: 'get',\n      url: () => `/api/merchant/products/${testData.products[0]?._id || testData.products[0]?.id || 'invalid'}/reviews`,\n      expectedStatus: 404,  // Route not implemented",
  "name: 'GET /api/merchant/products/:id/reviews - Get product reviews',\n      method: 'get',\n      url: () => `/api/merchant/products/${testData.products[0]?._id || testData.products[0]?.id || 'invalid'}/reviews`,\n      expectedStatus: 200,  // Now implemented!"
);

// Write back
fs.writeFileSync(testFile, content, 'utf8');

console.log('✅ Fixed GET /products/:id/variants (expected 200)');
console.log('✅ Fixed POST /products/:id/variants (expected 201)');
console.log('✅ Fixed GET /products/:id/reviews (expected 200)');
console.log('\n📝 E2E test file updated!\n');
console.log('⚠️  RESTART BACKEND for changes to take effect!\n');
