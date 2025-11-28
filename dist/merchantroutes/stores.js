"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const Store_1 = require("../models/Store");
const Category_1 = require("../models/Category");
const Merchant_1 = require("../models/Merchant");
const Review_1 = __importDefault(require("../models/Review"));
const Video_1 = require("../models/Video");
const Wallet_1 = require("../models/Wallet");
const Transaction_1 = require("../models/Transaction");
const joi_1 = __importDefault(require("joi"));
const AuditService_1 = __importDefault(require("../services/AuditService"));
const mongoose_1 = __importDefault(require("mongoose"));
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const createStoreSchema = joi_1.default.object({
    name: joi_1.default.string().required().min(2).max(100),
    description: joi_1.default.string().max(1000).optional(),
    logo: joi_1.default.string().uri().optional(),
    banner: joi_1.default.alternatives().try(joi_1.default.string().uri(), joi_1.default.array().items(joi_1.default.string().uri()).min(1).max(10) // Support 1-10 banner images
    ).optional(),
    category: joi_1.default.string().required(),
    location: joi_1.default.object({
        address: joi_1.default.string().required(),
        city: joi_1.default.string().required(),
        state: joi_1.default.string().optional(),
        pincode: joi_1.default.string().pattern(/^\d{6}$/).optional(),
        coordinates: joi_1.default.array().items(joi_1.default.number()).length(2).optional(), // [longitude, latitude]
        deliveryRadius: joi_1.default.number().min(0).max(500).default(5), // Allow up to 500km for regional delivery
        landmark: joi_1.default.string().optional()
    }).required(),
    contact: joi_1.default.object({
        phone: joi_1.default.string().optional(),
        email: joi_1.default.string().email().optional(),
        website: joi_1.default.string().uri().optional(),
        whatsapp: joi_1.default.string().optional()
    }).optional(),
    operationalInfo: joi_1.default.object({
        hours: joi_1.default.object({
            monday: joi_1.default.object({
                open: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                close: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                closed: joi_1.default.boolean().default(false)
            }).optional(),
            tuesday: joi_1.default.object({
                open: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                close: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                closed: joi_1.default.boolean().default(false)
            }).optional(),
            wednesday: joi_1.default.object({
                open: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                close: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                closed: joi_1.default.boolean().default(false)
            }).optional(),
            thursday: joi_1.default.object({
                open: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                close: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                closed: joi_1.default.boolean().default(false)
            }).optional(),
            friday: joi_1.default.object({
                open: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                close: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                closed: joi_1.default.boolean().default(false)
            }).optional(),
            saturday: joi_1.default.object({
                open: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                close: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                closed: joi_1.default.boolean().default(false)
            }).optional(),
            sunday: joi_1.default.object({
                open: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                close: joi_1.default.string().pattern(/^\d{2}:\d{2}$/),
                closed: joi_1.default.boolean().default(false)
            }).optional()
        }).optional(),
        deliveryTime: joi_1.default.string().optional(),
        minimumOrder: joi_1.default.number().min(0).default(0),
        deliveryFee: joi_1.default.number().min(0).default(0),
        freeDeliveryAbove: joi_1.default.number().min(0).optional(),
        acceptsWalletPayment: joi_1.default.boolean().default(true),
        paymentMethods: joi_1.default.array().items(joi_1.default.string()).default(['cash', 'card', 'upi', 'wallet'])
    }).optional(),
    offers: joi_1.default.object({
        cashback: joi_1.default.number().min(0).max(100).optional(),
        minOrderAmount: joi_1.default.number().min(0).optional(),
        maxCashback: joi_1.default.number().min(0).optional(),
        isPartner: joi_1.default.boolean().default(false),
        partnerLevel: joi_1.default.string().valid('bronze', 'silver', 'gold', 'platinum').optional()
    }).optional(),
    deliveryCategories: joi_1.default.object({
        fastDelivery: joi_1.default.boolean().default(false),
        budgetFriendly: joi_1.default.boolean().default(false),
        ninetyNineStore: joi_1.default.boolean().default(false),
        premium: joi_1.default.boolean().default(false),
        organic: joi_1.default.boolean().default(false),
        alliance: joi_1.default.boolean().default(false),
        lowestPrice: joi_1.default.boolean().default(false),
        mall: joi_1.default.boolean().default(false),
        cashStore: joi_1.default.boolean().default(false)
    }).optional(),
    tags: joi_1.default.array().items(joi_1.default.string()).optional(),
    isActive: joi_1.default.boolean().default(true),
    isFeatured: joi_1.default.boolean().default(false)
});
const updateStoreSchema = createStoreSchema.fork(['name', 'category', 'location'], (schema) => schema.optional());
const storeIdSchema = joi_1.default.object({
    id: joi_1.default.string().required()
});
// Helper function to generate unique slug
const generateSlug = async (name) => {
    let slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();
    let finalSlug = slug;
    let counter = 1;
    while (await Store_1.Store.findOne({ slug: finalSlug })) {
        finalSlug = `${slug}-${counter}`;
        counter++;
    }
    return finalSlug;
};
/**
 * @route   POST /api/merchant/stores
 * @desc    Create a new store
 * @access  Private (Merchant)
 */
