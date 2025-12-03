"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkImportService = exports.BulkImportService = void 0;
const csv_parser_1 = __importDefault(require("csv-parser"));
const XLSX = __importStar(require("xlsx"));
const fs_1 = __importDefault(require("fs"));
const Product_1 = require("../models/Product");
const Category_1 = require("../models/Category");
const mongoose_1 = require("mongoose");
class BulkImportService {
    constructor() {
        this.batchSize = 50; // Process 50 rows at a time
    }
    /**
     * Parse CSV file
     */
    async parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            fs_1.default.createReadStream(filePath)
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));
        });
    }
    /**
     * Parse Excel file
     */
    async parseExcel(filePath) {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0]; // Read first sheet
            const worksheet = workbook.Sheets[sheetName];
            // Convert to JSON
            const data = XLSX.utils.sheet_to_json(worksheet, {
                raw: false, // Return formatted strings
                defval: '' // Default value for empty cells
            });
            return data;
        }
        catch (error) {
            throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Parse file based on extension
     */
    async parseFile(filePath, fileType) {
        if (fileType === 'csv' || filePath.endsWith('.csv')) {
            return this.parseCSV(filePath);
        }
        else if (fileType === 'excel' || filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
            return this.parseExcel(filePath);
        }
        else {
            throw new Error('Unsupported file type. Only CSV and Excel files are supported.');
        }
    }
    /**
     * Validate single product row
     */
    async validateProductRow(row, rowNumber, storeId, merchantId) {
        const errors = [];
        const warnings = [];
        // Required fields validation
        if (!row.name || row.name.trim() === '') {
            errors.push('Product name is required');
        }
        if (!row.description || row.description.trim() === '') {
            errors.push('Product description is required');
        }
        if (!row.category || row.category.trim() === '') {
            errors.push('Category is required');
        }
        // Price validation
        const price = parseFloat(row.price);
        if (isNaN(price) || price < 0) {
            errors.push('Invalid price. Must be a positive number');
        }
        // Stock validation
        const stock = parseInt(row.stock);
        if (isNaN(stock) || stock < 0) {
            errors.push('Invalid stock. Must be a non-negative integer');
        }
        // SKU validation (optional, auto-generate if not provided)
        if (!row.sku || row.sku.trim() === '') {
            warnings.push('SKU not provided. Will auto-generate');
        }
        else {
            // Check if SKU already exists
            const existingProduct = await Product_1.Product.findOne({ sku: row.sku.toUpperCase() });
            if (existingProduct && existingProduct.store.toString() !== storeId) {
                errors.push(`SKU ${row.sku} already exists in another store`);
            }
        }
        // Category validation
        let categoryId = null;
        let subCategoryId = null;
        if (row.category) {
            // Check if it's an ObjectId or category name
            if (mongoose_1.Types.ObjectId.isValid(row.category)) {
                const category = await Category_1.Category.findById(row.category);
                if (!category) {
                    errors.push(`Category with ID ${row.category} not found`);
                }
                else {
                    categoryId = category._id.toString();
                }
            }
            else {
                // Search by name
                const category = await Category_1.Category.findOne({
                    name: new RegExp(`^${row.category}$`, 'i')
                });
                if (!category) {
                    errors.push(`Category '${row.category}' not found`);
                }
                else {
                    categoryId = category._id.toString();
                }
            }
        }
        // Subcategory validation
        if (row.subcategory && categoryId) {
            if (mongoose_1.Types.ObjectId.isValid(row.subcategory)) {
                const subCategory = await Category_1.Category.findById(row.subcategory);
                if (!subCategory) {
                    warnings.push(`Subcategory with ID ${row.subcategory} not found. Will be ignored`);
                }
                else {
                    subCategoryId = subCategory._id.toString();
                }
            }
            else {
                // Search by name
                const subCategory = await Category_1.Category.findOne({
                    name: new RegExp(`^${row.subcategory}$`, 'i'),
                    parentCategory: categoryId
                });
                if (!subCategory) {
                    warnings.push(`Subcategory '${row.subcategory}' not found. Will be ignored`);
                }
                else {
                    subCategoryId = subCategory._id.toString();
                }
            }
        }
        // Image validation
        if (row.images) {
            const imageUrls = row.images.split(',').map((url) => url.trim());
            const validUrls = imageUrls.filter((url) => {
                try {
                    new URL(url);
                    return true;
                }
                catch {
                    return false;
                }
            });
            if (validUrls.length === 0) {
                warnings.push('No valid image URLs provided');
            }
        }
        return {
            rowNumber,
            status: errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'success'),
            data: {
                ...row,
                categoryId,
                subCategoryId,
                price: parseFloat(row.price) || 0,
                stock: parseInt(row.stock) || 0,
                costPrice: parseFloat(row.costPrice) || undefined,
                compareAtPrice: parseFloat(row.compareAtPrice) || undefined,
                lowStockThreshold: parseInt(row.lowStockThreshold) || 5,
                weight: parseFloat(row.weight) || undefined,
                isFeatured: row.isFeatured === 'true' || row.isFeatured === '1' || row.isFeatured === 'yes'
            },
            errors,
            warnings
        };
    }
    /**
     * Create or update product from validated row
     */
    async processProductRow(validatedRow, storeId, merchantId) {
        try {
            const data = validatedRow.data;
            // Generate SKU if not provided
            const sku = data.sku?.toUpperCase() || this.generateSKU(data.name);
            // Check if product exists (update scenario)
            let existingProduct = await Product_1.Product.findOne({ sku, store: storeId });
            // Parse images
            const images = data.images
                ? data.images.split(',').map((url) => url.trim()).filter((url) => {
                    try {
                        new URL(url);
                        return true;
                    }
                    catch {
                        return false;
                    }
                })
                : [];
            // Parse tags
            const tags = data.tags
                ? data.tags.split(',').map((tag) => tag.trim().toLowerCase())
                : [];
            // Product data structure
            const productData = {
                name: data.name.trim(),
                description: data.description?.trim(),
                shortDescription: data.shortDescription?.trim(),
                sku,
                category: new mongoose_1.Types.ObjectId(data.categoryId),
                subCategory: data.subCategoryId ? new mongoose_1.Types.ObjectId(data.subCategoryId) : undefined,
                store: new mongoose_1.Types.ObjectId(storeId),
                merchantId: new mongoose_1.Types.ObjectId(merchantId),
                brand: data.brand?.trim(),
                barcode: data.barcode?.trim(),
                images: images.length > 0 ? images : ['https://via.placeholder.com/400'],
                pricing: {
                    original: data.compareAtPrice || data.price,
                    selling: data.price,
                    discount: data.compareAtPrice
                        ? Math.round(((data.compareAtPrice - data.price) / data.compareAtPrice) * 100)
                        : 0,
                    currency: 'INR'
                },
                inventory: {
                    stock: data.stock,
                    isAvailable: data.stock > 0,
                    lowStockThreshold: data.lowStockThreshold || 5,
                    unlimited: false
                },
                tags,
                weight: data.weight,
                isActive: data.status === 'active' || !data.status,
                isFeatured: data.isFeatured || false,
                isDigital: false,
                ratings: {
                    average: 0,
                    count: 0,
                    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                },
                analytics: {
                    views: 0,
                    purchases: 0,
                    conversions: 0,
                    wishlistAdds: 0,
                    shareCount: 0,
                    returnRate: 0,
                    avgRating: 0,
                    todayPurchases: 0,
                    todayViews: 0,
                    lastResetDate: new Date()
                },
                seo: {
                    title: data.name,
                    description: data.shortDescription || data.description,
                    keywords: tags
                },
                specifications: []
            };
            let product;
            let action = 'created';
            if (existingProduct) {
                // Update existing product
                Object.assign(existingProduct, productData);
                product = await existingProduct.save();
                action = 'updated';
            }
            else {
                // Create new product
                product = new Product_1.Product(productData);
                await product.save();
            }
            return {
                ...validatedRow,
                status: 'success',
                productId: product._id.toString(),
                action
            };
        }
        catch (error) {
            return {
                ...validatedRow,
                status: 'error',
                errors: [...validatedRow.errors, `Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`]
            };
        }
    }
    /**
     * Generate SKU from product name
     */
    generateSKU(name) {
        const timestamp = Date.now().toString().slice(-6);
        const namePrefix = name
            .substring(0, 4)
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
        return `${namePrefix || 'PROD'}-${timestamp}`;
    }
    /**
     * Process bulk import
     */
    async processBulkImport(filePath, fileType, storeId, merchantId) {
        const startTime = new Date();
        try {
            // Parse file
            const rows = await this.parseFile(filePath, fileType);
            if (rows.length === 0) {
                throw new Error('File is empty or contains no valid data');
            }
            if (rows.length > 1000) {
                throw new Error('File contains too many rows. Maximum 1000 rows allowed per import');
            }
            const result = {
                total: rows.length,
                successful: 0,
                failed: 0,
                warnings: 0,
                rows: [],
                startTime
            };
            // Process in batches
            for (let i = 0; i < rows.length; i += this.batchSize) {
                const batch = rows.slice(i, i + this.batchSize);
                // Validate batch
                const validatedBatch = await Promise.all(batch.map((row, index) => this.validateProductRow(row, i + index + 1, storeId, merchantId)));
                // Process valid rows
                const processedBatch = await Promise.all(validatedBatch.map(row => row.status === 'error'
                    ? Promise.resolve(row)
                    : this.processProductRow(row, storeId, merchantId)));
                // Update result
                processedBatch.forEach(row => {
                    result.rows.push(row);
                    if (row.status === 'success') {
                        result.successful++;
                    }
                    else if (row.status === 'error') {
                        result.failed++;
                    }
                    else if (row.status === 'warning') {
                        result.warnings++;
                    }
                });
            }
            result.endTime = new Date();
            result.duration = result.endTime.getTime() - startTime.getTime();
            return result;
        }
        catch (error) {
            throw new Error(`Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate CSV template
     */
    generateCSVTemplate() {
        const headers = [
            'name',
            'description',
            'shortDescription',
            'sku',
            'price',
            'costPrice',
            'compareAtPrice',
            'category',
            'subcategory',
            'stock',
            'lowStockThreshold',
            'brand',
            'tags',
            'status',
            'images',
            'barcode',
            'weight',
            'isFeatured'
        ];
        const sampleRow = [
            'Sample Product Name',
            'Detailed description of the product',
            'Short description',
            'PROD-001',
            '999',
            '800',
            '1299',
            'Electronics',
            'Mobile Phones',
            '100',
            '5',
            'Samsung',
            'smartphone,5g,android',
            'active',
            'https://example.com/image1.jpg,https://example.com/image2.jpg',
            '1234567890123',
            '200',
            'false'
        ];
        return headers.join(',') + '\n' + sampleRow.join(',');
    }
    /**
     * Get import instructions
     */
    getImportInstructions() {
        return {
            title: 'Product Import Instructions',
            fileFormats: ['CSV', 'Excel (.xlsx, .xls)'],
            maxRows: 1000,
            requiredColumns: [
                { name: 'name', description: 'Product name (required, max 200 characters)' },
                { name: 'description', description: 'Product description (required, max 2000 characters)' },
                { name: 'price', description: 'Selling price (required, must be positive number)' },
                { name: 'category', description: 'Category name or ID (required)' },
                { name: 'stock', description: 'Stock quantity (required, non-negative integer)' }
            ],
            optionalColumns: [
                { name: 'shortDescription', description: 'Short description (max 300 characters)' },
                { name: 'sku', description: 'Stock Keeping Unit (auto-generated if not provided)' },
                { name: 'costPrice', description: 'Cost price for profit calculation' },
                { name: 'compareAtPrice', description: 'Original price (for discount display)' },
                { name: 'subcategory', description: 'Subcategory name or ID' },
                { name: 'lowStockThreshold', description: 'Low stock alert threshold (default: 5)' },
                { name: 'brand', description: 'Product brand name' },
                { name: 'tags', description: 'Comma-separated tags (e.g., "tag1,tag2,tag3")' },
                { name: 'status', description: 'Product status: "active", "draft", or "inactive" (default: active)' },
                { name: 'images', description: 'Comma-separated image URLs' },
                { name: 'barcode', description: 'Product barcode' },
                { name: 'weight', description: 'Product weight in grams' },
                { name: 'isFeatured', description: 'Featured product flag: "true" or "false"' }
            ],
            notes: [
                'Maximum 1000 products per import',
                'SKU will be auto-generated if not provided',
                'Products with matching SKU will be updated',
                'Invalid rows will be reported with specific errors',
                'Category and subcategory can be name or ID',
                'All prices should be in INR',
                'Image URLs must be valid HTTP/HTTPS URLs'
            ]
        };
    }
}
exports.BulkImportService = BulkImportService;
exports.bulkImportService = new BulkImportService();
