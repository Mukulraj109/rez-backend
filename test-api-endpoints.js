/**
 * API Endpoints Test Suite
 * Tests all API endpoints to verify they return correct data
 */

require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Test results storage
const results = {
  endpoints: [],
  passed: 0,
  failed: 0,
  timestamp: new Date().toISOString()
};

// Utility functions
const printHeader = (title) => {
  console.log('\n' + chalk.cyan('═'.repeat(60)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan('═'.repeat(60)) + '\n');
};

const testEndpoint = async (method, endpoint, expectedStatus, description, testData = null, headers = {}) => {
  try {
    console.log(chalk.blue(`Testing: ${method.toUpperCase()} ${endpoint}`));
    console.log(chalk.gray(`   ${description}`));

    const startTime = Date.now();
    let response;

    switch (method.toLowerCase()) {
      case 'get':
        response = await axios.get(`${BASE_URL}${endpoint}`, { headers });
        break;
      case 'post':
        response = await axios.post(`${BASE_URL}${endpoint}`, testData, { headers });
        break;
      case 'put':
        response = await axios.put(`${BASE_URL}${endpoint}`, testData, { headers });
        break;
      case 'delete':
        response = await axios.delete(`${BASE_URL}${endpoint}`, { headers });
        break;
    }

    const responseTime = Date.now() - startTime;

    if (response.status === expectedStatus) {
      console.log(chalk.green(`   ✅ PASSED (${responseTime}ms) - Status: ${response.status}`));
      console.log(chalk.gray(`   Data received: ${JSON.stringify(response.data).substring(0, 100)}...`));
      results.passed++;
      results.endpoints.push({
        endpoint,
        method,
        status: 'PASSED',
        responseTime,
        statusCode: response.status
      });
      return { success: true, data: response.data };
    } else {
      console.log(chalk.red(`   ❌ FAILED - Expected ${expectedStatus}, got ${response.status}`));
      results.failed++;
      results.endpoints.push({
        endpoint,
        method,
        status: 'FAILED',
        responseTime,
        statusCode: response.status,
        error: `Expected ${expectedStatus}, got ${response.status}`
      });
      return { success: false };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(chalk.red(`   ❌ FAILED - ${error.message}`));
    if (error.response) {
      console.log(chalk.red(`   Status: ${error.response.status}`));
      console.log(chalk.red(`   Error: ${JSON.stringify(error.response.data)}`));
    }
    results.failed++;
    results.endpoints.push({
      endpoint,
      method,
      status: 'FAILED',
      responseTime,
      error: error.message
    });
    return { success: false };
  } finally {
    console.log('');
  }
};

const testResponseStructure = (data, requiredFields, description) => {
  console.log(chalk.blue(`Validating: ${description}`));

  let valid = true;
  const missing = [];

  for (const field of requiredFields) {
    if (!(field in data)) {
      missing.push(field);
      valid = false;
    }
  }

  if (valid) {
    console.log(chalk.green(`   ✅ All required fields present`));
    console.log(chalk.gray(`   Fields: ${requiredFields.join(', ')}`));
  } else {
    console.log(chalk.red(`   ❌ Missing fields: ${missing.join(', ')}`));
  }

  console.log('');
  return valid;
};

async function testProductEndpoints() {
  printHeader('📦 TESTING PRODUCT ENDPOINTS');

  // Get all products
  const result1 = await testEndpoint(
    'GET',
    '/products',
    200,
    'Fetch all products'
  );

  if (result1.success && result1.data.products && result1.data.products.length > 0) {
    const product = result1.data.products[0];
    testResponseStructure(
      product,
      ['_id', 'name', 'price', 'store'],
      'Product structure'
    );

    // Test single product
    await testEndpoint(
      'GET',
      `/products/${product._id}`,
      200,
      'Fetch single product by ID'
    );
  }

  // Test product search
  await testEndpoint(
    'GET',
    '/products/search?q=shirt',
    200,
    'Search products'
  );

  // Test products by store
  await testEndpoint(
    'GET',
    '/products/store/507f1f77bcf86cd799439011',
    200,
    'Fetch products by store'
  );

  // Test products by category
  await testEndpoint(
    'GET',
    '/products/category/507f1f77bcf86cd799439011',
    200,
    'Fetch products by category'
  );
}

async function testStoreEndpoints() {
  printHeader('🏪 TESTING STORE ENDPOINTS');

  // Get all stores
  const result1 = await testEndpoint(
    'GET',
    '/stores',
    200,
    'Fetch all stores'
  );

  if (result1.success && result1.data.stores && result1.data.stores.length > 0) {
    const store = result1.data.stores[0];
    testResponseStructure(
      store,
      ['_id', 'name', 'description', 'location'],
      'Store structure'
    );

    // Test single store
    await testEndpoint(
      'GET',
      `/stores/${store._id}`,
      200,
      'Fetch single store by ID'
    );
  }

  // Test store search
  await testEndpoint(
    'GET',
    '/stores/search?q=fashion',
    200,
    'Search stores'
  );

  // Test nearby stores
  await testEndpoint(
    'GET',
    '/stores/nearby?lat=28.6139&lng=77.2090&radius=10',
    200,
    'Fetch nearby stores'
  );
}

async function testCategoryEndpoints() {
  printHeader('📁 TESTING CATEGORY ENDPOINTS');

  // Get all categories
  const result1 = await testEndpoint(
    'GET',
    '/categories',
    200,
    'Fetch all categories'
  );

  if (result1.success && result1.data.categories && result1.data.categories.length > 0) {
    const category = result1.data.categories[0];
    testResponseStructure(
      category,
      ['_id', 'name', 'slug'],
      'Category structure'
    );

    // Test single category
    await testEndpoint(
      'GET',
      `/categories/${category._id}`,
      200,
      'Fetch single category by ID'
    );
  }

  // Test category hierarchy
  await testEndpoint(
    'GET',
    '/categories/hierarchy',
    200,
    'Fetch category hierarchy'
  );
}

async function testVideoEndpoints() {
  printHeader('🎥 TESTING VIDEO ENDPOINTS');

  // Get all videos
  const result1 = await testEndpoint(
    'GET',
    '/videos',
    200,
    'Fetch all videos'
  );

  if (result1.success && result1.data.videos && result1.data.videos.length > 0) {
    const video = result1.data.videos[0];
    testResponseStructure(
      video,
      ['_id', 'title', 'url', 'thumbnail'],
      'Video structure'
    );

    // Test single video
    await testEndpoint(
      'GET',
      `/videos/${video._id}`,
      200,
      'Fetch single video by ID'
    );
  }

  // Test shoppable videos
  await testEndpoint(
    'GET',
    '/videos/shoppable',
    200,
    'Fetch shoppable videos'
  );

  // Test video feed
  await testEndpoint(
    'GET',
    '/videos/feed?page=1&limit=10',
    200,
    'Fetch video feed with pagination'
  );
}

async function testOrderEndpoints() {
  printHeader('📦 TESTING ORDER ENDPOINTS');

  // Note: Order endpoints typically require authentication
  // These tests will likely fail without a valid token

  await testEndpoint(
    'GET',
    '/orders',
    401,
    'Fetch orders (should require auth)'
  );

  await testEndpoint(
    'GET',
    '/orders/123',
    401,
    'Fetch single order (should require auth)'
  );
}

async function testReviewEndpoints() {
  printHeader('⭐ TESTING REVIEW ENDPOINTS');

  // Get reviews for a product
  await testEndpoint(
    'GET',
    '/reviews/product/507f1f77bcf86cd799439011',
    200,
    'Fetch product reviews'
  );

  // Get reviews for a store
  await testEndpoint(
    'GET',
    '/reviews/store/507f1f77bcf86cd799439011',
    200,
    'Fetch store reviews'
  );

  // Get review statistics
  await testEndpoint(
    'GET',
    '/reviews/stats/product/507f1f77bcf86cd799439011',
    200,
    'Fetch review statistics'
  );
}

async function testWishlistEndpoints() {
  printHeader('💝 TESTING WISHLIST ENDPOINTS');

  // These typically require authentication
  await testEndpoint(
    'GET',
    '/wishlist',
    401,
    'Fetch user wishlist (should require auth)'
  );
}

async function testCartEndpoints() {
  printHeader('🛒 TESTING CART ENDPOINTS');

  // These typically require authentication
  await testEndpoint(
    'GET',
    '/cart',
    401,
    'Fetch user cart (should require auth)'
  );
}

async function testSearchEndpoints() {
  printHeader('🔍 TESTING SEARCH ENDPOINTS');

  // Global search
  await testEndpoint(
    'GET',
    '/search?q=fashion',
    200,
    'Global search'
  );

  // Advanced search
  await testEndpoint(
    'GET',
    '/search/advanced?q=shirt&category=fashion&minPrice=100&maxPrice=1000',
    200,
    'Advanced search with filters'
  );

  // Autocomplete
  await testEndpoint(
    'GET',
    '/search/autocomplete?q=shi',
    200,
    'Search autocomplete'
  );
}

async function testHomepageEndpoints() {
  printHeader('🏠 TESTING HOMEPAGE ENDPOINTS');

  // Homepage data
  await testEndpoint(
    'GET',
    '/homepage',
    200,
    'Fetch homepage data'
  );

  // Featured products
  await testEndpoint(
    'GET',
    '/homepage/featured',
    200,
    'Fetch featured products'
  );

  // Trending products
  await testEndpoint(
    'GET',
    '/homepage/trending',
    200,
    'Fetch trending products'
  );

  // Recommended stores
  await testEndpoint(
    'GET',
    '/homepage/recommended-stores',
    200,
    'Fetch recommended stores'
  );
}

async function testOfferEndpoints() {
  printHeader('🎁 TESTING OFFER ENDPOINTS');

  // Get all offers
  await testEndpoint(
    'GET',
    '/offers',
    200,
    'Fetch all offers'
  );

  // Get active offers
  await testEndpoint(
    'GET',
    '/offers/active',
    200,
    'Fetch active offers'
  );

  // Get deals
  await testEndpoint(
    'GET',
    '/offers/deals',
    200,
    'Fetch deals'
  );
}

async function printSummary() {
  printHeader('📊 TEST SUMMARY');

  const total = results.passed + results.failed;
  const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(2) : 0;

  console.log(`Total Tests: ${chalk.cyan(total)}`);
  console.log(`Passed: ${chalk.green(results.passed)}`);
  console.log(`Failed: ${chalk.red(results.failed)}`);
  console.log(`Success Rate: ${successRate >= 80 ? chalk.green(successRate + '%') : successRate >= 60 ? chalk.yellow(successRate + '%') : chalk.red(successRate + '%')}`);
  console.log('');

  if (results.failed > 0) {
    console.log(chalk.yellow('⚠️  FAILED ENDPOINTS:'));
    const failed = results.endpoints.filter(e => e.status === 'FAILED');
    failed.forEach(endpoint => {
      console.log(`   - ${chalk.red(`${endpoint.method} ${endpoint.endpoint}`)}`);
      if (endpoint.error) {
        console.log(`     Error: ${chalk.gray(endpoint.error)}`);
      }
    });
    console.log('');
  }

  // Performance summary
  const avgResponseTime = results.endpoints
    .filter(e => e.responseTime)
    .reduce((sum, e) => sum + e.responseTime, 0) / results.endpoints.filter(e => e.responseTime).length;

  console.log(`Average Response Time: ${chalk.cyan(avgResponseTime.toFixed(2) + 'ms')}`);
  console.log('');

  // Overall status
  if (successRate >= 90) {
    console.log(chalk.green.bold('✅ EXCELLENT! All critical endpoints are working.'));
  } else if (successRate >= 70) {
    console.log(chalk.yellow.bold('⚠️  GOOD, but some endpoints need attention.'));
  } else {
    console.log(chalk.red.bold('❌ CRITICAL: Multiple endpoint failures detected.'));
  }

  console.log('\n' + chalk.cyan('═'.repeat(60)) + '\n');

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    './test-results-api-endpoints.json',
    JSON.stringify(results, null, 2)
  );
  console.log(chalk.green('✅ Test results saved to test-results-api-endpoints.json\n'));
}

async function runAllTests() {
  try {
    printHeader('🧪 API ENDPOINTS TEST SUITE');
    console.log(chalk.blue(`Testing API at: ${BASE_URL}\n`));

    await testProductEndpoints();
    await testStoreEndpoints();
    await testCategoryEndpoints();
    await testVideoEndpoints();
    await testReviewEndpoints();
    await testWishlistEndpoints();
    await testCartEndpoints();
    await testOrderEndpoints();
    await testSearchEndpoints();
    await testHomepageEndpoints();
    await testOfferEndpoints();

    await printSummary();

  } catch (error) {
    console.error(chalk.red('❌ Test suite failed:'), error);
  }
}

// Run tests
runAllTests();
