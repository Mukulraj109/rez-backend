/**
 * Comprehensive API Testing Script
 * Tests all critical backend functionality after fixes
 *
 * Usage: node comprehensive-api-test.js
 */

const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:5001';
const API_PREFIX = '/api';

// Test results storage
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Store auth token for protected routes
let authToken = null;
let testUserId = null;

/**
 * Helper function to run a test
 */
async function runTest(testName, testFunction) {
  results.total++;
  console.log(chalk.blue(`\n🧪 Running: ${testName}`));

  const startTime = Date.now();
  try {
    const result = await testFunction();
    const duration = Date.now() - startTime;

    results.passed++;
    results.tests.push({
      name: testName,
      status: 'PASSED',
      duration: `${duration}ms`,
      details: result
    });

    console.log(chalk.green(`✓ PASSED (${duration}ms)`));
    if (result && typeof result === 'object') {
      console.log(chalk.gray(JSON.stringify(result, null, 2).substring(0, 200)));
    }
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    results.failed++;
    results.tests.push({
      name: testName,
      status: 'FAILED',
      duration: `${duration}ms`,
      error: error.message,
      details: error.response?.data || error.message
    });

    console.log(chalk.red(`✗ FAILED (${duration}ms)`));
    console.log(chalk.red(`Error: ${error.message}`));
    if (error.response?.data) {
      console.log(chalk.gray(JSON.stringify(error.response.data, null, 2)));
    }
    return null;
  }
}

/**
 * Helper to make API requests
 */
async function apiRequest(method, endpoint, data = null, useAuth = false) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (useAuth && authToken) {
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
  }

  const response = await axios(config);
  return response.data;
}

// ============================================
// TEST 1: AUTHENTICATION FLOW
// ============================================

async function testSendOTPNewUser() {
  const data = await apiRequest('POST', `${API_PREFIX}/user/auth/send-otp`, {
    phoneNumber: '9876543210',
    email: 'test@example.com'
  });

  if (!data.success) {
    throw new Error('Send OTP failed for new user');
  }

  return {
    success: data.success,
    message: data.message,
    devOtp: data.devOtp
  };
}

async function testSendOTPExistingUser() {
  const data = await apiRequest('POST', `${API_PREFIX}/user/auth/send-otp`, {
    phoneNumber: '9876543210'
  });

  if (!data.success) {
    throw new Error('Send OTP failed for existing user');
  }

  return {
    success: data.success,
    message: data.message,
    devOtp: data.devOtp
  };
}

async function testSendOTPDifferentFormats() {
  const formats = ['+919876543210', '919876543210', '9876543210'];
  const results = [];

  for (const phone of formats) {
    try {
      const data = await apiRequest('POST', `${API_PREFIX}/user/auth/send-otp`, {
        phoneNumber: phone
      });
      results.push({ phone, success: data.success });
    } catch (error) {
      results.push({ phone, success: false, error: error.message });
    }
  }

  return results;
}

async function testVerifyOTPCorrect() {
  // First send OTP
  const sendResult = await apiRequest('POST', `${API_PREFIX}/user/auth/send-otp`, {
    phoneNumber: '9876543211',
    email: 'verify@example.com'
  });

  // Then verify with dev OTP
  const data = await apiRequest('POST', `${API_PREFIX}/user/auth/verify-otp`, {
    phoneNumber: '9876543211',
    otp: sendResult.devOtp
  });

  if (!data.success || !data.token) {
    throw new Error('OTP verification failed');
  }

  // Store token for protected route tests
  authToken = data.token;
  testUserId = data.user?.id;

  return {
    success: data.success,
    hasToken: !!data.token,
    hasUser: !!data.user,
    isNewUser: data.isNewUser
  };
}

async function testVerifyOTPDevelopment() {
  const data = await apiRequest('POST', `${API_PREFIX}/user/auth/verify-otp`, {
    phoneNumber: '9876543211',
    otp: '123456'
  });

  if (!data.success) {
    throw new Error('Development OTP (123456) failed');
  }

  return {
    success: data.success,
    acceptsDevOTP: true
  };
}

// ============================================
// TEST 2: DATA APIs
// ============================================

async function testProductsAPI() {
  const data = await apiRequest('GET', `${API_PREFIX}/products?page=1&limit=10`);

  if (!data.success || !data.products || data.products.length === 0) {
    throw new Error('Products API returned no data');
  }

  return {
    success: data.success,
    count: data.products.length,
    total: data.pagination?.total,
    hasProducts: data.products.length >= 10
  };
}

async function testFeaturedProducts() {
  const data = await apiRequest('GET', `${API_PREFIX}/products/featured`);

  if (!data.success || !data.products || data.products.length === 0) {
    throw new Error('Featured products API returned no data');
  }

  return {
    success: data.success,
    count: data.products.length,
    hasFeatured: data.products.length >= 5
  };
}

