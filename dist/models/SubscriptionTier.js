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
exports.SubscriptionTier = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SubscriptionTierSchema = new mongoose_1.Schema({
    tier: {
        type: String,
        required: true,
        unique: true,
        enum: ['free', 'premium', 'vip'],
        index: true
    },
    name: {
        type: String,
        required: true
    },
    pricing: {
        monthly: {
            type: Number,
            required: true,
            min: 0
        },
        yearly: {
            type: Number,
            required: true,
            min: 0
        },
        yearlyDiscount: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },
    benefits: {
        cashbackMultiplier: {
            type: Number,
            required: true,
            default: 1,
            min: 1
        },
        freeDeliveries: {
            type: Number,
            required: true,
            default: 0
            // No min constraint - use -1 for unlimited
        },
        maxWishlists: {
            type: Number,
            required: true,
            default: 5
            // No min constraint - use -1 for unlimited
        },
        prioritySupport: {
            type: Boolean,
            default: false
        },
        exclusiveDeals: {
            type: Boolean,
            default: false
        },
        earlyAccess: {
            type: Boolean,
            default: false
        }
    },
    description: {
        type: String,
        required: true
    },
    features: [
        {
            type: String,
            required: true
        }
    ],
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});
// Index for efficient queries
SubscriptionTierSchema.index({ isActive: 1, sortOrder: 1 });
exports.SubscriptionTier = mongoose_1.default.model('SubscriptionTier', SubscriptionTierSchema);
