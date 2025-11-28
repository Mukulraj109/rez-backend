"use strict";
// ServiceRequest Model
// Tracks service requests for user products (repair, replacement, installation, etc.)
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
exports.ServiceRequest = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TechnicianSchema = new mongoose_1.Schema({
    id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Technician' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    rating: { type: Number, min: 0, max: 5 },
}, { _id: false });
const CostSchema = new mongoose_1.Schema({
    estimatedCost: { type: Number, default: 0, min: 0 },
    actualCost: { type: Number, min: 0 },
    warrantyCovered: { type: Boolean, default: false },
    payment: {
        method: { type: String },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending',
        },
        transactionId: { type: String },
    },
}, { _id: false });
const ServiceRequestSchema = new mongoose_1.Schema({
    requestNumber: {
        type: String,
        unique: true,
        required: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    userProduct: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'UserProduct',
        required: true,
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    requestType: {
        type: String,
        enum: ['repair', 'replacement', 'installation', 'maintenance', 'inspection'],
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'pending',
        index: true,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    scheduledDate: {
        type: Date,
    },
    scheduledTimeSlot: {
        type: String, // e.g., "09:00-12:00", "14:00-17:00"
    },
    technician: {
        type: TechnicianSchema,
    },
    issueDescription: {
        type: String,
        required: true,
    },
    issueCategory: {
        type: String,
    },
    images: [{
            type: String, // URLs
        }],
    diagnosis: {
        type: String,
    },
    resolution: {
        type: String,
    },
    cost: {
        type: CostSchema,
        default: () => ({ estimatedCost: 0, warrantyCovered: false }),
    },
    address: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Address',
        required: true,
    },
    completedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },
    cancellationReason: {
        type: String,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    feedback: {
        type: String,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
ServiceRequestSchema.index({ user: 1, status: 1 });
ServiceRequestSchema.index({ user: 1, createdAt: -1 });
ServiceRequestSchema.index({ requestNumber: 1 });
ServiceRequestSchema.index({ scheduledDate: 1 });
ServiceRequestSchema.index({ status: 1, scheduledDate: 1 });
// Virtual: Days until scheduled
ServiceRequestSchema.virtual('daysUntilScheduled').get(function () {
    if (!this.scheduledDate) {
        return null;
    }
    const now = new Date();
    const scheduled = new Date(this.scheduledDate);
    const diff = scheduled.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
});
// Virtual: Is overdue
ServiceRequestSchema.virtual('isOverdue').get(function () {
    if (!this.scheduledDate || this.status === 'completed' || this.status === 'cancelled') {
        return false;
    }
    const now = new Date();
    const scheduled = new Date(this.scheduledDate);
    return now > scheduled;
});
// Static method: Generate request number
ServiceRequestSchema.statics.generateRequestNumber = async function () {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    // Find the latest request number for this month
    const latestRequest = await this.findOne({
        requestNumber: new RegExp(`^SR-${year}${month}-`),
    })
        .sort({ requestNumber: -1 })
        .lean();
    let sequence = 1;
    if (latestRequest && latestRequest.requestNumber) {
        const parts = latestRequest.requestNumber.split('-');
        if (parts.length === 3) {
            sequence = parseInt(parts[2]) + 1;
        }
    }
    const requestNumber = `SR-${year}${month}-${String(sequence).padStart(4, '0')}`;
    return requestNumber;
};
// Static method: Get user's service requests
ServiceRequestSchema.statics.getUserRequests = async function (userId, filters = {}, page = 1, limit = 20) {
    const query = { user: userId };
    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.requestType) {
        query.requestType = filters.requestType;
    }
    if (filters.priority) {
        query.priority = filters.priority;
    }
    if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
            query.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
            query.createdAt.$lte = new Date(filters.dateTo);
        }
    }
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
        this.find(query)
            .populate('product', 'name images category')
            .populate('userProduct', 'purchaseDate warranty')
            .populate('address', 'fullAddress city state pincode')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query),
    ]);
    const pages = Math.ceil(total / limit);
    return { requests, total, pages };
};
// Static method: Get active service requests
ServiceRequestSchema.statics.getActiveRequests = async function (userId) {
    return this.find({
        user: userId,
        status: { $in: ['pending', 'scheduled', 'in_progress'] },
    })
        .populate('product', 'name images')
        .populate('userProduct', 'purchaseDate')
        .sort({ scheduledDate: 1 })
        .lean();
};
// Static method: Get overdue requests
ServiceRequestSchema.statics.getOverdueRequests = async function (userId) {
    const query = {
        status: { $in: ['scheduled', 'in_progress'] },
        scheduledDate: { $lt: new Date() },
    };
    if (userId) {
        query.user = userId;
    }
    return this.find(query)
        .populate('user', 'profile.firstName profile.lastName profile.phoneNumber')
        .populate('product', 'name images')
        .sort({ scheduledDate: 1 })
        .lean();
};
// Instance method: Schedule service
ServiceRequestSchema.methods.scheduleService = async function (scheduledDate, timeSlot, technician) {
    this.status = 'scheduled';
    this.scheduledDate = scheduledDate;
    this.scheduledTimeSlot = timeSlot;
    if (technician) {
        this.technician = technician;
    }
    await this.save();
    console.log(`✅ Service scheduled for: ${scheduledDate} (${timeSlot})`);
    return this;
};
// Instance method: Start service
ServiceRequestSchema.methods.startService = async function () {
    this.status = 'in_progress';
    await this.save();
    console.log(`✅ Service started for request: ${this.requestNumber}`);
    return this;
};
// Instance method: Complete service
ServiceRequestSchema.methods.completeService = async function (resolution, actualCost, diagnosis) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.resolution = resolution;
    if (actualCost !== undefined) {
        this.cost.actualCost = actualCost;
    }
    if (diagnosis) {
        this.diagnosis = diagnosis;
    }
    await this.save();
    console.log(`✅ Service completed for request: ${this.requestNumber}`);
    return this;
};
// Instance method: Cancel service
ServiceRequestSchema.methods.cancelService = async function (reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    await this.save();
    console.log(`✅ Service cancelled for request: ${this.requestNumber}`);
    return this;
};
// Instance method: Rate service
ServiceRequestSchema.methods.rateService = async function (rating, feedback) {
    if (this.status !== 'completed') {
        throw new Error('Can only rate completed service requests');
    }
    this.rating = rating;
    if (feedback) {
        this.feedback = feedback;
    }
    await this.save();
    console.log(`✅ Service rated: ${rating} stars`);
    return this;
};
// Instance method: Reschedule service
ServiceRequestSchema.methods.rescheduleService = async function (newDate, newTimeSlot) {
    if (this.status === 'completed' || this.status === 'cancelled') {
        throw new Error('Cannot reschedule completed or cancelled requests');
    }
    this.scheduledDate = newDate;
    this.scheduledTimeSlot = newTimeSlot;
    await this.save();
    console.log(`✅ Service rescheduled to: ${newDate} (${newTimeSlot})`);
    return this;
};
exports.ServiceRequest = mongoose_1.default.model('ServiceRequest', ServiceRequestSchema);
