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
exports.Store = void 0;
var mongoose_1 = __importStar(require("mongoose"));
// Store Schema
var StoreSchema = new mongoose_1.Schema({
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
        maxlength: 1000
    },
    logo: {
        type: String,
        trim: true
    },
    banner: {
        type: String,
        trim: true
    },
    videos: [{
            url: {
                type: String,
                required: true,
                trim: true
            },
            thumbnail: {
                type: String,
                trim: true
            },
            title: {
                type: String,
                trim: true,
                maxlength: 200
            },
            duration: {
                type: Number,
                min: 0
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subCategories: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Category'
        }],
    location: {
        address: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            trim: true
        },
        pincode: {
            type: String,
            trim: true,
            match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere',
            validate: {
                validator: function (v) {
                    return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
                },
                message: 'Coordinates must be [longitude, latitude] with valid ranges'
            }
        },
        deliveryRadius: {
            type: Number,
            default: 5, // 5 km default
            min: 0,
            max: 50
        },
        landmark: {
            type: String,
            trim: true
        }
    },
    contact: {
        phone: {
            type: String,
            trim: true,
            match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
        },
        website: {
            type: String,
            trim: true
        },
        whatsapp: {
            type: String,
            trim: true,
            match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid WhatsApp number']
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
    offers: {
        cashback: {
            type: Number,
            min: 0,
            max: 100 // Percentage
        },
        minOrderAmount: {
            type: Number,
            min: 0
        },
        maxCashback: {
            type: Number,
            min: 0
        },
        discounts: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Offer'
            }],
        isPartner: {
            type: Boolean,
            default: false
        },
        partnerLevel: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum']
        }
    },
    operationalInfo: {
        hours: {
            monday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            tuesday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            wednesday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            thursday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            friday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            saturday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            sunday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            }
        },
        deliveryTime: {
            type: String,
            default: '30-45 mins'
        },
        minimumOrder: {
            type: Number,
            default: 0,
            min: 0
        },
        deliveryFee: {
            type: Number,
            default: 0,
            min: 0
        },
        freeDeliveryAbove: {
            type: Number,
            min: 0
        },
        acceptsWalletPayment: {
            type: Boolean,
            default: true
        },
        paymentMethods: [{
                type: String,
                enum: ['cash', 'card', 'upi', 'wallet', 'netbanking']
            }]
    },
    deliveryCategories: {
        fastDelivery: {
            type: Boolean,
            default: false
        },
        budgetFriendly: {
            type: Boolean,
            default: false
        },
        ninetyNineStore: {
            type: Boolean,
            default: false
        },
        premium: {
            type: Boolean,
            default: false
        },
        organic: {
            type: Boolean,
            default: false
        },
        alliance: {
            type: Boolean,
            default: false
        },
        lowestPrice: {
            type: Boolean,
            default: false
        },
        mall: {
            type: Boolean,
            default: false
        },
        cashStore: {
            type: Boolean,
            default: false
        }
    },
    analytics: {
        totalOrders: {
            type: Number,
            default: 0,
            min: 0
        },
        totalRevenue: {
            type: Number,
            default: 0,
            min: 0
        },
        avgOrderValue: {
            type: Number,
            default: 0,
            min: 0
        },
        repeatCustomers: {
            type: Number,
            default: 0,
            min: 0
        },
        popularProducts: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product'
            }],
        peakHours: [String],
        monthlyStats: [{
                month: { type: Number, min: 1, max: 12 },
                year: { type: Number, min: 2000 },
                orders: { type: Number, default: 0 },
                revenue: { type: Number, default: 0 }
            }]
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
StoreSchema.index({ slug: 1 });
StoreSchema.index({ category: 1, isActive: 1 });
StoreSchema.index({ 'location.coordinates': '2dsphere' });
StoreSchema.index({ 'location.city': 1, isActive: 1 });
StoreSchema.index({ 'location.pincode': 1 });
StoreSchema.index({ 'ratings.average': -1, isActive: 1 });
StoreSchema.index({ isFeatured: 1, isActive: 1 });
StoreSchema.index({ 'offers.isPartner': 1, isActive: 1 });
StoreSchema.index({ tags: 1, isActive: 1 });
StoreSchema.index({ createdAt: -1 });
// Delivery category indexes
StoreSchema.index({ 'deliveryCategories.fastDelivery': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.budgetFriendly': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.premium': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.organic': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.alliance': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.lowestPrice': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.mall': 1, isActive: 1 });
StoreSchema.index({ 'deliveryCategories.cashStore': 1, isActive: 1 });
// Compound indexes
StoreSchema.index({ category: 1, 'location.city': 1, isActive: 1 });
StoreSchema.index({ 'offers.isPartner': 1, 'ratings.average': -1 });
// Virtual for current operational status
StoreSchema.virtual('isCurrentlyOpen').get(function () {
    return this.isOpen();
});
// Pre-save hook to generate slug
StoreSchema.pre('save', function (next) {
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    }
    next();
});
// Method to check if store is currently open
StoreSchema.methods.isOpen = function () {
    var now = new Date();
    var dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    var currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    var todayHours = this.operationalInfo.hours[dayName];
    if (!todayHours || todayHours.closed) {
        return false;
    }
    return currentTime >= todayHours.open && currentTime <= todayHours.close;
};
// Method to calculate distance from user coordinates
StoreSchema.methods.calculateDistance = function (userCoordinates) {
    if (!this.location.coordinates)
        return Infinity;
    var lon1 = userCoordinates[0], lat1 = userCoordinates[1];
    var _a = this.location.coordinates, lon2 = _a[0], lat2 = _a[1];
    var R = 6371; // Radius of Earth in kilometers
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
};
// Method to check delivery eligibility
StoreSchema.methods.isEligibleForDelivery = function (userCoordinates) {
    var distance = this.calculateDistance(userCoordinates);
    return distance <= (this.location.deliveryRadius || 5);
};
// Method to update ratings
StoreSchema.methods.updateRatings = function () {
    return __awaiter(this, void 0, void 0, function () {
        var Review, reviews, distribution, totalRating;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    Review = this.model('Review');
                    return [4 /*yield*/, Review.find({
                            targetType: 'Store',
                            targetId: this._id,
                            isApproved: true
                        })];
                case 1:
                    reviews = _a.sent();
                    if (reviews.length === 0) {
                        this.ratings = {
                            average: 0,
                            count: 0,
                            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                        };
                        return [2 /*return*/];
                    }
                    distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                    totalRating = 0;
                    reviews.forEach(function (review) {
                        var rating = Math.round(review.rating);
                        distribution[rating]++;
                        totalRating += review.rating;
                    });
                    this.ratings = {
                        average: Math.round((totalRating / reviews.length) * 10) / 10,
                        count: reviews.length,
                        distribution: distribution
                    };
                    return [2 /*return*/];
            }
        });
    });
};
// Static method to find nearby stores
StoreSchema.statics.findNearby = function (coordinates, radius, options) {
    if (radius === void 0) { radius = 10; }
    if (options === void 0) { options = {}; }
    var query = {
        'location.coordinates': {
            $nearSphere: {
                $geometry: {
                    type: 'Point',
                    coordinates: coordinates
                },
                $maxDistance: radius * 1000 // Convert km to meters
            }
        },
        isActive: true
    };
    if (options.category) {
        query.category = options.category;
    }
    if (options.isPartner !== undefined) {
        query['offers.isPartner'] = options.isPartner;
    }
    return this.find(query)
        .populate('category')
        .sort({ 'ratings.average': -1 })
        .limit(options.limit || 50);
};
// Static method to get featured stores
StoreSchema.statics.getFeatured = function (limit) {
    if (limit === void 0) { limit = 10; }
    return this.find({
        isFeatured: true,
        isActive: true
    })
        .populate('category')
        .sort({ 'ratings.average': -1 })
        .limit(limit);
};
exports.Store = mongoose_1.default.model('Store', StoreSchema);
