# Integration Testing Guide

## Overview

This guide explains how to test all the new services (Sync, Profile, Reviews) and verify the merchant app is correctly connected to the backend.

---

## Quick Start

### Option 1: Automated Test Suite

1. **Import the test runner in your app:**

```typescript
import { runAllTests, quickTest } from './tests/integration/api-tests';

// Run all tests
const results = await runAllTests();

// Or run quick test
await quickTest();
```

2. **Add the test UI component (optional):**

```typescript
import { ApiTestRunner } from './tests/integration/TestRunner';

// In your development screen
<ApiTestRunner />
```

### Option 2: Manual Testing via Console

Open your app and run in the console:

```javascript
import testSuite from './tests/integration/api-tests';

// Run all tests
testSuite.runAllTests();

// Run quick test
testSuite.quickTest();

// Run individual tests
testSuite.tests.sync.getStatus();
testSuite.tests.profile.getCustomerView();
testSuite.tests.bulk.downloadTemplate();
```

---

## Test Checklist

### ✅ Sync Service Tests

- [ ] **Get Sync Status** - `syncService.getSyncStatus()`
  - Verifies: API connection, merchant ID, last sync info
  - Expected: Returns sync status object with merchantId

- [ ] **Get Sync History** - `syncService.getSyncHistory(5)`
  - Verifies: Historical sync records retrieval
  - Expected: Returns array of sync history items

- [ ] **Get Sync Health** - `syncService.getSyncHealth()`
  - Verifies: Service health monitoring
  - Expected: Returns health status with uptime and stats

- [ ] **Trigger Sync** - `syncService.triggerSync({ syncTypes: ['merchant'] })`
  - Verifies: Manual sync trigger
  - Expected: Returns success with sync counts

### ✅ Profile Service Tests

- [ ] **Get Customer View Profile** - `profileService.getCustomerViewProfile()`
  - Verifies: Merchant profile retrieval
  - Expected: Returns complete profile object

- [ ] **Get Visibility Settings** - `profileService.getVisibilitySettings()`
  - Verifies: Visibility controls retrieval
  - Expected: Returns visibility settings object

- [ ] **Get Customer Reviews** - `profileService.getCustomerReviews({ page: 1, limit: 5 })`
  - Verifies: Customer reviews retrieval
  - Expected: Returns reviews with pagination

### ✅ Reviews Service Tests

- [ ] **Get Review Stats** - `reviewsService.getReviewStats(productId)`
  - Verifies: Review statistics retrieval
  - Expected: Returns stats with rating breakdown

- [ ] **Get Product Reviews** - `reviewsService.getProductReviews(productId)`
  - Verifies: Product-specific reviews retrieval
  - Expected: Returns reviews array with stats

### ✅ Bulk Operations Tests

- [ ] **Download Import Template** - `productsService.downloadImportTemplate('csv')`
  - Verifies: Template download endpoint
  - Expected: Returns template URL

- [ ] **Export Products** - `productsService.exportProductsAdvanced({ ... })`
  - Verifies: Product export functionality
  - Expected: Returns export file URL

### ✅ Variant Operations Tests

- [ ] **Get Product Variants** - `productsService.getProductVariants(productId)`
  - Verifies: Variant retrieval
  - Expected: Returns variants array

---

## Manual Testing Steps

### 1. Test Sync Service

```typescript
import { syncService } from '@/services/api';

// Get current sync status
const status = await syncService.getSyncStatus();
console.log('Last Sync:', syncService.formatSyncStatus(status));

// Trigger a sync
const result = await syncService.triggerSync({
  syncTypes: ['products', 'orders'],
  batchSize: 50
});
console.log('Sync Result:', result);

// Check sync history
const history = await syncService.getSyncHistory(10);
console.log('Recent Syncs:', history);
```

### 2. Test Profile Service

```typescript
import { profileService } from '@/services/api';

// Get customer-facing profile
const profile = await profileService.getCustomerViewProfile();
console.log('Store Name:', profile.storeName);
console.log('Categories:', profile.categories);

// Get visibility settings
const visibility = await profileService.getVisibilitySettings();
console.log('Status:', profileService.getVisibilityStatusLabel(visibility));

// Update visibility (optional)
await profileService.updateVisibilitySettings({
  isPubliclyVisible: true,
  acceptingOrders: true
});
```

### 3. Test Reviews Service

