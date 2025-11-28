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
const stream_1 = require("stream");
const csv_parser_1 = __importDefault(require("csv-parser"));
const csv_writer_1 = require("csv-writer");
const XLSX = __importStar(require("xlsx"));
const MerchantProduct_1 = require("../models/MerchantProduct");
const Product_1 = require("../models/Product");
const Store_1 = require("../models/Store");
const Category_1 = require("../models/Category");
const mongoose_1 = __importDefault(require("mongoose"));
class BulkProductService {
    // Validate product data
    validateProductRow(row, rowNumber) {
        const errors = [];
        // Required fields validation
        if (!row.name || row.name.trim().length < 2) {
            errors.push({
                row: rowNumber,
                field: 'name',
                message: 'Name is required and must be at least 2 characters',
                value: row.name
            });
        }
        if (!row.description || row.description.trim().length < 10) {
            errors.push({
                row: rowNumber,
                field: 'description',
                message: 'Description is required and must be at least 10 characters',
                value: row.description
            });
        }
        if (!row.price || isNaN(Number(row.price)) || Number(row.price) < 0) {
            errors.push({
                row: rowNumber,
                field: 'price',
                message: 'Price is required and must be a positive number',
                value: row.price
            });
        }
        if (!row.category || row.category.trim().length === 0) {
            errors.push({
                row: rowNumber,
                field: 'category',
                message: 'Category is required',
                value: row.category
            });
        }
        if (row.stock === undefined || isNaN(Number(row.stock)) || Number(row.stock) < 0) {
            errors.push({
                row: rowNumber,
                field: 'stock',
                message: 'Stock is required and must be a non-negative number',
                value: row.stock
            });
        }
        // Optional field validation
        if (row.compareAtPrice && (isNaN(Number(row.compareAtPrice)) || Number(row.compareAtPrice) < 0)) {
            errors.push({
                row: rowNumber,
                field: 'compareAtPrice',
                message: 'Compare at price must be a positive number',
                value: row.compareAtPrice
            });
        }
        if (row.weight && (isNaN(Number(row.weight)) || Number(row.weight) < 0)) {
            errors.push({
                row: rowNumber,
                field: 'weight',
                message: 'Weight must be a positive number',
                value: row.weight
            });
        }
        if (row.lowStockThreshold && (isNaN(Number(row.lowStockThreshold)) || Number(row.lowStockThreshold) < 0)) {
            errors.push({
                row: rowNumber,
                field: 'lowStockThreshold',
                message: 'Low stock threshold must be a non-negative number',
                value: row.lowStockThreshold
            });
        }
        if (row.status && !['active', 'inactive', 'draft', 'archived'].includes(row.status)) {
            errors.push({
                row: rowNumber,
                field: 'status',
                message: 'Status must be one of: active, inactive, draft, archived',
                value: row.status
            });
        }
        if (row.visibility && !['public', 'hidden', 'featured'].includes(row.visibility)) {
            errors.push({
                row: rowNumber,
                field: 'visibility',
                message: 'Visibility must be one of: public, hidden, featured',
                value: row.visibility
            });
        }
        if (row.cashbackPercentage && (isNaN(Number(row.cashbackPercentage)) || Number(row.cashbackPercentage) < 0 || Number(row.cashbackPercentage) > 100)) {
            errors.push({
                row: rowNumber,
                field: 'cashbackPercentage',
                message: 'Cashback percentage must be between 0 and 100',
                value: row.cashbackPercentage
            });
        }
        return errors;
    }
    // Generate unique SKU
    async generateSKU(merchantId, productName) {
        const prefix = productName.substring(0, 3).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        let sku = `${prefix}${timestamp}`;
        let counter = 1;
        while (await MerchantProduct_1.MProduct.findOne({ sku })) {
            sku = `${prefix}${timestamp}${counter}`;
            counter++;
        }
        return sku;
    }
    // Parse CSV file
    async parseCSV(fileBuffer) {
        return new Promise((resolve, reject) => {
            const products = [];
            const stream = stream_1.Readable.from(fileBuffer.toString());
            stream
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => {
                products.push(data);
            })
                .on('end', () => {
                resolve(products);
            })
                .on('error', (error) => {
                reject(error);
            });
        });
    }
    // Parse Excel file
    async parseExcel(fileBuffer) {
        try {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const products = XLSX.utils.sheet_to_json(worksheet);
            return products;
        }
        catch (error) {
            throw new Error(`Failed to parse Excel file: ${error}`);
        }
    }
    // Validate import data
    async validateImport(products, merchantId) {
        const errors = [];
        const skus = new Set();
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const rowNumber = i + 2; // +2 because row 1 is header and array is 0-indexed
            // Validate product fields
            const validationErrors = this.validateProductRow(product, rowNumber);
            errors.push(...validationErrors);
            // Check for duplicate SKUs within the file
            if (product.sku) {
                if (skus.has(product.sku.toUpperCase())) {
                    errors.push({
                        row: rowNumber,
                        field: 'sku',
                        message: 'Duplicate SKU found in import file',
                        value: product.sku
                    });
                }
                else {
                    skus.add(product.sku.toUpperCase());
                }
                // Check if SKU already exists in database
                const existingProduct = await MerchantProduct_1.MProduct.findOne({
                    sku: product.sku.toUpperCase(),
                    merchantId
                });
                if (existingProduct) {
                    errors.push({
                        row: rowNumber,
                        field: 'sku',
                        message: 'SKU already exists in your products',
                        value: product.sku
                    });
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    // Import products from CSV/Excel
    async importProducts(products, merchantId, validateOnly = false) {
        const errors = [];
        let successCount = 0;
        let errorCount = 0;
        const createdProducts = [];
        // Validate all rows first
        const validation = await this.validateImport(products, merchantId);
        if (!validation.isValid) {
            return {
                success: false,
                totalRows: products.length,
                successCount: 0,
                errorCount: products.length,
                errors: validation.errors
            };
        }
        // If validation only, return success
        if (validateOnly) {
            return {
                success: true,
                totalRows: products.length,
                successCount: products.length,
                errorCount: 0,
                errors: []
            };
        }
        // Use MongoDB session for transaction
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            // Find the store for this merchant
            const store = await Store_1.Store.findOne({ merchantId }).session(session);
            if (!store) {
                throw new Error('Store not found for merchant');
            }
            // Process products in batches for better performance
            const batchSize = 100;
            for (let i = 0; i < products.length; i += batchSize) {
                const batch = products.slice(i, i + batchSize);
                for (let j = 0; j < batch.length; j++) {
                    const productRow = batch[j];
                    const rowNumber = i + j + 2;
                    try {
                        // Generate SKU if not provided
                        const sku = productRow.sku
                            ? productRow.sku.toUpperCase()
                            : await this.generateSKU(merchantId, productRow.name);
                        // Parse tags
                        const tags = productRow.tags
                            ? productRow.tags.split(',').map(tag => tag.trim())
                            : [];
                        // Create product data
                        const productData = {
                            merchantId,
                            name: productRow.name.trim(),
                            description: productRow.description.trim(),
                            shortDescription: productRow.shortDescription?.trim(),
                            sku,
                            barcode: productRow.barcode?.trim(),
                            category: productRow.category.trim(),
                            subcategory: productRow.subcategory?.trim(),
                            brand: productRow.brand?.trim(),
                            price: Number(productRow.price),
                            compareAtPrice: productRow.compareAtPrice ? Number(productRow.compareAtPrice) : undefined,
                            costPrice: productRow.compareAtPrice ? Number(productRow.compareAtPrice) * 0.7 : Number(productRow.price) * 0.7,
                            currency: 'INR',
                            inventory: {
                                stock: Number(productRow.stock),
                                lowStockThreshold: productRow.lowStockThreshold ? Number(productRow.lowStockThreshold) : 5,
                                trackInventory: true,
                                allowBackorders: false
                            },
                            images: productRow.imageUrl ? [{
                                    url: productRow.imageUrl,
                                    isMain: true,
                                    sortOrder: 0
                                }] : [],
                            weight: productRow.weight ? Number(productRow.weight) : undefined,
                            tags,
                            status: productRow.status || 'draft',
                            visibility: productRow.visibility || 'public',
                            cashback: {
                                percentage: productRow.cashbackPercentage ? Number(productRow.cashbackPercentage) : 5,
                                isActive: true
                            }
                        };
                        // Create merchant product
                        const merchantProduct = new MerchantProduct_1.MProduct(productData);
                        await merchantProduct.save({ session });
                        // Create user-side product
                        await this.createUserSideProduct(merchantProduct, merchantId, store._id, session);
                        createdProducts.push(merchantProduct);
                        successCount++;
                    }
                    catch (error) {
                        errorCount++;
                        errors.push({
                            row: rowNumber,
                            field: 'general',
                            message: error.message || 'Failed to create product',
                            value: productRow.name
                        });
                    }
                }
            }
            // Commit transaction if no errors
            if (errorCount === 0) {
                await session.commitTransaction();
            }
            else {
                await session.abortTransaction();
                // If there were errors, return them but don't create any products
                successCount = 0;
                createdProducts.length = 0;
            }
            return {
                success: errorCount === 0,
                totalRows: products.length,
                successCount,
                errorCount,
                errors,
                products: createdProducts
            };
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    // Create user-side product
    async createUserSideProduct(merchantProduct, merchantId, storeId, session) {
        try {
            // Find or create category
            let category = await Category_1.Category.findOne({ name: merchantProduct.category }).session(session);
            if (!category) {
                const newCategory = await Category_1.Category.create([{
                        name: merchantProduct.category,
                        slug: merchantProduct.category.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
                        type: 'product',
                        isActive: true
                    }], { session });
                category = newCategory[0];
            }
            // Create unique slug
            let productSlug = merchantProduct.name
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '-')
                .trim();
            let counter = 1;
            while (await Product_1.Product.findOne({ slug: productSlug }).session(session)) {
                productSlug = `${merchantProduct.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}-${counter}`;
                counter++;
            }
            // Create user product
            const userProduct = new Product_1.Product({
                name: merchantProduct.name,
                slug: productSlug,
                description: merchantProduct.description,
                shortDescription: merchantProduct.shortDescription,
                category: category._id,
                store: storeId,
                brand: merchantProduct.brand,
                sku: merchantProduct.sku,
                barcode: merchantProduct.barcode,
                images: merchantProduct.images?.map((img) => img.url) || [],
                pricing: {
                    original: merchantProduct.compareAtPrice || merchantProduct.price,
                    selling: merchantProduct.price,
                    currency: merchantProduct.currency || 'INR',
                    discount: merchantProduct.compareAtPrice
                        ? Math.round(((merchantProduct.compareAtPrice - merchantProduct.price) / merchantProduct.compareAtPrice) * 100)
                        : 0
                },
                inventory: {
                    stock: merchantProduct.inventory.stock,
                    isAvailable: merchantProduct.inventory.stock > 0,
                    lowStockThreshold: merchantProduct.inventory.lowStockThreshold || 5,
                    unlimited: false
                },
                ratings: {
                    average: 0,
                    count: 0,
                    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                },
                specifications: [],
                tags: merchantProduct.tags || [],
                seo: {
                    title: merchantProduct.name,
                    description: merchantProduct.shortDescription || merchantProduct.description,
                    keywords: []
                },
                analytics: {
                    views: 0,
                    purchases: 0,
                    conversions: 0,
                    wishlistAdds: 0,
                    shareCount: 0,
                    returnRate: 0,
                    avgRating: 0
                },
                cashback: {
                    percentage: merchantProduct.cashback?.percentage || 5,
                    isActive: merchantProduct.cashback?.isActive || true
                },
                isActive: merchantProduct.status === 'active',
                isFeatured: merchantProduct.visibility === 'featured',
                isDigital: false,
                weight: merchantProduct.weight,
                productType: 'product'
            });
            await userProduct.save({ session });
        }
        catch (error) {
            console.error('Error creating user-side product:', error);
            throw error;
        }
    }
    // Export products to CSV
    async exportToCSV(merchantId, filePath) {
        try {
            const products = await MerchantProduct_1.MProduct.find({ merchantId })
                .select('name description shortDescription price compareAtPrice category subcategory brand sku barcode inventory weight tags status visibility cashback')
                .lean();
            const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
                path: filePath,
                header: [
                    { id: 'name', title: 'name' },
                    { id: 'description', title: 'description' },
                    { id: 'shortDescription', title: 'shortDescription' },
                    { id: 'price', title: 'price' },
                    { id: 'compareAtPrice', title: 'compareAtPrice' },
                    { id: 'category', title: 'category' },
                    { id: 'subcategory', title: 'subcategory' },
                    { id: 'brand', title: 'brand' },
                    { id: 'sku', title: 'sku' },
                    { id: 'barcode', title: 'barcode' },
                    { id: 'stock', title: 'stock' },
                    { id: 'lowStockThreshold', title: 'lowStockThreshold' },
                    { id: 'weight', title: 'weight' },
                    { id: 'tags', title: 'tags' },
                    { id: 'status', title: 'status' },
                    { id: 'visibility', title: 'visibility' },
                    { id: 'cashbackPercentage', title: 'cashbackPercentage' }
                ]
            });
            const records = products.map(product => ({
                name: product.name,
                description: product.description,
                shortDescription: product.shortDescription || '',
                price: product.price,
                compareAtPrice: product.compareAtPrice || '',
                category: product.category,
                subcategory: product.subcategory || '',
                brand: product.brand || '',
                sku: product.sku,
                barcode: product.barcode || '',
                stock: product.inventory?.stock || 0,
                lowStockThreshold: product.inventory?.lowStockThreshold || 5,
                weight: product.weight || '',
                tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
                status: product.status,
                visibility: product.visibility,
                cashbackPercentage: product.cashback?.percentage || 5
            }));
            await csvWriter.writeRecords(records);
        }
        catch (error) {
            throw new Error(`Failed to export CSV: ${error}`);
        }
    }
    // Export products to Excel
    async exportToExcel(merchantId, filePath) {
        try {
            const products = await MerchantProduct_1.MProduct.find({ merchantId })
                .select('name description shortDescription price compareAtPrice category subcategory brand sku barcode inventory weight tags status visibility cashback')
                .lean();
            const records = products.map(product => ({
                name: product.name,
                description: product.description,
                shortDescription: product.shortDescription || '',
                price: product.price,
                compareAtPrice: product.compareAtPrice || '',
                category: product.category,
                subcategory: product.subcategory || '',
                brand: product.brand || '',
                sku: product.sku,
                barcode: product.barcode || '',
                stock: product.inventory?.stock || 0,
                lowStockThreshold: product.inventory?.lowStockThreshold || 5,
                weight: product.weight || '',
                tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
                status: product.status,
                visibility: product.visibility,
                cashbackPercentage: product.cashback?.percentage || 5
            }));
            const worksheet = XLSX.utils.json_to_sheet(records);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
            XLSX.writeFile(workbook, filePath);
        }
        catch (error) {
            throw new Error(`Failed to export Excel: ${error}`);
        }
    }
    // Get template data
    getTemplateHeaders() {
        return [
            'name',
            'description',
            'shortDescription',
            'price',
            'compareAtPrice',
            'category',
            'subcategory',
            'brand',
            'sku',
            'barcode',
            'stock',
            'lowStockThreshold',
            'weight',
            'tags',
            'status',
            'visibility',
            'cashbackPercentage',
            'imageUrl'
        ];
    }
}
exports.default = new BulkProductService();
