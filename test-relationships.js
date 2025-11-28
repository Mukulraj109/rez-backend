/**
 * Relationship Integrity Test Suite
 * Tests all database relationships and generates a comprehensive report
 */

require('dotenv').config();
const mongoose = require('mongoose');
const chalk = require('chalk');

// Import models
const Product = require('./models/Product');
const Store = require('./models/Store');
const Category = require('./models/Category');
const Video = require('./models/Video');
const Order = require('./models/Order');
const User = require('./models/User');
const Review = require('./models/Review');
const Wishlist = require('./models/Wishlist');
const Cart = require('./models/Cart');

// Test results storage
const results = {
  tests: [],
  overallHealth: 0,
  timestamp: new Date().toISOString()
};

// Utility functions
const addTest = (name, total, withRef, validLinks, brokenLinks, percentage) => {
  results.tests.push({
    name,
    total,
    withRef,
    validLinks,
    brokenLinks,
    percentage: percentage || (total > 0 ? ((validLinks / total) * 100).toFixed(2) : 0)
  });
};

const printHeader = (title) => {
  console.log('\n' + chalk.cyan('═'.repeat(60)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan('═'.repeat(60)) + '\n');
};

const printTest = (emoji, name, total, withRef, validLinks, brokenLinks) => {
  const status = brokenLinks === 0 ? chalk.green('✅') : chalk.yellow('⚠️');
  const percentage = total > 0 ? ((validLinks / total) * 100).toFixed(1) : 0;

  console.log(`${status} ${chalk.bold(name)}`);
  console.log(`   Total Records: ${chalk.cyan(total)}`);
  console.log(`   With Reference: ${chalk.cyan(withRef)} (${((withRef/total)*100).toFixed(1)}%)`);
  console.log(`   Valid Links: ${chalk.green(validLinks)} (${percentage}%)`);
  if (brokenLinks > 0) {
    console.log(`   ${chalk.red('Broken Links: ' + brokenLinks)}`);
  }
  console.log('');
};

// Test functions
async function testProductsToStores() {
  console.log(chalk.blue('Testing Products → Stores...'));

  const totalProducts = await Product.countDocuments();
  const productsWithStore = await Product.countDocuments({ store: { $exists: true, $ne: null } });

  // Get products and populate store
  const products = await Product.find({ store: { $exists: true, $ne: null } })
    .populate('store')
    .limit(1000);

  let validLinks = 0;
  let brokenLinks = 0;

  for (const product of products) {
    if (product.store && product.store._id) {
      validLinks++;
    } else {
      brokenLinks++;
      console.log(chalk.red(`   ⚠️  Product ${product._id} has invalid store reference`));
    }
  }

  printTest('🏪', 'Products → Stores', totalProducts, productsWithStore, validLinks, brokenLinks);
  addTest('Products → Stores', totalProducts, productsWithStore, validLinks, brokenLinks);

  return { totalProducts, productsWithStore, validLinks, brokenLinks };
}

async function testProductsToCategories() {
  console.log(chalk.blue('Testing Products → Categories...'));

  const totalProducts = await Product.countDocuments();
  const productsWithCategory = await Product.countDocuments({ category: { $exists: true, $ne: null } });

  const products = await Product.find({ category: { $exists: true, $ne: null } })
    .populate('category')
    .limit(1000);

  let validLinks = 0;
  let brokenLinks = 0;

  for (const product of products) {
    if (product.category && product.category._id) {
      validLinks++;
    } else {
      brokenLinks++;
      console.log(chalk.red(`   ⚠️  Product ${product._id} has invalid category reference`));
    }
  }

  printTest('📁', 'Products → Categories', totalProducts, productsWithCategory, validLinks, brokenLinks);
  addTest('Products → Categories', totalProducts, productsWithCategory, validLinks, brokenLinks);

  return { totalProducts, productsWithCategory, validLinks, brokenLinks };
}

async function testVideosToProducts() {
  console.log(chalk.blue('Testing Videos → Products...'));

  const totalVideos = await Video.countDocuments();
  const videosWithProducts = await Video.countDocuments({
    products: { $exists: true, $ne: [] }
  });

  const videos = await Video.find({ products: { $exists: true, $ne: [] } })
    .populate('products')
    .limit(500);

  let validLinks = 0;
  let brokenLinks = 0;
  let totalProductRefs = 0;

  for (const video of videos) {
    if (video.products && video.products.length > 0) {
      totalProductRefs += video.products.length;
      let hasValidProduct = false;

      for (const product of video.products) {
        if (product && product._id) {
          validLinks++;
          hasValidProduct = true;
        } else {
          brokenLinks++;
        }
      }

      if (!hasValidProduct) {
        console.log(chalk.red(`   ⚠️  Video ${video._id} has no valid product references`));
      }
    }
  }

  console.log(`${chalk.green('✅')} ${chalk.bold('Videos → Products')}`);
  console.log(`   Total Videos: ${chalk.cyan(totalVideos)}`);
  console.log(`   Shoppable Videos: ${chalk.cyan(videosWithProducts)} (${((videosWithProducts/totalVideos)*100).toFixed(1)}%)`);
  console.log(`   Total Product Links: ${chalk.cyan(totalProductRefs)}`);
  console.log(`   Valid Links: ${chalk.green(validLinks)}`);
  if (brokenLinks > 0) {
    console.log(`   ${chalk.red('Broken Links: ' + brokenLinks)}`);
  }
  console.log('');

  addTest('Videos → Products', totalVideos, videosWithProducts, validLinks, brokenLinks);

  return { totalVideos, videosWithProducts, validLinks, brokenLinks };
}

async function testOrdersToUsers() {
  console.log(chalk.blue('Testing Orders → Users...'));

  const totalOrders = await Order.countDocuments();
  const ordersWithUser = await Order.countDocuments({ user: { $exists: true, $ne: null } });

  const orders = await Order.find({ user: { $exists: true, $ne: null } })
    .populate('user')
    .limit(500);

  let validLinks = 0;
  let brokenLinks = 0;

  for (const order of orders) {
    if (order.user && order.user._id) {
      validLinks++;
    } else {
      brokenLinks++;
      console.log(chalk.red(`   ⚠️  Order ${order._id} has invalid user reference`));
    }
  }

  printTest('👤', 'Orders → Users', totalOrders, ordersWithUser, validLinks, brokenLinks);
  addTest('Orders → Users', totalOrders, ordersWithUser, validLinks, brokenLinks);

  return { totalOrders, ordersWithUser, validLinks, brokenLinks };
}

async function testOrdersToProducts() {
  console.log(chalk.blue('Testing Orders → Products...'));

  const totalOrders = await Order.countDocuments();
  const ordersWithItems = await Order.countDocuments({
    'items.0': { $exists: true }
  });

  const orders = await Order.find({ 'items.0': { $exists: true } })
    .populate('items.product')
    .limit(500);

  let validLinks = 0;
  let brokenLinks = 0;
  let totalItems = 0;

  for (const order of orders) {
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        totalItems++;
        if (item.product && item.product._id) {
          validLinks++;
        } else {
          brokenLinks++;
          console.log(chalk.red(`   ⚠️  Order ${order._id} has invalid product reference in items`));
        }
      }
    }
  }

  console.log(`${brokenLinks === 0 ? chalk.green('✅') : chalk.yellow('⚠️')} ${chalk.bold('Orders → Products')}`);
  console.log(`   Total Orders: ${chalk.cyan(totalOrders)}`);
  console.log(`   Orders with Items: ${chalk.cyan(ordersWithItems)}`);
  console.log(`   Total Order Items: ${chalk.cyan(totalItems)}`);
  console.log(`   Valid Product Links: ${chalk.green(validLinks)}`);
  if (brokenLinks > 0) {
    console.log(`   ${chalk.red('Broken Links: ' + brokenLinks)}`);
  }
  console.log('');

  addTest('Orders → Products', totalOrders, ordersWithItems, validLinks, brokenLinks);

  return { totalOrders, ordersWithItems, validLinks, brokenLinks };
}

