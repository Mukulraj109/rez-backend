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
exports.MiniGame = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const MiniGameSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    gameType: {
        type: String,
        enum: ['spin_wheel', 'scratch_card', 'quiz'],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'expired'],
        default: 'active',
        index: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard']
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    reward: {
        coins: Number,
        cashback: Number,
        discount: Number,
        voucher: String,
        badge: String
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});
// Indexes for efficient querying
MiniGameSchema.index({ user: 1, gameType: 1, status: 1 });
MiniGameSchema.index({ user: 1, createdAt: -1 });
MiniGameSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Method to complete mini-game
MiniGameSchema.methods.complete = async function (reward) {
    if (this.status === 'completed') {
        throw new Error('Mini-game already completed');
    }
    if (this.status === 'expired') {
        throw new Error('Mini-game has expired');
    }
    this.status = 'completed';
    this.completedAt = new Date();
    this.reward = reward;
    return this.save();
};
// Static method to expire old games
MiniGameSchema.statics.expireGames = async function () {
    const now = new Date();
    return this.updateMany({
        status: 'active',
        expiresAt: { $lt: now }
    }, {
        status: 'expired'
    });
};
exports.MiniGame = mongoose_1.default.model('MiniGame', MiniGameSchema);