router.post('/', (0, merchantvalidation_1.validateRequest)(createStoreSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Verify merchant exists
        const merchant = await Merchant_1.Merchant.findById(merchantId);
        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'Merchant not found'
            });
        }
        const storeData = req.body;
        // Verify category exists
        const category = await Category_1.Category.findById(storeData.category);
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category not found'
            });
        }
        // Generate unique slug
        const slug = await generateSlug(storeData.name);
        // Create store
        // Normalize banner to always be an array
        let bannerArray = [];
        if (storeData.banner) {
            bannerArray = Array.isArray(storeData.banner) ? storeData.banner : [storeData.banner];
        }
        const store = new Store_1.Store({
            name: storeData.name,
            slug,
            description: storeData.description,
            logo: storeData.logo,
            banner: bannerArray,
            category: category._id,
            merchantId: merchant._id,
            location: {
                address: storeData.location.address,
                city: storeData.location.city,
                state: storeData.location.state,
                pincode: storeData.location.pincode,
                coordinates: storeData.location.coordinates,
                deliveryRadius: storeData.location.deliveryRadius || 5,
                landmark: storeData.location.landmark
            },
            contact: storeData.contact || {},
            operationalInfo: {
                hours: storeData.operationalInfo?.hours || {},
                deliveryTime: storeData.operationalInfo?.deliveryTime || '30-45 mins',
                minimumOrder: storeData.operationalInfo?.minimumOrder || 0,
                deliveryFee: storeData.operationalInfo?.deliveryFee || 0,
                freeDeliveryAbove: storeData.operationalInfo?.freeDeliveryAbove,
                acceptsWalletPayment: storeData.operationalInfo?.acceptsWalletPayment !== undefined
                    ? storeData.operationalInfo.acceptsWalletPayment
                    : true,
                paymentMethods: storeData.operationalInfo?.paymentMethods || ['cash', 'card', 'upi', 'wallet']
            },
            offers: {
                cashback: storeData.offers?.cashback,
                minOrderAmount: storeData.offers?.minOrderAmount,
                maxCashback: storeData.offers?.maxCashback,
                isPartner: storeData.offers?.isPartner || false,
                partnerLevel: storeData.offers?.partnerLevel
            },
            tags: storeData.tags || [],
            isActive: storeData.isActive !== undefined ? storeData.isActive : true,
            isFeatured: storeData.isFeatured || false,
            isVerified: merchant.verificationStatus === 'verified',
            ratings: {
                average: 0,
                count: 0,
                distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            },
            analytics: {
                totalOrders: 0,
                totalRevenue: 0,
                avgOrderValue: 0,
                repeatCustomers: 0
            },
            deliveryCategories: storeData.deliveryCategories || {
                fastDelivery: false,
                budgetFriendly: false,
                ninetyNineStore: false,
                premium: false,
                organic: false,
                alliance: false,
                lowestPrice: false,
                mall: false,
                cashStore: false
            }
        });
        await store.save();
        // Audit log
        await AuditService_1.default.log({
            merchantId: merchantId,
            action: 'store.created',
            resourceType: 'store',
            resourceId: store._id.toString(),
            details: {
                after: store.toObject(),
                metadata: { name: store.name, slug: store.slug }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'info'
        });
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${merchantId}`).emit('store_created', {
                storeId: store._id,
                storeName: store.name
            });
        }
        return res.status(201).json({
            success: true,
            message: 'Store created successfully',
            data: store
        });
    }
    catch (error) {
        console.error('Create store error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create store'
        });
    }
});
/**
 * @route   GET /api/merchant/stores
 * @desc    Get all stores for the merchant
 * @access  Private (Merchant)
 */
router.get('/', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        const { isActive, search } = req.query;
        // Build query
        const query = { merchantId: new mongoose_1.default.Types.ObjectId(merchantId) };
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'location.city': { $regex: search, $options: 'i' } }
            ];
        }
        const stores = await Store_1.Store.find(query)
            .populate('category', 'name slug')
            .sort({ createdAt: -1 })
            .lean();
        return res.json({
            success: true,
            message: 'Stores retrieved successfully',
            data: stores,
            count: stores.length
        });
    }
    catch (error) {
        console.error('Get stores error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve stores'
        });
    }
});
/**
 * @route   GET /api/merchant/stores/active
 * @desc    Get the currently active store
 * @access  Private (Merchant)
 */
router.get('/active', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Get the first active store (or first store if none active)
        let store = await Store_1.Store.findOne({
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId),
            isActive: true
        })
            .populate('category', 'name slug')
            .sort({ createdAt: 1 })
            .lean();
        // If no active store, get the first store
        if (!store) {
            store = await Store_1.Store.findOne({
                merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
            })
                .populate('category', 'name slug')
                .sort({ createdAt: 1 })
                .lean();
        }
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'No store found for this merchant'
            });
        }
        return res.json({
            success: true,
            message: 'Active store retrieved successfully',
            data: store
        });
    }
    catch (error) {
        console.error('Get active store error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve active store'
        });
    }
});
/**
 * @route   GET /api/merchant/stores/:id
 * @desc    Get store by ID
 * @access  Private (Merchant)
 */
router.get('/:id', (0, merchantvalidation_1.validateParams)(storeIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const storeId = req.params.id;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        })
            .populate('category', 'name slug')
            .lean();
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        return res.json({
            success: true,
            message: 'Store retrieved successfully',
            data: store
        });
    }
    catch (error) {
        console.error('Get store error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve store'
        });
    }
});
/**
 * @route   PUT /api/merchant/stores/:id
 * @desc    Update store
 * @access  Private (Merchant)
 */
router.put('/:id', (0, merchantvalidation_1.validateParams)(storeIdSchema), (0, merchantvalidation_1.validateRequest)(updateStoreSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const storeId = req.params.id;
        const updates = req.body;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Find store and verify ownership
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        // Store old values for audit
        const oldValues = store.toObject();
        // Update category if provided
        if (updates.category) {
            const category = await Category_1.Category.findById(updates.category);
            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Category not found'
                });
            }
            store.category = category._id;
        }
        // Update name and slug if name changed
        if (updates.name && updates.name !== store.name) {
            store.name = updates.name;
            store.slug = await generateSlug(updates.name);
        }
        // Handle banner separately using raw MongoDB update to bypass Mongoose casting
        // Mongoose's updateOne() still tries to cast Mixed types, so we use the raw collection
        if (updates.banner !== undefined) {
            // Use raw MongoDB collection to bypass Mongoose casting entirely
            if (!mongoose_1.default.connection.db) {
                throw new Error('Database connection not available');
            }
            const collection = mongoose_1.default.connection.db.collection('stores');
            const storeObjectId = typeof store._id === 'string'
                ? new mongoose_1.default.Types.ObjectId(store._id)
                : store._id;
            await collection.updateOne({ _id: storeObjectId }, { $set: { banner: updates.banner } });
            // Set the banner on the in-memory store object
            store.set('banner', updates.banner);
            store.markModified('banner');
        }
        // Update other fields
        if (updates.description !== undefined)
            store.description = updates.description;
        if (updates.logo !== undefined)
            store.logo = updates.logo;
        if (updates.location !== undefined) {
            store.location = {
                ...store.location,
                ...updates.location
            };
        }
        if (updates.contact !== undefined) {
            store.contact = {
                ...store.contact,
                ...updates.contact
            };
        }
        if (updates.operationalInfo !== undefined) {
            // Merge operationalInfo, but handle hours specially to merge individual days
            if (updates.operationalInfo.hours) {
                store.operationalInfo = {
                    ...store.operationalInfo,
                    ...updates.operationalInfo,
                    hours: {
                        ...store.operationalInfo.hours,
                        ...updates.operationalInfo.hours
                    }
                };
            }
            else {
                store.operationalInfo = {
                    ...store.operationalInfo,
                    ...updates.operationalInfo
                };
            }
        }
        if (updates.offers !== undefined) {
            store.offers = {
                ...store.offers,
                ...updates.offers
            };
        }
        if (updates.deliveryCategories !== undefined) {
            store.deliveryCategories = {
                ...store.deliveryCategories,
                ...updates.deliveryCategories
            };
        }
        if (updates.tags !== undefined)
            store.tags = updates.tags;
        if (updates.isActive !== undefined)
            store.isActive = updates.isActive;
        if (updates.isFeatured !== undefined)
            store.isFeatured = updates.isFeatured;
        // If banner was updated using raw MongoDB, we need to update other fields using raw MongoDB too
        // to prevent Mongoose from overwriting the banner with undefined
        if (updates.banner !== undefined && mongoose_1.default.connection.db) {
            // Banner was already updated in MongoDB using raw collection
            // Update other fields using raw MongoDB to avoid Mongoose casting issues
            const collection = mongoose_1.default.connection.db.collection('stores');
            const storeObjectId = typeof store._id === 'string'
                ? new mongoose_1.default.Types.ObjectId(store._id)
                : store._id;
            const fieldsToUpdate = {};
            // Build update object with all changed fields (excluding banner which was already updated)
            if (updates.name && store.name)
                fieldsToUpdate.name = store.name;
            if (updates.description !== undefined)
                fieldsToUpdate.description = store.description;
            if (updates.logo !== undefined)
                fieldsToUpdate.logo = store.logo;
            if (updates.location)
                fieldsToUpdate.location = store.location;
            if (updates.contact)
                fieldsToUpdate.contact = store.contact;
            if (updates.operationalInfo)
                fieldsToUpdate.operationalInfo = store.operationalInfo;
            if (updates.offers)
                fieldsToUpdate.offers = store.offers;
            if (updates.deliveryCategories)
                fieldsToUpdate.deliveryCategories = store.deliveryCategories;
            if (updates.tags !== undefined)
                fieldsToUpdate.tags = store.tags;
            if (updates.isActive !== undefined)
                fieldsToUpdate.isActive = store.isActive;
            if (updates.isFeatured !== undefined)
                fieldsToUpdate.isFeatured = store.isFeatured;
            if (store.category) {
                // Ensure category is an ObjectId
                fieldsToUpdate.category = store.category instanceof mongoose_1.default.Types.ObjectId
                    ? store.category
                    : new mongoose_1.default.Types.ObjectId(store.category);
            }
            if (store.slug)
                fieldsToUpdate.slug = store.slug;
            if (Object.keys(fieldsToUpdate).length > 0) {
                await collection.updateOne({ _id: storeObjectId }, { $set: fieldsToUpdate });
            }
        }
        else {
            // No banner update, safe to use normal save()
            await store.save();
        }
        // Reload store to get final state with populated category (for response)
        // If banner was updated, get it from raw MongoDB collection since Mongoose might not retrieve Mixed types correctly
        const finalStore = await Store_1.Store.findById(store._id).populate('category', 'name slug');
        // If banner was updated, get it from raw MongoDB to ensure it's correct
        if (updates.banner !== undefined && mongoose_1.default.connection.db && finalStore) {
            const collection = mongoose_1.default.connection.db.collection('stores');
            const storeObjectId = typeof store._id === 'string'
                ? new mongoose_1.default.Types.ObjectId(store._id)
                : store._id;
            const rawStore = await collection.findOne({ _id: storeObjectId }, { projection: { banner: 1 } });
            if (rawStore) {
                // Set the banner on the final store object
                finalStore.set('banner', rawStore.banner);
                finalStore.markModified('banner');
                Object.assign(store, finalStore.toObject());
            }
            else {
                if (finalStore) {
                    Object.assign(store, finalStore.toObject());
                }
            }
        }
        else if (finalStore) {
            Object.assign(store, finalStore.toObject());
        }
        // Audit log
        await AuditService_1.default.log({
            merchantId: merchantId,
            action: 'store.updated',
            resourceType: 'store',
            resourceId: store._id.toString(),
            details: {
                before: oldValues,
                after: store.toObject(),
                metadata: { name: store.name }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'info'
        });
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${merchantId}`).emit('store_updated', {
                storeId: store._id,
                storeName: store.name
            });
        }
        return res.json({
            success: true,
            message: 'Store updated successfully',
            data: store
        });
    }
    catch (error) {
        console.error('Update store error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update store'
        });
    }
});
/**
 * @route   DELETE /api/merchant/stores/:id
 * @desc    Delete or deactivate store
 * @access  Private (Merchant)
 */
