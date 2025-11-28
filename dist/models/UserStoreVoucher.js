"use strict";
// UserStoreVoucher Model - Tracks store vouchers assigned to users
// This is different from UserVoucher (gift card vouchers)
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
const UserStoreVoucherSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    voucher: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'StoreVoucher',
        required: true,
        index: true
    },
    assignedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    usedAt: {
        type: Date
    },
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order'
    },
    status: {
        type: String,
        enum: ['assigned', 'used', 'expired'],
        default: 'assigned',
        index: true
    }
}, {
    timestamps: false
});
// Compound indexes
UserStoreVoucherSchema.index({ user: 1, status: 1 });
UserStoreVoucherSchema.index({ user: 1, voucher: 1 }, { unique: true });
const UserStoreVoucher = mongoose_1.default.model('UserStoreVoucher', UserStoreVoucherSchema);
exports.default = UserStoreVoucher;