async function testReviewsToProducts() {
  console.log(chalk.blue('Testing Reviews → Products...'));

  const totalReviews = await Review.countDocuments();
  const productReviews = await Review.countDocuments({
    product: { $exists: true, $ne: null }
  });

  const reviews = await Review.find({ product: { $exists: true, $ne: null } })
    .populate('product')
    .limit(500);

  let validLinks = 0;
  let brokenLinks = 0;

  for (const review of reviews) {
    if (review.product && review.product._id) {
      validLinks++;
    } else {
      brokenLinks++;
      console.log(chalk.red(`   ⚠️  Review ${review._id} has invalid product reference`));
    }
  }

  printTest('⭐', 'Reviews → Products', totalReviews, productReviews, validLinks, brokenLinks);
  addTest('Reviews → Products', totalReviews, productReviews, validLinks, brokenLinks);

  return { totalReviews, productReviews, validLinks, brokenLinks };
}

async function testReviewsToStores() {
  console.log(chalk.blue('Testing Reviews → Stores...'));

  const totalReviews = await Review.countDocuments();
  const storeReviews = await Review.countDocuments({
    store: { $exists: true, $ne: null }
  });

  const reviews = await Review.find({ store: { $exists: true, $ne: null } })
    .populate('store')
    .limit(500);

  let validLinks = 0;
  let brokenLinks = 0;

  for (const review of reviews) {
    if (review.store && review.store._id) {
      validLinks++;
    } else {
      brokenLinks++;
      console.log(chalk.red(`   ⚠️  Review ${review._id} has invalid store reference`));
    }
  }

  printTest('🏪', 'Reviews → Stores', totalReviews, storeReviews, validLinks, brokenLinks);
  addTest('Reviews → Stores', totalReviews, storeReviews, validLinks, brokenLinks);

  return { totalReviews, storeReviews, validLinks, brokenLinks };
}

