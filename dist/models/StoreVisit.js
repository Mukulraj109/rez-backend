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
exports.StoreVisit = exports.VisitStatus = exports.VisitType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Visit Type Enum
var VisitType;
(function (VisitType) {
    VisitType["SCHEDULED"] = "scheduled";
    VisitType["QUEUE"] = "queue";
})(VisitType || (exports.VisitType = VisitType = {}));
// Visit Status Enum
var VisitStatus;
(function (VisitStatus) {
    VisitStatus["PENDING"] = "pending";
    VisitStatus["CHECKED_IN"] = "checked_in";
    VisitStatus["COMPLETED"] = "completed";
    VisitStatus["CANCELLED"] = "cancelled";
})(VisitStatus || (exports.VisitStatus = VisitStatus = {}));
// Store Visit Schema
const StoreVisitSchema = new mongoose_1.Schema({
    visitNumber: {
        type: String,
        required: false, // Will be auto-generated in pre-save hook
        unique: true,
        index: true
    },
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    visitType: {
        type: String,
        enum: Object.values(VisitType),
        required: true,
        default: VisitType.QUEUE
    },
    visitDate: {
        type: Date,
        required: true,
        index: true
    },
    visitTime: {
        type: String,
        trim: true
    },
    queueNumber: {
        type: Number,
        min: 100,
        max: 999,
        sparse: true // Allows null values for scheduled visits
    },
    customerName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20
    },
    customerEmail: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 100
    },
    status: {
        type: String,
        enum: Object.values(VisitStatus),
        default: VisitStatus.PENDING,
        required: true,
        index: true
    },
    estimatedDuration: {
        type: Number,
        default: 30, // 30 minutes default
        min: 5,
        max: 480 // Max 8 hours
    }
}, {
    timestamps: true
});
// Compound indexes for better query performance
StoreVisitSchema.index({ storeId: 1, visitDate: 1 });
StoreVisitSchema.index({ storeId: 1, queueNumber: 1, visitDate: 1 });
StoreVisitSchema.index({ userId: 1, createdAt: -1 });
// Generate visit number before saving
StoreVisitSchema.pre('save', async function (next) {
    if (this.isNew && !this.visitNumber) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.visitNumber = `SV-${timestamp}-${random}`;
    }
    next();
});
// Virtual for formatted date/time
StoreVisitSchema.virtual('formattedDateTime').get(function () {
    const date = new Date(this.visitDate);
    const formattedDate = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    if (this.visitType === VisitType.SCHEDULED && this.visitTime) {
        return `${formattedDate} at ${this.visitTime}`;
    }
    else if (this.visitType === VisitType.QUEUE && this.queueNumber) {
        return `${formattedDate} - Queue #${this.queueNumber}`;
    }
    return formattedDate;
});
// Ensure virtuals are included in JSON
StoreVisitSchema.set('toJSON', { virtuals: true });
StoreVisitSchema.set('toObject', { virtuals: true });
// Instance method: Update status
StoreVisitSchema.methods.updateStatus = async function (newStatus) {
    this.status = newStatus;
    return await this.save();
};
// Static method: Find by visit number
StoreVisitSchema.statics.findByVisitNumber = async function (visitNumber) {
    return await this.findOne({ visitNumber })
        .populate('storeId', 'name location contact')
        .populate('userId', 'name phoneNumber email');
};
// Static method: Find store visits
StoreVisitSchema.statics.findStoreVisits = async function (storeId, date) {
    const query = { storeId };
    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query.visitDate = { $gte: startOfDay, $lte: endOfDay };
    }
    return await this.find(query)
        .populate('userId', 'name phoneNumber email')
        .sort({ createdAt: -1 });
};
// Static method: Find user visits
StoreVisitSchema.statics.findUserVisits = async function (userId) {
    return await this.find({ userId })
        .populate('storeId', 'name location contact images')
        .sort({ createdAt: -1 });
};
// Static method: Get next available queue number
StoreVisitSchema.statics.getNextQueueNumber = async function (storeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Find all queue visits for today
    const todayVisits = await this.find({
        storeId,
        visitType: VisitType.QUEUE,
        visitDate: { $gte: today, $lt: tomorrow }
    }).select('queueNumber').sort({ queueNumber: -1 }).limit(1);
    if (todayVisits.length === 0) {
        // First queue number of the day
        return Math.floor(Math.random() * (999 - 100 + 1)) + 100; // Random between 100-999
    }
    // Get next sequential or random
    const lastQueueNumber = todayVisits[0].queueNumber || 100;
    let nextNumber = lastQueueNumber + 1;
    // If we exceed 999, wrap around to random
    if (nextNumber > 999) {
        nextNumber = Math.floor(Math.random() * (999 - 100 + 1)) + 100;
    }
    return nextNumber;
};
exports.StoreVisit = mongoose_1.default.model('StoreVisit', StoreVisitSchema);
