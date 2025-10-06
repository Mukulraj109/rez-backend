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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Category Schema
const CategorySchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    childCategories: [{
            type: mongoose_1.Schema.Types.ObjectId,
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
// Virtual for level (root = 0, child = 1, etc.)
CategorySchema.virtual('level').get(function () {
    return this.parentCategory ? 1 : 0; // Simplified - could be recursive for deeper levels
});
// Virtual for full category path
CategorySchema.virtual('fullPath').get(function () {
    // This will be populated by the method below
    return this._fullPath;
});
// Method to get full category path
CategorySchema.methods.getFullPath = async function () {
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
CategorySchema.methods.getAllChildren = async function () {
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
CategorySchema.pre('save', function (next) {
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
CategorySchema.pre('save', async function (next) {
    if (this.isNew && this.parentCategory) {
        await this.model('Category').findByIdAndUpdate(this.parentCategory, { $addToSet: { childCategories: this._id } });
    }
    next();
});
// Pre-remove hook to clean up references
CategorySchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    // Remove from parent's childCategories array
    if (this.parentCategory) {
        await this.model('Category').findByIdAndUpdate(this.parentCategory, { $pull: { childCategories: this._id } });
    }
    // Update child categories to remove parent reference
    await this.model('Category').updateMany({ parentCategory: this._id }, { $unset: { parentCategory: 1 } });
    next();
});
// Static method to get root categories
CategorySchema.statics.getRootCategories = function (type) {
    const query = { parentCategory: null, isActive: true };
    if (type) {
        query.type = type;
    }
    return this.find(query).sort({ sortOrder: 1 });
};
// Static method to get category tree
CategorySchema.statics.getCategoryTree = async function (type) {
    const query = { isActive: true };
    if (type) {
        query.type = type;
    }
    const categories = await this.find(query)
        .sort({ sortOrder: 1 })
        .populate('childCategories')
        .lean();
    // Build tree structure
    const categoryMap = new Map();
    const rootCategories = [];
    // First pass: create map of all categories
    categories.forEach((cat) => {
        categoryMap.set(cat._id.toString(), { ...cat, children: [] });
    });
    // Second pass: build tree structure
    categories.forEach((cat) => {
        if (cat.parentCategory) {
            const parent = categoryMap.get(cat.parentCategory.toString());
            if (parent) {
                parent.children.push(categoryMap.get(cat._id.toString()));
            }
        }
        else {
            rootCategories.push(categoryMap.get(cat._id.toString()));
        }
    });
    return rootCategories;
};
// Static method to get categories by type with counts
CategorySchema.statics.getCategoriesWithCounts = function (type) {
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
exports.Category = mongoose_1.default.model('Category', CategorySchema);
