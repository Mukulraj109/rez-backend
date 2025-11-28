"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
var mongoose_1 = require("mongoose");
// Category Schema
var CategorySchema = new mongoose_1.Schema({
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
CategorySchema.methods.getFullPath = function () {
    return __awaiter(this, void 0, void 0, function () {
        var path, parent_1, parentPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    path = this.name;
                    if (!this.parentCategory) return [3 /*break*/, 3];
                    return [4 /*yield*/, this.model('Category').findById(this.parentCategory)];
                case 1:
                    parent_1 = _a.sent();
                    if (!parent_1) return [3 /*break*/, 3];
                    return [4 /*yield*/, parent_1.getFullPath()];
                case 2:
                    parentPath = _a.sent();
                    path = "".concat(parentPath, " > ").concat(path);
                    _a.label = 3;
                case 3: return [2 /*return*/, path];
            }
        });
    });
};
// Method to get all child categories recursively
CategorySchema.methods.getAllChildren = function () {
    return __awaiter(this, void 0, void 0, function () {
        var children, allChildren, _i, children_1, child, grandChildren;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this.model('Category').find({
                        parentCategory: this._id,
                        isActive: true
                    }).sort({ sortOrder: 1 })];
                case 1:
                    children = _a.sent();
                    allChildren = __spreadArray([], children, true);
                    _i = 0, children_1 = children;
                    _a.label = 2;
                case 2:
                    if (!(_i < children_1.length)) return [3 /*break*/, 5];
                    child = children_1[_i];
                    return [4 /*yield*/, child.getAllChildren()];
                case 3:
                    grandChildren = _a.sent();
                    allChildren = __spreadArray(__spreadArray([], allChildren, true), grandChildren, true);
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, allChildren];
            }
        });
    });
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
CategorySchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(this.isNew && this.parentCategory)) return [3 /*break*/, 2];
                    return [4 /*yield*/, this.model('Category').findByIdAndUpdate(this.parentCategory, { $addToSet: { childCategories: this._id } })];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    next();
                    return [2 /*return*/];
            }
        });
    });
});
// Pre-remove hook to clean up references
CategorySchema.pre('deleteOne', { document: true, query: false }, function (next) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!this.parentCategory) return [3 /*break*/, 2];
                    return [4 /*yield*/, this.model('Category').findByIdAndUpdate(this.parentCategory, { $pull: { childCategories: this._id } })];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: 
                // Update child categories to remove parent reference
                return [4 /*yield*/, this.model('Category').updateMany({ parentCategory: this._id }, { $unset: { parentCategory: 1 } })];
                case 3:
                    // Update child categories to remove parent reference
                    _a.sent();
                    next();
                    return [2 /*return*/];
            }
        });
    });
});
// Static method to get root categories
CategorySchema.statics.getRootCategories = function (type) {
    var query = { parentCategory: null, isActive: true };
    if (type) {
        query.type = type;
    }
    return this.find(query).sort({ sortOrder: 1 });
};
// Static method to get category tree
CategorySchema.statics.getCategoryTree = function (type) {
    return __awaiter(this, void 0, void 0, function () {
        var query, categories, categoryMap, rootCategories;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = { isActive: true };
                    if (type) {
                        query.type = type;
                    }
                    return [4 /*yield*/, this.find(query)
                            .sort({ sortOrder: 1 })
                            .populate('childCategories')
                            .lean()];
                case 1:
                    categories = _a.sent();
                    categoryMap = new Map();
                    rootCategories = [];
                    // First pass: create map of all categories
                    categories.forEach(function (cat) {
                        categoryMap.set(cat._id.toString(), __assign(__assign({}, cat), { children: [] }));
                    });
                    // Second pass: build tree structure
                    categories.forEach(function (cat) {
                        if (cat.parentCategory) {
                            var parent_2 = categoryMap.get(cat.parentCategory.toString());
                            if (parent_2) {
                                parent_2.children.push(categoryMap.get(cat._id.toString()));
                            }
                        }
                        else {
                            rootCategories.push(categoryMap.get(cat._id.toString()));
                        }
                    });
                    return [2 /*return*/, rootCategories];
            }
        });
    });
};
// Static method to get categories by type with counts
CategorySchema.statics.getCategoriesWithCounts = function (type) {
    return this.aggregate([
        { $match: { type: type, isActive: true } },
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
