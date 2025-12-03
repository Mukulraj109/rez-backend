import mongoose, { Document, Types } from 'mongoose';
export interface IImportJobRow {
    rowNumber: number;
    status: 'success' | 'error' | 'warning';
    data: any;
    errors: string[];
    warnings: string[];
    productId?: Types.ObjectId;
    action?: 'created' | 'updated' | 'skipped';
}
export interface IImportJob extends Document {
    merchantId: Types.ObjectId;
    storeId: Types.ObjectId;
    fileName: string;
    fileType: 'csv' | 'excel';
    filePath: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: {
        total: number;
        processed: number;
        successful: number;
        failed: number;
        warnings: number;
    };
    result?: {
        total: number;
        successful: number;
        failed: number;
        warnings: number;
        rows: IImportJobRow[];
        startTime: Date;
        endTime?: Date;
        duration?: number;
    };
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ImportJob: mongoose.Model<any, {}, {}, {}, any, any>;
