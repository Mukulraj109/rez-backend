import mongoose, { Schema, Document } from 'mongoose';

export interface IFeatureFlag extends Document {
  key: string;
  label: string;
  group: string;
  enabled: boolean;
  sortOrder: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureFlagSchema = new Schema({
  key: { type: String, required: true, unique: true, trim: true, index: true },
  label: { type: String, required: true, trim: true },
  group: { type: String, required: true, trim: true, index: true },
  enabled: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

FeatureFlagSchema.index({ group: 1, sortOrder: 1 });

export default mongoose.model<IFeatureFlag>('FeatureFlag', FeatureFlagSchema);
