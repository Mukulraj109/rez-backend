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
exports.MerchantModel = exports.Merchant = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Merchant Schema
const MerchantSchema = new mongoose_1.Schema({
    businessName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    ownerName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false // Don't include password in queries by default
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    businessAddress: {
        street: {
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
            required: true,
            trim: true
        },
        zipCode: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: String,
            required: true,
            trim: true
        },
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    businessLicense: {
        type: String,
        trim: true
    },
    taxId: {
        type: String,
        trim: true
    },
    website: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    logo: {
        type: String,
        trim: true
    },
    lastLogin: {
        type: Date
    },
    // Password Reset
    resetPasswordToken: {
        type: String,
        select: false // Don't include in queries by default
    },
    resetPasswordExpiry: {
        type: Date,
        select: false
    },
    // Email Verification
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        select: false
    },
    emailVerificationExpiry: {
        type: Date,
        select: false
    },
    // Account Security
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    accountLockedUntil: {
        type: Date
    },
    lastLoginAt: {
        type: Date
    },
    lastLoginIP: {
        type: String
    },
    // Additional optional fields
    displayName: String,
    tagline: String,
    coverImage: String,
    galleryImages: [String],
    brandColors: {
        primary: String,
        secondary: String,
        accent: String
    },
    address: mongoose_1.Schema.Types.Mixed,
    contact: mongoose_1.Schema.Types.Mixed,
    socialMedia: mongoose_1.Schema.Types.Mixed,
    businessHours: mongoose_1.Schema.Types.Mixed,
    deliveryOptions: mongoose_1.Schema.Types.Mixed,
    paymentMethods: mongoose_1.Schema.Types.Mixed,
    policies: mongoose_1.Schema.Types.Mixed,
    ratings: mongoose_1.Schema.Types.Mixed,
    status: String,
    isFeatured: { type: Boolean, default: false },
    categories: [String],
    tags: [String],
    // Additional fields needed by merchant-profile route
    timezone: String,
    serviceArea: mongoose_1.Schema.Types.Mixed,
    features: [String],
    reviewSummary: mongoose_1.Schema.Types.Mixed,
    verification: {
        isVerified: { type: Boolean, default: false }
    },
    metrics: {
        totalOrders: { type: Number, default: 0 },
        totalCustomers: { type: Number, default: 0 },
        averageResponseTime: { type: String, default: '< 1 hour' },
        fulfillmentRate: { type: Number, default: 95 }
    },
    activePromotions: [mongoose_1.Schema.Types.Mixed],
    announcements: [mongoose_1.Schema.Types.Mixed],
    searchKeywords: [String],
    sortOrder: { type: Number, default: 0 },
    lastActiveAt: Date,
    isPubliclyVisible: { type: Boolean, default: true },
    searchable: { type: Boolean, default: true },
    acceptingOrders: { type: Boolean, default: true },
    showInDirectory: { type: Boolean, default: true },
    showContact: { type: Boolean, default: true },
    showRatings: { type: Boolean, default: true },
    showBusinessHours: { type: Boolean, default: true },
    allowCustomerMessages: { type: Boolean, default: true },
    showPromotions: { type: Boolean, default: true },
    // Onboarding
    onboarding: {
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'rejected'],
            default: 'pending'
        },
        currentStep: {
            type: Number,
            default: 1,
            min: 1,
            max: 5
        },
        completedSteps: [{
                type: Number,
                min: 1,
                max: 5
            }],
        stepData: {
            businessInfo: {
                companyName: String,
                businessType: String,
                registrationNumber: String,
                gstNumber: String,
                panNumber: String
            },
            storeDetails: {
                storeName: String,
                description: String,
                category: String,
                logoUrl: String,
                bannerUrl: String,
                address: {
                    street: String,
                    city: String,
                    state: String,
                    zipCode: String,
                    country: String,
                    landmark: String
                }
            },
            bankDetails: {
                accountNumber: String,
                ifscCode: String,
                accountHolderName: String,
                bankName: String,
                branchName: String
            },
            verification: {
                documents: [{
                        type: {
                            type: String,
                            enum: ['business_license', 'id_proof', 'address_proof', 'gst_certificate', 'pan_card']
                        },
                        url: String,
                        status: {
                            type: String,
                            enum: ['pending', 'verified', 'rejected'],
                            default: 'pending'
                        },
                        rejectionReason: String,
                        uploadedAt: {
                            type: Date,
                            default: Date.now
                        }
                    }],
                verificationStatus: {
                    type: String,
                    enum: ['pending', 'verified', 'rejected'],
                    default: 'pending'
                },
                verifiedAt: Date,
                verifiedBy: String
            }
        },
        startedAt: Date,
        completedAt: Date,
        rejectionReason: String
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            return ret;
        }
    }
});
// Indexes
// Note: email index is automatically created due to unique: true in schema
MerchantSchema.index({ verificationStatus: 1 });
MerchantSchema.index({ isActive: 1 });
MerchantSchema.index({ 'businessAddress.city': 1 });
MerchantSchema.index({ 'businessAddress.state': 1 });
MerchantSchema.index({ 'onboarding.status': 1 });
MerchantSchema.index({ 'onboarding.currentStep': 1 });
// Add static methods before creating the model
MerchantSchema.statics.update = async function (id, updates) {
    return await this.findByIdAndUpdate(id, updates, { new: true });
};
exports.Merchant = mongoose_1.default.model('Merchant', MerchantSchema);
exports.MerchantModel = exports.Merchant;
