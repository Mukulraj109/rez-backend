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
exports.Address = exports.AddressType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Address Type
var AddressType;
(function (AddressType) {
    AddressType["HOME"] = "HOME";
    AddressType["OFFICE"] = "OFFICE";
    AddressType["OTHER"] = "OTHER";
})(AddressType || (exports.AddressType = AddressType = {}));
// Address Schema
const AddressSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: Object.values(AddressType),
        default: AddressType.HOME,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    addressLine1: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    addressLine2: {
        type: String,
        trim: true,
        maxlength: 200
    },
    city: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    state: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    postalCode: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20
    },
    country: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        default: 'India'
    },
    coordinates: {
        latitude: {
            type: Number,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180
        }
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    instructions: {
        type: String,
        trim: true,
        maxlength: 500
    }
}, {
    timestamps: true
});
// Indexes
AddressSchema.index({ user: 1, isDefault: 1 });
AddressSchema.index({ user: 1, createdAt: -1 });
// Pre-save hook to ensure only one default address per user
AddressSchema.pre('save', async function (next) {
    if (this.isDefault) {
        // Set all other addresses for this user to non-default
        await mongoose_1.default.model('Address').updateMany({ user: this.user, _id: { $ne: this._id } }, { $set: { isDefault: false } });
    }
    next();
});
exports.Address = mongoose_1.default.model('Address', AddressSchema);