async function testStoresAPI() {
  const data = await apiRequest('GET', `${API_PREFIX}/stores?page=1&limit=10`);

  if (!data.success || !data.stores || data.stores.length === 0) {
    throw new Error('Stores API returned no data');
  }

  return {
    success: data.success,
    count: data.stores.length,
    total: data.pagination?.total,
    hasStores: data.stores.length >= 10
  };
}

async function testOffersAPI() {
  const data = await apiRequest('GET', `${API_PREFIX}/offers`);

  if (!data.success || !data.offers || data.offers.length === 0) {
    throw new Error('Offers API returned no data');
  }

  return {
    success: data.success,
    count: data.offers.length,
    hasOffers: data.offers.length >= 15
  };
}

async function testVideosAPI() {
  const data = await apiRequest('GET', `${API_PREFIX}/videos`);

  if (!data.success || !data.videos || data.videos.length === 0) {
    throw new Error('Videos API returned no data');
  }

  return {
    success: data.success,
    count: data.videos.length,
    hasVideos: data.videos.length >= 10
  };
}

async function testProjectsAPI() {
  const data = await apiRequest('GET', `${API_PREFIX}/projects`);

  if (!data.success || !data.projects || data.projects.length === 0) {
    throw new Error('Projects API returned no data');
  }

  return {
    success: data.success,
    count: data.projects.length,
    hasProjects: data.projects.length >= 5
  };
}

async function testCategoriesAPI() {
  const data = await apiRequest('GET', `${API_PREFIX}/categories`);

  if (!data.success || !data.categories || data.categories.length === 0) {
    throw new Error('Categories API returned no data');
  }

  return {
    success: data.success,
    count: data.categories.length
  };
}

async function testHomepageAPI() {
  const data = await apiRequest('GET', `${API_PREFIX}/homepage`);

  if (!data.success) {
    throw new Error('Homepage API failed');
  }

  return {
    success: data.success,
    hasSections: !!data.sections,
    sectionCount: data.sections?.length || 0
  };
}

// ============================================
// TEST 3: PROTECTED ENDPOINTS
// ============================================

async function testGetCart() {
  if (!authToken) {
    throw new Error('No auth token available');
  }

  const data = await apiRequest('GET', `${API_PREFIX}/cart`, null, true);

  return {
    success: data.success,
    hasCart: !!data.cart,
    itemCount: data.cart?.items?.length || 0
  };
}

async function testAddToCart() {
  if (!authToken) {
    throw new Error('No auth token available');
  }

  // Get a product first
  const productsData = await apiRequest('GET', `${API_PREFIX}/products?page=1&limit=1`);
  if (!productsData.products || productsData.products.length === 0) {
    throw new Error('No products available to add to cart');
  }

  const product = productsData.products[0];

  const data = await apiRequest('POST', `${API_PREFIX}/cart/items`, {
    productId: product._id,
    quantity: 1
  }, true);

  return {
    success: data.success,
    itemAdded: !!data.cart,
    message: data.message
  };
}

async function testGetWishlist() {
  if (!authToken) {
    throw new Error('No auth token available');
  }

  const data = await apiRequest('GET', `${API_PREFIX}/wishlist`, null, true);

  return {
    success: data.success,
    hasWishlist: !!data.wishlist,
    itemCount: data.wishlist?.items?.length || 0
  };
}

async function testAddToWishlist() {
  if (!authToken) {
    throw new Error('No auth token available');
  }

  // Get a product first
  const productsData = await apiRequest('GET', `${API_PREFIX}/products?page=1&limit=1`);
  if (!productsData.products || productsData.products.length === 0) {
    throw new Error('No products available to add to wishlist');
  }

  const product = productsData.products[0];

  const data = await apiRequest('POST', `${API_PREFIX}/wishlist/items`, {
    productId: product._id
  }, true);

  return {
    success: data.success,
    itemAdded: !!data.wishlist,
    message: data.message
  };
}

async function testGetCurrentUser() {
  if (!authToken) {
    throw new Error('No auth token available');
  }

  const data = await apiRequest('GET', `${API_PREFIX}/user/auth/me`, null, true);

  return {
    success: data.success,
    hasUser: !!data.user,
    userId: data.user?._id,
    phoneNumber: data.user?.phoneNumber
  };
}

// ============================================
// TEST 4: ERROR HANDLING
// ============================================

async function testInvalidOTP() {
  try {
    await apiRequest('POST', `${API_PREFIX}/user/auth/verify-otp`, {
      phoneNumber: '9876543210',
      otp: '000000'
    });
    throw new Error('Should have failed with invalid OTP');
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 401) {
      return {
        correctlyRejected: true,
        status: error.response.status,
        message: error.response.data.message
      };
    }
    throw error;
  }
}

async function testMissingPhoneNumber() {
  try {
    await apiRequest('POST', `${API_PREFIX}/user/auth/send-otp`, {
      email: 'test@example.com'
    });
    throw new Error('Should have failed without phone number');
  } catch (error) {
    if (error.response?.status === 400) {
      return {
        correctlyRejected: true,
        status: error.response.status,
        message: error.response.data.message
      };
    }
    throw error;
  }
}