```typescript
import { reviewsService } from '@/services/api';

// Get reviews for a product
const reviews = await reviewsService.getProductReviews('product_id', {
  page: 1,
  limit: 20,
  filter: 'with_images'
});

console.log('Total Reviews:', reviews.stats.totalReviews);
console.log('Average Rating:', reviewsService.formatRating(reviews.stats.averageRating));

// Get review statistics
const stats = await reviewsService.getReviewStats('product_id');
console.log('Rating Breakdown:', stats.ratingBreakdown);
```

### 4. Test Bulk Operations

```typescript
import { productsService } from '@/services/api';

// Download CSV template
const template = await productsService.downloadImportTemplate('csv');
console.log('Template URL:', template.url);

// Export products
const exportResult = await productsService.exportProductsAdvanced({
  fields: ['name', 'sku', 'price', 'stock'],
  format: 'csv',
  filters: {
    status: 'active'
  }
});
console.log('Export URL:', exportResult.url);
```

---

## Expected Results

### All Tests Passing ✅

```
🧪 Starting Integration Tests...
============================================================

✅ Sync: Get Status - PASSED (234ms)
✅ Sync: Get History - PASSED (156ms)
✅ Sync: Get Health - PASSED (189ms)
✅ Sync: Trigger Sync - PASSED (567ms)
✅ Profile: Get Customer View - PASSED (245ms)
✅ Profile: Get Visibility Settings - PASSED (178ms)
✅ Profile: Get Customer Reviews - PASSED (298ms)
✅ Reviews: Get Stats - PASSED (201ms)
✅ Reviews: Get Product Reviews - PASSED (223ms)
✅ Bulk: Download Template - PASSED (312ms)
✅ Bulk: Export Products - PASSED (445ms)
✅ Variants: Get Product Variants - PASSED (198ms)

============================================================

📊 Test Results Summary:

Total Tests: 12
✅ Passed: 12
❌ Failed: 0
Success Rate: 100.0%
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Errors (401)

**Problem:** `Unauthorized` or `Invalid token` errors

**Solution:**
- Ensure you're logged in before running tests
- Check that `auth_token` is stored in AsyncStorage
- Verify token hasn't expired

```typescript
import { authService } from '@/services/api';

// Check if authenticated
const isAuth = await authService.isAuthenticated();
console.log('Authenticated:', isAuth);

// Re-login if needed
await authService.login({ email, password });
```

#### 2. Network Errors

**Problem:** `Network request failed` or timeout errors

**Solution:**
- Verify backend is running (`http://localhost:5001` or your IP)
- Check `EXPO_PUBLIC_API_BASE_URL` in `.env`
- Ensure device/emulator can reach backend

```typescript
// Check API URL
import { getApiUrl } from '@/config/api';
console.log('API URL:', getApiUrl());
```

#### 3. 404 Not Found

**Problem:** Endpoint not found errors

**Solution:**
- Verify backend routes are mounted in `server.ts`
- Check route paths match frontend calls
- Ensure backend is latest version

#### 4. CORS Errors (Web only)

**Problem:** CORS policy blocking requests

**Solution:**
- Add merchant app URL to backend `CORS_ORIGIN`
- Restart backend after updating `.env`

---

## Integration with UI

### Add Test Screen to Development Menu

```typescript
// app/(dev)/api-tests.tsx
import { ApiTestRunner } from '@/tests/integration/TestRunner';

export default function ApiTestsScreen() {
  return <ApiTestRunner />;
}
```

### Add Quick Test Button

```typescript
import { quickTest } from '@/tests/integration/api-tests';

<Button
  title="Run API Tests"
  onPress={async () => {
    try {
      await quickTest();
      Alert.alert('Success', 'All tests passed!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  }}
/>
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: npm install
      
      - name: Start Backend
        run: |
          cd user-backend
          npm install
          npm start &
          sleep 10
      
      - name: Run Integration Tests
        run: |
          cd admin-project/merchant-app
          npm test -- tests/integration/api-tests.ts
```

---

## Next Steps

After all tests pass:

1. ✅ **Mark Phase 8 complete** in task.md
2. 🚀 **Proceed to Phase 9** - Production Readiness
3. 📱 **Test on real devices** (iOS/Android)
4. 🔄 **Verify Socket.IO** real-time updates
5. 📊 **Monitor performance** and error rates

---

## Support

If tests fail:
1. Check console logs for detailed error messages
2. Verify backend is running and accessible
3. Ensure all environment variables are set
4. Review the walkthrough.md for setup instructions

For help, check the implementation plan and walkthrough documents.