router.delete('/:id', (0, merchantvalidation_1.validateParams)(storeIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const storeId = req.params.id;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Find store and verify ownership - use lean() to avoid validation on document creation
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        }).lean();
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        // Check if this is the only store
        const storeCount = await Store_1.Store.countDocuments({
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId),
            isActive: true
        });
        if (storeCount === 1 && store.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete the only active store. Please create another store first or deactivate it instead.'
            });
        }
        // Soft delete: deactivate instead of hard delete using updateOne to bypass validation
        // Use lean() to return plain object and avoid Mongoose model initialization validation
        const deactivatedStore = await Store_1.Store.findByIdAndUpdate(store._id, { isActive: false }, { new: true, runValidators: false }).lean();
        if (!deactivatedStore) {
            return res.status(404).json({
                success: false,
                message: 'Store not found after update'
            });
        }
        // Audit log
        await AuditService_1.default.log({
            merchantId: merchantId,
            action: 'store.deleted',
            resourceType: 'store',
            resourceId: deactivatedStore._id.toString(),
            details: {
                before: store,
                metadata: { name: deactivatedStore.name }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'warning'
        });
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${merchantId}`).emit('store_deleted', {
                storeId: deactivatedStore._id,
                storeName: deactivatedStore.name
            });
        }
        return res.json({
            success: true,
            message: 'Store deactivated successfully',
            data: deactivatedStore
        });
    }
    catch (error) {
        console.error('Delete store error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete store'
        });
    }
});
/**
 * @route   POST /api/merchant/stores/:id/activate
 * @desc    Set store as active
 * @access  Private (Merchant)
 */
router.post('/:id/activate', (0, merchantvalidation_1.validateParams)(storeIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const storeId = req.params.id;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Find store and verify ownership - use lean() to avoid validation on document creation
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        }).lean();
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        // Deactivate all other stores for this merchant
        await Store_1.Store.updateMany({
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId),
            _id: { $ne: storeId }
        }, { isActive: false });
        // Activate this store using updateOne to bypass full document validation
        // Use lean() to return plain object and avoid Mongoose model initialization validation
        const updatedStore = await Store_1.Store.findByIdAndUpdate(storeId, { isActive: true }, { new: true, runValidators: false }).lean();
        if (!updatedStore) {
            return res.status(404).json({
                success: false,
                message: 'Store not found after update'
            });
        }
        // Audit log
        await AuditService_1.default.log({
            merchantId: merchantId,
            action: 'store.activated',
            resourceType: 'store',
            resourceId: updatedStore._id.toString(),
            details: {
                after: updatedStore,
                metadata: { name: updatedStore.name }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'info'
        });
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${merchantId}`).emit('store_activated', {
                storeId: updatedStore._id,
                storeName: updatedStore.name
            });
        }
        return res.json({
            success: true,
            message: 'Store activated successfully',
            data: updatedStore
        });
    }
    catch (error) {
        console.error('Activate store error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to activate store'
        });
    }
});
/**
 * @route   GET /api/merchant/stores/:id/reviews
 * @desc    Get all reviews for a store
 * @access  Private (Merchant)
 */
