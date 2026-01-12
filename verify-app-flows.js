/**
 * Verify App Flows - Check if each achievement can be completed in the app
 * and if the trigger will fire automatically
 */

const fs = require('fs');
const path = require('path');

const frontendPath = 'C:/Users/user/Desktop/rez/rez-frontend/app';
const backendPath = 'C:/Users/user/Desktop/rez/rez-backend/src';

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║          APP FLOW VERIFICATION - CAN USER COMPLETE ACHIEVEMENTS?            ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

const achievements = [
  {
    type: 'FIRST_ORDER / ORDERS_10 / ORDERS_50',
    action: 'Place an order',
    coins: '50 / 100 / 500 / 1000',
    frontendPages: ['(tabs)/index.tsx', 'store/', 'cart.tsx', 'checkout.tsx'],
    backendTrigger: 'orderController.ts → createOrder() → achievementService.triggerAchievementUpdate()',
    apiEndpoint: 'POST /api/orders'
  },
  {
    type: 'FIRST_REVIEW / REVIEWS_25',
    action: 'Submit a product review',
    coins: '25 / 250',
    frontendPages: ['review/', 'product/[id].tsx'],
    backendTrigger: 'reviewController.ts → createReview() → achievementService.triggerAchievementUpdate()',
    apiEndpoint: 'POST /api/reviews'
  },
  {
    type: 'FIRST_VIDEO / VIEWS_10000',
    action: 'Create/upload a video',
    coins: '100 / 1000',
    frontendPages: ['video/', 'create-video.tsx', 'upload-video.tsx'],
    backendTrigger: 'videoController.ts → createVideo() → achievementService.triggerAchievementUpdate()',
    apiEndpoint: 'POST /api/videos'
  },
  {
    type: 'FIRST_PROJECT / TOP_EARNER',
    action: 'Submit a project',
    coins: '50 / 500',
    frontendPages: ['projects/', 'submit-project.tsx'],
    backendTrigger: 'projectController.ts → submitProject() → achievementService.triggerAchievementUpdate()',
    apiEndpoint: 'POST /api/projects/submit'
  },
  {
    type: 'FIRST_REFERRAL / REFERRALS_10',
    action: 'Refer a friend (friend signs up with your code)',
    coins: '100 / 1000',
    frontendPages: ['referral.tsx', 'refer.tsx'],
    backendTrigger: 'authController.ts → verifyOTP() → achievementService.triggerAchievementUpdate()',
    apiEndpoint: 'When friend signs up with referral code'
  },
  {
    type: 'EARLY_BIRD',
    action: 'Be active for 30 days (automatic)',
    coins: '200',
    frontendPages: ['N/A - Time based'],
    backendTrigger: 'Auto-calculated during any recalculation',
    apiEndpoint: 'Automatic'
  },
  {
    type: 'ACTIVE_USER / SUPER_USER',
    action: 'Complete 100/500 total activities',
    coins: '500 / 2000',
    frontendPages: ['Any activity in the app'],
    backendTrigger: 'Auto-calculated (orders + videos + projects + reviews + offers)',
    apiEndpoint: 'Automatic'
  }
];

// Check frontend pages
function checkFrontendPage(pagePath) {
  const fullPath = path.join(frontendPath, pagePath);
  if (fs.existsSync(fullPath)) {
    return '✅';
  }
  // Check if it's a directory
  if (fs.existsSync(fullPath.replace('.tsx', ''))) {
    return '✅';
  }
  return '❌';
}

// Check backend trigger
function checkBackendTrigger(controllerName) {
  const filePath = path.join(backendPath, 'controllers', controllerName);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('achievementService.triggerAchievementUpdate')) {
      return '✅ TRIGGER FOUND';
    }
    return '⚠️ NO TRIGGER';
  }
  return '❌ FILE NOT FOUND';
}

achievements.forEach((achievement, index) => {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${index + 1}. ${achievement.type}`);
  console.log(`   Action: ${achievement.action}`);
  console.log(`   Coins: +${achievement.coins}`);
  console.log(`   API: ${achievement.apiEndpoint}`);

  // Check frontend
  console.log(`\n   📱 FRONTEND PAGES:`);
  if (Array.isArray(achievement.frontendPages)) {
    achievement.frontendPages.forEach(page => {
      if (page === 'N/A - Time based' || page === 'Any activity in the app') {
        console.log(`      ${page}`);
      } else {
        const status = checkFrontendPage(page);
        console.log(`      ${status} ${page}`);
      }
    });
  }

  // Check backend
  console.log(`\n   🔧 BACKEND TRIGGER:`);
  const triggerFile = achievement.backendTrigger.split(' →')[0];
  if (triggerFile.includes('.ts')) {
    const status = checkBackendTrigger(triggerFile);
    console.log(`      ${status} in ${triggerFile}`);
  } else {
    console.log(`      ✅ ${achievement.backendTrigger}`);
  }

  console.log('');
});

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log('\n📋 SUMMARY OF HOW TO COMPLETE EACH ACHIEVEMENT IN THE APP:\n');

const howTo = [
  { achievement: 'First Order (+50)', howTo: 'Go to Home → Browse stores → Add to cart → Checkout → Complete order' },
  { achievement: '10/50/100 Orders', howTo: 'Keep ordering! Each delivered order counts toward progress' },
  { achievement: 'First Review (+25)', howTo: 'Go to a product you purchased → Write a review → Submit' },
  { achievement: 'Review Master (+250)', howTo: 'Write 25 reviews on products you\'ve purchased' },
  { achievement: 'First Video (+100)', howTo: 'Go to Video section → Create/Upload a video about a product' },
  { achievement: 'Influencer (+1000)', howTo: 'Get 10,000 total views on your videos' },
  { achievement: 'First Project (+50)', howTo: 'Go to Projects → Find a brand project → Submit your work' },
  { achievement: 'Top Earner (+500)', howTo: 'Earn ₹5000 total from approved projects' },
  { achievement: 'First Referral (+100)', howTo: 'Go to Refer & Earn → Share your code → Friend signs up & orders' },
  { achievement: 'Referral Master (+1000)', howTo: 'Successfully refer 10 friends who sign up with your code' },
  { achievement: 'Early Bird (+200)', howTo: 'Automatic after 30 days of being a member' },
  { achievement: 'Active User (+500)', howTo: 'Complete 100 total activities (orders + reviews + videos + projects)' },
  { achievement: 'Super User (+2000)', howTo: 'Complete 500 total activities' },
];

howTo.forEach((item, i) => {
  console.log(`${i + 1}. ${item.achievement}`);
  console.log(`   → ${item.howTo}\n`);
});
