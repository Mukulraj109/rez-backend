"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Article = void 0;
var mongoose_1 = require("mongoose");
// Article Schema
var ArticleSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    excerpt: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    coverImage: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    authorType: {
        type: String,
        enum: ['user', 'merchant'],
        required: true,
        default: 'user'
    },
    category: {
        type: String,
        required: true,
        enum: ['fashion', 'beauty', 'lifestyle', 'tech', 'general'],
        index: true
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
    products: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Product'
        }],
    stores: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Store'
        }],
    engagement: {
        likes: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User'
            }],
        bookmarks: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User'
            }],
        shares: {
            type: Number,
            default: 0,
            min: 0
        },
        comments: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    analytics: {
        totalViews: {
            type: Number,
            default: 0,
            min: 0
        },
        uniqueViews: {
            type: Number,
            default: 0,
            min: 0
        },
        avgReadTime: {
            type: Number,
            default: 0,
            min: 0
        },
        completionRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        engagementRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        shareRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        likeRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        viewsByDate: {
            type: Map,
            of: Number,
            default: {}
        },
        topLocations: [String],
        deviceBreakdown: {
            mobile: { type: Number, default: 0 },
            tablet: { type: Number, default: 0 },
            desktop: { type: Number, default: 0 }
        }
    },
    readTime: {
        type: String,
        required: true,
        default: '5 min read'
    },
    isPublished: {
        type: Boolean,
        default: false,
        index: true
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending',
        index: true
    },
    moderationReasons: [String],
    publishedAt: {
        type: Date,
        index: true
    },
    scheduledAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
