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
exports.Activity = exports.getActivityTypeDefaults = exports.ActivityType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Activity Types
var ActivityType;
(function (ActivityType) {
    ActivityType["ORDER"] = "ORDER";
    ActivityType["CASHBACK"] = "CASHBACK";
    ActivityType["REVIEW"] = "REVIEW";
    ActivityType["VIDEO"] = "VIDEO";
    ActivityType["PROJECT"] = "PROJECT";
    ActivityType["VOUCHER"] = "VOUCHER";
    ActivityType["OFFER"] = "OFFER";
    ActivityType["REFERRAL"] = "REFERRAL";
    ActivityType["WALLET"] = "WALLET";
    ActivityType["ACHIEVEMENT"] = "ACHIEVEMENT";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
// Activity Schema
const ActivitySchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: Object.values(ActivityType),
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    amount: {
        type: Number
    },
    icon: {
        type: String,
        required: true
    },
    color: {
        type: String,
        default: '#10B981'
    },
    relatedEntity: {
        id: {
            type: mongoose_1.Schema.Types.ObjectId
        },
        type: {
            type: String
        }
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed
    }
}, {
    timestamps: true
});
// Indexes
ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ user: 1, type: 1, createdAt: -1 });
// Static method to create activity
ActivitySchema.statics.createActivity = async function (userId, type, data) {
    const activity = new this({
        user: userId,
        type,
        ...data
    });
    return await activity.save();
};
// Helper function to get icon and color for activity type
const getActivityTypeDefaults = (type) => {
    const defaults = {
        [ActivityType.ORDER]: { icon: 'checkmark-circle', color: '#10B981' },
        [ActivityType.CASHBACK]: { icon: 'cash', color: '#F59E0B' },
        [ActivityType.REVIEW]: { icon: 'star', color: '#EC4899' },
        [ActivityType.VIDEO]: { icon: 'videocam', color: '#8B5CF6' },
        [ActivityType.PROJECT]: { icon: 'briefcase', color: '#3B82F6' },
        [ActivityType.VOUCHER]: { icon: 'ticket', color: '#F59E0B' },
        [ActivityType.OFFER]: { icon: 'pricetag', color: '#EF4444' },
        [ActivityType.REFERRAL]: { icon: 'people', color: '#10B981' },
        [ActivityType.WALLET]: { icon: 'wallet', color: '#6366F1' },
        [ActivityType.ACHIEVEMENT]: { icon: 'trophy', color: '#F59E0B' }
    };
    return defaults[type] || { icon: 'information-circle', color: '#6B7280' };
};
exports.getActivityTypeDefaults = getActivityTypeDefaults;
exports.Activity = mongoose_1.default.model('Activity', ActivitySchema);
