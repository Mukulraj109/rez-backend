"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const Store_1 = require("../models/Store");
const Offer_1 = __importDefault(require("../models/Offer"));
const joi_1 = __importDefault(require("joi"));
const AuditService_1 = __importDefault(require("../services/AuditService"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const createOfferSchema = joi_1.default.object({
    title: joi_1.default.string().required().min(3).max(100),
    subtitle: joi_1.default.string().max(200).optional(),
    description: joi_1.default.string().max(1000).optional(),
    image: joi_1.default.string().uri().required(),
    category: joi_1.default.string().valid('mega', 'student', 'new_arrival', 'trending', 'food', 'fashion', 'electronics', 'general').default('general'),
    type: joi_1.default.string().valid('cashback', 'discount', 'voucher', 'combo', 'special', 'walk_in').default('walk_in'),
    cashbackPercentage: joi_1.default.number().min(0).max(100).required(),
    originalPrice: joi_1.default.number().min(0).optional(),
    discountedPrice: joi_1.default.number().min(0).optional(),
    storeId: joi_1.default.string().required(),
    validity: joi_1.default.object({
        startDate: joi_1.default.date().required(),
        endDate: joi_1.default.date().required().min(joi_1.default.ref('startDate')),
        isActive: joi_1.default.boolean().default(true),
    }).required(),
    restrictions: joi_1.default.object({
        minOrderValue: joi_1.default.number().min(0).optional(),
        maxDiscountAmount: joi_1.default.number().min(0).optional(),
        applicableOn: joi_1.default.array().items(joi_1.default.string()).optional(),
        excludedProducts: joi_1.default.array().items(joi_1.default.string()).optional(),
        usageLimitPerUser: joi_1.default.number().min(1).optional(),
        usageLimit: joi_1.default.number().min(1).optional(),
    }).optional(),
    metadata: joi_1.default.object({
        isNew: joi_1.default.boolean().default(false),
        isTrending: joi_1.default.boolean().default(false),
        isBestSeller: joi_1.default.boolean().default(false),
        isSpecial: joi_1.default.boolean().default(false),
        priority: joi_1.default.number().min(0).max(100).default(0),
        tags: joi_1.default.array().items(joi_1.default.string()).optional(),
        featured: joi_1.default.boolean().default(false),
    }).optional(),
});
const updateOfferSchema = createOfferSchema.fork(['title', 'image', 'storeId', 'validity'], (schema) => schema.optional());
/**
 * @route   GET /api/merchant/offers
 * @desc    Get all offers for merchant's stores
 * @access  Private (Merchant)
 */
router.get('/', (0, merchantvalidation_1.validateQuery)(joi_1.default.object({
    store: joi_1.default.string().optional(),
    type: joi_1.default.string().valid('cashback', 'discount', 'voucher', 'combo', 'special', 'walk_in').optional(),
    active: joi_1.default.boolean().optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(50).default(20),
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Get all stores belonging to this merchant
        const stores = await Store_1.Store.find({ merchantId: new mongoose_1.default.Types.ObjectId(merchantId) });
        const storeIds = stores.map(s => s._id);
        if (storeIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    items: [],
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 0,
                        hasNext: false,
                        hasPrevious: false,
                    }
                }
            });
        }
        // Build query
        const query = {
            'store.id': { $in: storeIds },
        };
        // Filter by store if provided
        if (req.query.store) {
            const storeId = new mongoose_1.default.Types.ObjectId(req.query.store);
            // Verify store belongs to merchant
            const store = stores.find((s) => s._id.toString() === storeId.toString());
            if (!store) {
                return res.status(403).json({
                    success: false,
                    message: 'Store not found or access denied'
                });
            }
            query['store.id'] = storeId;
        }
        // Filter by type
        if (req.query.type) {
            query.type = req.query.type;
        }
        // Filter by active status
        if (req.query.active !== undefined) {
            query['validity.isActive'] = req.query.active === 'true';
        }
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Execute query
        const [offers, total] = await Promise.all([
            Offer_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Offer_1.default.countDocuments(query),
        ]);
        return res.json({
            success: true,
            data: {
                items: offers,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page < Math.ceil(total / limit),
                    hasPrevious: page > 1,
                }
            }
        });
    }
    catch (error) {
        console.error('Get merchant offers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch offers',
            error: error.message
        });
    }
});
/**
 * @route   POST /api/merchant/offers
 * @desc    Create a new offer for a store
 * @access  Private (Merchant)
 */
