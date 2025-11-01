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
const mongoose_1 = __importStar(require("mongoose"));
const GameSessionSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    gameType: {
        type: String,
        enum: ['spin_wheel', 'scratch_card', 'quiz', 'daily_trivia'],
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'playing', 'completed', 'expired'],
        default: 'pending',
        index: true
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    result: {
        won: Boolean,
        prize: {
            type: {
                type: String,
                enum: ['coins', 'discount', 'free_delivery', 'cashback_multiplier', 'badge']
            },
            value: mongoose_1.Schema.Types.Mixed,
            description: String
        },
        score: Number
    },
    earnedFrom: String,
    expiresAt: {
        type: Date,
        required: true,
        index: true
    }
}, {
    timestamps: true
});
// Indexes
GameSessionSchema.index({ user: 1, gameType: 1, status: 1 });
GameSessionSchema.index({ user: 1, createdAt: -1 });
// Method to complete game session
GameSessionSchema.methods.complete = async function (result) {
    if (this.status === 'completed') {
        throw new Error('Game session already completed');
    }
    if (this.status === 'expired') {
        throw new Error('Game session has expired');
    }
    this.status = 'completed';
    this.completedAt = new Date();
    this.result = result;
    return this.save();
};
// Static method to check expired sessions
GameSessionSchema.statics.expireSessions = async function () {
    const now = new Date();
    return this.updateMany({
        status: { $in: ['pending', 'playing'] },
        expiresAt: { $lt: now }
    }, {
        status: 'expired'
    });
};
exports.default = mongoose_1.default.model('GameSession', GameSessionSchema);