async function testWishlistsToUsers() {
  console.log(chalk.blue('Testing Wishlists → Users...'));

  const totalWishlists = await Wishlist.countDocuments();
  const wishlistsWithUser = await Wishlist.countDocuments({
    user: { $exists: true, $ne: null }
  });

  const wishlists = await Wishlist.find({ user: { $exists: true, $ne: null } })
    .populate('user')
    .limit(500);

  let validLinks = 0;
  let brokenLinks = 0;

  for (const wishlist of wishlists) {
    if (wishlist.user && wishlist.user._id) {
      validLinks++;
    } else {
      brokenLinks++;
      console.log(chalk.red(`   ⚠️  Wishlist ${wishlist._id} has invalid user reference`));
    }
  }

  printTest('💝', 'Wishlists → Users', totalWishlists, wishlistsWithUser, validLinks, brokenLinks);
  addTest('Wishlists → Users', totalWishlists, wishlistsWithUser, validLinks, brokenLinks);

  return { totalWishlists, wishlistsWithUser, validLinks, brokenLinks };
}

async function testWishlistsToProducts() {
  console.log(chalk.blue('Testing Wishlists → Products...'));

  const totalWishlists = await Wishlist.countDocuments();
  const wishlistsWithItems = await Wishlist.countDocuments({
    'items.0': { $exists: true }
  });

  const wishlists = await Wishlist.find({ 'items.0': { $exists: true } })
    .populate('items.product')
    .limit(500);

  let validLinks = 0;
  let brokenLinks = 0;
  let totalItems = 0;

  for (const wishlist of wishlists) {
    if (wishlist.items && wishlist.items.length > 0) {
      for (const item of wishlist.items) {
        totalItems++;
        if (item.product && item.product._id) {
          validLinks++;
        } else {
          brokenLinks++;
        }
      }
    }
  }

  console.log(`${brokenLinks === 0 ? chalk.green('✅') : chalk.yellow('⚠️')} ${chalk.bold('Wishlists → Products')}`);
  console.log(`   Total Wishlists: ${chalk.cyan(totalWishlists)}`);
  console.log(`   Wishlists with Items: ${chalk.cyan(wishlistsWithItems)}`);
  console.log(`   Total Items: ${chalk.cyan(totalItems)}`);
  console.log(`   Valid Product Links: ${chalk.green(validLinks)}`);
  if (brokenLinks > 0) {
    console.log(`   ${chalk.red('Broken Links: ' + brokenLinks)}`);
  }
  console.log('');

  addTest('Wishlists → Products', totalWishlists, wishlistsWithItems, validLinks, brokenLinks);

  return { totalWishlists, wishlistsWithItems, validLinks, brokenLinks };
}

async function testCartsToUsers() {
  console.log(chalk.blue('Testing Carts → Users...'));

  const totalCarts = await Cart.countDocuments();
  const cartsWithUser = await Cart.countDocuments({
    user: { $exists: true, $ne: null }
  });

  const carts = await Cart.find({ user: { $exists: true, $ne: null } })
    .populate('user')
    .limit(500);

  let validLinks = 0;
  let brokenLinks = 0;

  for (const cart of carts) {
    if (cart.user && cart.user._id) {
      validLinks++;
    } else {
      brokenLinks++;
      console.log(chalk.red(`   ⚠️  Cart ${cart._id} has invalid user reference`));
    }
  }

  printTest('🛒', 'Carts → Users', totalCarts, cartsWithUser, validLinks, brokenLinks);
  addTest('Carts → Users', totalCarts, cartsWithUser, validLinks, brokenLinks);

  return { totalCarts, cartsWithUser, validLinks, brokenLinks };
}