router.post('/', (0, merchantvalidation_1.validateRequest)(createOfferSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        const offerData = req.body;
        // Verify store belongs to merchant
        const store = await Store_1.Store.findOne({
            _id: offerData.storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(403).json({
                success: false,
                message: 'Store not found or access denied'
            });
        }
        // Get store location for offer
        const storeLocation = store.location?.coordinates || [0, 0];
        // Create offer
        const offer = new Offer_1.default({
            title: offerData.title,
            subtitle: offerData.subtitle,
            description: offerData.description,
            image: offerData.image,
            category: offerData.category || 'general',
            type: offerData.type || 'walk_in',
            cashbackPercentage: offerData.cashbackPercentage,
            originalPrice: offerData.originalPrice,
            discountedPrice: offerData.discountedPrice,
            location: {
                type: 'Point',
                coordinates: storeLocation,
            },
            store: {
                id: store._id,
                name: store.name,
                logo: store.logo,
                rating: store.ratings?.average || 0,
                verified: store.isVerified || false,
            },
            validity: {
                startDate: new Date(offerData.validity.startDate),
                endDate: new Date(offerData.validity.endDate),
                isActive: offerData.validity.isActive !== undefined ? offerData.validity.isActive : true,
            },
            restrictions: offerData.restrictions || {},
            metadata: {
                ...offerData.metadata,
                priority: offerData.metadata?.priority || 0,
                tags: offerData.metadata?.tags || [],
            },
            engagement: {
                likesCount: 0,
                sharesCount: 0,
                viewsCount: 0,
            },
            createdBy: new mongoose_1.default.Types.ObjectId(merchantId),
        });
        await offer.save();
        // Update store's offers.discounts array
        if (!store.offers.discounts) {
            store.offers.discounts = [];
        }
        store.offers.discounts.push(offer._id);
        await store.save();
        // Audit log
        await AuditService_1.default.log({
            merchantId: merchantId,
            action: 'offer.created',
            resourceType: 'offer',
            resourceId: offer._id.toString(),
            details: {
                metadata: {
                    offerTitle: offer.title,
                    storeId: store._id.toString(),
                    storeName: store.name,
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'info'
        });
        return res.status(201).json({
            success: true,
            message: 'Offer created successfully',
            data: offer
        });
    }
    catch (error) {
        console.error('Create offer error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create offer',
            error: error.message
        });
    }
});
/**
 * @route   GET /api/merchant/offers/:id
 * @desc    Get a single offer by ID
 * @access  Private (Merchant)
 */
router.get('/:id', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required()
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const offerId = req.params.id;
        // Get offer
        const offer = await Offer_1.default.findById(offerId).lean();
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }
        // Verify offer belongs to merchant's store
        const store = await Store_1.Store.findOne({
            _id: offer.store.id,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        return res.json({
            success: true,
            data: offer
        });
    }
    catch (error) {
        console.error('Get offer error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch offer',
            error: error.message
        });
    }
});
/**
 * @route   PUT /api/merchant/offers/:id
 * @desc    Update an offer
 * @access  Private (Merchant)
 */