ArticleSchema.index({ author: 1, isPublished: 1, createdAt: -1 });
ArticleSchema.index({ category: 1, isPublished: 1, publishedAt: -1 });
ArticleSchema.index({ isFeatured: 1, isPublished: 1 });
ArticleSchema.index({ tags: 1, isPublished: 1 });
ArticleSchema.index({ 'analytics.totalViews': -1, isPublished: 1 });
ArticleSchema.index({ moderationStatus: 1 });
ArticleSchema.index({ publishedAt: -1 });
// Text search index
ArticleSchema.index({
    title: 'text',
    excerpt: 'text',
    content: 'text',
    tags: 'text'
}, {
    weights: {
        title: 10,
        excerpt: 5,
        tags: 3,
        content: 1
    }
});
// Compound indexes
ArticleSchema.index({ category: 1, 'analytics.totalViews': -1, publishedAt: -1 });
ArticleSchema.index({ author: 1, publishedAt: -1 });
// Virtual for like count
ArticleSchema.virtual('likeCount').get(function () {
    return this.engagement.likes.length;
});
// Virtual for bookmark count
ArticleSchema.virtual('bookmarkCount').get(function () {
    return this.engagement.bookmarks.length;
});
// Virtual for engagement score
ArticleSchema.virtual('engagementScore').get(function () {
    var views = this.analytics.totalViews || 1;
    var likes = this.engagement.likes.length;
    var bookmarks = this.engagement.bookmarks.length;
    var comments = this.engagement.comments;
    var shares = this.engagement.shares;
    return ((likes * 3 + bookmarks * 2 + comments * 2 + shares * 5) / views) * 100;
});
// Virtual for view count display
ArticleSchema.virtual('viewCount').get(function () {
    var views = this.analytics.totalViews;
    if (views >= 1000000) {
        return "".concat((views / 1000000).toFixed(1), "M");
    }
    if (views >= 1000) {
        return "".concat((views / 1000).toFixed(1), "K");
    }
    return views.toString();
});
// Pre-save hooks
ArticleSchema.pre('save', function (next) {
    // Set published date when first published
    if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    // Calculate read time based on content length
    if (this.isModified('content')) {
        var wordsPerMinute = 200;
        var wordCount = this.content.split(/\s+/).length;
        var minutes = Math.ceil(wordCount / wordsPerMinute);
        this.readTime = "".concat(minutes, " min read");
    }
    next();
});
// Method to increment views
ArticleSchema.methods.incrementViews = function (userId) {
    return __awaiter(this, void 0, void 0, function () {
        var now, date;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = new Date();
                    date = now.toISOString().split('T')[0];
                    if (!this.analytics.viewsByDate)
                        this.analytics.viewsByDate = new Map();
                    this.analytics.totalViews += 1;
                    this.analytics.viewsByDate.set(date, (this.analytics.viewsByDate.get(date) || 0) + 1);
                    if (userId) {
                        // Track unique views (simplified - in production, use a separate collection)
                        this.analytics.uniqueViews += 1;
                    }
                    return [4 /*yield*/, this.save()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
// Method to toggle like
ArticleSchema.methods.toggleLike = function (userId) {
    return __awaiter(this, void 0, void 0, function () {
        var userObjectId, isLiked;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userObjectId = new mongoose_1.default.Types.ObjectId(userId);
                    isLiked = this.engagement.likes.some(function (id) { return id.equals(userObjectId); });
                    if (isLiked) {
                        this.engagement.likes = this.engagement.likes.filter(function (id) { return !id.equals(userObjectId); });
                    }
                    else {
                        this.engagement.likes.push(userObjectId);
                    }
                    return [4 /*yield*/, this.save()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, !isLiked]; // Return new like status
            }
        });
    });
};
// Method to toggle bookmark
ArticleSchema.methods.toggleBookmark = function (userId) {
    return __awaiter(this, void 0, void 0, function () {
        var userObjectId, isBookmarked;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userObjectId = new mongoose_1.default.Types.ObjectId(userId);
                    isBookmarked = this.engagement.bookmarks.some(function (id) { return id.equals(userObjectId); });
                    if (isBookmarked) {
                        this.engagement.bookmarks = this.engagement.bookmarks.filter(function (id) { return !id.equals(userObjectId); });
                    }
                    else {
                        this.engagement.bookmarks.push(userObjectId);
                    }
                    return [4 /*yield*/, this.save()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, !isBookmarked]; // Return new bookmark status
            }
        });
    });
};
// Method to increment shares
ArticleSchema.methods.share = function () {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    this.engagement.shares += 1;
                    this.analytics.shareRate = (this.engagement.shares / this.analytics.totalViews) * 100;
                    return [4 /*yield*/, this.save()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
// Method to update analytics
ArticleSchema.methods.updateAnalytics = function () {
    return __awaiter(this, void 0, void 0, function () {
        var views, likes, bookmarks, comments, shares;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    views = this.analytics.totalViews || 1;
                    likes = this.engagement.likes.length;
                    bookmarks = this.engagement.bookmarks.length;
                    comments = this.engagement.comments;
                    shares = this.engagement.shares;
                    this.analytics.engagementRate = ((likes + bookmarks + comments + shares) / views) * 100;
                    this.analytics.likeRate = (likes / views) * 100;
                    this.analytics.shareRate = (shares / views) * 100;
                    return [4 /*yield*/, this.save()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
// Method to check if article is viewable by user
ArticleSchema.methods.isViewableBy = function (userId) {
    if (!this.isPublished || !this.isApproved) {
        // Only author can view unpublished articles
        return this.author.toString() === userId;
    }
    return true;
};
// Static method to get featured articles
ArticleSchema.statics.getFeatured = function (limit) {
    if (limit === void 0) { limit = 10; }
    return this.find({
        isFeatured: true,
        isPublished: true,
        isApproved: true
    })
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ publishedAt: -1 })
        .limit(limit);
};
// Static method to get articles by category
ArticleSchema.statics.getByCategory = function (category, limit) {
    if (limit === void 0) { limit = 20; }
    return this.find({
        category: category,
        isPublished: true,
        isApproved: true
    })
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ publishedAt: -1 })
        .limit(limit);
};
// Static method to search articles
ArticleSchema.statics.searchArticles = function (searchText, filters, options) {
    if (filters === void 0) { filters = {}; }
    if (options === void 0) { options = {}; }
    var query = {
        $text: { $search: searchText },
        isPublished: true,
        isApproved: true
    };
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.author) {
        query.author = filters.author;
    }
    if (filters.hasProducts) {
        query.products = { $exists: true, $not: { $size: 0 } };
    }
    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};
// Static method to get trending articles (most viewed in last 7 days)
ArticleSchema.statics.getTrending = function (limit) {
    if (limit === void 0) { limit = 10; }
    var sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.find({
        isPublished: true,
        isApproved: true,
        publishedAt: { $gte: sevenDaysAgo }
    })
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ 'analytics.totalViews': -1, 'engagement.likes': -1 })
        .limit(limit);
};
exports.Article = mongoose_1.default.model('Article', ArticleSchema);