async function testUnauthorizedAccess() {
  try {
    await apiRequest('GET', `${API_PREFIX}/cart`);
    throw new Error('Should have failed without auth token');
  } catch (error) {
    if (error.response?.status === 401) {
      return {
        correctlyRejected: true,
        status: error.response.status,
        message: error.response.data.message
      };
    }
    throw error;
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  console.log(chalk.cyan('\n' + '='.repeat(60)));
  console.log(chalk.cyan('  COMPREHENSIVE BACKEND API TEST SUITE'));
  console.log(chalk.cyan('='.repeat(60)));

  // Check backend health
  try {
    const health = await apiRequest('GET', '/health');
    console.log(chalk.green('\n✓ Backend is running'));
    console.log(chalk.gray(`  Database: ${health.database.status}`));
    console.log(chalk.gray(`  Environment: ${health.environment}`));
    console.log(chalk.gray(`  Total Endpoints: ${health.api.totalEndpoints}`));
  } catch (error) {
    console.log(chalk.red('\n✗ Backend is not responding'));
    console.log(chalk.yellow('Please start the backend server first'));
    process.exit(1);
  }

  console.log(chalk.cyan('\n' + '─'.repeat(60)));
  console.log(chalk.cyan('TASK 1: AUTHENTICATION FLOW'));
  console.log(chalk.cyan('─'.repeat(60)));

  await runTest('1.1 - Send OTP (New User with Email)', testSendOTPNewUser);
  await runTest('1.2 - Send OTP (Existing User)', testSendOTPExistingUser);
  await runTest('1.3 - Send OTP (Different Phone Formats)', testSendOTPDifferentFormats);
  await runTest('1.4 - Verify OTP (Correct OTP)', testVerifyOTPCorrect);
  await runTest('1.5 - Verify OTP (Development OTP 123456)', testVerifyOTPDevelopment);
  await runTest('1.6 - Get Current User', testGetCurrentUser);

  console.log(chalk.cyan('\n' + '─'.repeat(60)));
  console.log(chalk.cyan('TASK 2: DATA APIs'));
  console.log(chalk.cyan('─'.repeat(60)));

  await runTest('2.1 - Products API', testProductsAPI);
  await runTest('2.2 - Featured Products', testFeaturedProducts);
  await runTest('2.3 - Stores API', testStoresAPI);
  await runTest('2.4 - Offers API', testOffersAPI);
  await runTest('2.5 - Videos API', testVideosAPI);
  await runTest('2.6 - Projects API', testProjectsAPI);
  await runTest('2.7 - Categories API', testCategoriesAPI);
  await runTest('2.8 - Homepage API', testHomepageAPI);

  console.log(chalk.cyan('\n' + '─'.repeat(60)));
  console.log(chalk.cyan('TASK 3: PROTECTED ENDPOINTS'));
  console.log(chalk.cyan('─'.repeat(60)));

  await runTest('3.1 - Get Cart', testGetCart);
  await runTest('3.2 - Add to Cart', testAddToCart);
  await runTest('3.3 - Get Wishlist', testGetWishlist);
  await runTest('3.4 - Add to Wishlist', testAddToWishlist);

  console.log(chalk.cyan('\n' + '─'.repeat(60)));
  console.log(chalk.cyan('TASK 4: ERROR HANDLING'));
  console.log(chalk.cyan('─'.repeat(60)));

  await runTest('4.1 - Invalid OTP', testInvalidOTP);
  await runTest('4.2 - Missing Phone Number', testMissingPhoneNumber);
  await runTest('4.3 - Unauthorized Access', testUnauthorizedAccess);

  // Print summary
  console.log(chalk.cyan('\n' + '='.repeat(60)));
  console.log(chalk.cyan('  TEST SUMMARY'));
  console.log(chalk.cyan('='.repeat(60)));

  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(chalk.white(`\nTotal Tests: ${results.total}`));
  console.log(chalk.green(`Passed: ${results.passed}`));
  console.log(chalk.red(`Failed: ${results.failed}`));
  console.log(chalk.yellow(`Pass Rate: ${passRate}%`));

  if (results.failed > 0) {
    console.log(chalk.red('\n\nFailed Tests:'));
    results.tests
      .filter(t => t.status === 'FAILED')
      .forEach(test => {
        console.log(chalk.red(`\n✗ ${test.name}`));
        console.log(chalk.gray(`  Error: ${test.error}`));
        console.log(chalk.gray(`  Duration: ${test.duration}`));
      });
  }

  // Save results to file
  const fs = require('fs');
  const reportPath = 'test-results-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      passRate: `${passRate}%`
    },
    tests: results.tests
  }, null, 2));

  console.log(chalk.cyan(`\n📄 Detailed report saved to: ${reportPath}`));
  console.log(chalk.cyan('='.repeat(60) + '\n'));

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(chalk.red('\n❌ Fatal Error:'), error.message);
  process.exit(1);
});