router.put('/:id', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required()
})), (0, merchantvalidation_1.validateRequest)(updateOfferSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const offerId = req.params.id;
        const updateData = req.body;
        // Get offer
        const offer = await Offer_1.default.findById(offerId);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }
        // Verify offer belongs to merchant's store
        const store = await Store_1.Store.findOne({
            _id: offer.store.id,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        // If storeId is being updated, verify new store belongs to merchant
        if (updateData.storeId && updateData.storeId !== offer.store.id.toString()) {
            const newStore = await Store_1.Store.findOne({
                _id: updateData.storeId,
                merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
            });
            if (!newStore) {
                return res.status(403).json({
                    success: false,
                    message: 'New store not found or access denied'
                });
            }
            // Remove from old store
            if (store.offers.discounts) {
                store.offers.discounts = store.offers.discounts.filter((id) => id.toString() !== offerId);
                await store.save();
            }
            // Add to new store
            if (!newStore.offers.discounts) {
                newStore.offers.discounts = [];
            }
            newStore.offers.discounts.push(offer._id);
            await newStore.save();
            // Update offer store info
            offer.store = {
                id: newStore._id,
                name: newStore.name,
                logo: newStore.logo,
                rating: newStore.ratings?.average || 0,
                verified: newStore.isVerified || false,
            };
        }
        // Update offer fields
        if (updateData.title)
            offer.title = updateData.title;
        if (updateData.subtitle !== undefined)
            offer.subtitle = updateData.subtitle;
        if (updateData.description !== undefined)
            offer.description = updateData.description;
        if (updateData.image)
            offer.image = updateData.image;
        if (updateData.category)
            offer.category = updateData.category;
        if (updateData.type)
            offer.type = updateData.type;
        if (updateData.cashbackPercentage !== undefined)
            offer.cashbackPercentage = updateData.cashbackPercentage;
        if (updateData.originalPrice !== undefined)
            offer.originalPrice = updateData.originalPrice;
        if (updateData.discountedPrice !== undefined)
            offer.discountedPrice = updateData.discountedPrice;
        if (updateData.validity) {
            if (updateData.validity.startDate)
                offer.validity.startDate = new Date(updateData.validity.startDate);
            if (updateData.validity.endDate)
                offer.validity.endDate = new Date(updateData.validity.endDate);
            if (updateData.validity.isActive !== undefined)
                offer.validity.isActive = updateData.validity.isActive;
        }
        if (updateData.restrictions) {
            offer.restrictions = { ...offer.restrictions, ...updateData.restrictions };
        }
        if (updateData.metadata) {
            offer.metadata = { ...offer.metadata, ...updateData.metadata };
        }
        await offer.save();
        // Audit log
        await AuditService_1.default.log({
            merchantId: merchantId,
            action: 'offer.updated',
            resourceType: 'offer',
            resourceId: offer._id.toString(),
            details: {
                metadata: {
                    offerTitle: offer.title,
                    storeId: store._id.toString(),
                    storeName: store.name,
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'info'
        });
        return res.json({
            success: true,
            message: 'Offer updated successfully',
            data: offer
        });
    }
    catch (error) {
        console.error('Update offer error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update offer',
            error: error.message
        });
    }
});
/**
 * @route   DELETE /api/merchant/offers/:id
 * @desc    Delete an offer
 * @access  Private (Merchant)
 */
router.delete('/:id', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required()
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const offerId = req.params.id;
        // Get offer
        const offer = await Offer_1.default.findById(offerId);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }
        // Verify offer belongs to merchant's store
        const store = await Store_1.Store.findOne({
            _id: offer.store.id,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        // Remove from store's offers.discounts array
        if (store.offers.discounts) {
            store.offers.discounts = store.offers.discounts.filter((id) => id.toString() !== offerId);
            await store.save();
        }
        // Delete offer
        await Offer_1.default.findByIdAndDelete(offerId);
        // Audit log
        await AuditService_1.default.log({
            merchantId: merchantId,
            action: 'offer.deleted',
            resourceType: 'offer',
            resourceId: offerId,
            details: {
                metadata: {
                    offerTitle: offer.title,
                    storeId: store._id.toString(),
                    storeName: store.name,
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'info'
        });
        return res.json({
            success: true,
            message: 'Offer deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete offer error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete offer',
            error: error.message
        });
    }
});
exports.default = router;
