"use strict";
// UserProduct Model
// Tracks products purchased by users with warranty, registration, installation, and AMC details
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
exports.UserProduct = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const WarrantySchema = new mongoose_1.Schema({
    hasWarranty: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
    duration: { type: Number }, // months
    warrantyCard: { type: String }, // URL
    terms: [{ type: String }],
}, { _id: false });
const RegistrationSchema = new mongoose_1.Schema({
    isRegistered: { type: Boolean, default: false },
    registrationDate: { type: Date },
    serialNumber: { type: String },
    registrationNumber: { type: String },
}, { _id: false });
const InstallationSchema = new mongoose_1.Schema({
    required: { type: Boolean, default: false },
    scheduled: { type: Boolean, default: false },
    scheduledDate: { type: Date },
    completed: { type: Boolean, default: false },
    completedDate: { type: Date },
    technician: { type: String },
    notes: { type: String },
}, { _id: false });
const AMCSchema = new mongoose_1.Schema({
    hasAMC: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
    serviceCount: { type: Number, default: 0 },
    amount: { type: Number },
    renewalDue: { type: Boolean, default: false },
}, { _id: false });
const UserProductSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    purchaseDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    warranty: {
        type: WarrantySchema,
        default: () => ({ hasWarranty: false }),
    },
    registration: {
        type: RegistrationSchema,
        default: () => ({ isRegistered: false }),
    },
    installation: {
        type: InstallationSchema,
        default: () => ({ required: false, scheduled: false, completed: false }),
    },
    amc: {
        type: AMCSchema,
        default: () => ({ hasAMC: false, serviceCount: 0, renewalDue: false }),
    },
    status: {
        type: String,
        enum: ['active', 'warranty_expired', 'returned', 'replaced'],
        default: 'active',
    },
    serviceRequests: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'ServiceRequest',
        }],
    documents: [{
            type: String, // URLs
        }],
    notes: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
UserProductSchema.index({ user: 1, purchaseDate: -1 });
UserProductSchema.index({ user: 1, status: 1 });
UserProductSchema.index({ 'warranty.endDate': 1 });
UserProductSchema.index({ 'amc.endDate': 1 });
// Virtual: Warranty days remaining
UserProductSchema.virtual('warrantyDaysRemaining').get(function () {
    if (!this.warranty.hasWarranty || !this.warranty.endDate) {
        return null;
    }
    const now = new Date();
    const endDate = new Date(this.warranty.endDate);
    const diff = endDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
});
// Virtual: Warranty status
UserProductSchema.virtual('warrantyStatus').get(function () {
    if (!this.warranty.hasWarranty) {
        return 'no_warranty';
    }
    const daysRemaining = this.warrantyDaysRemaining || 0;
    if (daysRemaining === 0) {
        return 'expired';
    }
    else if (daysRemaining <= 30) {
        return 'expiring_soon';
    }
    else {
        return 'active';
    }
});
// Virtual: Is warranty expiring soon (within 30 days)
UserProductSchema.virtual('isWarrantyExpiringSoon').get(function () {
    if (!this.warranty.hasWarranty) {
        return false;
    }
    const daysRemaining = this.warrantyDaysRemaining || 0;
    return daysRemaining > 0 && daysRemaining <= 30;
});
// Virtual: AMC days remaining
UserProductSchema.virtual('amcDaysRemaining').get(function () {
    if (!this.amc.hasAMC || !this.amc.endDate) {
        return null;
    }
    const now = new Date();
    const endDate = new Date(this.amc.endDate);
    const diff = endDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
});
// Virtual: Is AMC expiring soon (within 30 days)
UserProductSchema.virtual('isAMCExpiringSoon').get(function () {
    if (!this.amc.hasAMC) {
        return false;
    }
    const daysRemaining = this.amcDaysRemaining || 0;
    return daysRemaining > 0 && daysRemaining <= 30;
});
// Static method: Get user's products
UserProductSchema.statics.getUserProducts = async function (userId, filters = {}) {
    const query = { user: userId };
    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.category) {
        // Will need to populate product and filter by category
    }
    if (filters.hasWarranty !== undefined) {
        query['warranty.hasWarranty'] = filters.hasWarranty;
    }
    if (filters.hasAMC !== undefined) {
        query['amc.hasAMC'] = filters.hasAMC;
    }
    return this.find(query)
        .populate('product', 'name images category basePrice')
        .populate('order', 'orderNumber totalAmount purchaseDate')
        .sort({ purchaseDate: -1 })
        .lean();
};
// Static method: Get products with expiring warranties
UserProductSchema.statics.getExpiringWarranties = async function (userId, days = 30) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.find({
        user: userId,
        'warranty.hasWarranty': true,
        'warranty.endDate': {
            $gte: now,
            $lte: futureDate,
        },
    })
        .populate('product', 'name images category')
        .sort({ 'warranty.endDate': 1 })
        .lean();
};
// Static method: Get products with expiring AMC
UserProductSchema.statics.getExpiringAMC = async function (userId, days = 30) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.find({
        user: userId,
        'amc.hasAMC': true,
        'amc.endDate': {
            $gte: now,
            $lte: futureDate,
        },
    })
        .populate('product', 'name images category')
        .sort({ 'amc.endDate': 1 })
        .lean();
};
// Static method: Mark expired warranties
UserProductSchema.statics.markExpiredWarranties = async function () {
    const now = new Date();
    const result = await this.updateMany({
        status: 'active',
        'warranty.hasWarranty': true,
        'warranty.endDate': { $lt: now },
    }, {
        $set: { status: 'warranty_expired' },
    });
    console.log(`✅ Marked ${result.modifiedCount} products with expired warranties`);
    return result.modifiedCount;
};
// Instance method: Register product
UserProductSchema.methods.registerProduct = async function (serialNumber, registrationNumber) {
    this.registration.isRegistered = true;
    this.registration.registrationDate = new Date();
    this.registration.serialNumber = serialNumber;
    if (registrationNumber) {
        this.registration.registrationNumber = registrationNumber;
    }
    else {
        // Auto-generate registration number
        const timestamp = Date.now();
        this.registration.registrationNumber = `REG-${timestamp}`;
    }
    await this.save();
    console.log(`✅ Product registered: ${this.registration.registrationNumber}`);
    return this;
};
// Instance method: Schedule installation
UserProductSchema.methods.scheduleInstallation = async function (scheduledDate, technician, notes) {
    this.installation.scheduled = true;
    this.installation.scheduledDate = scheduledDate;
    if (technician) {
        this.installation.technician = technician;
    }
    if (notes) {
        this.installation.notes = notes;
    }
    await this.save();
    console.log(`✅ Installation scheduled for: ${scheduledDate}`);
    return this;
};
// Instance method: Complete installation
UserProductSchema.methods.completeInstallation = async function (notes) {
    this.installation.completed = true;
    this.installation.completedDate = new Date();
    if (notes) {
        this.installation.notes = notes;
    }
    await this.save();
    console.log(`✅ Installation completed for product`);
    return this;
};
// Instance method: Renew AMC
UserProductSchema.methods.renewAMC = async function (duration, // months
amount) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);
    this.amc.hasAMC = true;
    this.amc.startDate = startDate;
    this.amc.endDate = endDate;
    this.amc.amount = amount;
    this.amc.renewalDue = false;
    await this.save();
    console.log(`✅ AMC renewed until: ${endDate}`);
    return this;
};
exports.UserProduct = mongoose_1.default.model('UserProduct', UserProductSchema);
