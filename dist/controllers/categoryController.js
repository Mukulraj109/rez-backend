"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeaturedCategories = exports.getRootCategories = exports.getCategoriesWithCounts = exports.getCategoryBySlug = exports.getCategoryTree = exports.getCategories = void 0;
const Category_1 = require("../models/Category");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
// Get all categories with optional filtering
exports.getCategories = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type, featured, parent } = req.query;
    try {
        const query = { isActive: true };
        if (type)
            query.type = type;
        if (featured !== undefined)
            query['metadata.featured'] = featured === 'true';
        if (parent === 'null' || parent === 'root') {
            query.parentCategory = null;
        }
        else if (parent) {
            query.parentCategory = parent;
        }
        const categories = await Category_1.Category.find(query)
            .populate('parentCategory', 'name slug')
            .populate('childCategories', 'name slug image')
            .sort({ sortOrder: 1, name: 1 })
            .lean();
        (0, response_1.sendSuccess)(res, categories, 'Categories retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch categories', 500);
    }
});
// Get category tree structure
exports.getCategoryTree = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type } = req.query;
    try {
        // Get root categories first
        const query = { parentCategory: null, isActive: true };
        if (type)
            query.type = type;
        const rootCategories = await Category_1.Category.find(query)
            .populate('childCategories', 'name slug image sortOrder')
            .sort({ sortOrder: 1, name: 1 })
            .lean();
        (0, response_1.sendSuccess)(res, rootCategories, 'Category tree retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch category tree', 500);
    }
});
// Get single category by slug
exports.getCategoryBySlug = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { slug } = req.params;
    try {
        const category = await Category_1.Category.findOne({
            slug,
            isActive: true
        })
            .populate('parentCategory', 'name slug')
            .populate('childCategories', 'name slug image sortOrder')
            .lean();
        if (!category) {
            return (0, response_1.sendNotFound)(res, 'Category not found');
        }
        (0, response_1.sendSuccess)(res, category, 'Category retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch category', 500);
    }
});
// Get categories with product/store counts
exports.getCategoriesWithCounts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type = 'general' } = req.query;
    try {
        const query = { isActive: true };
        if (type)
            query.type = type;
        const categories = await Category_1.Category.find(query)
            .sort({ sortOrder: 1, name: 1 })
            .lean();
        (0, response_1.sendSuccess)(res, categories, 'Categories with counts retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch categories with counts', 500);
    }
});
// Get root categories (no parent)
exports.getRootCategories = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type } = req.query;
    try {
        const query = { parentCategory: null, isActive: true };
        if (type)
            query.type = type;
        const rootCategories = await Category_1.Category.find(query)
            .sort({ sortOrder: 1, name: 1 })
            .lean();
        (0, response_1.sendSuccess)(res, rootCategories, 'Root categories retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch root categories', 500);
    }
});
// Get featured categories
exports.getFeaturedCategories = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type, limit = 6 } = req.query;
    try {
        const query = {
            isActive: true,
            'metadata.featured': true
        };
        if (type)
            query.type = type;
        const categories = await Category_1.Category.find(query)
            .sort({ sortOrder: 1, name: 1 })
            .limit(Number(limit))
            .lean();
        (0, response_1.sendSuccess)(res, categories, 'Featured categories retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch featured categories', 500);
    }
});
