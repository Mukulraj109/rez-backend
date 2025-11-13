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
// Consultation Schema
const ConsultationSchema = new mongoose_1.Schema({
    consultationNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    consultationType: {
        type: String,
        required: true,
        trim: true
    },
    consultationDate: {
        type: Date,
        required: true
    },
    consultationTime: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: Number,
        default: 30,
        min: 15,
        max: 120
    },
    patientName: {
        type: String,
        required: true,
        trim: true
    },
    patientAge: {
        type: Number,
        required: true,
        min: 0,
        max: 150
    },
    patientPhone: {
        type: String,
        required: true,
        trim: true
    },
    patientEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    reasonForConsultation: {
        type: String,
        required: true,
        trim: true
    },
    medicalHistory: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    doctorName: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes
ConsultationSchema.index({ consultationNumber: 1 }, { unique: true });
ConsultationSchema.index({ storeId: 1, consultationDate: 1 });
ConsultationSchema.index({ userId: 1, status: 1 });
ConsultationSchema.index({ status: 1, consultationDate: 1 });
ConsultationSchema.index({ storeId: 1, status: 1 });
// Pre-save middleware to generate consultation number
ConsultationSchema.pre('save', function (next) {
    if (!this.consultationNumber) {
        // Generate unique consultation number: CN-TIMESTAMP-RANDOM
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.consultationNumber = `CN-${timestamp}-${random}`;
    }
    next();
});
// Virtual for formatted date/time
ConsultationSchema.virtual('formattedDateTime').get(function () {
    return this.getFormattedDateTime();
});
// Instance method: Update status
ConsultationSchema.methods.updateStatus = async function (newStatus) {
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
    }
    this.status = newStatus;
    return await this.save();
};
// Instance method: Get formatted date/time
ConsultationSchema.methods.getFormattedDateTime = function () {
    const date = new Date(this.consultationDate);
    const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    return `${dateStr} at ${this.consultationTime}`;
};
// Static method: Find by consultation number
ConsultationSchema.statics.findByConsultationNumber = function (consultationNumber) {
    return this.findOne({ consultationNumber })
        .populate('storeId', 'name location contact')
        .populate('userId', 'name phoneNumber email');
};
// Static method: Find store consultations
ConsultationSchema.statics.findStoreConsultations = function (storeId, date) {
    const query = { storeId };
    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query.consultationDate = {
            $gte: startOfDay,
            $lte: endOfDay
        };
    }
    return this.find(query)
        .populate('userId', 'name phoneNumber email')
        .sort({ consultationDate: 1, consultationTime: 1 });
};
// Static method: Find user consultations
ConsultationSchema.statics.findUserConsultations = function (userId) {
    return this.find({ userId })
        .populate('storeId', 'name location contact')
        .sort({ consultationDate: -1, createdAt: -1 });
};
// Create and export the model
const Consultation = mongoose_1.default.model('Consultation', ConsultationSchema);
exports.default = Consultation;
