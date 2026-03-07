import mongoose, { Document, Schema, Types } from 'mongoose';
import { BillType, BILL_TYPES } from './BillProvider';

// ============================================
// TYPES & INTERFACES
// ============================================

export type BillPaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IBillPayment extends Document {
  userId: Types.ObjectId;
  provider: Types.ObjectId;
  billType: BillType;
  customerNumber: string;
  amount: number;
  cashbackAmount: number;
  status: BillPaymentStatus;
  transactionRef?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const BillPaymentSchema = new Schema<IBillPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'BillProvider',
      required: [true, 'Provider is required'],
      index: true,
    },
    billType: {
      type: String,
      required: [true, 'Bill type is required'],
      enum: BILL_TYPES,
      index: true,
    },
    customerNumber: {
      type: String,
      required: [true, 'Customer number is required'],
      trim: true,
      maxlength: 50,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1'],
    },
    cashbackAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    transactionRef: {
      type: String,
      trim: true,
      sparse: true,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
BillPaymentSchema.index({ userId: 1, createdAt: -1 });
BillPaymentSchema.index({ userId: 1, status: 1 });
BillPaymentSchema.index({ userId: 1, billType: 1, createdAt: -1 });

export const BillPayment = mongoose.model<IBillPayment>('BillPayment', BillPaymentSchema);
