import mongoose, { Schema, Document, Types } from 'mongoose';

// Product variant interface
export interface IProductVariant {
  type: string; // 'size', 'color', 'flavor', etc.
  value: string; // 'XL', 'Red', 'Chocolate', etc.
  price?: number; // Additional price for variant
  stock: number;
  sku?: string;
  image?: string;
}

// Product pricing interface
export interface IProductPricing {
  original: number;
  selling: number;
  discount?: number; // Percentage
  currency: string;
  bulk?: {
    minQuantity: number;
    price: number;
  }[];
}

// Product inventory interface
export interface IProductInventory {
  stock: number;
  isAvailable: boolean;
  lowStockThreshold?: number;
  variants?: IProductVariant[];
  unlimited: boolean; // For digital products
}

// Product ratings interface
export interface IProductRatings {
  average: number;
  count: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// Product specifications interface
export interface IProductSpecification {
  key: string;
  value: string;
  group?: string; // 'dimensions', 'material', 'features', etc.
}

// Product SEO interface
export interface IProductSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  metaTags?: { [key: string]: string };
}

// Product analytics interface
export interface IProductAnalytics {
  views: number;
  purchases: number;
  conversions: number;
  wishlistAdds: number;
  shareCount: number;
  returnRate: number;
  avgRating: number;
}

// Main Product interface
export interface IProduct {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  category: Types.ObjectId;
  subCategory?: Types.ObjectId;
  store: Types.ObjectId;
  brand?: string;
  model?: string;
  sku: string;
  barcode?: string;
  images: string[];
  videos?: string[];
  pricing: IProductPricing;
  inventory: IProductInventory;
  ratings: IProductRatings;
  specifications: IProductSpecification[];
  tags: string[];
  seo: IProductSEO;
  analytics: IProductAnalytics;
  isActive: boolean;
  isFeatured: boolean;
  isDigital: boolean;
  weight?: number; // in grams
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit: 'cm' | 'inch';
  };
  shippingInfo?: {
    weight: number;
    freeShipping: boolean;
    shippingCost?: number;
    processingTime?: string; // "1-2 days"
  };
  relatedProducts?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isInStock(): boolean;
  getVariantByType(type: string, value: string): IProductVariant | null;
  calculateDiscountedPrice(): number;
  updateRatings(): Promise<void>;
  incrementViews(): Promise<void>;
}

// Product Schema
const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 300
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subCategory: {
    type: Schema.Types.ObjectId,
    ref: 'Category'
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  brand: {
    type: String,
    trim: true,
    maxlength: 100
  },
  model: {
    type: String,
    trim: true,
    maxlength: 100
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  barcode: {
    type: String,
    trim: true,
    sparse: true // Allows multiple null values
  },
  images: [{
    type: String,
    required: true
  }],
  videos: [String],
  pricing: {
    original: {
      type: Number,
      required: true,
      min: 0
    },
    selling: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      min: 0,
      max: 100
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR']
    },
    bulk: [{
      minQuantity: { type: Number, min: 1 },
      price: { type: Number, min: 0 }
    }]
  },
  inventory: {
    stock: {
      type: Number,
      required: true,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },
    variants: [{
      type: {
        type: String,
        required: true,
        trim: true
      },
      value: {
        type: String,
        required: true,
        trim: true
      },
      price: {
        type: Number,
        min: 0
      },
      stock: {
        type: Number,
        required: true,
        min: 0
      },
      sku: String,
      image: String
    }],
    unlimited: {
      type: Boolean,
      default: false
    }
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    distribution: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },
  specifications: [{
    key: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: String,
      required: true,
      trim: true
    },
    group: {
      type: String,
      trim: true
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  seo: {
    title: {
      type: String,
      trim: true,
      maxlength: 60
    },
    description: {
      type: String,
      trim: true,
      maxlength: 160
    },
    keywords: [String],
    metaTags: {
      type: Map,
      of: String
    }
  },
  analytics: {
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    purchases: {
      type: Number,
      default: 0,
      min: 0
    },
    conversions: {
      type: Number,
      default: 0,
      min: 0
    },
    wishlistAdds: {
      type: Number,
      default: 0,
      min: 0
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0
    },
    returnRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isDigital: {
    type: Boolean,
    default: false
  },
  weight: {
    type: Number,
    min: 0 // in grams
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    unit: {
      type: String,
      enum: ['cm', 'inch'],
      default: 'cm'
    }
  },
  shippingInfo: {
    weight: { type: Number, min: 0 },
    freeShipping: { type: Boolean, default: false },
    shippingCost: { type: Number, min: 0 },
    processingTime: String
  },
  relatedProducts: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ProductSchema.index({ slug: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ store: 1, isActive: 1 });
ProductSchema.index({ brand: 1, isActive: 1 });
ProductSchema.index({ 'pricing.selling': 1 });
ProductSchema.index({ 'ratings.average': -1, isActive: 1 });
ProductSchema.index({ isFeatured: 1, isActive: 1 });
ProductSchema.index({ tags: 1, isActive: 1 });
ProductSchema.index({ 'inventory.stock': 1, 'inventory.isAvailable': 1 });
ProductSchema.index({ createdAt: -1 });

// Text search index
ProductSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  brand: 'text'
}, {
  weights: {
    name: 10,
    tags: 5,
    brand: 3,
    description: 1
  }
});

// Compound indexes
ProductSchema.index({ category: 1, 'pricing.selling': 1, isActive: 1 });
ProductSchema.index({ store: 1, 'ratings.average': -1 });
ProductSchema.index({ isFeatured: 1, 'ratings.average': -1, isActive: 1 });

// Virtual for discount percentage
ProductSchema.virtual('discountPercentage').get(function() {
  if (this.pricing.original <= this.pricing.selling) return 0;
  return Math.round(((this.pricing.original - this.pricing.selling) / this.pricing.original) * 100);
});

// Virtual for low stock status
ProductSchema.virtual('isLowStock').get(function() {
  if (this.inventory.unlimited) return false;
  return this.inventory.stock <= (this.inventory.lowStockThreshold || 5);
});

// Virtual for out of stock status
ProductSchema.virtual('isOutOfStock').get(function() {
  if (this.inventory.unlimited) return false;
  return this.inventory.stock === 0;
});

// Pre-save hook to generate slug and calculate discount
ProductSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
  
  // Calculate discount percentage
  if (this.pricing.original && this.pricing.selling) {
    if (this.pricing.original > this.pricing.selling) {
      this.pricing.discount = Math.round(((this.pricing.original - this.pricing.selling) / this.pricing.original) * 100);
    } else {
      this.pricing.discount = 0;
    }
  }
  
  // Update availability based on stock
  if (!this.inventory.unlimited) {
    this.inventory.isAvailable = this.inventory.stock > 0;
  }
  
  next();
});

