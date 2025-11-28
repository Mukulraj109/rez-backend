"use strict";
// Offer Model
// Main model for managing all types of offers (mega, student, new arrival, etc.)
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
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var OfferSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Offer title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters'],
        index: true
    },
    subtitle: {
        type: String,
        trim: true,
        maxlength: [200, 'Subtitle cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    image: {
        type: String,
        required: [true, 'Offer image is required'],
        validate: {
            validator: function (v) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
            },
            message: 'Image must be a valid URL'
        }
    },
    category: {
        type: String,
        enum: ['mega', 'student', 'new_arrival', 'trending', 'food', 'fashion', 'electronics', 'general'],
        required: [true, 'Offer category is required'],
        index: true
    },
    type: {
        type: String,
        enum: ['cashback', 'discount', 'voucher', 'combo', 'special', 'walk_in'],
        required: [true, 'Offer type is required'],
        default: 'cashback'
    },
    cashbackPercentage: {
        type: Number,
        required: [true, 'Cashback percentage is required'],
        min: [0, 'Cashback percentage cannot be negative'],
        max: [100, 'Cashback percentage cannot exceed 100%']
    },
    originalPrice: {
        type: Number,
        min: [0, 'Original price cannot be negative']
    },
    discountedPrice: {
        type: Number,
        min: [0, 'Discounted price cannot be negative']
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: function (v) {
                    return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
                },
                message: 'Invalid coordinates format'
            }
        }
    },
    distance: {
        type: Number,
        min: [0, 'Distance cannot be negative']
    },
    store: {
        id: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Store',
            required: [true, 'Store reference is required'],
            index: true
        },
        name: {
            type: String,
            required: [true, 'Store name is required'],
            trim: true
        },
        logo: {
            type: String,
            validate: {
                validator: function (v) {
                    return !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
                },
                message: 'Logo must be a valid URL'
            }
        },
        rating: {
            type: Number,
            min: [0, 'Rating cannot be negative'],
            max: [5, 'Rating cannot exceed 5']
        },
        verified: {
            type: Boolean,
            default: false
        }
    },
    validity: {
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
            index: true
        },
        endDate: {
            type: Date,
            required: [true, 'End date is required'],
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    engagement: {
        likesCount: {
            type: Number,
            default: 0,
            min: [0, 'Likes count cannot be negative']
        },
        sharesCount: {
            type: Number,
            default: 0,
            min: [0, 'Shares count cannot be negative']
        },
        viewsCount: {
            type: Number,
            default: 0,
            min: [0, 'Views count cannot be negative']
        }
    },
    restrictions: {
        minOrderValue: {
            type: Number,
            min: [0, 'Minimum order value cannot be negative']
        },
        maxDiscountAmount: {
            type: Number,
            min: [0, 'Maximum discount amount cannot be negative']
        },
        applicableOn: [{
                type: String,
                enum: ['online', 'offline', 'both']
            }],
        excludedProducts: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product'
            }],
        ageRestriction: {
            minAge: {
                type: Number,
                min: [0, 'Minimum age cannot be negative'],
                max: [120, 'Minimum age cannot exceed 120']
            },
            maxAge: {
                type: Number,
                min: [0, 'Maximum age cannot be negative'],
                max: [120, 'Maximum age cannot exceed 120']
            }
        },
        userTypeRestriction: {
            type: String,
            enum: ['student', 'new_user', 'premium', 'all'],
            default: 'all'
        },
        usageLimitPerUser: {
            type: Number,
            min: [1, 'Usage limit per user must be at least 1']
        },
        usageLimit: {
            type: Number,
            min: [1, 'Total usage limit must be at least 1']
        }
    },
    metadata: {
        isNew: {
            type: Boolean,
            default: false,
            index: true
        },
        isTrending: {
            type: Boolean,
            default: false,
            index: true
        },
        isBestSeller: {
            type: Boolean,
            default: false,
            index: true
        },
        isSpecial: {
            type: Boolean,
            default: false,
            index: true
        },
        priority: {
            type: Number,
            default: 0,
            index: true
        },
        tags: [{
                type: String,
                trim: true,
                lowercase: true
            }],
        featured: {
            type: Boolean,
            default: false,
            index: true
        },
        flashSale: {
            isActive: {
                type: Boolean,
                default: false
            },
            endTime: {
                type: Date
            },
            originalPrice: {
                type: Number,
                min: [0, 'Flash sale original price cannot be negative']
            },
            salePrice: {
                type: Number,
                min: [0, 'Flash sale price cannot be negative']
            }
        }
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Created by user is required'],
        index: true
    }
}, {
    timestamps: true
});
// Geospatial index for location-based queries
OfferSchema.index({ location: '2dsphere' });
// Compound indexes for efficient queries
OfferSchema.index({ category: 1, 'validity.isActive': 1, 'validity.endDate': 1 });
OfferSchema.index({ 'metadata.isTrending': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'metadata.isNew': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'metadata.featured': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'store.id': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'metadata.priority': -1, 'validity.isActive': 1 });
// Instance methods
OfferSchema.methods.calculateDistance = function (userLocation) {
    var R = 6371; // Earth's radius in kilometers
    var dLat = this.toRadians(userLocation[1] - this.location.coordinates[1]);
    var dLon = this.toRadians(userLocation[0] - this.location.coordinates[0]);
    var lat1 = this.toRadians(this.location.coordinates[1]);
    var lat2 = this.toRadians(userLocation[1]);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
};
OfferSchema.methods.toRadians = function (degrees) {
    return degrees * (Math.PI / 180);
};
OfferSchema.methods.isExpired = function () {
    return new Date() > this.validity.endDate;
};
OfferSchema.methods.isActiveForUser = function (userId) {
    return __awaiter(this, void 0, void 0, function () {
        var now;
        return __generator(this, function (_a) {
            now = new Date();
            // Check if offer is expired
            if (now > this.validity.endDate) {
                return [2 /*return*/, { canUse: false, reason: 'Offer has expired' }];
            }
            // Check if offer is not yet active
            if (now < this.validity.startDate) {
                return [2 /*return*/, { canUse: false, reason: 'Offer is not yet active' }];
            }
            // Check if offer is active
            if (!this.validity.isActive) {
                return [2 /*return*/, { canUse: false, reason: 'Offer is not active' }];
            }
            // Check user type restrictions
            if (this.restrictions.userTypeRestriction && this.restrictions.userTypeRestriction !== 'all') {
                // This would need to be implemented based on user data
                // For now, we'll assume all users can use the offer
            }
            return [2 /*return*/, { canUse: true }];
        });
    });
};
OfferSchema.methods.incrementEngagement = function (action) {
    return __awaiter(this, void 0, void 0, function () {
        var updateField;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    updateField = "".concat(action, "Count");
                    if (!(updateField in this.engagement)) return [3 /*break*/, 2];
                    this.engagement[updateField] = this.engagement[updateField] + 1;
                    return [4 /*yield*/, this.save()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
};
// Static methods
OfferSchema.statics.findActiveOffers = function () {
    var now = new Date();
    return this.find({
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    }).sort({ 'metadata.priority': -1, createdAt: -1 });
};
OfferSchema.statics.findOffersByCategory = function (category) {
    var now = new Date();
    return this.find({
        category: category,
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    }).sort({ 'metadata.priority': -1, createdAt: -1 });
};
OfferSchema.statics.findNearbyOffers = function (userLocation, maxDistance) {
    if (maxDistance === void 0) { maxDistance = 10; }
    var now = new Date();
    return this.find({
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: userLocation
                },
                $maxDistance: maxDistance * 1000 // Convert km to meters
            }
        },
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    }).sort({ 'metadata.priority': -1, createdAt: -1 });
};
OfferSchema.statics.findTrendingOffers = function (limit) {
    if (limit === void 0) { limit = 10; }
    var now = new Date();
    return this.find({
        'metadata.isTrending': true,
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    })
        .sort({ 'engagement.likesCount': -1, 'metadata.priority': -1 })
        .limit(limit)
        .lean();
};
OfferSchema.statics.findNewArrivals = function (limit) {
    if (limit === void 0) { limit = 10; }
    var now = new Date();
    return this.find({
        'metadata.isNew': true,
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    })
        .sort({ createdAt: -1, 'metadata.priority': -1 })
        .limit(limit)
        .lean();
};
OfferSchema.statics.findStudentOffers = function () {
    var now = new Date();
    return this.find({
        $or: [
            { category: 'student' },
            { 'restrictions.userTypeRestriction': 'student' }
        ],
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    }).sort({ 'metadata.priority': -1, createdAt: -1 }).lean();
};
OfferSchema.statics.findMegaOffers = function () {
    var now = new Date();
    return this.find({
        category: 'mega',
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    }).sort({ 'metadata.priority': -1, createdAt: -1 }).lean();
};
OfferSchema.statics.searchOffers = function (query, filters) {
    if (filters === void 0) { filters = {}; }
    var now = new Date();
    var searchQuery = {
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    };
    // Text search
    if (query) {
        searchQuery.$or = [
            { title: { $regex: query, $options: 'i' } },
            { subtitle: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { 'store.name': { $regex: query, $options: 'i' } },
            { 'metadata.tags': { $in: [new RegExp(query, 'i')] } }
        ];
    }
    // Apply filters
    if (filters.category) {
        searchQuery.category = filters.category;
    }
    if (filters.type) {
        searchQuery.type = filters.type;
    }
    if (filters.minCashback) {
        searchQuery.cashbackPercentage = { $gte: filters.minCashback };
    }
    if (filters.maxCashback) {
        searchQuery.cashbackPercentage = __assign(__assign({}, searchQuery.cashbackPercentage), { $lte: filters.maxCashback });
    }
    return this.find(searchQuery).sort({ 'metadata.priority': -1, createdAt: -1 });
};
// Pre-save middleware
OfferSchema.pre('save', function (next) {
    var _a, _b;
    // Validate that end date is after start date
    if (this.validity.endDate <= this.validity.startDate) {
        next(new Error('End date must be after start date'));
        return;
    }
    // Validate flash sale dates
    if (((_a = this.metadata.flashSale) === null || _a === void 0 ? void 0 : _a.isActive) && ((_b = this.metadata.flashSale) === null || _b === void 0 ? void 0 : _b.endTime)) {
        if (this.metadata.flashSale.endTime <= new Date()) {
            this.metadata.flashSale.isActive = false;
        }
    }
    next();
});
// Create and export the model
var Offer = mongoose_1.default.model('Offer', OfferSchema);
exports.default = Offer;
