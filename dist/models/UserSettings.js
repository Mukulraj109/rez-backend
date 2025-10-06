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
exports.UserSettings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// User Settings Schema
const UserSettingsSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    general: {
        language: {
            type: String,
            default: 'en'
        },
        currency: {
            type: String,
            default: 'INR'
        },
        timezone: {
            type: String,
            default: 'Asia/Kolkata'
        },
        dateFormat: {
            type: String,
            default: 'DD/MM/YYYY'
        },
        timeFormat: {
            type: String,
            enum: ['12h', '24h'],
            default: '12h'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
        }
    },
    notifications: {
        push: {
            enabled: { type: Boolean, default: true },
            orderUpdates: { type: Boolean, default: true },
            promotions: { type: Boolean, default: false },
            recommendations: { type: Boolean, default: true },
            priceAlerts: { type: Boolean, default: true },
            deliveryUpdates: { type: Boolean, default: true },
            paymentUpdates: { type: Boolean, default: true },
            securityAlerts: { type: Boolean, default: true },
            chatMessages: { type: Boolean, default: true }
        },
        email: {
            enabled: { type: Boolean, default: true },
            newsletters: { type: Boolean, default: false },
            orderReceipts: { type: Boolean, default: true },
            weeklyDigest: { type: Boolean, default: true },
            promotions: { type: Boolean, default: false },
            securityAlerts: { type: Boolean, default: true },
            accountUpdates: { type: Boolean, default: true }
        },
        sms: {
            enabled: { type: Boolean, default: true },
            orderUpdates: { type: Boolean, default: true },
            deliveryAlerts: { type: Boolean, default: true },
            paymentConfirmations: { type: Boolean, default: true },
            securityAlerts: { type: Boolean, default: true },
            otpMessages: { type: Boolean, default: true }
        },
        inApp: {
            enabled: { type: Boolean, default: true },
            showBadges: { type: Boolean, default: true },
            soundEnabled: { type: Boolean, default: true },
            vibrationEnabled: { type: Boolean, default: true },
            bannerStyle: {
                type: String,
                enum: ['BANNER', 'ALERT', 'SILENT'],
                default: 'BANNER'
            }
        }
    },
    privacy: {
        profileVisibility: {
            type: String,
            enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'],
            default: 'FRIENDS'
        },
        showActivity: { type: Boolean, default: false },
        showPurchaseHistory: { type: Boolean, default: false },
        allowMessaging: { type: Boolean, default: true },
        allowFriendRequests: { type: Boolean, default: true },
        dataSharing: {
            shareWithPartners: { type: Boolean, default: false },
            shareForMarketing: { type: Boolean, default: false },
            shareForRecommendations: { type: Boolean, default: true },
            shareForAnalytics: { type: Boolean, default: false },
            sharePurchaseData: { type: Boolean, default: false }
        },
        analytics: {
            allowUsageTracking: { type: Boolean, default: true },
            allowCrashReporting: { type: Boolean, default: true },
            allowPerformanceTracking: { type: Boolean, default: true },
            allowLocationTracking: { type: Boolean, default: false }
        }
    },
    security: {
        twoFactorAuth: {
            enabled: { type: Boolean, default: false },
            method: {
                type: String,
                enum: ['2FA_SMS', '2FA_EMAIL', '2FA_APP'],
                default: '2FA_SMS'
            },
            backupCodes: [{ type: String }],
            lastUpdated: Date
        },
        biometric: {
            fingerprintEnabled: { type: Boolean, default: false },
            faceIdEnabled: { type: Boolean, default: false },
            voiceEnabled: { type: Boolean, default: false },
            availableMethods: [{
                    type: String,
                    enum: ['FINGERPRINT', 'FACE_ID', 'VOICE']
                }]
        },
        sessionManagement: {
            autoLogoutTime: {
                type: Number,
                default: 30,
                min: 5,
                max: 120
            },
            allowMultipleSessions: { type: Boolean, default: true },
            rememberMe: { type: Boolean, default: true }
        },
        loginAlerts: { type: Boolean, default: true }
    },
    delivery: {
        defaultAddressId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Address'
        },
        deliveryInstructions: String,
        deliveryTime: {
            preferred: {
                type: String,
                enum: ['ASAP', 'SCHEDULED'],
                default: 'ASAP'
            },
            workingDays: [{
                    type: String,
                    enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
                }]
        },
        contactlessDelivery: { type: Boolean, default: true },
        deliveryNotifications: { type: Boolean, default: true }
    },
    payment: {
        defaultPaymentMethodId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'PaymentMethod'
        },
        autoPayEnabled: { type: Boolean, default: false },
        paymentPinEnabled: { type: Boolean, default: true },
        biometricPaymentEnabled: { type: Boolean, default: true },
        transactionLimits: {
            dailyLimit: { type: Number, default: 5000 },
            weeklyLimit: { type: Number, default: 25000 },
            monthlyLimit: { type: Number, default: 100000 },
            singleTransactionLimit: { type: Number, default: 10000 }
        }
    },
    preferences: {
        startupScreen: {
            type: String,
            enum: ['HOME', 'EXPLORE', 'LAST_VIEWED'],
            default: 'HOME'
        },
        defaultView: {
            type: String,
            enum: ['CARD', 'LIST', 'GRID'],
            default: 'CARD'
        },
        autoRefresh: { type: Boolean, default: true },
        offlineMode: { type: Boolean, default: false },
        dataSaver: { type: Boolean, default: false },
        highQualityImages: { type: Boolean, default: true },
        animations: { type: Boolean, default: true },
        sounds: { type: Boolean, default: true },
        hapticFeedback: { type: Boolean, default: true }
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// Indexes
UserSettingsSchema.index({ user: 1 });
// Pre-save hook to update lastUpdated
UserSettingsSchema.pre('save', function (next) {
    this.lastUpdated = new Date();
    next();
});
exports.UserSettings = mongoose_1.default.model('UserSettings', UserSettingsSchema);
