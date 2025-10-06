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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// User Schema
const UserSchema = new mongoose_1.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
    },
    email: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple null values
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        minlength: 6,
        select: false // Don't include password in queries by default
    },
    profile: {
        firstName: {
            type: String,
            trim: true,
            maxlength: 50
        },
        lastName: {
            type: String,
            trim: true,
            maxlength: 50
        },
        avatar: {
            type: String,
            default: null
        },
        bio: {
            type: String,
            trim: true,
            maxlength: 500
        },
        dateOfBirth: {
            type: Date
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other']
        },
        location: {
            address: String,
            city: String,
            state: String,
            pincode: {
                type: String,
                match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                index: '2dsphere' // For geospatial queries
            }
        },
        locationHistory: [{
                coordinates: {
                    type: [Number],
                    required: true
                },
                address: {
                    type: String,
                    required: true
                },
                city: String,
                timestamp: {
                    type: Date,
                    default: Date.now
                },
                source: {
                    type: String,
                    enum: ['manual', 'gps', 'ip'],
                    default: 'manual'
                }
            }],
        timezone: {
            type: String,
            default: 'Asia/Kolkata'
        }
    },
    preferences: {
        language: {
            type: String,
            default: 'en',
            enum: ['en', 'hi', 'te', 'ta', 'bn']
        },
        notifications: {
            type: Boolean,
            default: true
        },
        categories: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Category'
            }],
        theme: {
            type: String,
            default: 'light',
            enum: ['light', 'dark']
        },
        emailNotifications: {
            type: Boolean,
            default: true
        },
        pushNotifications: {
            type: Boolean,
            default: true
        },
        smsNotifications: {
            type: Boolean,
            default: false
        }
    },
    wallet: {
        balance: {
            type: Number,
            default: 0,
            min: 0
        },
        totalEarned: {
            type: Number,
            default: 0,
            min: 0
        },
        totalSpent: {
            type: Number,
            default: 0,
            min: 0
        },
        pendingAmount: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    auth: {
        isVerified: {
            type: Boolean,
            default: false
        },
        isOnboarded: {
            type: Boolean,
            default: false
        },
        lastLogin: {
            type: Date
        },
        refreshToken: {
            type: String,
            select: false
        },
        otpCode: {
            type: String,
            select: false
        },
        otpExpiry: {
            type: Date,
            select: false
        },
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: {
            type: Date,
            select: false
        }
    },
    referral: {
        referralCode: {
            type: String,
            unique: true,
            uppercase: true,
            trim: true,
            minlength: 6,
            maxlength: 10
        },
        referredBy: {
            type: String,
            uppercase: true,
            trim: true
        },
        referredUsers: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User'
            }],
        totalReferrals: {
            type: Number,
            default: 0
        },
        referralEarnings: {
            type: Number,
            default: 0
        }
    },
    socialLogin: {
        googleId: String,
        facebookId: String,
        provider: {
            type: String,
            enum: ['google', 'facebook']
        }
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'merchant'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.password;
            if (ret.auth) {
                delete ret.auth.refreshToken;
                delete ret.auth.otpCode;
                delete ret.auth.otpExpiry;
                delete ret.auth.lockUntil;
            }
            return ret;
        }
    }
});
// Indexes for performance
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ 'referral.referralCode': 1 });
UserSchema.index({ 'referral.referredBy': 1 });
UserSchema.index({ 'profile.location.coordinates': '2dsphere' });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'auth.isVerified': 1 });
UserSchema.index({ role: 1 });
// Virtual for account lock status
UserSchema.virtual('isLocked').get(function () {
    return !!(this.auth.lockUntil && this.auth.lockUntil > new Date());
});
// Pre-save hook to generate referral code and hash password
UserSchema.pre('save', async function (next) {
    // Generate referral code for new users
    if (this.isNew && !this.referral.referralCode) {
        this.referral.referralCode = await generateUniqueReferralCode();
    }
    // Only hash the password if it has been modified (or is new)
    if (this.isModified('password') && this.password) {
        // Hash password with cost of 12
        this.password = await bcryptjs_1.default.hash(this.password, 12);
    }
    next();
});
// Helper function to generate unique referral code
async function generateUniqueReferralCode() {
    const User = mongoose_1.default.model('User');
    let referralCode;
    let isUnique = false;
    while (!isUnique) {
        // Generate 6-character alphanumeric code
        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        // Check if code already exists
        const existingUser = await User.findOne({ 'referral.referralCode': referralCode });
        if (!existingUser) {
            isUnique = true;
        }
    }
    return referralCode;
}
// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password)
        return false;
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
// Instance method to generate OTP
UserSchema.methods.generateOTP = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    this.auth.otpCode = otp;
    this.auth.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    return otp;
};
// Instance method to verify OTP
UserSchema.methods.verifyOTP = function (otp) {
    // DEV MODE: Skip OTP verification for development
    // TODO: UNCOMMENT BELOW SECTION FOR PRODUCTION DEPLOYMENT
    /*
    if (!this.auth.otpCode || !this.auth.otpExpiry) return false;
  
    const isValid = this.auth.otpCode === otp && this.auth.otpExpiry > new Date();
  
    if (isValid) {
      // Clear OTP after successful verification
      this.auth.otpCode = undefined;
      this.auth.otpExpiry = undefined;
      this.auth.isVerified = true;
    }
  
    return isValid;
    */
    // DEV MODE: Accept any 6-digit OTP and mark as verified
    console.log(`🔧 [DEV MODE] User.verifyOTP - accepting any OTP: ${otp}`);
    // Clear OTP and mark as verified (simulate successful verification)
    this.auth.otpCode = undefined;
    this.auth.otpExpiry = undefined;
    this.auth.isVerified = true;
    return true; // Always return true in dev mode
};
// Instance method to check if account is locked
UserSchema.methods.isAccountLocked = function () {
    return !!(this.auth.lockUntil && this.auth.lockUntil > new Date());
};
// Instance method to increment login attempts
UserSchema.methods.incrementLoginAttempts = async function () {
    // Check if we have a previous lock that has expired
    if (this.auth.lockUntil && this.auth.lockUntil < new Date()) {
        return this.updateOne({
            $unset: { 'auth.lockUntil': 1, 'auth.loginAttempts': 1 }
        });
    }
    const updates = { $inc: { 'auth.loginAttempts': 1 } };
    // Lock account after 5 failed attempts for 30 minutes
    if (this.auth.loginAttempts + 1 >= 5 && !this.auth.lockUntil) {
        updates.$set = { 'auth.lockUntil': new Date(Date.now() + 30 * 60 * 1000) };
    }
    return this.updateOne(updates);
};
// Instance method to reset login attempts
UserSchema.methods.resetLoginAttempts = async function () {
    return this.updateOne({
        $unset: { 'auth.lockUntil': 1, 'auth.loginAttempts': 1 }
    });
};
// Static method to find by phone or email
UserSchema.statics.findByCredentials = function (identifier) {
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier } : { phoneNumber: identifier };
    return this.findOne(query).select('+password');
};
exports.User = mongoose_1.default.model('User', UserSchema);