router.get('/:id/reviews', (0, merchantvalidation_1.validateParams)(storeIdSchema), (0, merchantvalidation_1.validateQuery)(joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(50).default(20),
    rating: joi_1.default.number().integer().min(1).max(5).optional(),
    filter: joi_1.default.string().valid('all', 'with_images', 'verified', '5', '4', '3', '2', '1').optional(),
    sort: joi_1.default.string().valid('newest', 'oldest', 'rating_high', 'rating_low', 'helpful').default('newest'),
    moderationStatus: joi_1.default.string().valid('pending', 'approved', 'rejected').optional()
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const storeId = req.params.id;
        if (!merchantId) {
            return (0, response_1.sendBadRequest)(res, 'Merchant ID not found. Authentication required.');
        }
        // Verify store belongs to merchant
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Pagination
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');
        const skip = (page - 1) * limit;
        // Build query - merchants can see all reviews including pending
        const reviewQuery = {
            store: new mongoose_1.default.Types.ObjectId(storeId),
            isActive: true
        };
        // Add moderation status filter if provided
        const moderationFilter = req.query.moderationStatus;
        if (moderationFilter && ['pending', 'approved', 'rejected'].includes(moderationFilter)) {
            reviewQuery.moderationStatus = moderationFilter;
        }
        // Filter by rating if provided
        const rating = req.query.rating ? parseInt(req.query.rating) : null;
        if (rating) {
            reviewQuery.rating = rating;
        }
        // Apply filters
        const filter = req.query.filter;
        if (filter === 'with_images') {
            reviewQuery.images = { $exists: true, $ne: [] };
        }
        else if (filter === 'verified') {
            reviewQuery.verified = true;
        }
        else if (filter && !isNaN(parseInt(filter))) {
            reviewQuery.rating = parseInt(filter);
        }
        // Sorting
        const sort = req.query.sort || 'newest';
        let sortOptions = {};
        switch (sort) {
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            case 'rating_high':
                sortOptions = { rating: -1, createdAt: -1 };
                break;
            case 'rating_low':
                sortOptions = { rating: 1, createdAt: -1 };
                break;
            case 'helpful':
                sortOptions = { helpful: -1, createdAt: -1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }
        // Query reviews
        const [reviews, totalCount] = await Promise.all([
            Review_1.default.find(reviewQuery)
                .populate('user', 'profile.firstName profile.lastName profile.avatar')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(),
            Review_1.default.countDocuments(reviewQuery)
        ]);
        // Get review stats
        const stats = await Review_1.default.getStoreRatingStats(storeId);
        return (0, response_1.sendSuccess)(res, {
            reviews: reviews.map((review) => {
                // Combine firstName and lastName to create full name
                const firstName = review.user?.profile?.firstName || '';
                const lastName = review.user?.profile?.lastName || '';
                const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Anonymous';
                return {
                    id: review._id.toString(),
                    _id: review._id.toString(),
                    user: {
                        id: review.user?._id?.toString() || review.user?.id || '',
                        name: fullName,
                        avatar: review.user?.profile?.avatar || review.user?.avatar,
                    },
                    rating: review.rating,
                    title: review.title || '',
                    comment: review.comment || review.text || '',
                    helpful: review.helpful || 0,
                    createdAt: review.createdAt,
                    verified: review.verified || false,
                    images: review.images || [],
                    moderationStatus: review.moderationStatus || 'pending',
                    moderatedBy: review.moderatedBy?.toString(),
                    moderatedAt: review.moderatedAt,
                    moderationReason: review.moderationReason,
                    merchantResponse: review.merchantResponse ? {
                        message: review.merchantResponse.message,
                        respondedAt: review.merchantResponse.respondedAt,
                        respondedBy: review.merchantResponse.respondedBy?.toString() || '',
                    } : undefined,
                };
            }),
            stats: {
                averageRating: stats.average || 0,
                totalReviews: stats.count || 0,
                ratingBreakdown: {
                    5: stats.distribution?.[5] || 0,
                    4: stats.distribution?.[4] || 0,
                    3: stats.distribution?.[3] || 0,
                    2: stats.distribution?.[2] || 0,
                    1: stats.distribution?.[1] || 0,
                },
            },
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNext: page < Math.ceil(totalCount / limit),
                hasPrevious: page > 1
            }
        }, 'Store reviews retrieved successfully');
    }
    catch (error) {
        console.error('Get store reviews error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch store reviews'
        });
    }
});
/**
 * @route   GET /api/merchant/stores/:id/ugc
 * @desc    Get UGC content for a store
 * @access  Private (Merchant)
 */
