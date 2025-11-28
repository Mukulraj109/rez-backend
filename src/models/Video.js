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
exports.Video = void 0;
var mongoose_1 = require("mongoose");
// Video Schema
var VideoSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    creator: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    contentType: {
        type: String,
        enum: ['merchant', 'ugc', 'article_video'],
        required: true,
        default: 'ugc',
        index: true
    },
    videoUrl: {
        type: String,
        required: true,
        trim: true
    },
    thumbnail: {
        type: String,
        required: true,
        trim: true
    },
    preview: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review'],
        index: true
    },
    subcategory: {
        type: String,
        trim: true
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
    hashtags: [{
            type: String,
            trim: true,
            match: [/^#[\w\d_]+$/, 'Hashtags must start with # and contain only letters, numbers, and underscores']
        }],
    associatedArticle: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Article'
    },
    products: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Product'
        }],
    stores: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Store'
        }],
    engagement: {
        views: {
            type: Number,
            default: 0,
            min: 0
        },
        likes: [{
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
        },
        saves: {
            type: Number,
            default: 0,
            min: 0
        },
        reports: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    metadata: {
        duration: {
            type: Number,
            required: true,
            min: 1,
            max: 300 // 5 minutes max
        },
        resolution: {
            type: String,
            enum: ['480p', '720p', '1080p', '4K']
        },
        fileSize: {
            type: Number,
            min: 0
        },
        format: {
            type: String,
            enum: ['mp4', 'mov', 'avi', 'webm'],
            default: 'mp4'
        },
        aspectRatio: {
            type: String,
            enum: ['16:9', '9:16', '4:3', '1:1'],
            default: '9:16'
        },
        fps: {
            type: Number,
            min: 24,
            max: 60,
            default: 30
        }
    },
    processing: {
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        originalUrl: String,
        processedUrl: String,
        thumbnailUrl: String,
        previewUrl: String,
        errorMessage: String,
        processedAt: Date
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
        avgWatchTime: {
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
        viewsByHour: {
            type: Map,
            of: Number,
            default: {}
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
    reports: [{
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            reason: {
                type: String,
                required: true,
                enum: ['inappropriate', 'misleading', 'spam', 'copyright', 'other']
            },
            details: {
                type: String,
                maxlength: 500
            },
            reportedAt: {
                type: Date,
                default: Date.now
            }
        }],
    reportCount: {
        type: Number,
        default: 0,
        min: 0
    },
    isReported: {
        type: Boolean,
        default: false
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
    isTrending: {
        type: Boolean,
        default: false,
        index: true
    },
    isSponsored: {
        type: Boolean,
        default: false
    },
    sponsorInfo: {
        brand: String,
        campaignId: String,
        isDisclosed: {
            type: Boolean,
            default: true
        }
    },
    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending',
        index: true
    },
    moderationReasons: [String],
    location: {
        name: String,
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere'
        },
        city: String,
        country: String
    },
    music: {
        title: String,
        artist: String,
        url: String,
        startTime: {
            type: Number,
            min: 0
        },
        duration: {
            type: Number,
            min: 1
        }
    },
    effects: [String],
    privacy: {
        type: String,
        enum: ['public', 'private', 'unlisted'],
        default: 'public'
    },
    allowComments: {
        type: Boolean,
        default: true
    },
    allowSharing: {
        type: Boolean,
        default: true
    },
    ageRestriction: {
        type: Number,
        min: 13,
        max: 21
    },
    publishedAt: {
        type: Date,
        index: true
    },
    scheduledAt: Date,
    expiresAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
VideoSchema.index({ creator: 1, isPublished: 1, createdAt: -1 });
VideoSchema.index({ category: 1, isPublished: 1, publishedAt: -1 });
VideoSchema.index({ contentType: 1, isPublished: 1, publishedAt: -1 });
VideoSchema.index({ isFeatured: 1, isPublished: 1 });
VideoSchema.index({ isTrending: 1, isPublished: 1 });
VideoSchema.index({ tags: 1, isPublished: 1 });
VideoSchema.index({ hashtags: 1, isPublished: 1 });
VideoSchema.index({ 'engagement.views': -1, isPublished: 1 });
VideoSchema.index({ 'engagement.likes': -1, isPublished: 1 });
VideoSchema.index({ moderationStatus: 1 });
VideoSchema.index({ publishedAt: -1 });
// Text search index
VideoSchema.index({
    title: 'text',
    description: 'text',
    tags: 'text',
    hashtags: 'text'
}, {
    weights: {
        title: 10,
        tags: 5,
        hashtags: 3,
        description: 1
    }
});
// Compound indexes
VideoSchema.index({ category: 1, 'engagement.views': -1, publishedAt: -1 });
VideoSchema.index({ creator: 1, privacy: 1, publishedAt: -1 });
// Virtual for like count
VideoSchema.virtual('likeCount').get(function () {
    return this.engagement.likes.length;
});
// Virtual for engagement score
VideoSchema.virtual('engagementScore').get(function () {
    var views = this.engagement.views || 1;
    var likes = this.engagement.likes.length;
    var comments = this.engagement.comments;
    var shares = this.engagement.shares;
    return ((likes * 3 + comments * 2 + shares * 5) / views) * 100;
});
// Virtual for trending score
VideoSchema.virtual('trendingScore').get(function () {
    var _a;
    var ageInHours = (Date.now() - (((_a = this.publishedAt) === null || _a === void 0 ? void 0 : _a.getTime()) || this.createdAt.getTime())) / (1000 * 60 * 60);
    if (ageInHours > 72)
        return 0; // Only consider videos from last 72 hours
    var views = this.engagement.views || 0;
    var likes = this.engagement.likes.length;
    var shares = this.engagement.shares;
    // Time decay factor - newer videos get higher score
    var timeFactor = Math.max(0, (72 - ageInHours) / 72);
    return (views + likes * 10 + shares * 20) * timeFactor;
});
// Pre-save hooks
VideoSchema.pre('save', function (next) {
    // Set published date when first published
    if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    // Update processing status
    if (this.isModified('processing.status') && this.processing.status === 'completed') {
        this.processing.processedAt = new Date();
    }
    next();
});
// Method to increment views
VideoSchema.methods.incrementViews = function (userId) {
    return __awaiter(this, void 0, void 0, function () {
        var now, hour, date;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    this.engagement.views += 1;
                    now = new Date();
                    hour = now.getHours().toString();
                    date = now.toISOString().split('T')[0];
                    if (!this.analytics.viewsByHour)
                        this.analytics.viewsByHour = new Map();
                    if (!this.analytics.viewsByDate)
                        this.analytics.viewsByDate = new Map();
                    this.analytics.totalViews += 1;
                    this.analytics.viewsByHour.set(hour, (this.analytics.viewsByHour.get(hour) || 0) + 1);
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
VideoSchema.methods.toggleLike = function (userId) {
    return __awaiter(this, void 0, void 0, function () {
        var userObjectId, isLiked;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userObjectId = new mongoose_1.default.Types.ObjectId(userId);
                    isLiked = this.engagement.likes.includes(userObjectId);
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
// Method to add comment (simplified)
VideoSchema.methods.addComment = function (userId, content) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // In a full implementation, this would create a Comment document
                    this.engagement.comments += 1;
                    return [4 /*yield*/, this.save()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
// Method to increment shares
VideoSchema.methods.share = function () {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    this.engagement.shares += 1;
                    this.analytics.shareRate = (this.engagement.shares / this.engagement.views) * 100;
                    return [4 /*yield*/, this.save()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
// Method to update analytics
VideoSchema.methods.updateAnalytics = function () {
    return __awaiter(this, void 0, void 0, function () {
        var views, likes, comments, shares;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    views = this.engagement.views || 1;
                    likes = this.engagement.likes.length;
                    comments = this.engagement.comments;
                    shares = this.engagement.shares;
                    this.analytics.engagementRate = ((likes + comments + shares) / views) * 100;
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
// Method to report video
VideoSchema.methods.reportVideo = function (userId, reason, details) {
    return __awaiter(this, void 0, void 0, function () {
        var userObjectId, alreadyReported;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userObjectId = new mongoose_1.default.Types.ObjectId(userId);
                    alreadyReported = this.reports.some(function (report) {
                        return report.userId.equals(userObjectId);
                    });
                    if (!!alreadyReported) return [3 /*break*/, 2];
                    this.reports.push({
                        userId: userObjectId,
                        reason: reason,
                        details: details || '',
                        reportedAt: new Date()
                    });
                    this.reportCount = this.reports.length;
                    // Auto-flag video if it has 5+ reports
                    if (this.reportCount >= 5) {
                        this.isReported = true;
                        this.moderationStatus = 'flagged';
                    }
                    return [4 /*yield*/, this.save()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
};
// Method to check if video is viewable by user
VideoSchema.methods.isViewableBy = function (userId) {
    if (!this.isPublished || !this.isApproved)
        return false;
    if (this.privacy === 'private' && this.creator.toString() !== userId)
        return false;
    if (this.expiresAt && this.expiresAt < new Date())
        return false;
    return true;
};
// Static method to get trending videos
VideoSchema.statics.getTrending = function (category, limit) {
    if (limit === void 0) { limit = 20; }
    var query = {
        isPublished: true,
        isApproved: true,
        privacy: 'public',
        publishedAt: { $gte: new Date(Date.now() - 72 * 60 * 60 * 1000) } // Last 72 hours
    };
    if (category && category !== 'all') {
        query.category = category;
    }
    return this.find(query)
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ 'engagement.views': -1, 'engagement.likes': -1 })
        .limit(limit);
};
// Static method to get featured videos
VideoSchema.statics.getFeatured = function (limit) {
    if (limit === void 0) { limit = 10; }
    return this.find({
        isFeatured: true,
        isPublished: true,
        isApproved: true,
        privacy: 'public'
    })
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .sort({ publishedAt: -1 })
        .limit(limit);
};
// Static method to search videos
VideoSchema.statics.searchVideos = function (searchText, filters, options) {
    if (filters === void 0) { filters = {}; }
    if (options === void 0) { options = {}; }
    var query = {
        $text: { $search: searchText },
        isPublished: true,
        isApproved: true,
        privacy: 'public'
    };
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.creator) {
        query.creator = filters.creator;
    }
    if (filters.hasProducts) {
        query.products = { $exists: true, $not: { $size: 0 } };
    }
    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};
exports.Video = mongoose_1.default.model('Video', VideoSchema);
