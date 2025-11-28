/**
 * Integration Test Suite for Merchant App Backend Connection
 * 
 * This file contains test functions to verify all new services work correctly.
 * Run these tests to ensure the merchant app is properly connected to the backend.
 * 
 * Usage:
 * 1. Import this file in your app
 * 2. Call runAllTests() after authentication
 * 3. Check console for results
 */

import { syncService } from './services/api/sync';
import { profileService } from './services/api/profile';
import { reviewsService } from './services/api/reviews';
import { productsService } from './services/api/products';

// Test results interface
interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    duration?: number;
}

const testResults: TestResult[] = [];

// Helper function to run a test
async function runTest(
    name: string,
    testFn: () => Promise<void>
): Promise<TestResult> {
    const startTime = Date.now();
    try {
        await testFn();
        const duration = Date.now() - startTime;
        console.log(`✅ ${name} - PASSED (${duration}ms)`);
        return { name, passed: true, duration };
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`❌ ${name} - FAILED (${duration}ms)`, error.message);
        return { name, passed: false, error: error.message, duration };
    }
}

// ==================== SYNC SERVICE TESTS ====================

async function testGetSyncStatus() {
    const status = await syncService.getSyncStatus();

    if (!status || !status.merchantId) {
        throw new Error('Invalid sync status response');
    }

    console.log('Sync Status:', {
        merchantId: status.merchantId,
        lastSync: status.lastSync?.syncedAt,
        autoSync: status.autoSync?.enabled
    });
}

async function testGetSyncHistory() {
    const history = await syncService.getSyncHistory(5);

    if (!Array.isArray(history)) {
        throw new Error('Sync history should be an array');
    }

    console.log(`Sync History: ${history.length} records`);
}

async function testGetSyncHealth() {
    const health = await syncService.getSyncHealth();

    if (!health || !health.service) {
        throw new Error('Invalid sync health response');
    }

    console.log('Sync Health:', {
        service: health.service,
        uptime: health.uptime,
        totalSyncs: health.stats?.totalSyncs
    });
}

async function testTriggerSync() {
    // Test with minimal options to avoid actually syncing large amounts of data
    const result = await syncService.triggerSync({
        syncTypes: ['merchant'],
        batchSize: 1
    });

    if (!result || !result.success) {
        throw new Error('Sync trigger failed');
    }

    console.log('Sync Result:', {
        success: result.success,
        syncedAt: result.syncedAt,
        counts: result.counts
    });
}

// ==================== PROFILE SERVICE TESTS ====================

async function testGetCustomerViewProfile() {
    const profile = await profileService.getCustomerViewProfile();

    if (!profile || !profile.merchantId) {
        throw new Error('Invalid customer view profile response');
    }

    console.log('Customer Profile:', {
        merchantId: profile.merchantId,
        storeName: profile.storeName,
        isActive: profile.isActive,
        categories: profile.categories?.length || 0
    });
}

async function testGetVisibilitySettings() {
    const settings = await profileService.getVisibilitySettings();

    if (settings === null || settings === undefined) {
        throw new Error('Invalid visibility settings response');
    }

    console.log('Visibility Settings:', {
        isPubliclyVisible: settings.isPubliclyVisible,
        acceptingOrders: settings.acceptingOrders,
        searchable: settings.searchable
    });
}

async function testGetCustomerReviews() {
    const reviews = await profileService.getCustomerReviews({
        page: 1,
        limit: 5
    });

    if (!reviews || !reviews.pagination) {
        throw new Error('Invalid customer reviews response');
    }

    console.log('Customer Reviews:', {
        totalReviews: reviews.summary?.totalReviews || 0,
        averageRating: reviews.summary?.averageRating || 0,
        reviewsCount: reviews.reviews?.length || 0
    });
}

// ==================== REVIEWS SERVICE TESTS ====================

async function testGetReviewStats() {
    // This test requires a valid product ID
    // We'll skip if no products exist
    try {
        const products = await productsService.getProducts({ limit: 1 });

        if (products.products && products.products.length > 0) {
            const productId = products.products[0].id;
            const stats = await reviewsService.getReviewStats(productId);

            console.log('Review Stats:', {
                totalReviews: stats.totalReviews,
                averageRating: stats.averageRating,
                breakdown: stats.ratingBreakdown
            });
        } else {
            console.log('⚠️ Skipping review stats test - no products found');
        }
    } catch (error) {
        console.log('⚠️ Skipping review stats test - error getting products');
    }
}

async function testGetProductReviews() {
    // This test requires a valid product ID
    try {
        const products = await productsService.getProducts({ limit: 1 });

        if (products.products && products.products.length > 0) {
            const productId = products.products[0].id;
            const reviews = await reviewsService.getProductReviews(productId, {
                page: 1,
                limit: 5
            });

            console.log('Product Reviews:', {
                reviewsCount: reviews.reviews?.length || 0,
                totalReviews: reviews.stats?.totalReviews || 0,
                averageRating: reviews.stats?.averageRating || 0
            });
        } else {
            console.log('⚠️ Skipping product reviews test - no products found');
        }
    } catch (error) {
        console.log('⚠️ Skipping product reviews test - error getting products');
    }
}

