import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { validateRequest, validateQuery, validateParams } from '../middleware/merchantvalidation';
// Using unified Product model instead of MProduct for real-time sync with user app
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { Review } from '../models/Review';
import Joi from 'joi';
import mongoose from 'mongoose';
import SMSService from '../services/SMSService';
import { Merchant } from '../models/Merchant';
import AuditService from '../services/AuditService';
import CloudinaryService from '../services/CloudinaryService';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const createProductSchema = Joi.object({
  name: Joi.string().required().min(2).max(200),
  description: Joi.string().required().min(10),
  shortDescription: Joi.string().max(300),
  sku: Joi.string().optional(),
  barcode: Joi.string().optional(),
  category: Joi.string().required(),
  subcategory: Joi.string().optional(),
  brand: Joi.string().optional(),
  storeId: Joi.string().optional(), // Store assignment for multi-store support
  price: Joi.number().required().min(0),
  costPrice: Joi.number().min(0),
  compareAtPrice: Joi.number().min(0),
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR').default('USD'),
  inventory: Joi.object({
    stock: Joi.number().required().min(0),
    lowStockThreshold: Joi.number().min(0).default(5),
    trackInventory: Joi.boolean().default(true),
    allowBackorders: Joi.boolean().default(false)
  }).required(),
  images: Joi.array().items(Joi.object({
    url: Joi.string().required(),
    thumbnailUrl: Joi.string(),
    altText: Joi.string(),
    sortOrder: Joi.number().default(0),
    isMain: Joi.boolean().default(false)
  })),
  weight: Joi.number().min(0),
  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    height: Joi.number().min(0),
    unit: Joi.string().valid('cm', 'inch').default('cm')
  }),
  tags: Joi.array().items(Joi.string()),
  metaTitle: Joi.string().max(60),
  metaDescription: Joi.string().max(160),
  searchKeywords: Joi.array().items(Joi.string()),
  status: Joi.string().valid('active', 'inactive', 'draft', 'archived').default('draft'),
  visibility: Joi.string().valid('public', 'hidden', 'featured').default('public'),
  cashback: Joi.object({
    percentage: Joi.number().min(0).max(100).default(0),
    maxAmount: Joi.number().min(0),
    isActive: Joi.boolean().default(true)
  }).required()
});

const updateProductSchema = createProductSchema.fork(
  ['name', 'description', 'price', 'inventory', 'category', 'cashback'],  // Fixed: Made category and cashback optional for updates
  (schema) => schema.optional()
);

const searchProductsSchema = Joi.object({
  query: Joi.string(),
  category: Joi.string(),
  status: Joi.string().valid('active', 'inactive', 'draft', 'archived'),
  visibility: Joi.string().valid('public', 'hidden', 'featured'),
  stockLevel: Joi.string().valid('all', 'in_stock', 'low_stock', 'out_of_stock'),
  storeId: Joi.string().optional(), // Filter by store
  sortBy: Joi.string().valid('name', 'price', 'stock', 'created', 'updated').default('created'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20)
});

const productIdSchema = Joi.object({
  id: Joi.string().required()
});

// Generate unique SKU
const generateSKU = async (merchantId: string, productName: string): Promise<string> => {
  const prefix = productName.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  let sku = `${prefix}${timestamp}`;

  // Ensure uniqueness
  let counter = 1;
  while (await Product.findOne({ sku })) {
    sku = `${prefix}${timestamp}${counter}`;
    counter++;
  }

  return sku;
};

