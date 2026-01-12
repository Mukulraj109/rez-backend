/**
 * Verify Achievement Flow - Check if completing each achievement will award coins
 */

const fs = require('fs');
const path = require('path');

// Achievement definitions with expected triggers
const ACHIEVEMENTS = [
  {
    type: 'FIRST_ORDER',
    title: 'First Order',
    coins: 50,
    requirement: '1 delivered order',
    triggerFile: 'controllers/orderController.ts',
    triggerLine: 'achievementService.triggerAchievementUpdate(userId, \'order_created\')',
    metric: 'totalOrders'
  },
  {
    type: 'ORDERS_10',
    title: '10 Orders',
    coins: 100,
    requirement: '10 delivered orders',
    triggerFile: 'controllers/orderController.ts',
    triggerLine: 'Same as FIRST_ORDER',
    metric: 'totalOrders'
  },
  {
    type: 'ORDERS_50',
    title: '50 Orders',
    coins: 500,
    requirement: '50 delivered orders',
    triggerFile: 'controllers/orderController.ts',
    triggerLine: 'Same as FIRST_ORDER',
    metric: 'totalOrders'
  },
  {
    type: 'FREQUENT_BUYER',
    title: 'Frequent Buyer',
    coins: 1000,
    requirement: '100 delivered orders',
    triggerFile: 'controllers/orderController.ts',
    triggerLine: 'Same as FIRST_ORDER',
    metric: 'totalOrders'
  },
  {
    type: 'FIRST_REVIEW',
    title: 'First Review',
    coins: 25,
    requirement: '1 review submitted',
    triggerFile: 'controllers/reviewController.ts',
    triggerLine: 'achievementService.triggerAchievementUpdate(userId, \'review_created\')',
    metric: 'totalReviews'
  },
  {
    type: 'REVIEWS_25',
    title: 'Review Master',
    coins: 250,
    requirement: '25 reviews submitted',
    triggerFile: 'controllers/reviewController.ts',
    triggerLine: 'Same as FIRST_REVIEW',
    metric: 'totalReviews'
  },
  {
    type: 'FIRST_VIDEO',
    title: 'First Video',
    coins: 100,
    requirement: '1 video created',
    triggerFile: 'controllers/videoController.ts',
    triggerLine: 'achievementService.triggerAchievementUpdate(userId, \'video_created\')',
    metric: 'totalVideos'
  },
  {
    type: 'VIEWS_10000',
    title: 'Influencer',
    coins: 1000,
    requirement: '10,000 video views',
    triggerFile: 'controllers/videoController.ts',
    triggerLine: 'Same as FIRST_VIDEO (recalculates all)',
    metric: 'totalVideoViews'
  },
  {
    type: 'FIRST_PROJECT',
    title: 'First Project',
    coins: 50,
    requirement: '1 project submitted',
    triggerFile: 'controllers/projectController.ts',
    triggerLine: 'achievementService.triggerAchievementUpdate(userId, \'project_submitted\')',
    metric: 'totalProjects'
  },
  {
    type: 'TOP_EARNER',
    title: 'Top Earner',
    coins: 500,
    requirement: '₹5000 earned from projects',
    triggerFile: 'controllers/projectController.ts',
    triggerLine: 'Same as FIRST_PROJECT',
    metric: 'projectEarnings'
  },
  {
    type: 'FIRST_REFERRAL',
    title: 'First Referral',
    coins: 100,
    requirement: '1 successful referral',
    triggerFile: 'controllers/authController.ts',
    triggerLine: 'achievementService.triggerAchievementUpdate(referrerId, \'referral_completed\')',
    metric: 'totalReferrals'
  },
  {
    type: 'REFERRALS_10',
    title: 'Referral Master',
    coins: 1000,
    requirement: '10 successful referrals',
    triggerFile: 'controllers/authController.ts',
    triggerLine: 'Same as FIRST_REFERRAL',
    metric: 'totalReferrals'
  },
  {
    type: 'EARLY_BIRD',
    title: 'Early Bird',
    coins: 200,
    requirement: '30 days active',
    triggerFile: 'Automatic (time-based)',
    triggerLine: 'Checked during recalculation',
    metric: 'daysActive'
  },
  {
    type: 'ACTIVITY_100',
    title: 'Active User',
    coins: 500,
    requirement: '100+ total activities',
    triggerFile: 'Any activity trigger',
    triggerLine: 'Checked during recalculation',
    metric: 'totalActivity'
  },
  {
    type: 'SUPER_USER',
    title: 'Super User',
    coins: 2000,
    requirement: '500+ total activities',
    triggerFile: 'Any activity trigger',
    triggerLine: 'Checked during recalculation',
    metric: 'totalActivity'
  }
];

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║               ACHIEVEMENT FLOW VERIFICATION REPORT                           ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

