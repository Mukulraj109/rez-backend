import mongoose, { Schema, Document, Types } from 'mongoose';

// Category metadata interface
export interface ICategoryMetadata {
  color?: string;
  tags?: string[];
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  featured?: boolean;
}

// Category interface
export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  bannerImage?: string;
  type: 'going_out' | 'home_delivery' | 'earn' | 'play' | 'general';
  parentCategory?: Types.ObjectId;
  childCategories?: Types.ObjectId[];
  isActive: boolean;
  sortOrder: number;
  metadata: ICategoryMetadata;
  productCount: number;
  storeCount: number;
  isBestDiscount: boolean;
  isBestSeller: boolean;
  maxCashback?: number;
  createdAt: Date;
  updatedAt: Date;
  _fullPath?: string;

  // Virtual methods
  getFullPath(): Promise<string>;
  getAllChildren(): Promise<ICategory[]>;
}

// Category Schema
const CategorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
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
    maxlength: 500
  },
  icon: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    trim: true
  },
  bannerImage: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['going_out', 'home_delivery', 'earn', 'play', 'general'],
    default: 'general'
  },
  parentCategory: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  childCategories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  metadata: {
    color: {
      type: String,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color']
    },
    tags: [{
      type: String,
      trim: true
    }],
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 60
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 160
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  productCount: {
    type: Number,
    default: 0,
    min: 0
  },
  storeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isBestDiscount: {
    type: Boolean,
    default: false,
    index: true
  },
  isBestSeller: {
    type: Boolean,
    default: false,
    index: true
  },
  maxCashback: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CategorySchema.index({ slug: 1 });
CategorySchema.index({ type: 1, isActive: 1 });
CategorySchema.index({ parentCategory: 1 });
CategorySchema.index({ sortOrder: 1 });
CategorySchema.index({ 'metadata.featured': 1, isActive: 1 });
CategorySchema.index({ createdAt: -1 });

// Compound index for hierarchical queries
CategorySchema.index({ type: 1, parentCategory: 1, sortOrder: 1 });

// Indexes for best discount and best seller queries
CategorySchema.index({ isBestDiscount: 1, isActive: 1, maxCashback: -1, sortOrder: 1 });
CategorySchema.index({ isBestSeller: 1, isActive: 1, productCount: -1, sortOrder: 1 });

// Virtual for level (root = 0, child = 1, etc.)
CategorySchema.virtual('level').get(function() {
  return this.parentCategory ? 1 : 0; // Simplified - could be recursive for deeper levels
});

// Virtual for full category path
CategorySchema.virtual('fullPath').get(function() {
  // This will be populated by the method below
  return this._fullPath;
});

// Method to get full category path
CategorySchema.methods.getFullPath = async function(): Promise<string> {
  let path = this.name;
  
  if (this.parentCategory) {
    const parent = await this.model('Category').findById(this.parentCategory);
    if (parent) {
      const parentPath = await parent.getFullPath();
      path = `${parentPath} > ${path}`;
    }
  }
  
  return path;
};

// Method to get all child categories recursively
CategorySchema.methods.getAllChildren = async function(): Promise<ICategory[]> {
  const children = await this.model('Category').find({ 
    parentCategory: this._id,
    isActive: true 
  }).sort({ sortOrder: 1 });
  
  let allChildren = [...children];
  
  // Recursively get children of children
  for (const child of children) {
    const grandChildren = await child.getAllChildren();
    allChildren = [...allChildren, ...grandChildren];
  }
  
  return allChildren;
};

// Pre-save hook to generate slug if not provided
CategorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .trim();
  }
  next();
});

// Pre-save hook to update parent's childCategories array
CategorySchema.pre('save', async function(next) {
  if (this.isNew && this.parentCategory) {
    await this.model('Category').findByIdAndUpdate(
      this.parentCategory,
      { $addToSet: { childCategories: this._id } }
    );
  }
  next();
});

// Pre-remove hook to clean up references
CategorySchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  // Remove from parent's childCategories array
  if (this.parentCategory) {
    await this.model('Category').findByIdAndUpdate(
      this.parentCategory,
      { $pull: { childCategories: this._id } }
    );
  }
  
  // Update child categories to remove parent reference
  await this.model('Category').updateMany(
    { parentCategory: this._id },
    { $unset: { parentCategory: 1 } }
  );
  
  next();
});

// Static method to get root categories
CategorySchema.statics.getRootCategories = function(type?: string) {
  const query: any = { parentCategory: null, isActive: true };
  if (type) {
    query.type = type;
  }
  return this.find(query).sort({ sortOrder: 1 });
};

// Static method to get category tree
CategorySchema.statics.getCategoryTree = async function(type?: string) {
  const query: any = { isActive: true };
  if (type) {
    query.type = type;
  }
  
  const categories = await this.find(query)
    .sort({ sortOrder: 1 })
    .populate('childCategories')
    .lean();
    
  // Build tree structure
  const categoryMap = new Map();
  const rootCategories: any[] = [];
  
  // First pass: create map of all categories
  categories.forEach((cat: any) => {
    categoryMap.set(cat._id.toString(), { ...cat, children: [] });
  });
  
  // Second pass: build tree structure
  categories.forEach((cat: any) => {
    if (cat.parentCategory) {
      const parent = categoryMap.get(cat.parentCategory.toString());
      if (parent) {
        parent.children.push(categoryMap.get(cat._id.toString()));
      }
    } else {
      rootCategories.push(categoryMap.get(cat._id.toString()));
    }
  });
  
  return rootCategories;
};

// Static method to get categories by type with counts
CategorySchema.statics.getCategoriesWithCounts = function(type: string) {
  return this.aggregate([
    { $match: { type, isActive: true } },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'category',
        as: 'products'
      }
    },
    {
      $lookup: {
        from: 'stores',
        localField: '_id',
        foreignField: 'category',
        as: 'stores'
      }
    },
    {
      $addFields: {
        productCount: { $size: '$products' },
        storeCount: { $size: '$stores' }
      }
    },
    {
      $project: {
        products: 0,
        stores: 0
      }
    },
    { $sort: { sortOrder: 1 } }
  ]);
};

export const Category = mongoose.model<ICategory>('Category', CategorySchema);