// @route   GET /api/products
// @desc    Get merchant products with search and filtering
// @access  Private
router.get('/', validateQuery(searchProductsSchema), async (req, res) => {
  try {
   const {
  query,
  category,
  status,
  visibility,
  stockLevel,
  storeId,
  sortBy,
  sortOrder,
  page,
  limit
} = (req as any).validatedQuery;


    // Build search criteria - Products are linked to stores, not directly to merchants
    console.log('🔍 [PRODUCTS] Query params:', { storeId, category, status, visibility, page, limit });
    console.log('🔍 [PRODUCTS] Merchant ID:', req.merchantId);
    
    // First, find all stores belonging to this merchant
    const merchantStores = await Store.find({ merchantId: req.merchantId }).select('_id');
    const storeIds = merchantStores.map(store => store._id);
    
    console.log('🔍 [PRODUCTS] Found', storeIds.length, 'stores for merchant');
    
    // If no stores found, return empty
    if (storeIds.length === 0) {
      console.log('⚠️ [PRODUCTS] No stores found for merchant, returning empty');
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
    
    const searchCriteria: any = { store: { $in: storeIds } };

    if (category) searchCriteria.category = category;
    if (status) searchCriteria.status = status;
    if (visibility) searchCriteria.visibility = visibility;
    if (storeId) {
      console.log('🔍 [PRODUCTS] Filtering by specific store:', storeId);
      
      // Validate store belongs to merchant
      const store = await Store.findOne({
        _id: storeId,
        merchantId: req.merchantId
      });
      
      console.log('🔍 [PRODUCTS] Store validation:', store ? `Found: ${store.name}` : 'NOT FOUND');
      
      if (!store) {
        console.log('❌ [PRODUCTS] Store does not belong to merchant');
        return res.status(403).json({
          success: false,
          message: 'Store does not belong to this merchant'
        });
      }
      
      // Override to query only this specific store
      searchCriteria.store = storeId;
      console.log('🔍 [PRODUCTS] Search criteria updated to specific store');
    }
    
    console.log('🔍 [PRODUCTS] Final search criteria:', JSON.stringify(searchCriteria));

    // Text search
    if (query) {
      searchCriteria.$text = { $search: query };
    }

    // Stock level filtering
    if (stockLevel && stockLevel !== 'all') {
      switch (stockLevel) {
        case 'in_stock':
          searchCriteria['inventory.stock'] = { $gt: 0 };
          break;
        case 'low_stock':
          searchCriteria.$expr = {
            $lte: ['$inventory.stock', '$inventory.lowStockThreshold']
          };
          break;
        case 'out_of_stock':
          searchCriteria['inventory.stock'] = 0;
          break;
      }
    }

    // Build sort criteria
    const sortCriteria: any = {};
    switch (sortBy) {
      case 'name':
        sortCriteria.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'price':
        sortCriteria.price = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'stock':
        sortCriteria['inventory.stock'] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'updated':
        sortCriteria.updatedAt = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'created':
      default:
        sortCriteria.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    console.log('🔍 [PRODUCTS] Executing query...');
    const [products, totalCount] = await Promise.all([
      Product.find(searchCriteria)
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(searchCriteria)
    ]);

    console.log('✅ [PRODUCTS] Query complete:', totalCount, 'products found');
    console.log('📦 [PRODUCTS] Returning', products.length, 'products for this page');

    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return res.json({
      success: true,
      data: {
        products,
        pagination: {
          totalCount,
          page,
          limit,
          totalPages,
          hasNext,
          hasPrevious
        }
      }
    });
  } catch (error: any) {
    console.error('Get products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});
// @route   GET /api/products/categories
// @desc    Get all available product categories from Category model
// @access  Private
router.get('/categories', async (req, res) => {
  try {
    // Fetch all active categories from Category model
    const categories = await Category.find({ isActive: true })
      .select('name slug _id')
      .sort({ name: 1 })
      .lean();

    // Get merchant stores for querying products
    const merchantStores = await Store.find({ merchantId: req.merchantId }).select('_id');
    const storeIds = merchantStores.map(store => store._id);

    // Also get categories that are already used in products (for backward compatibility)
    const usedCategories = storeIds.length > 0 
      ? await Product.distinct('category', { 
          $or: [
            { merchantId: req.merchantId },
            { store: { $in: storeIds } }
          ]
        })
      : [];

    // Combine and format response
    const categoryList = categories.map((cat: any) => ({
      label: cat.name,
      value: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
      id: cat._id ? cat._id.toString() : ''
    }));

    // Add any used categories that might not be in the Category model (for backward compatibility)
    const usedCategoryIds = new Set(categories.map((c: any) => c._id ? c._id.toString() : ''));
    for (const usedCatId of usedCategories) {
      if (usedCatId && !usedCategoryIds.has(usedCatId.toString())) {
        // This category is used but not in Category model - try to find it
        const cat = await Category.findById(usedCatId);
        if (cat) {
          categoryList.push({
            label: cat.name,
            value: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
            id: cat._id ? cat._id.toString() : ''
          });
        }
      }
    }

    return res.json({
      success: true,
      data: { categories: categoryList }
    });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});
// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private
router.get('/:id', validateParams(productIdSchema), async (req, res) => {
  try {
    const productId = req.params.id;
    const merchantId = req.merchantId;
    
    console.log('🔍 [GET PRODUCT] Request received:');
    console.log('   Product ID:', productId);
    console.log('   Merchant ID:', merchantId);
    console.log('   Merchant ID type:', typeof merchantId);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.log('❌ [GET PRODUCT] Invalid product ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    // Convert to ObjectId for proper comparison
    const productObjectId = new mongoose.Types.ObjectId(productId);
    const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
    
    // First check if product exists at all
    const productExists = await Product.findById(productObjectId);
    console.log('   Product exists:', !!productExists);
    if (productExists) {
      console.log('   Product merchantId:', productExists.merchantId?.toString());
      console.log('   Request merchantId:', merchantObjectId.toString());
      console.log('   MerchantId match:', productExists.merchantId?.toString() === merchantObjectId.toString());
    }
    
    const product = await Product.findOne({
      _id: productObjectId,
      merchantId: merchantObjectId
    })
    .populate('category', 'name') // Populate category with name
    .populate('store', 'name logo'); // Populate store with name and logo

    if (!product) {
      console.log('❌ [GET PRODUCT] Product not found with merchantId filter');
      
      // Check if product exists but belongs to different merchant
      const productWithDifferentMerchant = await Product.findById(productObjectId);
      if (productWithDifferentMerchant) {
        console.log('   Product exists but belongs to different merchant:', productWithDifferentMerchant.merchantId?.toString());
      }
      
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log('✅ [GET PRODUCT] Product found:', product.name);
    console.log('✅ [GET PRODUCT] Category:', product.category);
    return res.json({
      success: true,
      data: product
    });
  } catch (error: any) {
    console.error('❌ [GET PRODUCT] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private
router.post('/', validateRequest(createProductSchema), async (req, res) => {
  try {
    const productData = req.body;
    productData.merchantId = req.merchantId;

    // Log images for debugging
    console.log('📸 Received images:', JSON.stringify(productData.images, null, 2));

    // Handle storeId assignment
    if (productData.storeId) {
      // Validate that the store belongs to this merchant
      const store = await Store.findOne({
        _id: productData.storeId,
        merchantId: req.merchantId
      });
      
      if (!store) {
        return res.status(400).json({
          success: false,
          message: 'Store not found or does not belong to this merchant'
        });
      }
      
      // Convert to ObjectId
      productData.storeId = new mongoose.Types.ObjectId(productData.storeId);
    } else {
      // If no storeId provided, use merchant's active store (backward compatibility)
      const activeStore = await Store.findOne({
        merchantId: req.merchantId,
        isActive: true
      }).sort({ createdAt: 1 }); // Get first store if multiple active
      
      if (activeStore) {
        productData.storeId = activeStore._id;
      } else {
        // Fallback: get any store for this merchant
        const anyStore = await Store.findOne({ merchantId: req.merchantId }).sort({ createdAt: 1 });
        if (anyStore) {
          productData.storeId = anyStore._id;
        }
      }
    }

    // Handle category conversion if provided (can be string name/slug or ObjectId)
    if (productData.category) {
      if (typeof productData.category === 'string' && !mongoose.Types.ObjectId.isValid(productData.category)) {
        // Category is a string name/slug, need to find the ObjectId
        const category = await Category.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${productData.category}$`, 'i') } },
            { slug: productData.category.toLowerCase() }
          ],
          isActive: true
        });
        
        if (!category) {
          console.log('❌ [CREATE PRODUCT] Category not found:', productData.category);
          return res.status(400).json({
            success: false,
            message: `Category "${productData.category}" not found. Please use a valid category name or ID.`
          });
        }
        
        productData.category = category._id;
        console.log('✅ [CREATE PRODUCT] Category converted to ObjectId:', category.name, category._id);
      } else if (mongoose.Types.ObjectId.isValid(productData.category)) {
        // Already a valid ObjectId, convert to ObjectId type
        productData.category = new mongoose.Types.ObjectId(productData.category);
      }
    }

    // Handle subcategory conversion if provided (can be string name/slug or ObjectId)
    if (productData.subcategory || productData.subCategory) {
      const subcategoryValue = productData.subcategory || productData.subCategory;
      
      if (typeof subcategoryValue === 'string' && !mongoose.Types.ObjectId.isValid(subcategoryValue)) {
        // Subcategory is a string name/slug, need to find the ObjectId
        const subcategory = await Category.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${subcategoryValue}$`, 'i') } },
            { slug: subcategoryValue.toLowerCase() }
          ],
          isActive: true
        });
        
        if (!subcategory) {
          console.log('❌ [CREATE PRODUCT] Subcategory not found:', subcategoryValue);
          return res.status(400).json({
            success: false,
            message: `Subcategory "${subcategoryValue}" not found. Please use a valid subcategory name or ID.`
          });
        }
        
        productData.subCategory = subcategory._id;
        delete productData.subcategory; // Remove lowercase version if it exists
        console.log('✅ [CREATE PRODUCT] Subcategory converted to ObjectId:', subcategory.name, subcategory._id);
      } else if (mongoose.Types.ObjectId.isValid(subcategoryValue)) {
        // Already a valid ObjectId, convert to ObjectId type and use subCategory (camelCase)
        productData.subCategory = new mongoose.Types.ObjectId(subcategoryValue);
        delete productData.subcategory; // Remove lowercase version if it exists
      }
    }

    // Convert storeId to store (Product model uses 'store' not 'storeId')
    if (productData.storeId) {
      productData.store = productData.storeId;
      delete productData.storeId;
    }

    // Generate SKU if not provided
    if (!productData.sku) {
      productData.sku = await generateSKU(req.merchantId!, productData.name);
    } else {
      // Check if SKU already exists
      const existingProduct = await Product.findOne({ sku: productData.sku });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }
    }

    // Transform images from objects to array of URLs (Product model expects string[])
    if (productData.images && productData.images.length > 0) {
      const imageUrls = productData.images
        .map((img: any) => {
          if (typeof img === 'string') {
            return img;
          } else if (img && img.url) {
            return img.url;
          }
          return null;
        })
        .filter((url: string | null) => url !== null && url.trim() !== '');
      
      productData.images = imageUrls;
      console.log('📸 [CREATE PRODUCT] Transformed images to URLs:', imageUrls);
    }

    // Transform pricing from flat structure to nested structure
    // Frontend sends: price, costPrice, compareAtPrice
    // Product model expects: pricing.selling, pricing.original, pricing.cost
    if (productData.price !== undefined) {
      productData.pricing = {
        selling: Number(productData.price),
        original: Number(productData.compareAtPrice || productData.price),
        cost: productData.costPrice ? Number(productData.costPrice) : undefined,
        currency: productData.currency || 'INR',
        discount: productData.compareAtPrice && productData.price
          ? Math.round(((Number(productData.compareAtPrice) - Number(productData.price)) / Number(productData.compareAtPrice)) * 100)
          : 0,
        bulk: []
      };
      
      // Remove old pricing fields
      delete productData.price;
      delete productData.costPrice;
      delete productData.compareAtPrice;
      delete productData.currency; // Already moved to pricing.currency
      
      console.log('💰 [CREATE PRODUCT] Transformed pricing:', productData.pricing);
    }

    // Generate slug from product name if not provided
    if (!productData.slug && productData.name) {
      const baseSlug = productData.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Make slug unique by checking existing slugs and appending number if needed
      let slug = baseSlug;
      let counter = 1;
      let existingProduct = await Product.findOne({ slug });
      
      while (existingProduct) {
        slug = `${baseSlug}-${counter}`;
        existingProduct = await Product.findOne({ slug });
        counter++;
      }
      
      // Add timestamp to ensure uniqueness
      const timestamp = Date.now().toString().slice(-6);
      productData.slug = `${slug}-${timestamp}`;
      
      console.log('🔗 [CREATE PRODUCT] Generated slug:', productData.slug);
    }

    // Set productType if not provided
    if (!productData.productType) {
      productData.productType = 'product';
    }

    // Ensure inventory structure is correct
    if (productData.inventory) {
      if (productData.inventory.stock === undefined || productData.inventory.stock === null) {
        productData.inventory.stock = 0;
      }
      if (productData.inventory.isAvailable === undefined) {
        productData.inventory.isAvailable = productData.inventory.stock > 0;
      }
      if (productData.inventory.lowStockThreshold === undefined) {
        productData.inventory.lowStockThreshold = 5;
      }
    }

    const product = new Product(productData);
    await product.save();

    // Log saved product images for debugging
    console.log('💾 Saved merchant product images:', JSON.stringify(product.images, null, 2));
    console.log('✅ Merchant product created with ID:', product._id);

    // Automatically create product on user side (sync to user Product model)
    try {
      await createUserSideProduct(product, req.merchantId!);
      console.log('✅ Product successfully synced to user-side');
    } catch (syncError: any) {
      // Log error but don't fail the merchant product creation
      console.error('⚠️ Warning: Failed to sync product to user-side:', syncError.message);
      console.error('   Product was still created in merchant database');
      // Continue - merchant product creation should succeed even if sync fails
    }

    // Audit log: Product created
    await AuditService.log({
      merchantId: req.merchantId!,
      action: 'product.created',
      resourceType: 'product',
      resourceId: product._id,
      details: {
        after: product.toObject(),
        metadata: { name: product.name, sku: product.sku }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${req.merchantId}`).emit('product_created', {
        productId: product._id,
        productName: product.name
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product.toObject ? product.toObject() : product
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put('/:id',
  validateParams(productIdSchema),
  validateRequest(updateProductSchema),
  async (req, res) => {
    try {
      const productId = req.params.id;
      const merchantId = req.merchantId;
      const productData = req.body;

      console.log('✏️ [UPDATE PRODUCT] Request received:');
      console.log('   Product ID:', productId);
      console.log('   Merchant ID:', merchantId);
      
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        console.log('❌ [UPDATE PRODUCT] Invalid product ID format');
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }
      
      // Convert to ObjectId for proper comparison
      const productObjectId = new mongoose.Types.ObjectId(productId);
      const merchantObjectId = new mongoose.Types.ObjectId(merchantId);

      // Find product
      const product = await Product.findOne({
        _id: productObjectId,
        merchantId: merchantObjectId
      });

      if (!product) {
        console.log('❌ [UPDATE PRODUCT] Product not found');
        
        // Check if product exists but belongs to different merchant
        const productExists = await Product.findById(productObjectId);
        if (productExists) {
          console.log('   Product exists but belongs to different merchant:', productExists.merchantId?.toString());
        } else {
          console.log('   Product does not exist at all');
        }
        
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      console.log('✅ [UPDATE PRODUCT] Product found:', product.name);

      // Handle store update if provided (can be storeId or store)
      const storeId = productData.store || productData.storeId;
      if (storeId) {
        // Validate that the store belongs to this merchant
        const store = await Store.findOne({
          _id: storeId,
          merchantId: merchantObjectId
        });
        
        if (!store) {
          console.log('❌ [UPDATE PRODUCT] Store not found or does not belong to merchant');
          return res.status(400).json({
            success: false,
            message: 'Store not found or does not belong to this merchant'
          });
        }
        
        // Convert to ObjectId and set as store (not storeId)
        productData.store = new mongoose.Types.ObjectId(storeId);
        delete productData.storeId; // Remove storeId if it exists
        console.log('✅ [UPDATE PRODUCT] Store validated:', store.name);
      }

      // Handle category conversion if provided (can be string name/slug or ObjectId)
      if (productData.category) {
        if (typeof productData.category === 'string' && !mongoose.Types.ObjectId.isValid(productData.category)) {
          // Category is a string name/slug, need to find the ObjectId
          const category = await Category.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${productData.category}$`, 'i') } },
              { slug: productData.category.toLowerCase() }
            ],
            isActive: true
          });
          
          if (!category) {
            console.log('❌ [UPDATE PRODUCT] Category not found:', productData.category);
            return res.status(400).json({
              success: false,
              message: `Category "${productData.category}" not found. Please use a valid category name or ID.`
            });
          }
          
          productData.category = category._id;
          console.log('✅ [UPDATE PRODUCT] Category converted to ObjectId:', category.name, category._id);
        } else if (mongoose.Types.ObjectId.isValid(productData.category)) {
          // Already a valid ObjectId, convert to ObjectId type
          productData.category = new mongoose.Types.ObjectId(productData.category);
        }
      }

      // Handle subcategory conversion if provided (can be string name/slug or ObjectId)
      if (productData.subcategory || productData.subCategory) {
        const subcategoryValue = productData.subcategory || productData.subCategory;
        
        if (typeof subcategoryValue === 'string' && !mongoose.Types.ObjectId.isValid(subcategoryValue)) {
          // Subcategory is a string name/slug, need to find the ObjectId
          const subcategory = await Category.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${subcategoryValue}$`, 'i') } },
              { slug: subcategoryValue.toLowerCase() }
            ],
            isActive: true
          });
          
          if (!subcategory) {
            console.log('❌ [UPDATE PRODUCT] Subcategory not found:', subcategoryValue);
            return res.status(400).json({
              success: false,
              message: `Subcategory "${subcategoryValue}" not found. Please use a valid subcategory name or ID.`
            });
          }
          
          productData.subCategory = subcategory._id;
          delete productData.subcategory; // Remove lowercase version if it exists
          console.log('✅ [UPDATE PRODUCT] Subcategory converted to ObjectId:', subcategory.name, subcategory._id);
        } else if (mongoose.Types.ObjectId.isValid(subcategoryValue)) {
          // Already a valid ObjectId, convert to ObjectId type and use subCategory (camelCase)
          productData.subCategory = new mongoose.Types.ObjectId(subcategoryValue);
          delete productData.subcategory; // Remove lowercase version if it exists
        }
      }

      // Check SKU uniqueness if being updated
      if (productData.sku && productData.sku !== product.sku) {
        const existingProduct = await Product.findOne({ sku: productData.sku });
        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: 'SKU already exists'
          });
        }
      }

      // Handle image updates - Product schema expects array of strings (URLs)
      if (productData.images) {
        console.log('📸 [UPDATE PRODUCT] Received images:', JSON.stringify(productData.images, null, 2));
        
        // Transform images array to array of URLs (strings)
        // If images are objects with url property, extract just the URLs
        // If images are already strings, use them as-is
        const imageUrls = productData.images
          .map((img: any) => {
            if (typeof img === 'string') {
              return img;
            } else if (img && img.url) {
              return img.url;
            }
            return null;
          })
          .filter((url: string | null) => url !== null && url.trim() !== '');
        
        console.log('📸 [UPDATE PRODUCT] Transformed images to URLs:', imageUrls);
        productData.images = imageUrls;
      }

      // Update product - only assign valid fields
      // Remove any fields that shouldn't be directly assigned
      const fieldsToUpdate: any = {
        ...productData,
        updatedAt: new Date(),
      };
      
      // Remove fields that shouldn't be updated directly
      delete fieldsToUpdate._id;
      delete fieldsToUpdate.__v;
      delete fieldsToUpdate.createdAt;
      
      // Assign fields to product
      Object.assign(product, fieldsToUpdate);
      
      console.log('💾 [UPDATE PRODUCT] Saving product with data:', {
        name: product.name,
        imagesCount: product.images?.length || 0,
        pricing: product.pricing,
        inventory: product.inventory,
      });
      
      await product.save();

      // Log updated product images for debugging
      console.log('💾 Updated merchant product images:', JSON.stringify(product.images, null, 2));
      console.log('✅ Merchant product updated with ID:', product._id);

      // Update corresponding product on user side (sync to user Product model)
      try {
        await updateUserSideProduct(product, req.merchantId!);
        console.log('✅ Product update successfully synced to user-side');
      } catch (syncError: any) {
        // Log error but don't fail the merchant product update
        console.error('⚠️ Warning: Failed to sync product update to user-side:', syncError.message);
        console.error('   Product was still updated in merchant database');
        // Continue - merchant product update should succeed even if sync fails
      }

      // Check for low stock and send alert
      if (product.inventory && product.inventory.stock <= product.inventory.lowStockThreshold) {
        try {
          const merchant = await Merchant.findById(req.merchantId);
          if (merchant && merchant.phone) {
            const formattedPhone = SMSService.formatPhoneNumber(merchant.phone);
            await SMSService.sendLowStockAlert(
              formattedPhone,
              product.name,
              product.inventory.stock
            );
          }
        } catch (smsError) {
          console.warn('Failed to send low stock SMS:', smsError);
        }
      }

      // Send real-time notification
      if (global.io) {
        global.io.to(`merchant-${req.merchantId}`).emit('product_updated', {
          productId: product._id,
          productName: product.name
        });
      }

      return res.json({
        success: true,
        message: 'Product updated successfully',
        data: { product }
      });
    } catch (error: any) {
      console.error('Update product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/products/:id
// @desc    Delete product and all related data (images, videos, user-side product)
// @access  Private
router.delete('/:id', validateParams(productIdSchema), async (req, res) => {
  try {
    const productId = req.params.id;
    const merchantId = req.merchantId;
    
    console.log('🗑️ [DELETE PRODUCT] Request received:');
    console.log('   Product ID:', productId);
    console.log('   Merchant ID:', merchantId);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.log('❌ [DELETE PRODUCT] Invalid product ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    const productObjectId = new mongoose.Types.ObjectId(productId);
    const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
    
    // Try to find product by merchantId first (for products with merchantId set)
    let product = await Product.findOne({
      _id: productObjectId,
      merchantId: merchantObjectId
    });
    
    // If not found by merchantId, try finding through stores (for products linked via store)
    if (!product) {
      console.log('🔍 [DELETE PRODUCT] Product not found by merchantId, checking through stores...');
      
      // Find all stores belonging to this merchant
      const merchantStores = await Store.find({ merchantId: merchantObjectId }).select('_id');
      const storeIds = merchantStores.map(store => store._id);
      
      if (storeIds.length > 0) {
        // Try to find product by store
        product = await Product.findOne({
          _id: productObjectId,
          store: { $in: storeIds }
        });
        
        if (product) {
          console.log('✅ [DELETE PRODUCT] Product found via store relationship');
        }
      }
    } else {
      console.log('✅ [DELETE PRODUCT] Product found via merchantId');
    }

    if (!product) {
      console.log('❌ [DELETE PRODUCT] Product not found');
      
      // Check if product exists but doesn't belong to this merchant
      const productExists = await Product.findById(productObjectId);
      if (productExists) {
        console.log('   Product exists but belongs to different merchant/store');
        if (productExists.merchantId) {
          console.log('   Product merchantId:', productExists.merchantId.toString());
        }
        if (productExists.store) {
          console.log('   Product store:', productExists.store.toString());
        }
      } else {
        console.log('   Product does not exist at all');
      }
      
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log('✅ [DELETE PRODUCT] Product found:', product.name);

    // Delete images from Cloudinary
    if (product.images && Array.isArray(product.images)) {
      const imageDeletePromises = product.images
        .filter((img: any) => img.publicId)
        .map(async (img: any) => {
          try {
            await CloudinaryService.deleteFile(img.publicId);
            console.log(`🗑️ Deleted image from Cloudinary: ${img.publicId}`);
          } catch (error: any) {
            console.error(`⚠️ Failed to delete image ${img.publicId} from Cloudinary:`, error.message);
            // Continue even if Cloudinary deletion fails
          }
        });
      await Promise.allSettled(imageDeletePromises);
    }

    // Delete videos from Cloudinary
    if (product.videos && Array.isArray(product.videos)) {
      const videoDeletePromises = product.videos
        .filter((video: any) => video.publicId)
        .map(async (video: any) => {
          try {
            await CloudinaryService.deleteVideo(video.publicId);
            console.log(`🗑️ Deleted video from Cloudinary: ${video.publicId}`);
          } catch (error: any) {
            console.error(`⚠️ Failed to delete video ${video.publicId} from Cloudinary:`, error.message);
            // Continue even if Cloudinary deletion fails
          }
        });
      await Promise.allSettled(videoDeletePromises);
    }

    // Delete the merchant product from database
    // Use the same logic: try merchantId first, then store relationship
    const deleteQuery: any = { _id: productObjectId };
    
    // If product has merchantId, use it; otherwise use store relationship
    if (product.merchantId) {
      deleteQuery.merchantId = merchantObjectId;
    } else {
      // Find stores for this merchant and delete by store relationship
      const merchantStores = await Store.find({ merchantId: merchantObjectId }).select('_id');
      const storeIds = merchantStores.map(store => store._id);
      if (storeIds.length > 0) {
        deleteQuery.store = { $in: storeIds };
      } else {
        // No stores found, can't delete
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
    }
    
    const deleteResult = await Product.findOneAndDelete(deleteQuery);
    
    if (!deleteResult) {
      console.log('❌ [DELETE PRODUCT] Failed to delete product from database');
      return res.status(404).json({
        success: false,
        message: 'Product not found or already deleted'
      });
    }
    
    console.log('✅ [DELETE PRODUCT] Product deleted from database');

    // Delete corresponding product on user side
    await deleteUserSideProduct(product._id.toString());

    // Delete related reviews (optional - you may want to keep reviews)
    try {
      await Review.deleteMany({ productId: product._id.toString() });
      console.log(`🗑️ Deleted reviews for product: ${product._id}`);
    } catch (error: any) {
      console.error(`⚠️ Failed to delete reviews:`, error.message);
      // Continue even if review deletion fails
    }

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${req.merchantId}`).emit('product_deleted', {
        productId: product._id,
        productName: product.name
      });
    }

    console.log(`✅ Product "${product.name}" (ID: ${product._id}) deleted successfully with all related data`);

    return res.json({
      success: true,
      message: 'Product and all related data deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

// @route   GET /api/products/:id/variants
// @desc    Get product variants
// @access  Private
router.get('/:id/variants', async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      merchantId: req.merchantId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.json({
      success: true,
      data: {
        variants: product.variants || []
      }
    });
  } catch (error: any) {
    console.error('Get product variants error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product variants',
      error: error.message
    });
  }
});

// @route   POST /api/products/:id/variants
// @desc    Create product variant
// @access  Private
router.post('/:id/variants', async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      merchantId: req.merchantId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const variantData = {
      name: req.body.name,
      sku: req.body.sku || `${product.sku}-VAR-${Date.now()}`,
      price: req.body.price || product.price,
      compareAtPrice: req.body.compareAtPrice,
      inventory: {
        stock: req.body.quantity || 0,
        trackInventory: true,
        lowStockThreshold: 5
      },
      attributes: req.body.attributes || []
    };

    if (!product.variants) {
      product.variants = [];
    }

    product.variants.push(variantData as any);
    await product.save();

    return res.status(201).json({
      success: true,
      message: 'Variant created successfully',
      data: {
        variant: product.variants[product.variants.length - 1]
      }
    });
  } catch (error: any) {
    console.error('Create product variant error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product variant',
      error: error.message
    });
  }
});