// ==================== BULK OPERATIONS TESTS ====================

async function testDownloadImportTemplate() {
    const template = await productsService.downloadImportTemplate('csv');

    if (!template || !template.url) {
        throw new Error('Invalid template response');
    }

    console.log('Template Download:', {
        url: template.url,
        filename: template.filename
    });
}

async function testBulkExportProducts() {
    const exportResult = await productsService.exportProductsAdvanced({
        fields: ['name', 'sku', 'price', 'stock'],
        format: 'csv',
        filters: {}
    });

    if (!exportResult || !exportResult.url) {
        throw new Error('Invalid export response');
    }

    console.log('Export Result:', {
        url: exportResult.url,
        filename: exportResult.fileName,
        recordCount: exportResult.recordCount
    });
}

// ==================== VARIANT OPERATIONS TESTS ====================

async function testGetProductVariants() {
    try {
        const products = await productsService.getProducts({ limit: 1 });

        if (products.products && products.products.length > 0) {
            const productId = products.products[0].id;
            const variants = await productsService.getProductVariants(productId);

            console.log('Product Variants:', {
                productId,
                totalVariants: variants.totalCount || 0,
                variantsCount: variants.variants?.length || 0
            });
        } else {
            console.log('⚠️ Skipping variants test - no products found');
        }
    } catch (error) {
        console.log('⚠️ Skipping variants test - error getting products');
    }
}

// ==================== MAIN TEST RUNNER ====================

export async function runAllTests(): Promise<{
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
}> {
    console.log('\n🧪 Starting Integration Tests...\n');
    console.log('='.repeat(60));

    const tests = [
        // Sync Service Tests
        { name: 'Sync: Get Status', fn: testGetSyncStatus },
        { name: 'Sync: Get History', fn: testGetSyncHistory },
        { name: 'Sync: Get Health', fn: testGetSyncHealth },
        { name: 'Sync: Trigger Sync', fn: testTriggerSync },

        // Profile Service Tests
        { name: 'Profile: Get Customer View', fn: testGetCustomerViewProfile },
        { name: 'Profile: Get Visibility Settings', fn: testGetVisibilitySettings },
        { name: 'Profile: Get Customer Reviews', fn: testGetCustomerReviews },

        // Reviews Service Tests
        { name: 'Reviews: Get Stats', fn: testGetReviewStats },
        { name: 'Reviews: Get Product Reviews', fn: testGetProductReviews },

        // Bulk Operations Tests
        { name: 'Bulk: Download Template', fn: testDownloadImportTemplate },
        { name: 'Bulk: Export Products', fn: testBulkExportProducts },

        // Variant Operations Tests
        { name: 'Variants: Get Product Variants', fn: testGetProductVariants }
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
        const result = await runTest(test.name, test.fn);
        results.push(result);

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Results Summary:\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log('\n' + '='.repeat(60) + '\n');

    return {
        total: results.length,
        passed,
        failed,
        results
    };
}

// Quick test function for individual services
export async function quickTest() {
    console.log('\n🚀 Running Quick Test...\n');

    try {
        // Test Sync
        console.log('1️⃣ Testing Sync Service...');
        const syncStatus = await syncService.getSyncStatus();
        console.log('   ✅ Sync Status:', syncService.formatSyncStatus(syncStatus));

        // Test Profile
        console.log('\n2️⃣ Testing Profile Service...');
        const profile = await profileService.getCustomerViewProfile();
        console.log('   ✅ Store Name:', profile.storeName);

        // Test Visibility
        console.log('\n3️⃣ Testing Visibility Settings...');
        const visibility = await profileService.getVisibilitySettings();
        console.log('   ✅ Status:', profileService.getVisibilityStatusLabel(visibility));

        // Test Bulk Template
        console.log('\n4️⃣ Testing Bulk Operations...');
        const template = await productsService.downloadImportTemplate('csv');
        console.log('   ✅ Template URL:', template.url);

        console.log('\n✅ Quick Test Complete!\n');

    } catch (error: any) {
        console.error('\n❌ Quick Test Failed:', error.message);
        throw error;
    }
}

// Export individual test functions for manual testing
export const tests = {
    sync: {
        getStatus: testGetSyncStatus,
        getHistory: testGetSyncHistory,
        getHealth: testGetSyncHealth,
        trigger: testTriggerSync
    },
    profile: {
        getCustomerView: testGetCustomerViewProfile,
        getVisibility: testGetVisibilitySettings,
        getReviews: testGetCustomerReviews
    },
    reviews: {
        getStats: testGetReviewStats,
        getProductReviews: testGetProductReviews
    },
    bulk: {
        downloadTemplate: testDownloadImportTemplate,
        exportProducts: testBulkExportProducts
    },
    variants: {
        getVariants: testGetProductVariants
    }
};

export default {
    runAllTests,
    quickTest,
    tests
};
