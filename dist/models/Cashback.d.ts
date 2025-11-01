import { CashbackRequest, CashbackStatus, RiskFactor, CashbackMetrics, CashbackAnalytics } from '../types/shared';
declare const CashbackMongoModel: any;
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
        requests: any;
        totalCount: any;
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
