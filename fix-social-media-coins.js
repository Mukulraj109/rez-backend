/**
 * Fix: Credit missing CoinTransactions for social media posts
 * that were marked 'credited' but never got a CoinTransaction record.
 *
 * Run: node fix-social-media-coins.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Import models
  require('./src/models/CoinTransaction');
  require('./src/models/Wallet');
  require('./src/models/SocialMediaPost');
  require('./src/models/Order');
  require('./src/models/User');

  const CoinTransaction = mongoose.model('CoinTransaction');
  const SocialMediaPost = mongoose.model('SocialMediaPost');
  const coinService = require('./src/services/coinService');

  // Find all credited social media posts
  const creditedPosts = await SocialMediaPost.find({ status: 'credited' }).lean();
  console.log(`Found ${creditedPosts.length} credited social media posts`);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of creditedPosts) {
    // Check if a CoinTransaction with source social_share_reward already exists for this user
    const existing = await CoinTransaction.findOne({
      user: post.user,
      source: 'social_share_reward',
      description: { $regex: post._id.toString() }
    });

    if (existing) {
      console.log(`SKIP: post ${post._id} - CoinTransaction already exists`);
      skipped++;
      continue;
    }

    // Also check by order ID in description
    const existingByOrder = await CoinTransaction.findOne({
      user: post.user,
      source: 'social_share_reward',
      description: { $regex: post.order ? post.order.toString() : 'nomatch' }
    });

    if (existingByOrder) {
      console.log(`SKIP: post ${post._id} - CoinTransaction found by order ID`);
      skipped++;
      continue;
    }

    // Create the missing CoinTransaction
    try {
      const result = await coinService.awardCoins(
        post.user.toString(),
        post.cashbackAmount,
        'social_share_reward',
        `Social media cashback (${post.platform}) for order ${post.order} [fix]`,
        { postId: post._id, platform: post.platform, orderId: post.order }
      );
      fixed++;
      console.log(`FIXED: post ${post._id} - credited ${post.cashbackAmount} coins to user ${post.user} (new balance: ${result.newBalance})`);
    } catch (err) {
      failed++;
      console.log(`FAILED: post ${post._id} - ${err.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`RESULT: ${fixed} fixed, ${skipped} skipped, ${failed} failed`);
  console.log(`========================================`);

  await mongoose.disconnect();
  process.exit(0);
}

fix().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});