router.get('/:id/ugc', (0, merchantvalidation_1.validateParams)(storeIdSchema), (0, merchantvalidation_1.validateQuery)(joi_1.default.object({
    type: joi_1.default.string().valid('photo', 'video').optional(),
    limit: joi_1.default.number().integer().min(1).max(50).default(20),
    offset: joi_1.default.number().integer().min(0).default(0)
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const storeId = req.params.id;
        if (!merchantId) {
            return (0, response_1.sendBadRequest)(res, 'Merchant ID not found. Authentication required.');
        }
        // Verify store belongs to merchant
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Check if storeId is a valid ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            return (0, response_1.sendSuccess)(res, {
                content: [],
                total: 0
            }, 'UGC content retrieved successfully');
        }
        const { type, limit = 20, offset = 0 } = req.query;
        // Build query
        const query = {
            isPublished: true,
            isApproved: true,
            moderationStatus: 'approved',
            stores: new mongoose_1.default.Types.ObjectId(storeId)
        };
        // Filter by type if specified
        if (type === 'video') {
            query.contentType = { $in: ['ugc', 'merchant'] };
        }
        const videos = await Video_1.Video.find(query)
            .populate('creator', 'profile.firstName profile.lastName profile.avatar')
            .sort({ createdAt: -1 })
            .skip(Number(offset))
            .limit(Number(limit))
            .lean();
        const total = await Video_1.Video.countDocuments(query);
        // Transform videos to match UGC API format
        const content = videos.map((video) => ({
            _id: video._id,
            id: video._id.toString(),
            userId: video.creator?._id || video.creator,
            user: {
                _id: video.creator?._id || video.creator,
                profile: video.creator?.profile || { firstName: '', lastName: '', avatar: '' }
            },
            type: 'video',
            url: video.videoUrl,
            thumbnail: video.thumbnail,
            caption: video.description,
            tags: video.tags || [],
            relatedProduct: video.products?.[0] || null,
            relatedStore: video.stores?.[0] ? {
                _id: video.stores[0],
                name: store.name,
                logo: store.logo
            } : null,
            likes: video.analytics?.likes || video.engagement?.likes?.length || 0,
            comments: video.analytics?.comments || video.engagement?.comments || 0,
            shares: video.analytics?.shares || video.engagement?.shares || 0,
            views: video.analytics?.totalViews || video.analytics?.views || video.engagement?.views || 0,
            isLiked: false,
            isBookmarked: false,
            createdAt: video.createdAt,
            updatedAt: video.updatedAt
        }));
        return (0, response_1.sendSuccess)(res, {
            content,
            total
        }, 'UGC content retrieved successfully');
    }
    catch (error) {
        console.error('Get store UGC error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch store UGC content'
        });
    }
});
/**
 * @route   POST /api/merchant/stores/:id/reviews/:reviewId/approve
 * @desc    Approve a review and reward user with 10 rezcoins
 * @access  Private (Merchant)
 */
