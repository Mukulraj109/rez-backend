"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const Product_1 = require("../models/Product");
const Store_1 = require("../models/Store");
const joi_1 = __importDefault(require("joi"));
const mongoose_1 = __importDefault(require("mongoose"));
const AuditService_1 = __importDefault(require("../services/AuditService"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const productIdSchema = joi_1.default.object({
    id: joi_1.default.string().required()
});
// @route   POST /api/products/:id/restore
// @desc    Restore soft-deleted product
// @access  Private
router.post('/:id/restore', (0, merchantvalidation_1.validateParams)(productIdSchema), async (req, res) => {
    try {
        const productId = req.params.id;
        const merchantId = req.merchantId;
        console.log('🔄 [RESTORE PRODUCT] Request received:');
        console.log('   Product ID:', productId);
        console.log('   Merchant ID:', merchantId);
        // Validate ObjectId format
        if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
            console.log('❌ [RESTORE PRODUCT] Invalid product ID format');
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }
        const productObjectId = new mongoose_1.default.Types.ObjectId(productId);
        const merchantObjectId = new mongoose_1.default.Types.ObjectId(merchantId);
        // Find DELETED product - explicitly query for deleted products
        let product = await Product_1.Product.findOne({
            _id: productObjectId,
            merchantId: merchantObjectId,
            isDeleted: true // Only find deleted products
        });
        // If not found by merchantId, try finding through stores
        if (!product) {
            console.log('🔍 [RESTORE PRODUCT] Product not found by merchantId, checking through stores...');
            const merchantStores = await Store_1.Store.find({ merchantId: merchantObjectId }).select('_id');
            const storeIds = merchantStores.map(store => store._id);
            if (storeIds.length > 0) {
                product = await Product_1.Product.findOne({
                    _id: productObjectId,
                    store: { $in: storeIds },
                    isDeleted: true // Only find deleted products
                });
                if (product) {
                    console.log('✅ [RESTORE PRODUCT] Product found via store relationship');
                }
            }
        }
        else {
            console.log('✅ [RESTORE PRODUCT] Product found via merchantId');
        }
        if (!product) {
            console.log('❌ [RESTORE PRODUCT] Product not found or not deleted');
            return res.status(404).json({
                success: false,
                message: 'Product not found or not deleted'
            });
        }
        console.log('✅ [RESTORE PRODUCT] Deleted product found:', product.name);
        console.log('   Deleted At:', product.deletedAt);
        // Check if product can be restored (within 30 days)
        if (product.deletedAt) {
            const daysSinceDeletion = Math.floor((Date.now() - product.deletedAt.getTime()) / (1000 * 60 * 60 * 24));
            console.log('   Days since deletion:', daysSinceDeletion);
            if (daysSinceDeletion > 30) {
                return res.status(400).json({
                    success: false,
                    message: `Product was deleted ${daysSinceDeletion} days ago and cannot be restored (30-day limit exceeded)`
                });
            }
        }
        // Restore the product
        await product.restore();
        console.log(`✅ Product "${product.name}" (ID: ${product._id}) restored successfully`);
        // Restore corresponding user-side product
        await restoreUserSideProduct(product.sku);
        // Audit log: Product restored
        await AuditService_1.default.log({
            merchantId: merchantId,
            action: 'product.restored',
            resourceType: 'product',
            resourceId: product._id,
            details: {
                metadata: {
                    name: product.name,
                    sku: product.sku,
                    restoredAt: new Date()
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'info'
        });
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${req.merchantId}`).emit('product_restored', {
                productId: product._id,
                productName: product.name
            });
        }
        return res.json({
            success: true,
            message: 'Product restored successfully',
            data: {
                product: product.toObject ? product.toObject() : product
            }
        });
    }
    catch (error) {
        console.error('Restore product error:', error);
        // Handle specific error for restoration time limit
        if (error.message && error.message.includes('Cannot restore product deleted more than 30 days ago')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to restore product',
            error: error.message
        });
    }
});
// @route   GET /api/products/deleted
// @desc    Get all soft-deleted products for merchant
// @access  Private
router.get('/deleted', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        console.log('📋 [GET DELETED PRODUCTS] Request received:');
        console.log('   Merchant ID:', merchantId);
        console.log('   Page:', page, 'Limit:', limit);
        const merchantObjectId = new mongoose_1.default.Types.ObjectId(merchantId);
        // Find all stores belonging to this merchant
        const merchantStores = await Store_1.Store.find({ merchantId: merchantObjectId }).select('_id');
        const storeIds = merchantStores.map(store => store._id);
        if (storeIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    products: [],
                    pagination: {
                        totalCount: 0,
                        page,
                        limit,
                        totalPages: 0,
                        hasNext: false,
                        hasPrevious: false
                    }
                }
            });
        }
        // Query for deleted products
        const query = {
            store: { $in: storeIds },
            isDeleted: true
        };
        const [products, totalCount] = await Promise.all([
            Product_1.Product.find(query)
                .sort({ deletedAt: -1 })
                .skip(skip)
                .limit(limit),
            Product_1.Product.countDocuments(query)
        ]);
        console.log(`✅ Found ${totalCount} deleted products`);
        const totalPages = Math.ceil(totalCount / limit);
        // Add restoration eligibility info
        const productsWithEligibility = products.map(product => {
            const productObj = product.toObject ? product.toObject() : product;
            let canRestore = false;
            let daysUntilPermanent = 0;
            if (product.deletedAt) {
                const daysSinceDeletion = Math.floor((Date.now() - product.deletedAt.getTime()) / (1000 * 60 * 60 * 24));
                canRestore = daysSinceDeletion <= 30;
                daysUntilPermanent = Math.max(0, 30 - daysSinceDeletion);
            }
            return {
                ...productObj,
                canRestore,
                daysUntilPermanent
            };
        });
        return res.json({
            success: true,
            data: {
                products: productsWithEligibility,
                pagination: {
                    totalCount,
                    page,
                    limit,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Get deleted products error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch deleted products',
            error: error.message
        });
    }
});
// Helper function to restore user-side product
async function restoreUserSideProduct(sku) {
    const session = await Product_1.Product.db.startSession();
    session.startTransaction();
    try {
        // Find the corresponding deleted user-side product by SKU
        const userProduct = await Product_1.Product.findOne({
            sku,
            isDeleted: true
        }).session(session);
        if (!userProduct) {
            await session.abortTransaction();
            console.log(`⚠️ No corresponding deleted user-side product found for SKU "${sku}"`);
            return;
        }
        // Restore the user-side product
        await userProduct.restore();
        await session.commitTransaction();
        console.log(`🔄 Restored user-side product with SKU "${sku}"`);
        // Emit Socket.IO event after successful restoration
        if (global.io) {
            global.io.emit('product_synced', {
                action: 'restored',
                productSku: sku,
                productName: userProduct.name,
                restoredAt: new Date(),
                timestamp: new Date()
            });
        }
    }
    catch (error) {
        await session.abortTransaction();
        console.error('Error restoring user-side product:', error);
    }
    finally {
        session.endSession();
    }
}
exports.default = router;
