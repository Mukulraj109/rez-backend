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
exports.MerchantUser = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// MerchantUser Schema
const MerchantUserSchema = new mongoose_1.Schema({
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Merchant',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: false, // Not required initially for invited users
        select: false // Don't include password in queries by default
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'manager', 'staff'],
        required: true,
        default: 'staff'
    },
    permissions: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'inactive', // Inactive until invitation accepted
        index: true
    },
    invitedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'MerchantUser',
        required: true
    },
    invitedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    acceptedAt: {
        type: Date
    },
    lastLoginAt: {
        type: Date
    },
    // Invitation fields
    invitationToken: {
        type: String,
        select: false
    },
    invitationExpiry: {
        type: Date,
        select: false
    },
    // Password Reset
    resetPasswordToken: {
        type: String,
        select: false
    },
    resetPasswordExpiry: {
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
    lastLoginIP: {
        type: String
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            delete ret.invitationToken;
            delete ret.resetPasswordToken;
            return ret;
        }
    }
});
// Indexes
MerchantUserSchema.index({ merchantId: 1, email: 1 }, { unique: true }); // Unique email per merchant
MerchantUserSchema.index({ merchantId: 1, role: 1 });
MerchantUserSchema.index({ merchantId: 1, status: 1 });
MerchantUserSchema.index({ invitationToken: 1 });
// Instance method to check if account is locked
MerchantUserSchema.methods.isAccountLocked = function () {
    return this.accountLockedUntil ? this.accountLockedUntil > new Date() : false;
};
exports.MerchantUser = mongoose_1.default.model('MerchantUser', MerchantUserSchema);
