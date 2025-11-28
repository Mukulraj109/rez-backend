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
exports.PaymentMethod = exports.BankAccountType = exports.CardBrand = exports.CardType = exports.PaymentMethodType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Payment Method Types
var PaymentMethodType;
(function (PaymentMethodType) {
    PaymentMethodType["CARD"] = "CARD";
    PaymentMethodType["BANK_ACCOUNT"] = "BANK_ACCOUNT";
    PaymentMethodType["UPI"] = "UPI";
    PaymentMethodType["WALLET"] = "WALLET";
})(PaymentMethodType || (exports.PaymentMethodType = PaymentMethodType = {}));
var CardType;
(function (CardType) {
    CardType["CREDIT"] = "CREDIT";
    CardType["DEBIT"] = "DEBIT";
})(CardType || (exports.CardType = CardType = {}));
var CardBrand;
(function (CardBrand) {
    CardBrand["VISA"] = "VISA";
    CardBrand["MASTERCARD"] = "MASTERCARD";
    CardBrand["AMEX"] = "AMEX";
    CardBrand["RUPAY"] = "RUPAY";
    CardBrand["DISCOVER"] = "DISCOVER";
    CardBrand["OTHER"] = "OTHER";
})(CardBrand || (exports.CardBrand = CardBrand = {}));
var BankAccountType;
(function (BankAccountType) {
    BankAccountType["SAVINGS"] = "SAVINGS";
    BankAccountType["CURRENT"] = "CURRENT";
})(BankAccountType || (exports.BankAccountType = BankAccountType = {}));
// Payment Method Schema
const PaymentMethodSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: Object.values(PaymentMethodType),
        required: true
    },
    card: {
        type: {
            type: String,
            enum: Object.values(CardType)
        },
        brand: {
            type: String,
            enum: Object.values(CardBrand)
        },
        lastFourDigits: {
            type: String,
            match: /^\d{4}$/
        },
        expiryMonth: {
            type: Number,
            min: 1,
            max: 12
        },
        expiryYear: {
            type: Number,
            min: new Date().getFullYear()
        },
        cardholderName: {
            type: String,
            trim: true
        },
        nickname: {
            type: String,
            trim: true,
            maxlength: 50
        }
    },
    bankAccount: {
        bankName: {
            type: String,
            trim: true
        },
        accountType: {
            type: String,
            enum: Object.values(BankAccountType)
        },
        accountNumber: {
            type: String,
            trim: true
        },
        ifscCode: {
            type: String,
            trim: true,
            uppercase: true,
            match: /^[A-Z]{4}0[A-Z0-9]{6}$/
        },
        nickname: {
            type: String,
            trim: true,
            maxlength: 50
        },
        isVerified: {
            type: Boolean,
            default: false
        }
    },
    upi: {
        vpa: {
            type: String,
            trim: true,
            lowercase: true,
            match: /^[\w.-]+@[\w.-]+$/
        },
        nickname: {
            type: String,
            trim: true,
            maxlength: 50
        },
        isVerified: {
            type: Boolean,
            default: false
        }
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    token: {
        type: String,
        select: false // Don't expose token in queries
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            return ret;
        }
    }
});
// Virtual ID field
PaymentMethodSchema.virtual('id').get(function () {
    return this._id.toString();
});
// Indexes
PaymentMethodSchema.index({ user: 1, isDefault: 1 });
PaymentMethodSchema.index({ user: 1, isActive: 1 });
PaymentMethodSchema.index({ user: 1, type: 1 });
// Pre-save hook to ensure only one default payment method per user
PaymentMethodSchema.pre('save', async function (next) {
    if (this.isDefault) {
        // Set all other payment methods for this user to non-default
        await mongoose_1.default.model('PaymentMethod').updateMany({ user: this.user, _id: { $ne: this._id } }, { $set: { isDefault: false } });
    }
    next();
});
// Virtual to check if card is expired
PaymentMethodSchema.virtual('isCardExpired').get(function () {
    if (this.type === PaymentMethodType.CARD && this.card) {
        const now = new Date();
        const expiryDate = new Date(this.card.expiryYear, this.card.expiryMonth);
        return expiryDate < now;
    }
    return false;
});
exports.PaymentMethod = mongoose_1.default.model('PaymentMethod', PaymentMethodSchema);
