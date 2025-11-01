import { Document, Types } from 'mongoose';
export declare enum PaymentMethodType {
    CARD = "CARD",
    BANK_ACCOUNT = "BANK_ACCOUNT",
    UPI = "UPI",
    WALLET = "WALLET"
}
export declare enum CardType {
    CREDIT = "CREDIT",
    DEBIT = "DEBIT"
}
export declare enum CardBrand {
    VISA = "VISA",
    MASTERCARD = "MASTERCARD",
    AMEX = "AMEX",
    RUPAY = "RUPAY",
    DISCOVER = "DISCOVER",
    OTHER = "OTHER"
}
export declare enum BankAccountType {
    SAVINGS = "SAVINGS",
    CURRENT = "CURRENT"
}
export interface IPaymentMethod extends Document {
    id: string;
    user: Types.ObjectId;
    type: PaymentMethodType;
    card?: {
        type: CardType;
        brand: CardBrand;
        lastFourDigits: string;
        expiryMonth: number;
        expiryYear: number;
        cardholderName: string;
        nickname?: string;
    };
    bankAccount?: {
        bankName: string;
        accountType: BankAccountType;
        accountNumber: string;
        ifscCode: string;
        nickname?: string;
        isVerified: boolean;
    };
    upi?: {
        vpa: string;
        nickname?: string;
        isVerified: boolean;
    };
    isDefault: boolean;
    isActive: boolean;
    token?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PaymentMethod: any;
