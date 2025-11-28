export interface CashbackSearchRequest {
  merchantId: string;
  status?: string;
  customerId?: string;
  dateRange?: { start: Date; end: Date };
  amountRange?: { min: number; max: number };
  riskLevel?: string;
  flaggedOnly?: boolean;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export interface ApproveCashbackRequest {
  approvedAmount: number;
  notes?: string;
}

export interface RejectCashbackRequest {
  reason: string;
}

export interface BulkCashbackAction {
  requestIds: string[];
  action: 'approve' | 'reject';
  notes?: string;
  approvedAmount?: number;
  rejectionReason?: string;
}