// Method to check if product is in stock
ProductSchema.methods.isInStock = function(): boolean {
  if (this.inventory.unlimited) return true;
  return this.inventory.isAvailable && this.inventory.stock > 0;
};

// Method to get variant by type and value
ProductSchema.methods.getVariantByType = function(type: string, value: string): IProductVariant | null {
  if (!this.inventory.variants) return null;
  
  const variant = this.inventory.variants.find((v: IProductVariant) => 
    v.type.toLowerCase() === type.toLowerCase() && 
    v.value.toLowerCase() === value.toLowerCase()
  );
  
  return variant || null;
};

// Method to calculate discounted price
ProductSchema.methods.calculateDiscountedPrice = function(): number {
  return this.pricing.selling;
};

// Method to update ratings
ProductSchema.methods.updateRatings = async function(): Promise<void> {
  const Review = this.model('Review');
  const reviews = await Review.find({ 
    targetType: 'Product', 
    targetId: this._id,
    isApproved: true 
  });
  
  if (reviews.length === 0) {
    this.ratings = {
      average: 0,
      count: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
    return;
  }
  
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalRating = 0;
  
  reviews.forEach((review: any) => {
    const rating = Math.round(review.rating) as keyof typeof distribution;
    distribution[rating]++;
    totalRating += review.rating;
  });
  
  this.ratings = {
    average: Math.round((totalRating / reviews.length) * 10) / 10,
    count: reviews.length,
    distribution
  };
  
  // Update analytics
  this.analytics.avgRating = this.ratings.average;
};

// Method to increment views
ProductSchema.methods.incrementViews = async function(): Promise<void> {
  this.analytics.views += 1;
  await this.save();
};

// Static method to search products
ProductSchema.statics.searchProducts = function(
  searchText: string,
  filters: any = {},
  options: any = {}
) {
  const query: any = {
    $text: { $search: searchText },
    isActive: true
  };
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.store) {
    query.store = filters.store;
  }
  
  if (filters.brand) {
    query.brand = new RegExp(filters.brand, 'i');
  }
  
  if (filters.priceRange) {
    query['pricing.selling'] = {
      $gte: filters.priceRange.min || 0,
      $lte: filters.priceRange.max || Number.MAX_VALUE
    };
  }
  
  if (filters.inStock) {
    query['inventory.isAvailable'] = true;
    query['inventory.stock'] = { $gt: 0 };
  }
  
  if (filters.rating) {
    query['ratings.average'] = { $gte: filters.rating };
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('category store')
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get featured products
ProductSchema.statics.getFeatured = function(limit: number = 10) {
  return this.find({ 
    isFeatured: true, 
    isActive: true,
    'inventory.isAvailable': true 
  })
  .populate('category store')
  .sort({ 'ratings.average': -1, createdAt: -1 })
  .limit(limit);
};

// Static method to get products by category
ProductSchema.statics.getByCategory = function(categoryId: string, options: any = {}) {
  const query: any = { 
    category: categoryId, 
    isActive: true,
    'inventory.isAvailable': true 
  };
  
  let sortOptions: any = {};
  
  switch (options.sortBy) {
    case 'price_low':
      sortOptions = { 'pricing.selling': 1 };
      break;
    case 'price_high':
      sortOptions = { 'pricing.selling': -1 };
      break;
    case 'rating':
      sortOptions = { 'ratings.average': -1 };
      break;
    case 'newest':
      sortOptions = { createdAt: -1 };
      break;
    default:
      sortOptions = { 'ratings.average': -1, createdAt: -1 };
  }
  
  return this.find(query)
    .populate('category store')
    .sort(sortOptions)
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};
export const Product =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