router.post('/:id/reviews/:reviewId/approve', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required(),
    reviewId: joi_1.default.string().required()
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const storeId = req.params.id;
        const reviewId = req.params.reviewId;
        if (!merchantId) {
            return (0, response_1.sendBadRequest)(res, 'Merchant ID not found. Authentication required.');
        }
        // Verify store belongs to merchant
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Find the review
        const review = await Review_1.default.findOne({
            _id: reviewId,
            store: new mongoose_1.default.Types.ObjectId(storeId),
            isActive: true
        });
        if (!review) {
            return (0, response_1.sendNotFound)(res, 'Review not found');
        }
        // Check if already approved
        if (review.moderationStatus === 'approved') {
            return (0, response_1.sendBadRequest)(res, 'Review is already approved');
        }
        // Update review status
        review.moderationStatus = 'approved';
        review.moderatedBy = new mongoose_1.default.Types.ObjectId(merchantId);
        review.moderatedAt = new Date();
        review.verified = true; // Mark as verified when approved
        await review.save();
        // Update store rating statistics
        const ratingStats = await Review_1.default.getStoreRatingStats(storeId);
        await Store_1.Store.findByIdAndUpdate(storeId, {
            'ratings.average': ratingStats.average,
            'ratings.count': ratingStats.count,
            'ratings.distribution': ratingStats.distribution
        });
        // Reward user with 10 rezcoins
        try {
            // Get or create user wallet
            let wallet = await Wallet_1.Wallet.findOne({ user: review.user });
            if (!wallet) {
                wallet = await Wallet_1.Wallet.createForUser(review.user);
            }
            if (wallet) {
                const balanceBefore = wallet.balance.total;
                const rewardAmount = 10;
                // Add funds to wallet
                await wallet.addFunds(rewardAmount, 'reward');
                // Create transaction record
                const transaction = new Transaction_1.Transaction({
                    user: review.user,
                    type: 'credit',
                    category: 'reward',
                    amount: rewardAmount,
                    currency: wallet.currency,
                    description: 'Review approval reward - 10 rezcoins',
                    source: {
                        type: 'review_reward',
                        reference: new mongoose_1.default.Types.ObjectId(reviewId),
                        description: `Review approved for ${store.name}`,
                        metadata: {
                            reviewId: reviewId,
                            storeId: storeId,
                            storeName: store.name,
                            rewardType: 'review_approval'
                        }
                    },
                    balanceBefore: balanceBefore,
                    balanceAfter: balanceBefore + rewardAmount,
                    status: {
                        current: 'completed',
                        history: [{
                                status: 'completed',
                                timestamp: new Date()
                            }]
                    }
                });
                await transaction.save();
            }
        }
        catch (walletError) {
            console.error('Error rewarding user for review approval:', walletError);
            // Don't fail the approval if wallet operation fails, but log it
        }
        // Audit log
        await AuditService_1.default.log({
            merchantId: merchantId,
            action: 'review.approved',
            resourceType: 'review',
            resourceId: reviewId,
            details: {
                after: review.toObject(),
                metadata: {
                    storeId: storeId,
                    storeName: store.name,
                    reviewRating: review.rating
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'info'
        });
        return (0, response_1.sendSuccess)(res, {
            review: {
                id: review._id.toString(),
                moderationStatus: review.moderationStatus,
                moderatedAt: review.moderatedAt
            }
        }, 'Review approved successfully. User has been rewarded with 10 rezcoins.');
    }
    catch (error) {
        console.error('Approve review error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to approve review'
        });
    }
});
/**
 * @route   POST /api/merchant/stores/:id/reviews/:reviewId/reject
 * @desc    Reject a review
 * @access  Private (Merchant)
 */
