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
exports.UserVoucher = exports.VoucherBrand = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// VoucherBrand Schema
const VoucherBrandSchema = new mongoose_1.Schema({
    // Brand info
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true,
    },
    logo: {
        type: String,
        required: true,
    },
    backgroundColor: {
        type: String,
        default: '#F3F4F6',
    },
    logoColor: {
        type: String,
        default: '#000000',
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500,
    },
    // Cashback
    cashbackRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
    },
    // Rating
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 4.5,
    },
    ratingCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Category
    category: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    // Flags
    isNewlyAdded: {
        type: Boolean,
        default: true,
        index: true,
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    // Denominations
    denominations: [{
            type: Number,
            min: 1,
        }],
    // Terms
    termsAndConditions: [{
            type: String,
            trim: true,
        }],
    // Analytics
    purchaseCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    viewCount: {
        type: Number,
        default: 0,
        min: 0,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
VoucherBrandSchema.index({ category: 1, isActive: 1 });
VoucherBrandSchema.index({ isFeatured: 1, isActive: 1 });
VoucherBrandSchema.index({ isNewlyAdded: 1, isActive: 1 });
VoucherBrandSchema.index({ name: 'text', description: 'text' });
// UserVoucher Schema
const UserVoucherSchema = new mongoose_1.Schema({
    // User & Brand
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    brand: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'VoucherBrand',
        required: true,
        index: true,
    },
    // Voucher details
    voucherCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true,
    },
    denomination: {
        type: Number,
        required: true,
        min: 1,
    },
    purchasePrice: {
        type: Number,
        required: true,
        min: 0,
    },
    // Validity
    purchaseDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    expiryDate: {
        type: Date,
        required: true,
    },
    validityDays: {
        type: Number,
        required: true,
        default: 365, // 1 year default
    },
    // Status
    status: {
        type: String,
        enum: ['active', 'used', 'expired', 'cancelled'],
        default: 'active',
        index: true,
    },
    usedDate: {
        type: Date,
    },
    usedAt: {
        type: String,
    },
    // Delivery
    deliveryMethod: {
        type: String,
        enum: ['email', 'sms', 'app', 'physical'],
        default: 'app',
    },
    deliveryStatus: {
        type: String,
        enum: ['pending', 'delivered', 'failed'],
        default: 'pending',
    },
    deliveredAt: {
        type: Date,
    },
    // Payment
    paymentMethod: {
        type: String,
        enum: ['wallet', 'card', 'upi', 'netbanking'],
        required: true,
    },
    transactionId: {
        type: String,
        index: true,
    },
    // QR Code
    qrCode: {
        type: String,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
UserVoucherSchema.index({ user: 1, status: 1 });
UserVoucherSchema.index({ voucherCode: 1 }, { unique: true });
UserVoucherSchema.index({ expiryDate: 1 });
UserVoucherSchema.index({ purchaseDate: 1 });
// Pre-save middleware to generate voucher code if not provided
UserVoucherSchema.pre('save', function (next) {
    if (!this.voucherCode) {
        // Generate unique voucher code: BRAND-DENOMINATION-RANDOM
        const brandPrefix = this.brand.toString().substring(0, 6).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.voucherCode = `${brandPrefix}-${this.denomination}-${random}`;
    }
    // Set expiry date if not set
    if (!this.expiryDate && this.validityDays) {
        const expiry = new Date(this.purchaseDate);
        expiry.setDate(expiry.getDate() + this.validityDays);
        this.expiryDate = expiry;
    }
    next();
});
// Method to check if voucher is valid
UserVoucherSchema.methods.isValid = function () {
    return (this.status === 'active' &&
        new Date() <= this.expiryDate);
};
// Method to mark voucher as used
UserVoucherSchema.methods.markAsUsed = async function (usageLocation) {
    this.status = 'used';
    this.usedDate = new Date();
    if (usageLocation) {
        this.usedAt = usageLocation;
    }
    return this.save();
};
// Static method to check expiry and update status
UserVoucherSchema.statics.updateExpiredVouchers = async function () {
    const now = new Date();
    return this.updateMany({
        status: 'active',
        expiryDate: { $lt: now },
    }, {
        $set: { status: 'expired' },
    });
};
// Static method to get user's active vouchers
UserVoucherSchema.statics.getUserActiveVouchers = function (userId) {
    return this.find({
        user: userId,
        status: 'active',
        expiryDate: { $gte: new Date() },
    })
        .populate('brand', 'name logo backgroundColor cashbackRate')
        .sort({ purchaseDate: -1 });
};
const VoucherBrand = mongoose_1.default.model('VoucherBrand', VoucherBrandSchema);
exports.VoucherBrand = VoucherBrand;
const UserVoucher = mongoose_1.default.model('UserVoucher', UserVoucherSchema);
exports.UserVoucher = UserVoucher;
exports.default = VoucherBrand;
