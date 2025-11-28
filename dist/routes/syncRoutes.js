"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MerchantUserSyncService_1 = require("../services/MerchantUserSyncService");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = (0, express_1.Router)();
// GET /api/sync/status
// Get sync status for the system
router.get('/status', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const status = await MerchantUserSyncService_1.MerchantUserSyncService.getSyncStatus();
    if (!status) {
        return res.status(500).json({
            success: false,
            message: 'Failed to get sync status'
        });
    }
    return res.json({
        success: true,
        data: status,
        message: 'Sync status retrieved successfully'
    });
}));
// POST /api/sync/merchants
// Sync all merchants to create stores
router.post('/merchants', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await MerchantUserSyncService_1.MerchantUserSyncService.syncAllMerchantsToStores();
    const status = await MerchantUserSyncService_1.MerchantUserSyncService.getSyncStatus();
    return res.json({
        success: true,
        message: 'Merchants synced to stores successfully',
        data: status
    });
}));
// POST /api/sync/products
// Sync all merchant products to user-side products
router.post('/products', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await MerchantUserSyncService_1.MerchantUserSyncService.syncAllMerchantProductsToUserProducts();
    const status = await MerchantUserSyncService_1.MerchantUserSyncService.getSyncStatus();
    return res.json({
        success: true,
        message: 'Merchant products synced to user products successfully',
        data: status
    });
}));
// POST /api/sync/full
// Perform full sync of merchants and products
router.post('/full', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await MerchantUserSyncService_1.MerchantUserSyncService.forceFullSync();
    const status = await MerchantUserSyncService_1.MerchantUserSyncService.getSyncStatus();
    return res.json({
        success: true,
        message: 'Full sync completed successfully',
        data: status
    });
}));
exports.default = router;
