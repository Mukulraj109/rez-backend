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
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const productIdSchema = joi_1.default.object({
    id: joi_1.default.string().required()
});
const variantIdSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    variantId: joi_1.default.string().required()
});
const createVariantSchema = joi_1.default.object({
    type: joi_1.default.string().required().min(2).max(50),
    value: joi_1.default.string().required().min(1).max(50),
    attributes: joi_1.default.object().pattern(joi_1.default.string(), joi_1.default.string()),
    price: joi_1.default.number().min(0),
    compareAtPrice: joi_1.default.number().min(0),
    stock: joi_1.default.number().required().min(0),
    sku: joi_1.default.string().max(50),
    images: joi_1.default.array().items(joi_1.default.string()),
    barcode: joi_1.default.string().max(50),
    weight: joi_1.default.number().min(0),
    isAvailable: joi_1.default.boolean().default(true)
});
const updateVariantSchema = createVariantSchema.fork(['type', 'value', 'stock'], (schema) => schema.optional());
// Helper function to generate variant SKU
const generateVariantSKU = (productSKU, attributes, type, value) => {
    if (attributes && attributes.size > 0) {
        const attrString = Array.from(attributes.entries())
            .map(([k, v]) => `${v}`)
            .join('-');
        return `${productSKU}-${attrString}`.toUpperCase();
    }
    return `${productSKU}-${type}-${value}`.toUpperCase().replace(/\s+/g, '-');
};
// @route   GET /api/merchant/products/:id/variants
// @desc    Get all variants for a product
// @access  Private
router.get('/:id/variants', (0, merchantvalidation_1.validateParams)(productIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const productId = req.params.id;
        // Verify product belongs to merchant's store
        const store = await Store_1.Store.findOne({ merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        const product = await Product_1.Product.findOne({
            _id: productId,
            store: store._id
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        const variants = product.inventory.variants || [];
        return res.json({
            success: true,
            data: {
                productId: product._id,
                productName: product.name,
                variants,
                totalVariants: variants.length
            }
        });
    }
    catch (error) {
        console.error('Get variants error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch variants',
            error: error.message
        });
    }
});
// @route   POST /api/merchant/products/:id/variants
// @desc    Add a new variant to a product
// @access  Private
router.post('/:id/variants', (0, merchantvalidation_1.validateParams)(productIdSchema), (0, merchantvalidation_1.validateRequest)(createVariantSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const productId = req.params.id;
        const variantData = req.body;
        // Verify product belongs to merchant's store
        const store = await Store_1.Store.findOne({ merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        const product = await Product_1.Product.findOne({
            _id: productId,
            store: store._id
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Generate variant ID
        const variantId = (0, uuid_1.v4)();
        // Generate variant SKU if not provided
        const variantSKU = variantData.sku || generateVariantSKU(product.sku, variantData.attributes, variantData.type, variantData.value);
        // Check if variant SKU already exists
        const existingVariant = product.inventory.variants?.find((v) => v.sku === variantSKU);
        if (existingVariant) {
            return res.status(400).json({
                success: false,
                message: 'Variant with this SKU already exists'
            });
        }
        // Create new variant
        const newVariant = {
            variantId,
            type: variantData.type,
            value: variantData.value,
            attributes: variantData.attributes,
            price: variantData.price,
            compareAtPrice: variantData.compareAtPrice,
            stock: variantData.stock,
            sku: variantSKU,
            images: variantData.images || [],
            barcode: variantData.barcode,
            weight: variantData.weight,
            isAvailable: variantData.isAvailable !== false && variantData.stock > 0
        };
        // Add variant to product
        if (!product.inventory.variants) {
            product.inventory.variants = [];
        }
        product.inventory.variants.push(newVariant);
        // Update product
        await product.save();
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${merchantId}`).emit('variant_created', {
                productId: product._id,
                variantId,
                timestamp: new Date()
            });
        }
        return res.status(201).json({
            success: true,
            message: 'Variant created successfully',
            data: {
                variant: newVariant
            }
        });
    }
    catch (error) {
        console.error('Create variant error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create variant',
            error: error.message
        });
    }
});
// @route   PUT /api/merchant/products/:id/variants/:variantId
// @desc    Update a variant
// @access  Private
router.put('/:id/variants/:variantId', (0, merchantvalidation_1.validateParams)(variantIdSchema), (0, merchantvalidation_1.validateRequest)(updateVariantSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { id: productId, variantId } = req.params;
        const variantData = req.body;
        // Verify product belongs to merchant's store
        const store = await Store_1.Store.findOne({ merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        const product = await Product_1.Product.findOne({
            _id: productId,
            store: store._id
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Find variant
        const variantIndex = product.inventory.variants?.findIndex((v) => v.variantId === variantId);
        if (variantIndex === -1 || variantIndex === undefined) {
            return res.status(404).json({
                success: false,
                message: 'Variant not found'
            });
        }
        // Update variant
        const variant = product.inventory.variants[variantIndex];
        if (variantData.type)
            variant.type = variantData.type;
        if (variantData.value)
            variant.value = variantData.value;
        if (variantData.attributes)
            variant.attributes = variantData.attributes;
        if (variantData.price !== undefined)
            variant.price = variantData.price;
        if (variantData.compareAtPrice !== undefined)
            variant.compareAtPrice = variantData.compareAtPrice;
        if (variantData.stock !== undefined) {
            variant.stock = variantData.stock;
            variant.isAvailable = variantData.stock > 0;
        }
        if (variantData.images)
            variant.images = variantData.images;
        if (variantData.barcode)
            variant.barcode = variantData.barcode;
        if (variantData.weight !== undefined)
            variant.weight = variantData.weight;
        if (variantData.isAvailable !== undefined)
            variant.isAvailable = variantData.isAvailable;
        // Update SKU if type or value changed
        if (variantData.type || variantData.value) {
            variant.sku = generateVariantSKU(product.sku, variant.attributes, variant.type, variant.value);
        }
        // Save product
        await product.save();
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${merchantId}`).emit('variant_updated', {
                productId: product._id,
                variantId,
                timestamp: new Date()
            });
        }
        return res.json({
            success: true,
            message: 'Variant updated successfully',
            data: {
                variant
            }
        });
    }
    catch (error) {
        console.error('Update variant error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update variant',
            error: error.message
        });
    }
});
// @route   DELETE /api/merchant/products/:id/variants/:variantId
// @desc    Delete a variant
// @access  Private
router.delete('/:id/variants/:variantId', (0, merchantvalidation_1.validateParams)(variantIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { id: productId, variantId } = req.params;
        // Verify product belongs to merchant's store
        const store = await Store_1.Store.findOne({ merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        const product = await Product_1.Product.findOne({
            _id: productId,
            store: store._id
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Find and remove variant
        const variantIndex = product.inventory.variants?.findIndex((v) => v.variantId === variantId);
        if (variantIndex === -1 || variantIndex === undefined) {
            return res.status(404).json({
                success: false,
                message: 'Variant not found'
            });
        }
        const deletedVariant = product.inventory.variants[variantIndex];
        product.inventory.variants.splice(variantIndex, 1);
        // Save product
        await product.save();
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${merchantId}`).emit('variant_deleted', {
                productId: product._id,
                variantId,
                timestamp: new Date()
            });
        }
        return res.json({
            success: true,
            message: 'Variant deleted successfully',
            data: {
                deletedVariant
            }
        });
    }
    catch (error) {
        console.error('Delete variant error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete variant',
            error: error.message
        });
    }
});
// @route   GET /api/merchant/products/:id/variants/:variantId
// @desc    Get a specific variant
// @access  Private
router.get('/:id/variants/:variantId', (0, merchantvalidation_1.validateParams)(variantIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { id: productId, variantId } = req.params;
        // Verify product belongs to merchant's store
        const store = await Store_1.Store.findOne({ merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        const product = await Product_1.Product.findOne({
            _id: productId,
            store: store._id
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Find variant
        const variant = product.inventory.variants?.find((v) => v.variantId === variantId);
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: 'Variant not found'
            });
        }
        return res.json({
            success: true,
            data: {
                productId: product._id,
                productName: product.name,
                productSKU: product.sku,
                variant,
                inventory: {
                    totalStock: product.inventory.stock,
                    variantStock: variant.stock
                },
                pricing: {
                    basePrice: product.pricing.selling,
                    variantPrice: variant.price || product.pricing.selling
                }
            }
        });
    }
    catch (error) {
        console.error('Get variant error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch variant',
            error: error.message
        });
    }
});
// @route   POST /api/merchant/products/:id/variants/generate
// @desc    Generate all possible variant combinations from attributes
// @access  Private
const generateVariantsSchema = joi_1.default.object({
    attributes: joi_1.default.array().items(joi_1.default.object({
        type: joi_1.default.string().required().min(2).max(50),
        values: joi_1.default.array().items(joi_1.default.string().min(1).max(50)).required().min(1)
    })).required().min(1).max(5)
});
router.post('/:id/variants/generate', (0, merchantvalidation_1.validateParams)(productIdSchema), (0, merchantvalidation_1.validateRequest)(generateVariantsSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const productId = req.params.id;
        const { attributes } = req.body;
        // Verify product belongs to merchant's store
        const store = await Store_1.Store.findOne({ merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        const product = await Product_1.Product.findOne({
            _id: productId,
            store: store._id
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Generate all combinations using Cartesian product
        const generateCombinations = (attrs) => {
            if (attrs.length === 0)
                return [[]];
            const [first, ...rest] = attrs;
            const restCombinations = generateCombinations(rest);
            const combinations = [];
            for (const value of first.values) {
                for (const combo of restCombinations) {
                    combinations.push([
                        { type: first.type, value },
                        ...combo
                    ]);
                }
            }
            return combinations;
        };
        const combinations = generateCombinations(attributes);
        const generatedVariants = [];
        // Create variant objects for each combination
        for (const combo of combinations) {
            const variantId = (0, uuid_1.v4)();
            // Build attributes map
            const attributesMap = {};
            combo.forEach((attr) => {
                attributesMap[attr.type.toLowerCase()] = attr.value;
            });
            // Generate descriptive variant name and SKU
            const variantName = combo.map((attr) => attr.value).join(' / ');
            const variantSKU = generateVariantSKU(product.sku, new Map(Object.entries(attributesMap)), combo[0]?.type || 'variant', combo[0]?.value || 'default');
            generatedVariants.push({
                variantId,
                type: combo[0]?.type || 'variant',
                value: variantName,
                attributes: attributesMap,
                price: product.pricing.selling, // Default to base price
                compareAtPrice: product.pricing.original,
                stock: 0, // Merchant needs to set stock
                sku: variantSKU,
                images: [], // No images by default
                isAvailable: false // Not available until stock is set
            });
        }
        // Return generated variants without saving (merchant can review first)
        return res.status(200).json({
            success: true,
            message: `Generated ${generatedVariants.length} variant combinations`,
            data: {
                productId: product._id,
                productName: product.name,
                productSKU: product.sku,
                basePrice: product.pricing.selling,
                generatedVariants,
                totalCombinations: generatedVariants.length,
                attributes: attributes.map((attr) => ({
                    type: attr.type,
                    valueCount: attr.values.length
                }))
            }
        });
    }
    catch (error) {
        console.error('Generate variants error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate variants',
            error: error.message
        });
    }
});
exports.default = router;
