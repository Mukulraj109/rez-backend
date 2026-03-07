import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// TYPES & INTERFACES
// ============================================

export const BILL_TYPES = [
  'electricity',
  'water',
  'gas',
  'internet',
  'mobile_postpaid',
  'broadband',
  'dth',
  'landline',
] as const;

export type BillType = typeof BILL_TYPES[number];

export interface IRequiredField {
  fieldName: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number';
}

export interface IBillProvider extends Document {
  name: string;
  code: string;
  type: BillType;
  logo: string;
  region?: string;
  requiredFields: IRequiredField[];
  cashbackPercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const RequiredFieldSchema = new Schema<IRequiredField>(
  {
    fieldName: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    placeholder: { type: String, required: true, trim: true },
    type: { type: String, enum: ['text', 'number'], default: 'text' },
  },
  { _id: false }
);

const BillProviderSchema = new Schema<IBillProvider>(
  {
    name: {
      type: String,
      required: [true, 'Provider name is required'],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, 'Provider code is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
    },
    type: {
      type: String,
      required: [true, 'Bill type is required'],
      enum: BILL_TYPES,
      index: true,
    },
    logo: {
      type: String,
      default: '',
    },
    region: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 50,
      index: true,
    },
    requiredFields: {
      type: [RequiredFieldSchema],
      default: [
        {
          fieldName: 'consumerNumber',
          label: 'Consumer Number',
          placeholder: 'Enter your consumer/account number',
          type: 'text',
        },
      ],
    },
    cashbackPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
BillProviderSchema.index({ type: 1, isActive: 1 });
BillProviderSchema.index({ code: 1 }, { unique: true });

export const BillProvider = mongoose.model<IBillProvider>('BillProvider', BillProviderSchema);
