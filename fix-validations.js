const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, 'tests/e2e/merchant-endpoints-test.js');
let content = fs.readFileSync(testFile, 'utf8');

console.log('🔧 Fixing validation functions in E2E test file...\n');

const fixes = [
  // Dashboard
  {
    find: /GET \/api\/merchant\/dashboard\/activity.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.activities\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.activities)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'dashboard/activity'
  },
  {
    find: /GET \/api\/merchant\/dashboard\/top-products.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.topProducts\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.topProducts)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'dashboard/top-products'
  },
  {
    find: /GET \/api\/merchant\/dashboard\/sales-data.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.salesData\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.salesData)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'dashboard/sales-data'
  },
  {
    find: /GET \/api\/merchant\/dashboard\/low-stock.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.lowStockProducts\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.lowStockProducts)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'dashboard/low-stock'
  },

  // Onboarding
  {
    find: /GET \/api\/merchant\/onboarding\/status.*?validate: \(data\) => data\.success && typeof data\.data\.status === 'string'/s,
    replace: (match) => match.replace(
      "validate: (data) => data.success && typeof data.data.status === 'string'",
      "validate: (data) => data.success && data.data.status && data.data.currentStep !== undefined"
    ),
    name: 'onboarding/status'
  },

  // Team
  {
    find: /GET \/api\/merchant\/team.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data)',
      'validate: (data) => data.success && data.data.teamMembers !== undefined'
    ),
    name: 'team (GET)'
  },
  {
    find: /POST \/api\/merchant\/team\/invite.*?validate: \(data\) => data\.success && data\.data\.invitation/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && data.data.invitation',
      'validate: (data) => data.success && data.data.invitationId'
    ),
    name: 'team/invite'
  },

  // Orders analytics
  {
    find: /GET \/api\/merchant\/orders\/analytics.*?validate: \(data\) => data\.success && data\.data\.overview/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && data.data.overview',
      'validate: (data) => data.success && data.data.totalOrders !== undefined'
    ),
    name: 'orders/analytics'
  },

  // Notifications stats
  {
    find: /GET \/api\/merchant\/notifications\/stats.*?validate: \(data\) => data\.success && data\.data\.total !== undefined/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && data.data.total !== undefined',
      'validate: (data) => data.success && data.data.overview !== undefined'
    ),
    name: 'notifications/stats'
  },

  // Analytics - all return arrays or have specific structures
  {
    find: /GET \/api\/merchant\/analytics\/sales\/overview.*?validate: \(data\) => data\.success && data\.data\.revenue !== undefined/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && data.data.revenue !== undefined',
      'validate: (data) => data.success && data.data.totalRevenue !== undefined'
    ),
    name: 'analytics/sales/overview'
  },
  {
    find: /GET \/api\/merchant\/analytics\/sales\/trends.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.trends\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.trends)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'analytics/sales/trends'
  },
  {
    find: /GET \/api\/merchant\/analytics\/sales\/by-time.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.byTime\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.byTime)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'analytics/sales/by-time'
  },
  {
    find: /GET \/api\/merchant\/analytics\/sales\/by-day.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.byDay\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.byDay)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'analytics/sales/by-day'
  },
  {
    find: /GET \/api\/merchant\/analytics\/products\/top-selling.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.products\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.products)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'analytics/products/top-selling'
  },
  {
    find: /GET \/api\/merchant\/analytics\/categories\/performance.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.categories\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.categories)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'analytics/categories/performance'
  },
  {
    find: /GET \/api\/merchant\/analytics\/customers\/insights.*?validate: \(data\) => data\.success && data\.data\.totalCustomers !== undefined/s,
    replace: (match) => match,  // This one is correct, no change needed
    name: 'analytics/customers/insights (no change)'
  },
  {
    find: /GET \/api\/merchant\/analytics\/inventory\/status.*?validate: \(data\) => data\.success && data\.data\.totalProducts !== undefined/s,
    replace: (match) => match,  // This one is correct, no change needed
    name: 'analytics/inventory/status (no change)'
  },
  {
    find: /GET \/api\/merchant\/analytics\/payments\/breakdown.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.payments\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.payments)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'analytics/payments/breakdown'
  },

  // Audit
  {
    find: /GET \/api\/merchant\/audit\/stats.*?validate: \(data\) => data\.success && data\.data\.totalLogs !== undefined/s,
    replace: (match) => match,  // This one is correct, no change needed
    name: 'audit/stats (no change)'
  },
  {
    find: /GET \/api\/merchant\/audit\/timeline(?!\/today|\/recent|\/critical).*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.timeline\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.timeline)',
      'validate: (data) => data.success && Array.isArray(data.data)'
    ),
    name: 'audit/timeline'
  },
  {
    find: /GET \/api\/merchant\/audit\/timeline\/today.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.activities\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.activities)',
      'validate: (data) => data.success && data.data.date && Array.isArray(data.data.activities)'
    ),
    name: 'audit/timeline/today'
  },
  {
    find: /GET \/api\/merchant\/audit\/timeline\/recent.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.recent\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.recent)',
      'validate: (data) => data.success && Array.isArray(data.data.activities)'
    ),
    name: 'audit/timeline/recent'
  },
  {
    find: /GET \/api\/merchant\/audit\/timeline\/critical.*?validate: \(data\) => data\.success && Array\.isArray\(data\.data\.critical\)/s,
    replace: (match) => match.replace(
      'validate: (data) => data.success && Array.isArray(data.data.critical)',
      'validate: (data) => data.success && Array.isArray(data.data.activities)'
    ),
    name: 'audit/timeline/critical'
  },
  {
    find: /GET \/api\/merchant\/audit\/retention\/stats.*?validate: \(data\) => data\.success && data\.data\.totalLogs !== undefined/s,
    replace: (match) => match,  // This one is correct, no change needed
    name: 'audit/retention/stats (no change)'
  },
  {
    find: /GET \/api\/merchant\/audit\/retention\/compliance.*?validate: \(data\) => data\.success && data\.data\.complianceStatus/s,
    replace: (match) => match,  // This one is correct, no change needed
    name: 'audit/retention/compliance (no change)'
  }
];

let fixedCount = 0;

fixes.forEach(fix => {
  const before = content;
  if (fix.find.test(content)) {
    content = content.replace(fix.find, fix.replace);
    if (content !== before) {
      console.log(`✅ Fixed: ${fix.name}`);
      fixedCount++;
    } else {
      console.log(`⚠️  No change: ${fix.name}`);
    }
  } else {
    console.log(`❌ Not found: ${fix.name}`);
  }
});

// Write back
fs.writeFileSync(testFile, content, 'utf8');

console.log(`\n✅ Fixed ${fixedCount} validation functions`);
console.log('✅ E2E test file updated\n');