router.post('/:id/reviews/:reviewId/reject', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required(),
    reviewId: joi_1.default.string().required()
})), (0, merchantvalidation_1.validateRequest)(joi_1.default.object({
    reason: joi_1.default.string().max(500).optional()
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const storeId = req.params.id;
        const reviewId = req.params.reviewId;
        const { reason } = req.body;
        if (!merchantId) {
            return (0, response_1.sendBadRequest)(res, 'Merchant ID not found. Authentication required.');
        }
        // Verify store belongs to merchant
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Find the review
        const review = await Review_1.default.findOne({
            _id: reviewId,
            store: new mongoose_1.default.Types.ObjectId(storeId),
            isActive: true
        });
        if (!review) {
            return (0, response_1.sendNotFound)(res, 'Review not found');
        }
        // Check if already rejected
        if (review.moderationStatus === 'rejected') {
            return (0, response_1.sendBadRequest)(res, 'Review is already rejected');
        }
        // Update review status
        review.moderationStatus = 'rejected';
        review.moderatedBy = new mongoose_1.default.Types.ObjectId(merchantId);
        review.moderatedAt = new Date();
        review.moderationReason = reason || 'Review does not meet our guidelines';
        await review.save();
        // Update store rating statistics (remove this review from stats)
        const ratingStats = await Review_1.default.getStoreRatingStats(storeId);
        await Store_1.Store.findByIdAndUpdate(storeId, {
            'ratings.average': ratingStats.average,
            'ratings.count': ratingStats.count,
            'ratings.distribution': ratingStats.distribution
        });
        // Audit log
        await AuditService_1.default.log({
            merchantId: merchantId,
            action: 'review.rejected',
            resourceType: 'review',
            resourceId: reviewId,
            details: {
                after: review.toObject(),
                metadata: {
                    storeId: storeId,
                    storeName: store.name,
                    reviewRating: review.rating,
                    rejectionReason: reason
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'warning'
        });
        return (0, response_1.sendSuccess)(res, {
            review: {
                id: review._id.toString(),
                moderationStatus: review.moderationStatus,
                moderatedAt: review.moderatedAt,
                moderationReason: review.moderationReason
            }
        }, 'Review rejected successfully');
    }
    catch (error) {
        console.error('Reject review error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to reject review'
        });
    }
});
exports.default = router;
