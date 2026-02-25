import mongoose, { Schema, Document, Types } from 'mongoose';

export type LedgerAccountType = 'user_wallet' | 'platform_fees' | 'platform_float' | 'merchant_wallet' | 'expired_pool';
export type LedgerDirection = 'debit' | 'credit';
export type LedgerOperationType =
  | 'transfer' | 'gift' | 'topup' | 'withdrawal' | 'payment'
  | 'refund' | 'cashback' | 'loyalty_credit' | 'admin_adjustment'
  | 'expiry' | 'gift_card_purchase' | 'scratch_card_prize' | 'correction'
  | 'order_payment' | 'order_coin_deduction' | 'merchant_payout' | 'order_refund';
export type LedgerCoinType = 'nuqta' | 'promo' | 'branded';

export interface ILedgerEntry extends Document {
  pairId: string;
  accountType: LedgerAccountType;
  accountId: Types.ObjectId;
  direction: LedgerDirection;
  amount: number;
  coinType: LedgerCoinType;
  runningBalance: number;
  operationType: LedgerOperationType;
  referenceId: string;
  referenceModel: string;
  metadata: {
    requestId?: string;
    idempotencyKey?: string;
    adminUserId?: string;
    description?: string;
  };
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>({
  pairId: { type: String, required: true, index: true },
  accountType: {
    type: String, required: true,
    enum: ['user_wallet', 'platform_fees', 'platform_float', 'merchant_wallet', 'expired_pool']
  },
  accountId: { type: Schema.Types.ObjectId, required: true, index: true },
  direction: { type: String, required: true, enum: ['debit', 'credit'] },
  amount: { type: Number, required: true, min: 0 },
  coinType: { type: String, required: true, enum: ['nuqta', 'promo', 'branded'], default: 'nuqta' },
  runningBalance: { type: Number, required: true },
  operationType: {
    type: String, required: true,
    enum: ['transfer', 'gift', 'topup', 'withdrawal', 'payment', 'refund', 'cashback', 'loyalty_credit', 'admin_adjustment', 'expiry', 'gift_card_purchase', 'scratch_card_prize', 'correction', 'order_payment', 'order_coin_deduction', 'merchant_payout', 'order_refund']
  },
  referenceId: { type: String, required: true },
  referenceModel: { type: String, required: true },
  metadata: {
    requestId: String,
    idempotencyKey: String,
    adminUserId: String,
    description: String,
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Immutable — no updates
});

// Indexes for reconciliation and querying
LedgerEntrySchema.index({ accountId: 1, createdAt: -1 });
LedgerEntrySchema.index({ accountType: 1, operationType: 1 });
LedgerEntrySchema.index({ referenceId: 1, referenceModel: 1 });
LedgerEntrySchema.index({ accountId: 1, coinType: 1, createdAt: -1 });
LedgerEntrySchema.index({ pairId: 1, direction: 1 }, { unique: true }); // Each pair has exactly 1 debit + 1 credit

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