async function testCartsToProducts() {
  console.log(chalk.blue('Testing Carts → Products...'));

  const totalCarts = await Cart.countDocuments();
  const cartsWithItems = await Cart.countDocuments({
    'items.0': { $exists: true }
  });

  const carts = await Cart.find({ 'items.0': { $exists: true } })
    .populate('items.product')
    .limit(500);

  let validLinks = 0;
  let brokenLinks = 0;
  let totalItems = 0;

  for (const cart of carts) {
    if (cart.items && cart.items.length > 0) {
      for (const item of cart.items) {
        totalItems++;
        if (item.product && item.product._id) {
          validLinks++;
        } else {
          brokenLinks++;
        }
      }
    }
  }

  console.log(`${brokenLinks === 0 ? chalk.green('✅') : chalk.yellow('⚠️')} ${chalk.bold('Carts → Products')}`);
  console.log(`   Total Carts: ${chalk.cyan(totalCarts)}`);
  console.log(`   Carts with Items: ${chalk.cyan(cartsWithItems)}`);
  console.log(`   Total Items: ${chalk.cyan(totalItems)}`);
  console.log(`   Valid Product Links: ${chalk.green(validLinks)}`);
  if (brokenLinks > 0) {
    console.log(`   ${chalk.red('Broken Links: ' + brokenLinks)}`);
  }
  console.log('');

  addTest('Carts → Products', totalCarts, cartsWithItems, validLinks, brokenLinks);

  return { totalCarts, cartsWithItems, validLinks, brokenLinks };
}

async function calculateOverallHealth() {
  let totalTests = 0;
  let totalValid = 0;

  for (const test of results.tests) {
    totalTests += test.total;
    totalValid += test.validLinks;
  }

  results.overallHealth = totalTests > 0 ? ((totalValid / totalTests) * 100).toFixed(2) : 0;

  return results.overallHealth;
}

async function runAllTests() {
  try {
    printHeader('🧪 RELATIONSHIP INTEGRITY TEST SUITE');

    // Connect to MongoDB
    console.log(chalk.blue('Connecting to MongoDB...'));
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(chalk.green('✅ Connected to MongoDB\n'));

    // Run all tests
    await testProductsToStores();
    await testProductsToCategories();
    await testVideosToProducts();
    await testOrdersToUsers();
    await testOrdersToProducts();
    await testReviewsToProducts();
    await testReviewsToStores();
    await testWishlistsToUsers();
    await testWishlistsToProducts();
    await testCartsToUsers();
    await testCartsToProducts();

    // Calculate overall health
    const health = await calculateOverallHealth();

    // Print summary
    printHeader('📊 OVERALL SUMMARY');
    console.log(`Total Tests Run: ${chalk.cyan(results.tests.length)}`);
    console.log(`Overall Health: ${health >= 95 ? chalk.green(health + '%') : health >= 80 ? chalk.yellow(health + '%') : chalk.red(health + '%')}`);
    console.log('');

    // Print warnings
    const failedTests = results.tests.filter(t => t.brokenLinks > 0);
    if (failedTests.length > 0) {
      console.log(chalk.yellow('⚠️  TESTS WITH ISSUES:'));
      failedTests.forEach(test => {
        console.log(`   - ${test.name}: ${chalk.red(test.brokenLinks + ' broken links')}`);
      });
      console.log('');
    }

    // Print success message
    if (health >= 95) {
      console.log(chalk.green.bold('✅ EXCELLENT! Database relationships are healthy.'));
    } else if (health >= 80) {
      console.log(chalk.yellow.bold('⚠️  GOOD, but some relationships need attention.'));
    } else {
      console.log(chalk.red.bold('❌ CRITICAL: Multiple relationship issues detected.'));
    }

    console.log('\n' + chalk.cyan('═'.repeat(60)) + '\n');

    // Save results to file
    const fs = require('fs');
    fs.writeFileSync(
      './test-results-relationships.json',
      JSON.stringify(results, null, 2)
    );
    console.log(chalk.green('✅ Test results saved to test-results-relationships.json\n'));

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error);
  } finally {
    await mongoose.connection.close();
    console.log(chalk.blue('Database connection closed.'));
  }
}

// Run tests
runAllTests();
