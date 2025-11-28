/**
 * Data Quality Test Suite
 * Verifies data format consistency and quality across collections
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

// Test results storage
const results = {
  collections: [],
  issues: [],
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

const addIssue = (collection, field, issue, count) => {
  results.issues.push({
    collection,
    field,
    issue,
    count
  });
};

const addCollectionResult = (collection, total, issues) => {
  results.collections.push({
    collection,
    total,
    issues: issues.length,
    status: issues.length === 0 ? 'PASSED' : 'FAILED'
  });

  if (issues.length === 0) {
    results.passed++;
  } else {
    results.failed++;
  }
};

// Validation functions
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

const isValidPrice = (price) => {
  return typeof price === 'number' && price >= 0;
};

const isValidRating = (rating) => {
  return typeof rating === 'number' && rating >= 0 && rating <= 5;
};

// Test functions
async function testProductDataQuality() {
  printHeader('📦 TESTING PRODUCT DATA QUALITY');

  const issues = [];
  const products = await Product.find().limit(1000);
  const total = products.length;

  console.log(chalk.blue(`Analyzing ${total} products...\n`));

  let missingNames = 0;
  let invalidPrices = 0;
  let missingImages = 0;
  let invalidImages = 0;
  let missingDescriptions = 0;
  let invalidDiscounts = 0;
  let invalidStock = 0;

  for (const product of products) {
    // Check name
    if (!product.name || product.name.trim() === '') {
      missingNames++;
    }

    // Check price
    if (!isValidPrice(product.price)) {
      invalidPrices++;
    }

    // Check discounted price
    if (product.discountedPrice !== undefined && product.discountedPrice > product.price) {
      invalidDiscounts++;
    }

    // Check images
    if (!product.images || product.images.length === 0) {
      missingImages++;
    } else {
      for (const img of product.images) {
        if (!isValidUrl(img)) {
          invalidImages++;
          break;
        }
      }
    }

    // Check description
    if (!product.description || product.description.trim() === '') {
      missingDescriptions++;
    }

    // Check stock
    if (product.stock !== undefined && (typeof product.stock !== 'number' || product.stock < 0)) {
      invalidStock++;
    }
  }

  // Report issues
  if (missingNames > 0) {
    console.log(chalk.red(`   ❌ Missing Names: ${missingNames} (${((missingNames/total)*100).toFixed(2)}%)`));
    issues.push('Missing Names');
    addIssue('Product', 'name', 'Missing or empty', missingNames);
  }

  if (invalidPrices > 0) {
    console.log(chalk.red(`   ❌ Invalid Prices: ${invalidPrices} (${((invalidPrices/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Prices');
    addIssue('Product', 'price', 'Invalid or negative', invalidPrices);
  }

  if (invalidDiscounts > 0) {
    console.log(chalk.yellow(`   ⚠️  Invalid Discounts: ${invalidDiscounts} (${((invalidDiscounts/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Discounts');
    addIssue('Product', 'discountedPrice', 'Greater than original price', invalidDiscounts);
  }

  if (missingImages > 0) {
    console.log(chalk.yellow(`   ⚠️  Missing Images: ${missingImages} (${((missingImages/total)*100).toFixed(2)}%)`));
    issues.push('Missing Images');
    addIssue('Product', 'images', 'Missing or empty array', missingImages);
  }

  if (invalidImages > 0) {
    console.log(chalk.red(`   ❌ Invalid Image URLs: ${invalidImages} (${((invalidImages/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Image URLs');
    addIssue('Product', 'images', 'Invalid URL format', invalidImages);
  }

  if (missingDescriptions > 0) {
    console.log(chalk.yellow(`   ⚠️  Missing Descriptions: ${missingDescriptions} (${((missingDescriptions/total)*100).toFixed(2)}%)`));
    issues.push('Missing Descriptions');
    addIssue('Product', 'description', 'Missing or empty', missingDescriptions);
  }

  if (invalidStock > 0) {
    console.log(chalk.red(`   ❌ Invalid Stock Values: ${invalidStock} (${((invalidStock/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Stock');
    addIssue('Product', 'stock', 'Invalid or negative', invalidStock);
  }

  if (issues.length === 0) {
    console.log(chalk.green('   ✅ All product data is valid'));
  }

  console.log('');
  addCollectionResult('Product', total, issues);
}

async function testStoreDataQuality() {
  printHeader('🏪 TESTING STORE DATA QUALITY');

  const issues = [];
  const stores = await Store.find().limit(1000);
  const total = stores.length;

  console.log(chalk.blue(`Analyzing ${total} stores...\n`));

  let missingNames = 0;
  let missingLocations = 0;
  let invalidEmails = 0;
  let invalidPhones = 0;
  let invalidImages = 0;
  let invalidRatings = 0;

  for (const store of stores) {
    // Check name
    if (!store.name || store.name.trim() === '') {
      missingNames++;
    }

    // Check location
    if (!store.location || !store.location.address) {
      missingLocations++;
    }

    // Check email
    if (store.email && !isValidEmail(store.email)) {
      invalidEmails++;
    }

    // Check phone
    if (store.phone && !isValidPhone(store.phone)) {
      invalidPhones++;
    }

    // Check logo
    if (store.logo && !isValidUrl(store.logo)) {
      invalidImages++;
    }

    // Check rating
    if (store.rating !== undefined && !isValidRating(store.rating)) {
      invalidRatings++;
    }
  }

  // Report issues
  if (missingNames > 0) {
    console.log(chalk.red(`   ❌ Missing Names: ${missingNames} (${((missingNames/total)*100).toFixed(2)}%)`));
    issues.push('Missing Names');
    addIssue('Store', 'name', 'Missing or empty', missingNames);
  }

  if (missingLocations > 0) {
    console.log(chalk.red(`   ❌ Missing Locations: ${missingLocations} (${((missingLocations/total)*100).toFixed(2)}%)`));
    issues.push('Missing Locations');
    addIssue('Store', 'location', 'Missing or incomplete', missingLocations);
  }

  if (invalidEmails > 0) {
    console.log(chalk.red(`   ❌ Invalid Emails: ${invalidEmails} (${((invalidEmails/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Emails');
    addIssue('Store', 'email', 'Invalid format', invalidEmails);
  }

  if (invalidPhones > 0) {
    console.log(chalk.yellow(`   ⚠️  Invalid Phone Numbers: ${invalidPhones} (${((invalidPhones/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Phones');
    addIssue('Store', 'phone', 'Invalid format', invalidPhones);
  }

  if (invalidImages > 0) {
    console.log(chalk.red(`   ❌ Invalid Logo URLs: ${invalidImages} (${((invalidImages/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Logos');
    addIssue('Store', 'logo', 'Invalid URL', invalidImages);
  }

  if (invalidRatings > 0) {
    console.log(chalk.red(`   ❌ Invalid Ratings: ${invalidRatings} (${((invalidRatings/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Ratings');
    addIssue('Store', 'rating', 'Out of range (0-5)', invalidRatings);
  }

  if (issues.length === 0) {
    console.log(chalk.green('   ✅ All store data is valid'));
  }

  console.log('');
  addCollectionResult('Store', total, issues);
}

async function testCategoryDataQuality() {
  printHeader('📁 TESTING CATEGORY DATA QUALITY');

  const issues = [];
  const categories = await Category.find();
  const total = categories.length;

  console.log(chalk.blue(`Analyzing ${total} categories...\n`));

  let missingNames = 0;
  let missingSlugs = 0;
  let duplicateSlugs = 0;
  let invalidIcons = 0;

  const slugs = new Set();

  for (const category of categories) {
    // Check name
    if (!category.name || category.name.trim() === '') {
      missingNames++;
    }

    // Check slug
    if (!category.slug || category.slug.trim() === '') {
      missingSlugs++;
    } else {
      if (slugs.has(category.slug)) {
        duplicateSlugs++;
      }
      slugs.add(category.slug);
    }

    // Check icon
    if (category.icon && !isValidUrl(category.icon)) {
      invalidIcons++;
    }
  }

  // Report issues
  if (missingNames > 0) {
    console.log(chalk.red(`   ❌ Missing Names: ${missingNames} (${((missingNames/total)*100).toFixed(2)}%)`));
    issues.push('Missing Names');
    addIssue('Category', 'name', 'Missing or empty', missingNames);
  }

  if (missingSlugs > 0) {
    console.log(chalk.red(`   ❌ Missing Slugs: ${missingSlugs} (${((missingSlugs/total)*100).toFixed(2)}%)`));
    issues.push('Missing Slugs');
    addIssue('Category', 'slug', 'Missing or empty', missingSlugs);
  }

  if (duplicateSlugs > 0) {
    console.log(chalk.red(`   ❌ Duplicate Slugs: ${duplicateSlugs} (${((duplicateSlugs/total)*100).toFixed(2)}%)`));
    issues.push('Duplicate Slugs');
    addIssue('Category', 'slug', 'Duplicate values', duplicateSlugs);
  }

  if (invalidIcons > 0) {
    console.log(chalk.red(`   ❌ Invalid Icon URLs: ${invalidIcons} (${((invalidIcons/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Icons');
    addIssue('Category', 'icon', 'Invalid URL', invalidIcons);
  }

  if (issues.length === 0) {
    console.log(chalk.green('   ✅ All category data is valid'));
  }

  console.log('');
  addCollectionResult('Category', total, issues);
}

async function testVideoDataQuality() {
  printHeader('🎥 TESTING VIDEO DATA QUALITY');

  const issues = [];
  const videos = await Video.find().limit(1000);
  const total = videos.length;

  console.log(chalk.blue(`Analyzing ${total} videos...\n`));

  let missingTitles = 0;
  let missingUrls = 0;
  let invalidUrls = 0;
  let missingThumbnails = 0;
  let invalidThumbnails = 0;
  let invalidDurations = 0;
  let invalidViews = 0;

  for (const video of videos) {
    // Check title
    if (!video.title || video.title.trim() === '') {
      missingTitles++;
    }

    // Check URL
    if (!video.url || video.url.trim() === '') {
      missingUrls++;
    } else if (!isValidUrl(video.url)) {
      invalidUrls++;
    }

    // Check thumbnail
    if (!video.thumbnail || video.thumbnail.trim() === '') {
      missingThumbnails++;
    } else if (!isValidUrl(video.thumbnail)) {
      invalidThumbnails++;
    }

    // Check duration
    if (video.duration !== undefined && (typeof video.duration !== 'number' || video.duration <= 0)) {
      invalidDurations++;
    }

    // Check views
    if (video.views !== undefined && (typeof video.views !== 'number' || video.views < 0)) {
      invalidViews++;
    }
  }

  // Report issues
  if (missingTitles > 0) {
    console.log(chalk.red(`   ❌ Missing Titles: ${missingTitles} (${((missingTitles/total)*100).toFixed(2)}%)`));
    issues.push('Missing Titles');
    addIssue('Video', 'title', 'Missing or empty', missingTitles);
  }

  if (missingUrls > 0) {
    console.log(chalk.red(`   ❌ Missing URLs: ${missingUrls} (${((missingUrls/total)*100).toFixed(2)}%)`));
    issues.push('Missing URLs');
    addIssue('Video', 'url', 'Missing or empty', missingUrls);
  }

  if (invalidUrls > 0) {
    console.log(chalk.red(`   ❌ Invalid URLs: ${invalidUrls} (${((invalidUrls/total)*100).toFixed(2)}%)`));
    issues.push('Invalid URLs');
    addIssue('Video', 'url', 'Invalid format', invalidUrls);
  }

  if (missingThumbnails > 0) {
    console.log(chalk.yellow(`   ⚠️  Missing Thumbnails: ${missingThumbnails} (${((missingThumbnails/total)*100).toFixed(2)}%)`));
    issues.push('Missing Thumbnails');
    addIssue('Video', 'thumbnail', 'Missing or empty', missingThumbnails);
  }

  if (invalidThumbnails > 0) {
    console.log(chalk.red(`   ❌ Invalid Thumbnails: ${invalidThumbnails} (${((invalidThumbnails/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Thumbnails');
    addIssue('Video', 'thumbnail', 'Invalid URL', invalidThumbnails);
  }

  if (invalidDurations > 0) {
    console.log(chalk.red(`   ❌ Invalid Durations: ${invalidDurations} (${((invalidDurations/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Durations');
    addIssue('Video', 'duration', 'Invalid or zero', invalidDurations);
  }

  if (invalidViews > 0) {
    console.log(chalk.red(`   ❌ Invalid View Counts: ${invalidViews} (${((invalidViews/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Views');
    addIssue('Video', 'views', 'Invalid or negative', invalidViews);
  }

  if (issues.length === 0) {
    console.log(chalk.green('   ✅ All video data is valid'));
  }

  console.log('');
  addCollectionResult('Video', total, issues);
}

async function testReviewDataQuality() {
  printHeader('⭐ TESTING REVIEW DATA QUALITY');

  const issues = [];
  const reviews = await Review.find().limit(1000);
  const total = reviews.length;

  console.log(chalk.blue(`Analyzing ${total} reviews...\n`));

  let invalidRatings = 0;
  let missingContent = 0;
  let orphanedReviews = 0;

  for (const review of reviews) {
    // Check rating
    if (!isValidRating(review.rating)) {
      invalidRatings++;
    }

    // Check content
    if (!review.content || review.content.trim() === '') {
      missingContent++;
    }

    // Check references
    if (!review.product && !review.store) {
      orphanedReviews++;
    }
  }

  // Report issues
  if (invalidRatings > 0) {
    console.log(chalk.red(`   ❌ Invalid Ratings: ${invalidRatings} (${((invalidRatings/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Ratings');
    addIssue('Review', 'rating', 'Out of range (0-5)', invalidRatings);
  }

  if (missingContent > 0) {
    console.log(chalk.yellow(`   ⚠️  Missing Content: ${missingContent} (${((missingContent/total)*100).toFixed(2)}%)`));
    issues.push('Missing Content');
    addIssue('Review', 'content', 'Missing or empty', missingContent);
  }

  if (orphanedReviews > 0) {
    console.log(chalk.red(`   ❌ Orphaned Reviews: ${orphanedReviews} (${((orphanedReviews/total)*100).toFixed(2)}%)`));
    issues.push('Orphaned Reviews');
    addIssue('Review', 'product/store', 'No reference to product or store', orphanedReviews);
  }

  if (issues.length === 0) {
    console.log(chalk.green('   ✅ All review data is valid'));
  }

  console.log('');
  addCollectionResult('Review', total, issues);
}

async function testUserDataQuality() {
  printHeader('👤 TESTING USER DATA QUALITY');

  const issues = [];
  const users = await User.find().limit(1000);
  const total = users.length;

  console.log(chalk.blue(`Analyzing ${total} users...\n`));

  let missingNames = 0;
  let invalidEmails = 0;
  let duplicateEmails = 0;
  let invalidPhones = 0;

  const emails = new Set();

  for (const user of users) {
    // Check name
    if (!user.name || user.name.trim() === '') {
      missingNames++;
    }

    // Check email
    if (!user.email || !isValidEmail(user.email)) {
      invalidEmails++;
    } else {
      if (emails.has(user.email)) {
        duplicateEmails++;
      }
      emails.add(user.email);
    }

    // Check phone
    if (user.phone && !isValidPhone(user.phone)) {
      invalidPhones++;
    }
  }

  // Report issues
  if (missingNames > 0) {
    console.log(chalk.yellow(`   ⚠️  Missing Names: ${missingNames} (${((missingNames/total)*100).toFixed(2)}%)`));
    issues.push('Missing Names');
    addIssue('User', 'name', 'Missing or empty', missingNames);
  }

  if (invalidEmails > 0) {
    console.log(chalk.red(`   ❌ Invalid Emails: ${invalidEmails} (${((invalidEmails/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Emails');
    addIssue('User', 'email', 'Invalid format', invalidEmails);
  }

  if (duplicateEmails > 0) {
    console.log(chalk.red(`   ❌ Duplicate Emails: ${duplicateEmails} (${((duplicateEmails/total)*100).toFixed(2)}%)`));
    issues.push('Duplicate Emails');
    addIssue('User', 'email', 'Duplicate values', duplicateEmails);
  }

  if (invalidPhones > 0) {
    console.log(chalk.yellow(`   ⚠️  Invalid Phone Numbers: ${invalidPhones} (${((invalidPhones/total)*100).toFixed(2)}%)`));
    issues.push('Invalid Phones');
    addIssue('User', 'phone', 'Invalid format', invalidPhones);
  }

  if (issues.length === 0) {
    console.log(chalk.green('   ✅ All user data is valid'));
  }

  console.log('');
  addCollectionResult('User', total, issues);
}

async function printSummary() {
  printHeader('📊 DATA QUALITY SUMMARY');

  const total = results.passed + results.failed;
  const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(2) : 0;

  console.log(`Collections Tested: ${chalk.cyan(total)}`);
  console.log(`Passed: ${chalk.green(results.passed)}`);
  console.log(`Failed: ${chalk.red(results.failed)}`);
  console.log(`Quality Score: ${successRate >= 80 ? chalk.green(successRate + '%') : successRate >= 60 ? chalk.yellow(successRate + '%') : chalk.red(successRate + '%')}`);
  console.log('');

  if (results.issues.length > 0) {
    console.log(chalk.yellow('⚠️  DATA QUALITY ISSUES FOUND:'));
    console.log('');

    // Group issues by collection
    const byCollection = {};
    for (const issue of results.issues) {
      if (!byCollection[issue.collection]) {
        byCollection[issue.collection] = [];
      }
      byCollection[issue.collection].push(issue);
    }

    for (const [collection, issues] of Object.entries(byCollection)) {
      console.log(chalk.cyan(`   ${collection}:`));
      for (const issue of issues) {
        console.log(`      - ${chalk.yellow(issue.field)}: ${issue.issue} (${chalk.red(issue.count)} records)`);
      }
      console.log('');
    }
  }

  // Overall status
  if (successRate >= 90) {
    console.log(chalk.green.bold('✅ EXCELLENT! Data quality is high.'));
  } else if (successRate >= 70) {
    console.log(chalk.yellow.bold('⚠️  GOOD, but some data quality issues detected.'));
  } else {
    console.log(chalk.red.bold('❌ CRITICAL: Significant data quality issues found.'));
  }

  console.log('\n' + chalk.cyan('═'.repeat(60)) + '\n');

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    './test-results-data-quality.json',
    JSON.stringify(results, null, 2)
  );
  console.log(chalk.green('✅ Test results saved to test-results-data-quality.json\n'));
}

async function runAllTests() {
  try {
    printHeader('🧪 DATA QUALITY TEST SUITE');

    // Connect to MongoDB
    console.log(chalk.blue('Connecting to MongoDB...'));
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(chalk.green('✅ Connected to MongoDB\n'));

    // Run all tests
    await testProductDataQuality();
    await testStoreDataQuality();
    await testCategoryDataQuality();
    await testVideoDataQuality();
    await testReviewDataQuality();
    await testUserDataQuality();

    await printSummary();

  } catch (error) {
    console.error(chalk.red('❌ Test suite failed:'), error);
  } finally {
    await mongoose.connection.close();
    console.log(chalk.blue('Database connection closed.'));
  }
}

// Run tests
runAllTests();
