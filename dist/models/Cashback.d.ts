import mongoose, { Schema, Document } from 'mongoose';
import { CashbackRequest, CashbackStatus, RiskFactor, CashbackMetrics, CashbackCustomer, CashbackOrder, CashbackCalculation, CashbackAnalytics } from '../types/shared';
interface CashbackDocument extends Document, Omit<CashbackRequest, 'id'> {
    _id: string;
}
declare const CashbackMongoModel: mongoose.Model<CashbackDocument, {}, {}, {}, mongoose.Document<unknown, {}, CashbackDocument, {}, {}> & CashbackDocument & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
export { CashbackMongoModel };
export declare class CashbackModel {
    static generateRequestNumber(): string;
    static create(requestData: Omit<CashbackRequest, 'id' | 'requestNumber' | 'createdAt' | 'updatedAt' | 'expiresAt'>): Promise<CashbackRequest>;
    static findById(id: string): Promise<CashbackRequest | null>;
    static findByMerchantId(merchantId: string): Promise<CashbackRequest[]>;
    static search(params: {
        merchantId: string;
        status?: CashbackStatus;
        customerId?: string;
        dateRange?: {
            start: Date;
            end: Date;
        };
        amountRange?: {
            min: number;
            max: number;
        };
        riskLevel?: 'low' | 'medium' | 'high';
        flaggedOnly?: boolean;
        sortBy?: 'created' | 'amount' | 'risk_score' | 'expires';
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    }): Promise<{
        requests: {
            createdAt: Date;
            updatedAt: Date;
            _id: string;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: mongoose.Collection;
            db: mongoose.Connection;
            errors?: mongoose.Error.ValidationError;
            id: any;
            isNew: boolean;
            schema: Schema;
            merchantId: string;
            expiresAt: Date;
            timeline: Array<{
                status: CashbackStatus;
                timestamp: Date;
                notes?: string;
                by?: string;
            }>;
            status: CashbackStatus;
            paidAmount?: number | undefined;
            paidAt?: Date | undefined;
            priority: "normal" | "high" | "urgent";
            paymentMethod?: "wallet" | "bank_transfer" | "check" | undefined;
            reviewedBy?: string | undefined;
            reviewedAt?: Date | undefined;
            rejectionReason?: string | undefined;
            order: CashbackOrder;
            orderId: string;
            cashbackRate: number;
            customerId: string;
            customer: CashbackCustomer;
            requestNumber: string;
            requestedAmount: number;
            approvedAmount?: number | undefined;
            calculationBreakdown: CashbackCalculation[];
            riskScore: number;
            riskFactors: RiskFactor[];
            flaggedForReview: boolean;
            approvalNotes?: string | undefined;
            paymentReference?: string | undefined;
            __v: number;
        }[];
        totalCount: number;
        page: number;
        limit: number;
        hasNext: boolean;
        hasPrevious: boolean;
    }>;
    static getMetrics(merchantId: string): Promise<CashbackMetrics>;
    static assessRisk(requestData: Omit<CashbackRequest, 'id' | 'requestNumber' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'riskScore' | 'riskFactors' | 'flaggedForReview'>): {
        riskScore: number;
        riskFactors: RiskFactor[];
        flaggedForReview: boolean;
    };
    static approve(id: string, approvedAmount: number, notes?: string, reviewedBy?: string): Promise<CashbackRequest | null>;
    static reject(id: string, reason: string, reviewedBy?: string): Promise<CashbackRequest | null>;
    static markAsPaid(id: string, paymentMethod: string, paymentReference: string): Promise<CashbackRequest | null>;
    static bulkApprove(requestIds: string[], notes?: string, reviewedBy?: string): Promise<Array<{
        success: boolean;
        requestId: string;
        message?: string;
    }>>;
    static bulkReject(requestIds: string[], reason: string, reviewedBy?: string): Promise<Array<{
        success: boolean;
        requestId: string;
        message?: string;
    }>>;
    static getAnalytics(merchantId: string, dateRange?: {
        start: Date;
        end: Date;
    }): Promise<CashbackAnalytics>;
    static createSampleRequests(merchantId: string): Promise<void>;
}
