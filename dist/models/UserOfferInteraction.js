"use strict";
// UserOfferInteraction Model
// Tracks user interactions with offers (likes, shares, views, claims)
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
const mongoose_1 = __importStar(require("mongoose"));
const UserOfferInteractionSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
        index: true
    },
    offer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Offer',
        required: [true, 'Offer reference is required'],
        index: true
    },
    action: {
        type: String,
        enum: ['like', 'share', 'view', 'claim', 'click', 'favorite'],
        required: [true, 'Action is required'],
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    metadata: {
        source: {
            type: String,
            trim: true
        },
        device: {
            type: String,
            enum: ['mobile', 'desktop', 'tablet'],
            trim: true
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                validate: {
                    validator: function (v) {
                        // Allow empty array or undefined, but if provided must be valid
                        if (!v || v.length === 0)
                            return true; // Allow empty/undefined
                        return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
                    },
                    message: 'Invalid coordinates format'
                }
            }
        },
        userAgent: {
            type: String,
            trim: true
        },
        ipAddress: {
            type: String,
            trim: true
        },
        referrer: {
            type: String,
            trim: true
        },
        sessionId: {
            type: String,
            trim: true
        }
    }
}, {
    timestamps: true
});
// Compound indexes for efficient queries
UserOfferInteractionSchema.index({ user: 1, offer: 1, action: 1 });
UserOfferInteractionSchema.index({ offer: 1, action: 1, timestamp: -1 });
UserOfferInteractionSchema.index({ user: 1, action: 1, timestamp: -1 });
UserOfferInteractionSchema.index({ timestamp: -1 });
// Static methods
UserOfferInteractionSchema.statics.trackInteraction = async function (userId, offerId, action, metadata) {
    // Clean metadata - remove location if coordinates are empty/invalid
    const cleanMetadata = metadata ? { ...metadata } : {};
    if (cleanMetadata.location) {
        const coords = cleanMetadata.location.coordinates;
        if (!coords || coords.length !== 2 ||
            coords[0] < -180 || coords[0] > 180 ||
            coords[1] < -90 || coords[1] > 90) {
            // Remove invalid location
            delete cleanMetadata.location;
        }
    }
    const interaction = new this({
        user: userId,
        offer: offerId,
        action,
        metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : undefined,
        timestamp: new Date()
    });
    return await interaction.save();
};
UserOfferInteractionSchema.statics.getUserInteractions = function (userId, action) {
    const query = { user: userId };
    if (action) {
        query.action = action;
    }
    return this.find(query)
        .populate('offer', 'title image cashbackPercentage category')
        .sort({ timestamp: -1 });
};
UserOfferInteractionSchema.statics.getOfferInteractions = function (offerId, action) {
    const query = { offer: offerId };
    if (action) {
        query.action = action;
    }
    return this.find(query)
        .populate('user', 'name email')
        .sort({ timestamp: -1 });
};
UserOfferInteractionSchema.statics.getInteractionStats = async function (offerId) {
    const stats = await this.aggregate([
        { $match: { offer: offerId } },
        {
            $group: {
                _id: '$action',
                count: { $sum: 1 },
                uniqueUsers: { $addToSet: '$user' }
            }
        },
        {
            $project: {
                action: '$_id',
                count: 1,
                uniqueUserCount: { $size: '$uniqueUsers' }
            }
        }
    ]);
    return stats.reduce((acc, stat) => {
        acc[stat.action] = {
            count: stat.count,
            uniqueUsers: stat.uniqueUserCount
        };
        return acc;
    }, {});
};
UserOfferInteractionSchema.statics.getUserEngagementStats = async function (userId) {
    const stats = await this.aggregate([
        { $match: { user: userId } },
        {
            $group: {
                _id: '$action',
                count: { $sum: 1 },
                uniqueOffers: { $addToSet: '$offer' }
            }
        },
        {
            $project: {
                action: '$_id',
                count: 1,
                uniqueOffersCount: { $size: '$uniqueOffers' }
            }
        }
    ]);
    return stats.reduce((acc, stat) => {
        acc[stat.action] = {
            count: stat.count,
            uniqueOffers: stat.uniqueOffersCount
        };
        return acc;
    }, {});
};
// Create and export the model
const UserOfferInteraction = mongoose_1.default.model('UserOfferInteraction', UserOfferInteractionSchema);
exports.default = UserOfferInteraction;
