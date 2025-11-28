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
exports.StockHistory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Stock history schema
const StockHistorySchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    store: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    variant: {
        type: {
            type: String,
            trim: true
        },
        value: {
            type: String,
            trim: true
        }
    },
    previousStock: {
        type: Number,
        required: true,
        min: 0
    },
    newStock: {
        type: Number,
        required: true,
        min: 0
    },
    changeAmount: {
        type: Number,
        required: true
    },
    changeType: {
        type: String,
        required: true,
        enum: [
            'purchase',
            'return',
            'adjustment',
            'restock',
            'reservation',
            'reservation_release',
            'cancellation',
            'damage',
            'expired',
            'theft',
            'correction'
        ],
        index: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        index: true
    },
    reservation: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Cart'
    },
    reason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true,
    collection: 'stock_history'
});
// Compound indexes for common queries
StockHistorySchema.index({ product: 1, timestamp: -1 });
StockHistorySchema.index({ store: 1, timestamp: -1 });
StockHistorySchema.index({ changeType: 1, timestamp: -1 });
StockHistorySchema.index({ user: 1, timestamp: -1 });
StockHistorySchema.index({ order: 1 });
StockHistorySchema.index({
    product: 1,
    'variant.type': 1,
    'variant.value': 1,
    timestamp: -1
});
// Index for analytics queries
StockHistorySchema.index({
    store: 1,
    changeType: 1,
    timestamp: -1
});
// Virtual for absolute change amount
StockHistorySchema.virtual('absoluteChange').get(function () {
    return Math.abs(this.changeAmount);
});
// Virtual for change direction
StockHistorySchema.virtual('direction').get(function () {
    return this.changeAmount > 0 ? 'increase' : this.changeAmount < 0 ? 'decrease' : 'no_change';
});
// Virtual for percentage change
StockHistorySchema.virtual('percentageChange').get(function () {
    if (this.previousStock === 0)
        return this.changeAmount > 0 ? 100 : 0;
    return (this.changeAmount / this.previousStock) * 100;
});
// Static method to log stock change
StockHistorySchema.statics.logStockChange = async function (data) {
    const changeAmount = data.newStock - data.previousStock;
    const historyEntry = new this({
        product: data.productId,
        store: data.storeId,
        variant: data.variant,
        previousStock: data.previousStock,
        newStock: data.newStock,
        changeAmount,
        changeType: data.changeType,
        user: data.userId,
        order: data.orderId,
        reservation: data.reservationId,
        reason: data.reason,
        notes: data.notes,
        metadata: data.metadata,
        timestamp: new Date()
    });
    await historyEntry.save();
    return historyEntry;
};
// Static method to get stock history for a product
StockHistorySchema.statics.getProductHistory = function (productId, options = {}) {
    const query = { product: productId };
    if (options.variant) {
        query['variant.type'] = options.variant.type;
        query['variant.value'] = options.variant.value;
    }
    if (options.startDate || options.endDate) {
        query.timestamp = {};
        if (options.startDate)
            query.timestamp.$gte = options.startDate;
        if (options.endDate)
            query.timestamp.$lte = options.endDate;
    }
    if (options.changeTypes && options.changeTypes.length > 0) {
        query.changeType = { $in: options.changeTypes };
    }
    return this.find(query)
        .populate('user', 'name email phone')
        .populate('order', 'orderNumber status')
        .sort({ timestamp: -1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0);
};
// Static method to get stock snapshot at a specific date
StockHistorySchema.statics.getStockSnapshot = async function (productId, date, variant) {
    const query = {
        product: productId,
        timestamp: { $lte: date }
    };
    if (variant) {
        query['variant.type'] = variant.type;
        query['variant.value'] = variant.value;
    }
    const lastEntry = await this.findOne(query)
        .sort({ timestamp: -1 })
        .limit(1);
    return lastEntry ? lastEntry.newStock : 0;
};
// Static method to detect anomalies
StockHistorySchema.statics.detectAnomalies = async function (storeId, options = {}) {
    const days = options.days || 7;
    const threshold = options.threshold || 50; // Threshold for large changes
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const anomalies = await this.aggregate([
        {
            $match: {
                store: new mongoose_1.Types.ObjectId(storeId),
                timestamp: { $gte: startDate },
                $expr: { $gte: [{ $abs: '$changeAmount' }, threshold] }
            }
        },
        {
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        {
            $unwind: '$productInfo'
        },
        {
            $project: {
                product: 1,
                productName: '$productInfo.name',
                changeAmount: 1,
                changeType: 1,
                timestamp: 1,
                previousStock: 1,
                newStock: 1,
                reason: 1,
                absoluteChange: { $abs: '$changeAmount' },
                percentageChange: {
                    $cond: [
                        { $eq: ['$previousStock', 0] },
                        100,
                        { $multiply: [{ $divide: ['$changeAmount', '$previousStock'] }, 100] }
                    ]
                }
            }
        },
        {
            $sort: { timestamp: -1 }
        }
    ]);
    return anomalies;
};
// Static method to generate stock report
StockHistorySchema.statics.generateStockReport = async function (storeId, startDate, endDate) {
    const report = await this.aggregate([
        {
            $match: {
                store: new mongoose_1.Types.ObjectId(storeId),
                timestamp: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    product: '$product',
                    changeType: '$changeType'
                },
                totalChanges: { $sum: 1 },
                totalQuantity: { $sum: '$changeAmount' },
                absoluteQuantity: { $sum: { $abs: '$changeAmount' } }
            }
        },
        {
            $lookup: {
                from: 'products',
                localField: '_id.product',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        {
            $unwind: '$productInfo'
        },
        {
            $group: {
                _id: '$_id.product',
                productName: { $first: '$productInfo.name' },
                currentStock: { $first: '$productInfo.inventory.stock' },
                changes: {
                    $push: {
                        changeType: '$_id.changeType',
                        totalChanges: '$totalChanges',
                        totalQuantity: '$totalQuantity',
                        absoluteQuantity: '$absoluteQuantity'
                    }
                }
            }
        },
        {
            $sort: { productName: 1 }
        }
    ]);
    return report;
};
exports.StockHistory = mongoose_1.default.model('StockHistory', StockHistorySchema);