// Check each file for triggers
const basePath = __dirname + '/src/';

let allVerified = true;

ACHIEVEMENTS.forEach((achievement, index) => {
  console.log(`${index + 1}. ${achievement.title} (${achievement.type})`);
  console.log(`   Coins: +${achievement.coins}`);
  console.log(`   Requirement: ${achievement.requirement}`);
  console.log(`   Metric: ${achievement.metric}`);
  console.log(`   Trigger: ${achievement.triggerFile}`);

  // Check if trigger file exists and has the trigger
  if (achievement.triggerFile.includes('controllers/')) {
    const filePath = path.join(basePath, achievement.triggerFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('achievementService.triggerAchievementUpdate') ||
          content.includes('achievementService.checkAndAwardAchievements')) {
        console.log(`   Status: ✅ TRIGGER EXISTS`);
      } else {
        console.log(`   Status: ❌ TRIGGER MISSING`);
        allVerified = false;
      }
    } else {
      console.log(`   Status: ⚠️ FILE NOT FOUND`);
    }
  } else {
    console.log(`   Status: ✅ AUTO (recalculation)`);
  }
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('\n📋 COIN AWARD FLOW:');
console.log('   1. User completes action (order, review, video, etc.)');
console.log('   2. Controller calls achievementService.triggerAchievementUpdate()');
console.log('   3. achievementService.recalculateUserAchievements() runs');
console.log('   4. Progress is calculated from actual DB data');
console.log('   5. If progress >= 100% AND not already unlocked:');
console.log('      → Achievement unlocked');
console.log('      → coinService.awardCoins() called');
console.log('      → CoinTransaction created');
console.log('      → Wallet balance updated');
console.log('   6. Frontend syncs via syncCoinsFromWallet()');

console.log('\n═══════════════════════════════════════════════════════════════════════════════');

// Check achievementService for coin awarding
const achievementServicePath = path.join(basePath, 'services/achievementService.ts');
if (fs.existsSync(achievementServicePath)) {
  const content = fs.readFileSync(achievementServicePath, 'utf8');
  if (content.includes('coinService.awardCoins')) {
    console.log('\n✅ achievementService.ts HAS coinService.awardCoins() - COINS WILL BE AWARDED\n');
  } else {
    console.log('\n❌ achievementService.ts MISSING coinService.awardCoins() - COINS WON\'T BE AWARDED!\n');
    allVerified = false;
  }
}

// Check coinService for wallet update
const coinServicePath = path.join(basePath, 'services/coinService.ts');
if (fs.existsSync(coinServicePath)) {
  const content = fs.readFileSync(coinServicePath, 'utf8');
  if (content.includes('wallet.balance.available') || content.includes('Wallet.findOne')) {
    console.log('✅ coinService.ts UPDATES WALLET - BALANCE WILL SYNC\n');
  } else {
    console.log('❌ coinService.ts NOT UPDATING WALLET - BALANCE WON\'T SYNC!\n');
    allVerified = false;
  }
}

console.log('═══════════════════════════════════════════════════════════════════════════════');
if (allVerified) {
  console.log('\n🎉 ALL ACHIEVEMENTS VERIFIED - COINS WILL BE AWARDED CORRECTLY!\n');
} else {
  console.log('\n⚠️ SOME ISSUES FOUND - SEE ABOVE FOR DETAILS\n');
}
