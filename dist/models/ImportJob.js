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
exports.ImportJob = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ImportJobSchema = new mongoose_1.Schema({
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Merchant',
        required: true,
        index: true
    },
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        enum: ['csv', 'excel'],
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
        index: true
    },
    progress: {
        total: {
            type: Number,
            default: 0
        },
        processed: {
            type: Number,
            default: 0
        },
        successful: {
            type: Number,
            default: 0
        },
        failed: {
            type: Number,
            default: 0
        },
        warnings: {
            type: Number,
            default: 0
        }
    },
    result: {
        total: Number,
        successful: Number,
        failed: Number,
        warnings: Number,
        rows: [{
                rowNumber: Number,
                status: {
                    type: String,
                    enum: ['success', 'error', 'warning']
                },
                data: mongoose_1.Schema.Types.Mixed,
                errors: [String],
                warnings: [String],
                productId: {
                    type: mongoose_1.Schema.Types.ObjectId,
                    ref: 'Product'
                },
                action: {
                    type: String,
                    enum: ['created', 'updated', 'skipped']
                }
            }],
        startTime: Date,
        endTime: Date,
        duration: Number
    },
    error: String,
    startedAt: Date,
    completedAt: Date
}, {
    timestamps: true
});
// Indexes
ImportJobSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
ImportJobSchema.index({ storeId: 1, status: 1, createdAt: -1 });
ImportJobSchema.index({ status: 1, createdAt: -1 });
// Auto-delete completed jobs after 30 days
ImportJobSchema.index({ completedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
exports.ImportJob = mongoose_1.default.models.ImportJob || mongoose_1.default.model('ImportJob', ImportJobSchema);