// @route   GET /api/products/:id/reviews
// @desc    Get product reviews
// @access  Private
router.get('/:id/reviews', async (req, res) => {
  try {
    const merchantId = req.merchantId!;
    const productId = req.params.id;

    // Verify product belongs to merchant
    const product = await Product.findOne({
      _id: productId,
      merchantId: merchantId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get merchant's store to query reviews (reviews reference store, not product)
    const store = await Store.findOne({ merchantId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Filters
    const filter = req.query.filter as string;
    const reviewQuery: any = {
      store: store._id,
      isActive: true
    };

    // Apply filters
    if (filter === 'with_images') {
      reviewQuery.images = { $exists: true, $ne: [] };
    } else if (filter === 'verified') {
      reviewQuery.verified = true;
    } else if (filter && !isNaN(parseInt(filter))) {
      reviewQuery.rating = parseInt(filter);
    }

    // Query reviews from database
    const [reviews, totalCount] = await Promise.all([
      Review.find(reviewQuery)
        .populate('user', 'profile.name profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(reviewQuery)
    ]);

    // Get review stats using the Review model's static method
    const stats = await Review.getStoreRatingStats((store._id as any).toString());

    return res.json({
      success: true,
      data: {
        reviews,
        stats,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrevious: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Get product reviews error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product reviews',
      error: error.message
    });
  }
});

// @route   POST /api/products/bulk
// @desc    Bulk operations on products (deprecated - use /bulk-action)
// @access  Private
router.post('/bulk', async (req, res) => {
  try {
    const { productIds, action, data } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs are required'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }

    const updateQuery: any = { updatedAt: new Date() };

    switch (action) {
      case 'activate':
        updateQuery.status = 'active';
        break;
      case 'deactivate':
        updateQuery.status = 'inactive';
        break;
      case 'update_category':
        if (!data?.category) {
          return res.status(400).json({
            success: false,
            message: 'Category is required for category update'
          });
        }
        updateQuery.category = data.category;
        break;
      case 'update_pricing':
        if (!data?.priceAdjustment) {
          return res.status(400).json({
            success: false,
            message: 'Price adjustment data is required'
          });
        }
        // Add logic for price adjustments as needed
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    // Perform bulk action
    let affectedCount: number;
    if (action === 'delete') {
      const result = await Product.deleteMany({
        _id: { $in: productIds },
        merchantId: req.merchantId
      });
      affectedCount = result.deletedCount || 0;
    } else {
      const result = await Product.updateMany(
        { _id: { $in: productIds }, merchantId: req.merchantId },
        { $set: updateQuery }
      );
      affectedCount = result.modifiedCount || 0;
    }

    return res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: { affectedCount }
    });
  } catch (error: any) {
    console.error('Bulk operation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Bulk operation failed',
      error: error.message
    });
  }
});

// @route   POST /api/products/bulk-action
// @desc    Perform bulk actions on multiple products with validation and transactions
// @access  Private
router.post('/bulk-action', async (req, res) => {
  try {
    const { action, productIds } = req.body;

    // Validate input
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    if (productIds.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 1000 products can be processed at once'
      });
    }

    // Validate action
    const validActions = ['delete', 'activate', 'deactivate', 'archive'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }

    // Start MongoDB session for transaction
    const session = await Product.db.startSession();
    session.startTransaction();

    try {
      // Verify all products belong to merchant
      const existingProducts = await Product.find({
        _id: { $in: productIds },
        merchantId: req.merchantId
      }).session(session);

      if (existingProducts.length === 0) {
        throw new Error('No products found');
      }

      const foundIds = existingProducts.map(p => p._id.toString());
      const notFoundIds = productIds.filter((id: string) => !foundIds.includes(id));

      let result;
      let successCount = 0;
      const errors: any[] = [];

      switch (action) {
        case 'delete':
          // Delete products and sync with user-side
          result = await Product.deleteMany({
            _id: { $in: foundIds },
            merchantId: req.merchantId
          }).session(session);

          successCount = result.deletedCount || 0;

          // Delete corresponding user-side products
          for (const product of existingProducts) {
            await deleteUserSideProduct(product._id.toString());
          }
          break;

        case 'activate':
          result = await Product.updateMany(
            { _id: { $in: foundIds }, merchantId: req.merchantId },
            { $set: { status: 'active', updatedAt: new Date() } }
          ).session(session);
          successCount = result.modifiedCount || 0;

          // Update user-side products
          for (const product of existingProducts) {
            product.status = 'active';
            await updateUserSideProduct(product, req.merchantId!);
          }
          break;

        case 'deactivate':
          result = await Product.updateMany(
            { _id: { $in: foundIds }, merchantId: req.merchantId },
            { $set: { status: 'inactive', updatedAt: new Date() } }
          ).session(session);
          successCount = result.modifiedCount || 0;

          // Update user-side products
          for (const product of existingProducts) {
            product.status = 'inactive';
            await updateUserSideProduct(product, req.merchantId!);
          }
          break;

        case 'archive':
          result = await Product.updateMany(
            { _id: { $in: foundIds }, merchantId: req.merchantId },
            { $set: { status: 'archived', updatedAt: new Date() } }
          ).session(session);
          successCount = result.modifiedCount || 0;
          break;

        default:
          throw new Error('Invalid action');
      }

      // Commit transaction
      await session.commitTransaction();

      // Add errors for not found products
      if (notFoundIds.length > 0) {
        notFoundIds.forEach((id: string) => {
          errors.push({
            productId: id,
            error: 'Product not found or does not belong to merchant'
          });
        });
      }

      // Send real-time notification
      if (global.io) {
        global.io.to(`merchant-${req.merchantId}`).emit('products_bulk_action', {
          action,
          successCount,
          timestamp: new Date()
        });
      }

      // Audit log: Bulk action performed
      await AuditService.log({
        merchantId: req.merchantId!,
        action: `product.bulk_${action}`,
        resourceType: 'product',
        details: {
          metadata: {
            productIds: foundIds,
            successCount,
            failedCount: errors.length
          }
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        severity: 'info'
      });

      return res.json({
        success: successCount > 0,
        message: `Bulk ${action} completed. ${successCount} succeeded, ${errors.length} failed.`,
        data: {
          success: successCount,
          failed: errors.length,
          total: productIds.length,
          errors: errors.length > 0 ? errors : undefined
        }
      });

    } catch (error: any) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error: any) {
    console.error('Bulk action error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action',
      error: error.message
    });
  }
});



// Helper function to create user-side product when merchant creates a product
async function createUserSideProduct(merchantProduct: any, merchantId: string): Promise<void> {
  const session = await Product.db.startSession();
  session.startTransaction();

  try {
    // Use storeId from product if available, otherwise find merchant's store (backward compatibility)
    let store;
    if (merchantProduct.storeId) {
      store = await Store.findById(merchantProduct.storeId).session(session);
      if (!store) {
        console.error('Store not found for storeId:', merchantProduct.storeId);
        await session.abortTransaction();
        return;
      }
      // Verify store belongs to merchant
      if (store.merchantId?.toString() !== merchantId) {
        console.error('Store does not belong to merchant:', merchantId);
        await session.abortTransaction();
        return;
      }
    } else {
      // Fallback: Find the store associated with this merchant (backward compatibility)
      store = await Store.findOne({ merchantId: merchantId }).session(session);
      if (!store) {
        console.error('No store found for merchant:', merchantId);
        await session.abortTransaction();
        return;
      }
    }

    // Find or create the category
    // Use categoryType from product if available, otherwise default to 'general'
    const categoryType = (merchantProduct as any).categoryType || 'general';
    let category = await Category.findOne({ 
      name: merchantProduct.category,
      type: categoryType 
    }).session(session);
    
    if (!category) {
      // Check if category exists with different type
      const existingCategory = await Category.findOne({ name: merchantProduct.category }).session(session);
      if (existingCategory) {
        // Update existing category type if it's different
        existingCategory.type = categoryType as any;
        await existingCategory.save({ session });
        category = existingCategory;
      } else {
        // Create new category with the specified type
        const newCategory = await Category.create([{
          name: merchantProduct.category,
          slug: merchantProduct.category.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
          type: categoryType, // Use the category type from the product
          isActive: true
        }], { session });
        category = newCategory[0];
      }
    }

    // Create unique slug for the product
    let productSlug = merchantProduct.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    let counter = 1;
    while (await Product.findOne({ slug: productSlug }).session(session)) {
      productSlug = `${merchantProduct.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}-${counter}`;
      counter++;
    }

    // Extract image URLs from image objects
    const imageUrls = merchantProduct.images?.map((img: any) => {
      // Handle both object format {url, ...} and string format
      return typeof img === 'string' ? img : img.url;
    }).filter(Boolean) || [];

    // Extract video URLs from video objects
    const videoUrls = merchantProduct.videos?.map((video: any) => {
      // Handle both object format {url, ...} and string format
      return typeof video === 'string' ? video : video.url;
    }).filter(Boolean) || [];

    console.log(`🔄 Syncing product "${merchantProduct.name}" to user-side:`);
    console.log(`   - Images: ${imageUrls.length} image(s)`);
    console.log(`   - Videos: ${videoUrls.length} video(s)`);
    console.log(`   - Store: ${store.name} (${store._id})`);
    console.log(`   - Category: ${category.name} (${category._id})`);

    // Create the user-side product
    const userProduct = new Product({
      name: merchantProduct.name,
      slug: productSlug,
      description: merchantProduct.description,
      shortDescription: merchantProduct.shortDescription,
      category: category._id,
      store: store._id,
      brand: merchantProduct.brand,
      sku: merchantProduct.sku,
      barcode: merchantProduct.barcode,
      images: imageUrls,
      videos: videoUrls,
      pricing: {
        original: merchantProduct.compareAtPrice || merchantProduct.price,
        selling: merchantProduct.price,
        currency: merchantProduct.currency || 'INR',
        discount: merchantProduct.compareAtPrice ?
          Math.round(((merchantProduct.compareAtPrice - merchantProduct.price) / merchantProduct.compareAtPrice) * 100) : 0
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
        title: merchantProduct.metaTitle || merchantProduct.name,
        description: merchantProduct.metaDescription || merchantProduct.shortDescription,
        keywords: merchantProduct.searchKeywords || []
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
      isActive: merchantProduct.status === 'active',
      isFeatured: merchantProduct.visibility === 'featured',
      isDigital: false,
      weight: merchantProduct.weight,
      dimensions: merchantProduct.dimensions ? {
        length: merchantProduct.dimensions.length,
        width: merchantProduct.dimensions.width,
        height: merchantProduct.dimensions.height,
        unit: merchantProduct.dimensions.unit
      } : undefined,
      productType: 'product'
    });

    await userProduct.save({ session });
    await session.commitTransaction();

    console.log(`✅ Successfully synced product "${merchantProduct.name}" to user-side`);
    console.log(`   - User Product ID: ${userProduct._id}`);
    console.log(`   - Images synced: ${imageUrls.length}`);
    console.log(`   - Videos synced: ${videoUrls.length}`);

    // Emit Socket.IO event after successful sync
    if (global.io) {
      global.io.emit('product_synced', {
        action: 'created',
        productId: userProduct._id,
        productName: userProduct.name,
        merchantId: merchantId,
        timestamp: new Date()
      });
    }

  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating user-side product:', error);
    // Don't throw error to avoid breaking merchant product creation
  } finally {
    session.endSession();
  }
}

// Helper function to update user-side product when merchant updates a product
async function updateUserSideProduct(merchantProduct: any, merchantId: string): Promise<void> {
  const session = await Product.db.startSession();
  session.startTransaction();

  try {
    // Find the corresponding user-side product by SKU
    const userProduct = await Product.findOne({ sku: merchantProduct.sku }).session(session);
    if (!userProduct) {
      await session.abortTransaction();
      console.log('No corresponding user-side product found, creating new one');
      await createUserSideProduct(merchantProduct, merchantId);
      return;
    }

    // Update the user-side product with new data
    const updates: any = {
      name: merchantProduct.name,
      description: merchantProduct.description,
      shortDescription: merchantProduct.shortDescription,
      brand: merchantProduct.brand,
      'pricing.original': merchantProduct.compareAtPrice || merchantProduct.price,
      'pricing.selling': merchantProduct.price,
      'pricing.currency': merchantProduct.currency || 'INR',
      'inventory.stock': merchantProduct.inventory.stock,
      'inventory.isAvailable': merchantProduct.inventory.stock > 0,
      'inventory.lowStockThreshold': merchantProduct.inventory.lowStockThreshold || 5,
      tags: merchantProduct.tags || [],
      isActive: merchantProduct.status === 'active',
      isFeatured: merchantProduct.visibility === 'featured',
      weight: merchantProduct.weight,
      updatedAt: new Date()
    };

    // Update discount percentage
    if (merchantProduct.compareAtPrice) {
      updates['pricing.discount'] = Math.round(((merchantProduct.compareAtPrice - merchantProduct.price) / merchantProduct.compareAtPrice) * 100);
    }

    // Update images if provided
    if (merchantProduct.images && merchantProduct.images.length > 0) {
      updates.images = merchantProduct.images.map((img: any) => {
        // Handle both object format {url, ...} and string format
        return typeof img === 'string' ? img : img.url;
      }).filter(Boolean);
    }

    // Update videos if provided
    if (merchantProduct.videos && merchantProduct.videos.length > 0) {
      updates.videos = merchantProduct.videos.map((video: any) => {
        // Handle both object format {url, ...} and string format
        return typeof video === 'string' ? video : video.url;
      }).filter(Boolean);
    }

    // Update dimensions if provided
    if (merchantProduct.dimensions) {
      updates.dimensions = {
        length: merchantProduct.dimensions.length,
        width: merchantProduct.dimensions.width,
        height: merchantProduct.dimensions.height,
        unit: merchantProduct.dimensions.unit
      };
    }

    await Product.updateOne({ _id: userProduct._id }, updates, { session });
    await session.commitTransaction();

    console.log(`✅ Successfully synced product update "${merchantProduct.name}" to user-side`);
    console.log(`   - User Product ID: ${userProduct._id}`);
    if (updates.images) {
      console.log(`   - Images synced: ${updates.images.length}`);
    }
    if (updates.videos) {
      console.log(`   - Videos synced: ${updates.videos.length}`);
    }

    // Emit Socket.IO event after successful sync
    if (global.io) {
      global.io.emit('product_synced', {
        action: 'updated',
        productId: userProduct._id,
        productName: userProduct.name,
        merchantId: merchantId,
        timestamp: new Date()
      });
    }

  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating user-side product:', error);
  } finally {
    session.endSession();
  }
}

// Helper function to delete user-side product when merchant deletes a product
async function deleteUserSideProduct(merchantProductId: string): Promise<void> {
  const session = await Product.db.startSession();
  session.startTransaction();

  try {
    // Find the merchant product to get its SKU
    const merchantProduct = await Product.findById(merchantProductId).session(session);
    if (!merchantProduct) {
      await session.abortTransaction();
      return;
    }

    // Find and delete the corresponding user-side product
    const result = await Product.deleteOne({ sku: merchantProduct.sku }, { session });
    await session.commitTransaction();

    if (result.deletedCount > 0) {
      console.log(`📦 Deleted user-side product with SKU "${merchantProduct.sku}"`);

      // Emit Socket.IO event after successful deletion
      if (global.io) {
        global.io.emit('product_synced', {
          action: 'deleted',
          productSku: merchantProduct.sku,
          productName: merchantProduct.name,
          timestamp: new Date()
        });
      }
    }

  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting user-side product:', error);
  } finally {
    session.endSession();
  }
}

export default router;
