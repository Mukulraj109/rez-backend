"use strict";
// ServiceAppointment Model
// Tracks service appointments for stores (salons, spas, consultations, etc.)
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
exports.ServiceAppointment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ServiceAppointmentSchema = new mongoose_1.Schema({
    appointmentNumber: {
        type: String,
        unique: true,
        required: true,
        index: true,
    },
    store: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    serviceType: {
        type: String,
        required: true,
        trim: true,
    },
    appointmentDate: {
        type: Date,
        required: true,
        index: true,
    },
    appointmentTime: {
        type: String,
        required: true,
        trim: true,
        // Format: "HH:MM" (e.g., "14:30")
    },
    duration: {
        type: Number,
        required: true,
        default: 60,
        min: 15,
        max: 480, // max 8 hours
    },
    customerName: {
        type: String,
        required: true,
        trim: true,
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true,
    },
    customerEmail: {
        type: String,
        trim: true,
        lowercase: true,
    },
    specialInstructions: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
        default: 'pending',
        index: true,
    },
    staffMember: {
        type: String,
        trim: true,
    },
    confirmedAt: {
        type: Date,
    },
    completedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },
    cancellationReason: {
        type: String,
        trim: true,
        maxlength: 500,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Compound Indexes for better query performance
ServiceAppointmentSchema.index({ store: 1, appointmentDate: 1 });
ServiceAppointmentSchema.index({ user: 1, status: 1 });
ServiceAppointmentSchema.index({ user: 1, createdAt: -1 });
ServiceAppointmentSchema.index({ store: 1, status: 1, appointmentDate: 1 });
ServiceAppointmentSchema.index({ appointmentDate: 1, status: 1 });
// Virtual: Formatted date and time
ServiceAppointmentSchema.virtual('formattedDateTime').get(function () {
    const date = new Date(this.appointmentDate);
    const dateStr = date.toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    return `${dateStr} at ${this.appointmentTime}`;
});
// Static method: Generate appointment number
ServiceAppointmentSchema.statics.generateAppointmentNumber = async function () {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SA-${timestamp}-${random}`;
};
// Static method: Find appointment by appointment number
ServiceAppointmentSchema.statics.findByAppointmentNumber = async function (appointmentNumber) {
    return this.findOne({ appointmentNumber })
        .populate('store', 'name logo location contact')
        .populate('user', 'profile.firstName profile.lastName profile.phoneNumber profile.email')
        .lean();
};
// Static method: Get store's appointments
ServiceAppointmentSchema.statics.findStoreAppointments = async function (storeId, date) {
    const query = { store: storeId };
    if (date) {
        // Get appointments for specific date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query.appointmentDate = {
            $gte: startOfDay,
            $lte: endOfDay,
        };
    }
    return this.find(query)
        .populate('user', 'profile.firstName profile.lastName profile.phoneNumber')
        .sort({ appointmentDate: 1, appointmentTime: 1 })
        .lean();
};
// Static method: Get user's appointments
ServiceAppointmentSchema.statics.findUserAppointments = async function (userId) {
    return this.find({ user: userId })
        .populate('store', 'name logo location contact operationalInfo')
        .sort({ appointmentDate: -1, createdAt: -1 })
        .lean();
};
// Static method: Check availability for a time slot
ServiceAppointmentSchema.statics.checkAvailability = async function (storeId, date, time, duration = 60) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    // Get all appointments for the day
    const appointments = await this.find({
        store: storeId,
        appointmentDate: {
            $gte: startOfDay,
            $lte: endOfDay,
        },
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
    }).lean();
    // Parse requested time
    const [reqHour, reqMin] = time.split(':').map(Number);
    const reqStartTime = reqHour * 60 + reqMin; // minutes from midnight
    const reqEndTime = reqStartTime + duration;
    // Check for conflicts
    for (const appt of appointments) {
        const [apptHour, apptMin] = appt.appointmentTime.split(':').map(Number);
        const apptStartTime = apptHour * 60 + apptMin;
        const apptEndTime = apptStartTime + appt.duration;
        // Check if times overlap
        if ((reqStartTime >= apptStartTime && reqStartTime < apptEndTime) ||
            (reqEndTime > apptStartTime && reqEndTime <= apptEndTime) ||
            (reqStartTime <= apptStartTime && reqEndTime >= apptEndTime)) {
            return false; // Conflict found
        }
    }
    return true; // No conflicts
};
// Instance method: Update status
ServiceAppointmentSchema.methods.updateStatus = async function (newStatus) {
    this.status = newStatus;
    if (newStatus === 'confirmed' && !this.confirmedAt) {
        this.confirmedAt = new Date();
    }
    else if (newStatus === 'completed' && !this.completedAt) {
        this.completedAt = new Date();
    }
    else if (newStatus === 'cancelled' && !this.cancelledAt) {
        this.cancelledAt = new Date();
    }
    await this.save();
    console.log(`✅ Appointment ${this.appointmentNumber} status updated to: ${newStatus}`);
    return this;
};
// Instance method: Cancel appointment
ServiceAppointmentSchema.methods.cancel = async function (reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    if (reason) {
        this.cancellationReason = reason;
    }
    await this.save();
    console.log(`✅ Appointment ${this.appointmentNumber} cancelled`);
    return this;
};
// Instance method: Confirm appointment
ServiceAppointmentSchema.methods.confirm = async function () {
    this.status = 'confirmed';
    this.confirmedAt = new Date();
    await this.save();
    console.log(`✅ Appointment ${this.appointmentNumber} confirmed`);
    return this;
};
exports.ServiceAppointment = mongoose_1.default.model('ServiceAppointment', ServiceAppointmentSchema);
