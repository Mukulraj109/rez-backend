"use strict";
// SpinWheel Models
// Complete database models for spin wheel reward system
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
exports.UserSpinMetrics = exports.SpinWheelSpin = exports.SpinWheelConfig = void 0;
exports.getStartOfDayUTC = getStartOfDayUTC;
exports.getEndOfDayUTC = getEndOfDayUTC;
const mongoose_1 = __importStar(require("mongoose"));
const SpinWheelSegmentSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Number, required: true },
    color: { type: String, required: true },
    type: {
        type: String,
        enum: ['coins', 'discount', 'voucher', 'nothing'],
        required: true
    },
    icon: { type: String, required: true },
    probability: { type: Number, min: 0, max: 100, default: null }
});
const SpinWheelConfigSchema = new mongoose_1.Schema({
    isActive: { type: Boolean, default: true },
    segments: { type: [SpinWheelSegmentSchema], required: true },
    rulesPerDay: {
        maxSpins: { type: Number, default: 3, min: 1 },
        spinResetHour: { type: Number, default: 0, min: 0, max: 23 } // Midnight UTC
    },
    cooldownMinutes: { type: Number, default: 0, min: 0 }, // No cooldown by default
    rewardExpirationDays: { type: Number, default: 30, min: 1 }
}, {
    timestamps: true
});
exports.SpinWheelConfig = mongoose_1.default.model('SpinWheelConfig', SpinWheelConfigSchema);
const SpinWheelSpinSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    segmentId: { type: String, required: true },
    segmentLabel: { type: String, required: true },
    rewardType: {
        type: String,
        enum: ['coins', 'discount', 'voucher', 'nothing'],
        required: true
    },
    rewardValue: { type: Number, required: true, default: 0 },
    spinTimestamp: { type: Date, default: Date.now, index: true },
    claimedAt: { type: Date, default: null },
    status: {
        type: String,
        enum: ['pending', 'claimed', 'expired'],
        default: 'claimed', // Auto-claim on spin for coins
        index: true
    },
    expiresAt: { type: Date, required: true, index: true },
    ipAddress: { type: String },
    deviceInfo: {
        platform: { type: String },
        appVersion: { type: String }
    }
}, {
    timestamps: true
});
// Index for querying user's spin history
SpinWheelSpinSchema.index({ userId: 1, spinTimestamp: -1 });
SpinWheelSpinSchema.index({ status: 1, expiresAt: 1 }); // For cleanup jobs
exports.SpinWheelSpin = mongoose_1.default.model('SpinWheelSpin', SpinWheelSpinSchema);
const UserSpinMetricsSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: { type: Date, required: true, index: true }, // Stores date at midnight UTC
    spinsUsedToday: { type: Number, default: 0, min: 0 },
    spinsRemaining: { type: Number, default: 3, min: 0 },
    lastSpinAt: { type: Date },
    nextSpinEligibleAt: { type: Date },
    totalCoinsEarned: { type: Number, default: 0, min: 0 },
    totalSpinsCompleted: { type: Number, default: 0, min: 0 }
}, {
    timestamps: true
});
// Compound unique index to ensure one record per user per day
UserSpinMetricsSchema.index({ userId: 1, date: 1 }, { unique: true });
exports.UserSpinMetrics = mongoose_1.default.model('UserSpinMetrics', UserSpinMetricsSchema);
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Get start of day in UTC
 */
function getStartOfDayUTC(date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
/**
 * Get end of day in UTC
 */
function getEndOfDayUTC(date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
}
