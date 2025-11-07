import mongoose, { Document, Types } from 'mongoose';
export interface IBillImage {
    url: string;
    thumbnailUrl?: string;
    cloudinaryId: string;
    publicId?: string;
    imageHash?: string;
}
export interface IExtractedData {
    merchantName?: string;
    amount?: number;
    date?: Date;
    billNumber?: string;
    items?: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    taxAmount?: number;
    discountAmount?: number;
    confidence?: number;
}
export interface IBillMetadata {
    ocrConfidence?: number;
    processingTime?: number;
    verifiedBy?: Types.ObjectId;
    verifiedAt?: Date;
    ipAddress?: string;
    deviceInfo?: string;
    fraudScore?: number;
    fraudFlags?: string[];
}
export interface IBill extends Document {
    user: Types.ObjectId;
    merchant: Types.ObjectId;
    billImage: IBillImage;
    extractedData?: IExtractedData;
    amount: number;
    billDate: Date;
    billNumber?: string;
    notes?: string;
    verificationStatus: 'pending' | 'processing' | 'approved' | 'rejected';
    verificationMethod?: 'automatic' | 'manual';
    rejectionReason?: string;
    cashbackAmount?: number;
    cashbackPercentage?: number;
    cashbackStatus?: 'pending' | 'credited' | 'failed';
    cashbackCreditedAt?: Date;
    metadata: IBillMetadata;
    resubmissionCount?: number;
    originalBillId?: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    approve(verifiedBy?: Types.ObjectId): Promise<void>;
    reject(reason: string, verifiedBy?: Types.ObjectId): Promise<void>;
    markAsProcessing(): Promise<void>;
}
export declare const Bill: mongoose.Model<IBill, {}, {}, {}, mongoose.Document<unknown, {}, IBill, {}, {}> & IBill & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
